package service

import (
	"context"
	"encoding/json"
	"errors"
	"reflect"
	"slices"
	"strings"
	"sync"
	"testing"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/client"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/entity"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/exception"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/view"
)

const (
	testSystemPrompt   = "test prompt"
	testModelName      = "fake-model"
	largeTestBudget    = 1_000_000
	testCompletionSize = 100
)

// aiError stands for an AI request error of the given code; the test only needs the code to match.
func aiError(code string) error {
	return &exception.CustomError{Code: code}
}

// fakeLlmClient records deduplication requests and answers them with dedup, or with sameCodeOracle when dedup is nil.
// Like the real client, it does not dispatch a request whose context is already cancelled.
type fakeLlmClient struct {
	lint  func(docStr string) ([]view.AiValidationIssue, error)
	dedup func(call int, request view.AiDeduplicationRequest) ([]view.AiDuplicatePair, error)

	mu       sync.Mutex
	requests []view.AiDeduplicationRequest
}

func (f *fakeLlmClient) LintOasDocument(ctx context.Context, docStr string, _ string) ([]view.AiValidationIssue, client.RequestReport, error) {
	if err := ctx.Err(); err != nil {
		return nil, client.RequestReport{Model: testModelName}, err
	}
	issues, err := f.lint(docStr)
	return issues, client.RequestReport{Model: testModelName, ProviderAttempts: 1}, err
}

func (f *fakeLlmClient) DeduplicateIssues(ctx context.Context, _ string, request view.AiDeduplicationRequest, _ int) ([]view.AiDuplicatePair, client.RequestReport, error) {
	if err := ctx.Err(); err != nil {
		return nil, client.RequestReport{Model: testModelName}, err
	}
	f.mu.Lock()
	call := len(f.requests)
	f.requests = append(f.requests, request)
	f.mu.Unlock()

	report := client.RequestReport{Model: testModelName, ProviderAttempts: 1}
	if f.dedup == nil {
		return sameCodeOracle(request), report, nil
	}
	pairs, err := f.dedup(call, request)
	return pairs, report, err
}

func (f *fakeLlmClient) recordedRequests() []view.AiDeduplicationRequest {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]view.AiDeduplicationRequest(nil), f.requests...)
}

// sameCodeOracle behaves like a correct model whose criterion is "same code means same problem".
func sameCodeOracle(request view.AiDeduplicationRequest) []view.AiDuplicatePair {
	pairs := []view.AiDuplicatePair{}
	for _, group := range request.Groups {
		kept := map[string]int{}
		for _, issue := range append(append([]view.AiDeduplicationIssue{}, group.Known...), group.New...) {
			if of, exists := kept[issue.Code]; exists {
				pairs = append(pairs, view.AiDuplicatePair{DuplicateId: issue.Id, KeptId: of})
				continue
			}
			kept[issue.Code] = issue.Id
		}
	}
	return pairs
}

func newTestIssueDeduplicator(llm client.LLMClient, budget int) *aiIssueDeduplicator {
	return &aiIssueDeduplicator{llmClient: llm, systemPrompt: testSystemPrompt, requestTokenBudget: budget, maxCompletionTokens: testCompletionSize}
}

// testGroup returns a group of issues with the given codes and messages of equal length.
func testGroup(pathItem string, firstId int, codes ...string) issueGroup {
	group := issueGroup{ResolvedPath: []string{"paths", pathItem}}
	for i, code := range codes {
		group.Issues = append(group.Issues, numberedIssue{Id: firstId + i, issueWithResolvedPath: issueWithResolvedPath{
			Issue:        view.ValidationIssue{Path: group.ResolvedPath, Code: code, Severity: "warning", Message: "message of fixed length"},
			ResolvedPath: group.ResolvedPath,
		}})
	}
	return group
}

func wholeGroupsRequest(t *testing.T, groups []issueGroup) view.AiDeduplicationRequest {
	t.Helper()
	request := view.AiDeduplicationRequest{}
	for _, group := range groups {
		p, err := prepareGroup(group)
		if err != nil {
			t.Fatal(err)
		}
		request.Groups = append(request.Groups, view.AiDeduplicationGroup{Path: p.path, Known: []view.AiDeduplicationIssue{}, New: p.issues})
	}
	return request
}

// budgetForIssues returns the token budget of a request that holds exactly the first count issues of group.
func budgetForIssues(t *testing.T, group issueGroup, count int) int {
	t.Helper()
	group.Issues = group.Issues[:count]
	serialised, err := json.Marshal(wholeGroupsRequest(t, []issueGroup{group}))
	if err != nil {
		t.Fatal(err)
	}
	return estimateTokens(len(testSystemPrompt) + len(serialised))
}

// wantDuplicates is what one request with all groups returns from sameCodeOracle.
func wantDuplicates(t *testing.T, groups []issueGroup) map[int]int {
	want := map[int]int{}
	for _, pair := range sameCodeOracle(wholeGroupsRequest(t, groups)) {
		want[pair.DuplicateId] = pair.KeptId
	}
	return want
}

func newIssueIds(request view.AiDeduplicationRequest) []int {
	var ids []int
	for _, group := range request.Groups {
		for _, issue := range group.New {
			ids = append(ids, issue.Id)
		}
	}
	return ids
}

func TestNumberUniqueIssuesKey(t *testing.T) {
	issue := func(path []string, severity string) issueWithResolvedPath {
		return issueWithResolvedPath{Issue: view.ValidationIssue{Path: path, Code: "c", Severity: severity, Message: "m"}, ResolvedPath: path}
	}
	tests := []struct {
		name       string
		issues     []issueWithResolvedPath
		wantUnique int
	}{
		{"dotted segment differs from split segments", []issueWithResolvedPath{issue([]string{"paths", "/a.b"}, "warning"), issue([]string{"paths", "/a", "b"}, "warning")}, 2},
		{"different severity is kept", []issueWithResolvedPath{issue([]string{"paths", "/a"}, "warning"), issue([]string{"paths", "/a"}, "error")}, 2},
		{"exact repeat is dropped", []issueWithResolvedPath{issue([]string{"paths", "/a"}, "warning"), issue([]string{"paths", "/a"}, "warning")}, 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			unique, err := numberUniqueIssues(tt.issues)
			if err != nil {
				t.Fatal(err)
			}
			if len(unique) != tt.wantUnique {
				t.Fatalf("expected %d unique issues, got %d", tt.wantUnique, len(unique))
			}
			for i, issue := range unique {
				if issue.Id != i {
					t.Fatalf("expected id %d at position %d, got %d", i, i, issue.Id)
				}
			}
		})
	}
}

func TestWithoutDuplicatesKeepsOrderAndOriginalIssues(t *testing.T) {
	issues := testGroup("/pets", 0, "a", "a", "b", "c").Issues
	got := withoutDuplicates(issues, map[int]int{1: 0, 3: 2})
	if want := []view.ValidationIssue{issues[0].Issue, issues[2].Issue}; !reflect.DeepEqual(got, want) {
		t.Fatalf("expected %+v, got %+v", want, got)
	}
}

func TestGroupsArePackedUpToTheBudget(t *testing.T) {
	groups := []issueGroup{testGroup("/a", 0, "x", "x"), testGroup("/b", 2, "y", "z"), testGroup("/c", 4, "w", "w")}
	tests := []struct {
		name         string
		budget       int
		wantRequests int
	}{
		{"small groups share one request", largeTestBudget, 1},
		{"a group that does not fit starts a new request", budgetForIssues(t, groups[0], 2), 3},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			llm := &fakeLlmClient{}
			duplicates, stats, err := newTestIssueDeduplicator(llm, tt.budget).findDuplicates(context.Background(), groups)
			if err != nil {
				t.Fatal(err)
			}
			if requests := llm.recordedRequests(); len(requests) != tt.wantRequests || len(stats) != tt.wantRequests {
				t.Fatalf("expected %d requests and stats, got %d and %d", tt.wantRequests, len(requests), len(stats))
			}
			if want := wantDuplicates(t, groups); !reflect.DeepEqual(duplicates, want) {
				t.Fatalf("expected duplicates %v, got %v", want, duplicates)
			}
		})
	}
}

func TestOversizedGroupIsStreamedWithKnownIssues(t *testing.T) {
	llm := &fakeLlmClient{}
	group := testGroup("/pets", 0, "a", "b", "a", "b", "a", "b", "c", "a", "d")

	duplicates, _, err := newTestIssueDeduplicator(llm, budgetForIssues(t, group, 5)).findDuplicates(context.Background(), []issueGroup{group})
	if err != nil {
		t.Fatal(err)
	}
	if want := wantDuplicates(t, []issueGroup{group}); !reflect.DeepEqual(duplicates, want) {
		t.Fatalf("expected duplicates %v, got %v", want, duplicates)
	}

	var unique, sent []int
	for i, request := range llm.recordedRequests() {
		var known []int
		for _, issue := range request.Groups[0].Known {
			known = append(known, issue.Id)
		}
		if !reflect.DeepEqual(known, unique) {
			t.Fatalf("request %d: expected known %v, got %v", i, unique, known)
		}
		for _, id := range newIssueIds(request) {
			sent = append(sent, id)
			if _, duplicate := duplicates[id]; !duplicate {
				unique = append(unique, id)
			}
		}
	}
	if len(sent) != len(group.Issues) || len(llm.recordedRequests()) < 2 {
		t.Fatalf("expected every issue to be sent once as new over several requests, sent %v", sent)
	}
}

func TestResponseValidation(t *testing.T) {
	// Group 0 has known issue 0 and new issues 1, 2 and 3; group 1 has new issues 4 and 5.
	request := view.AiDeduplicationRequest{Groups: []view.AiDeduplicationGroup{
		{Path: []string{"a"}, Known: []view.AiDeduplicationIssue{{Id: 0}}, New: []view.AiDeduplicationIssue{{Id: 1}, {Id: 2}, {Id: 3}}},
		{Path: []string{"b"}, Known: []view.AiDeduplicationIssue{}, New: []view.AiDeduplicationIssue{{Id: 4}, {Id: 5}}},
	}}

	tests := []struct {
		name  string
		pairs []view.AiDuplicatePair
		// want is nil when the response is rejected.
		want []view.AiDuplicatePair
	}{
		{name: "missing duplicates field", pairs: nil},
		{name: "unknown duplicateId", pairs: []view.AiDuplicatePair{{DuplicateId: 99, KeptId: 0}}},
		{name: "unknown keptId", pairs: []view.AiDuplicatePair{{DuplicateId: 1, KeptId: 99}}},
		{name: "duplicateId from known", pairs: []view.AiDuplicatePair{{DuplicateId: 0, KeptId: 1}}},
		{name: "keptId from a different group", pairs: []view.AiDuplicatePair{{DuplicateId: 5, KeptId: 1}}},
		{name: "keptId larger than duplicateId", pairs: []view.AiDuplicatePair{{DuplicateId: 1, KeptId: 2}}},
		{name: "duplicateId reported twice", pairs: []view.AiDuplicatePair{{DuplicateId: 2, KeptId: 0}, {DuplicateId: 2, KeptId: 1}}, want: []view.AiDuplicatePair{{DuplicateId: 2, KeptId: 0}}},
		{name: "duplicateId equal to keptId", pairs: []view.AiDuplicatePair{{DuplicateId: 2, KeptId: 2}, {DuplicateId: 5, KeptId: 4}}, want: []view.AiDuplicatePair{{DuplicateId: 5, KeptId: 4}}},
		{name: "chained keptId", pairs: []view.AiDuplicatePair{{DuplicateId: 3, KeptId: 2}, {DuplicateId: 2, KeptId: 1}, {DuplicateId: 1, KeptId: 0}}, want: []view.AiDuplicatePair{{DuplicateId: 3, KeptId: 0}, {DuplicateId: 2, KeptId: 0}, {DuplicateId: 1, KeptId: 0}}},
	}
	for _, tt := range tests {
		llm := &fakeLlmClient{dedup: func(int, view.AiDeduplicationRequest) ([]view.AiDuplicatePair, error) { return tt.pairs, nil }}
		run := &issueDeduplicationRun{aiIssueDeduplicator: newTestIssueDeduplicator(llm, largeTestBudget), duplicates: map[int]int{}}

		pairs, _, err := run.send(context.Background(), request)

		if tt.want == nil {
			if !errors.Is(err, aiError(exception.AiInvalidDeduplicationResponse)) || pairs != nil || len(run.duplicates) != 0 || run.stats[0].ErrorClass != entity.AiRequestErrorClassValidation {
				t.Fatalf("%s: expected a rejected response recorded as a validation error, got %v, %v, %+v", tt.name, pairs, err, run.stats)
			}
			continue
		}
		want := map[int]int{}
		for _, pair := range tt.want {
			want[pair.DuplicateId] = pair.KeptId
		}
		if err != nil || !reflect.DeepEqual(pairs, tt.want) || !reflect.DeepEqual(run.duplicates, want) || run.stats[0].Duplicates != len(tt.want) {
			t.Fatalf("%s: expected pairs %v, got %v, %v, duplicates %v, stats %+v", tt.name, tt.want, pairs, err, run.duplicates, run.stats)
		}
	}
}

func TestLengthErrorsAndInvalidResponsesReduceTheRequest(t *testing.T) {
	smallGroups := []issueGroup{testGroup("/a", 0, "x", "x", "y"), testGroup("/b", 3, "y", "z"), testGroup("/c", 5, "w", "w")}
	bigGroup := testGroup("/pets", 0, strings.Split("abababcacbacbaacbcabcaab", "")...)
	// failing fails the given calls, or every call when none is given. aiError(exception.AiInvalidDeduplicationResponse) stands for a
	// response whose keptId is not part of the request.
	failing := func(err error, calls ...int) func(int, view.AiDeduplicationRequest) ([]view.AiDuplicatePair, error) {
		return func(call int, request view.AiDeduplicationRequest) ([]view.AiDuplicatePair, error) {
			if len(calls) > 0 && !slices.Contains(calls, call) {
				return sameCodeOracle(request), nil
			}
			if errors.Is(err, aiError(exception.AiInvalidDeduplicationResponse)) {
				return []view.AiDuplicatePair{{DuplicateId: newIssueIds(request)[0], KeptId: -1}}, nil
			}
			return nil, err
		}
	}
	tests := []struct {
		name         string
		groups       []issueGroup
		budget       int
		dedup        func(int, view.AiDeduplicationRequest) ([]view.AiDuplicatePair, error)
		wantErr      error
		wantRequests int
	}{
		{name: "context length of whole groups", groups: smallGroups, budget: largeTestBudget, dedup: failing(aiError(exception.AiContextLengthExceeded), 0)},
		{name: "output length of whole groups", groups: smallGroups, budget: largeTestBudget, dedup: failing(aiError(exception.AiOutputLengthExceeded), 0)},
		{name: "output length of a single whole group", groups: smallGroups[:1], budget: largeTestBudget, dedup: failing(aiError(exception.AiOutputLengthExceeded), 0)},
		{name: "context length of a streamed chunk", groups: []issueGroup{bigGroup}, budget: budgetForIssues(t, bigGroup, 12), dedup: failing(aiError(exception.AiContextLengthExceeded), 1)},
		{name: "output length of a streamed chunk", groups: []issueGroup{bigGroup}, budget: budgetForIssues(t, bigGroup, 12), dedup: failing(aiError(exception.AiOutputLengthExceeded), 1)},
		{name: "four length errors in a lineage", groups: []issueGroup{bigGroup}, budget: largeTestBudget, dedup: failing(aiError(exception.AiOutputLengthExceeded)), wantErr: aiError(exception.AiOutputLengthExceeded), wantRequests: maxRepacks + 1},
		{name: "output length with one new issue", groups: []issueGroup{testGroup("/a", 0, "x", "y")}, budget: largeTestBudget, dedup: failing(aiError(exception.AiOutputLengthExceeded)), wantErr: aiError(exception.AiOutputLengthExceeded), wantRequests: 2},
		{name: "invalid response of whole groups", groups: smallGroups, budget: largeTestBudget, dedup: failing(aiError(exception.AiInvalidDeduplicationResponse), 0)},
		{name: "invalid response of a streamed chunk", groups: []issueGroup{bigGroup}, budget: budgetForIssues(t, bigGroup, 12), dedup: failing(aiError(exception.AiInvalidDeduplicationResponse), 1)},
		{name: "four invalid responses in a lineage", groups: []issueGroup{bigGroup}, budget: largeTestBudget, dedup: failing(aiError(exception.AiInvalidDeduplicationResponse)), wantErr: aiError(exception.AiInvalidDeduplicationResponse), wantRequests: maxRepacks + 1},
		{name: "malformed output with one new issue", groups: []issueGroup{testGroup("/a", 0, "x", "y")}, budget: largeTestBudget, dedup: failing(aiError(exception.AiMalformedOutput)), wantErr: aiError(exception.AiMalformedOutput), wantRequests: 2},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			llm := &fakeLlmClient{dedup: tt.dedup}
			duplicates, stats, err := newTestIssueDeduplicator(llm, tt.budget).findDuplicates(context.Background(), tt.groups)
			requests := llm.recordedRequests()

			if tt.wantErr != nil {
				if !errors.Is(err, tt.wantErr) || len(requests) != tt.wantRequests || len(stats) != tt.wantRequests {
					t.Fatalf("expected %v after %d requests, got %v after %d requests and %d stats", tt.wantErr, tt.wantRequests, err, len(requests), len(stats))
				}
				return
			}
			if want := wantDuplicates(t, tt.groups); err != nil || !reflect.DeepEqual(duplicates, want) || len(stats) != len(requests) {
				t.Fatalf("expected duplicates %v and stats of %d requests, got %v, %v and %d stats", want, len(requests), duplicates, err, len(stats))
			}
			for i, stat := range stats {
				if stat.Status != entity.AiRequestStatusError {
					continue
				}
				failed, resent := requests[i], requests[i+1]
				if !reflect.DeepEqual(failed.Groups[0].Known, resent.Groups[0].Known) || newIssueIds(resent)[0] != newIssueIds(failed)[0] ||
					len(newIssueIds(resent)) >= len(newIssueIds(failed)) {
					t.Fatalf("expected the failed request to be resent smaller with the same known issues, failed %+v, resent %+v", failed, resent)
				}
			}
		})
	}
}

func TestFailedStreamReturnsStatsOfEveryDispatchedRequest(t *testing.T) {
	group := testGroup("/pets", 0, "a", "b", "a", "b", "c", "d", "a")
	llm := &fakeLlmClient{dedup: func(call int, request view.AiDeduplicationRequest) ([]view.AiDuplicatePair, error) {
		if call == 1 {
			return nil, aiError(exception.AiRequestRefused)
		}
		return sameCodeOracle(request), nil
	}}

	duplicates, stats, err := newTestIssueDeduplicator(llm, budgetForIssues(t, group, 4)).findDuplicates(context.Background(), []issueGroup{group})

	if !errors.Is(err, aiError(exception.AiRequestRefused)) || duplicates != nil {
		t.Fatalf("expected the refusal to fail the deduplication, got %v, %v", duplicates, err)
	}
	if len(stats) != 2 || stats[0].Status != entity.AiRequestStatusSuccess || stats[1].ErrorClass != entity.AiRequestErrorClassRefusal {
		t.Fatalf("expected the successful and the refused request in the stats, got %+v", stats)
	}
}
