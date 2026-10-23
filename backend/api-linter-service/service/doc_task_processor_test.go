package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"reflect"
	"slices"
	"strconv"
	"strings"
	"sync"
	"testing"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/client"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/entity"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/exception"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/repository"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/view"
)

const testOperationCount = 4

// fakeApihubClient implements only the calls made by the AI branch of processDocTask.
type fakeApihubClient struct {
	client.ApihubClient
}

func testOperationId(i int) string {
	return fmt.Sprintf("op-%d", i)
}

func (f fakeApihubClient) GetDocumentRawData(context.Context, string, string, string) ([]byte, error) {
	return []byte(`{"openapi":"3.0.0"}`), nil
}

func (f fakeApihubClient) GetDocumentDetails(context.Context, string, string, string) (*view.PublishedDocument, error) {
	doc := &view.PublishedDocument{}
	for i := range testOperationCount {
		doc.Operations = append(doc.Operations, view.DocumentOperation{OperationId: testOperationId(i)})
	}
	return doc, nil
}

func (f fakeApihubClient) GetOperationWithData(_ context.Context, _, _ string, _ view.OpApiType, operationId string) (*view.Operation, error) {
	data := fmt.Sprintf(`{"info":{"description":"shared"},"paths":{"/%s":{"get":{"description":"d"}}}}`, operationId)
	return &view.Operation{OperationId: operationId, Data: json.RawMessage(data)}, nil
}

func testOperations() []view.DocumentOperation {
	operations := make([]view.DocumentOperation, 0, testOperationCount)
	for i := range testOperationCount {
		operations = append(operations, view.DocumentOperation{OperationId: testOperationId(i)})
	}
	return operations
}

// operationPath returns the only path of the operation data built by fakeApihubClient.
func operationPath(docStr string) (string, error) {
	var data struct {
		Paths map[string]any `json:"paths"`
	}
	if err := json.Unmarshal([]byte(docStr), &data); err != nil {
		return "", err
	}
	for path := range data.Paths {
		return path, nil
	}
	return "", errors.New("operation data has no path")
}

// lintByOperation returns, for every operation, an issue on the shared info description (an exact repeat
// across operations) and two issues with the same code on the operation description (model duplicates).
func lintByOperation(docStr string) ([]view.AiValidationIssue, error) {
	path, err := operationPath(docStr)
	if err != nil {
		return nil, err
	}
	return []view.AiValidationIssue{
		{Path: []string{"info", "description"}, Code: "shared", Severity: "info", Message: "Shared description is vague"},
		{Path: []string{"paths", path, "get", "description"}, Code: "vague" + path, Severity: "warning", Message: "Description is vague"},
		{Path: []string{"paths", path, "get", "description"}, Code: "vague" + path, Severity: "warning", Message: "Description lacks detail"},
	}, nil
}

func newTestProcessor(llm client.LLMClient, apihub client.ApihubClient, docResults repository.DocResultRepository, statsRepo repository.AiLintStatsRepository) docTaskProcessorImpl {
	return docTaskProcessorImpl{
		ruleSetRepository:   fakeRulesetRepository{},
		docResultRepository: docResults,
		aiLintStatsRepo:     statsRepo,
		cl:                  apihub,
		aiOasExecutor:       &aiOasExecutor{llmClient: llm, issueDeduplicator: newTestIssueDeduplicator(llm, largeTestBudget)},
		aiModel:             testModelName,
		executorId:          "executor-1",
		aiLinterWorkers:     1,
	}
}

var testTask = entity.DocumentLintTask{
	Id: "task-1", PackageId: "pkg", Version: "1.0", Revision: 1, FileId: "doc.json", FileSlug: "doc-json",
	Linter: view.AiLinter, RulesetId: "ruleset-1", Recalculate: true,
}

// lintInOrder lints like lintByOperation, but the lint of each operation completes only after the lint of the
// operation before it in completionOrder has completed. The order in which lints actually completed is appended
// to observed.
func lintInOrder(completionOrder []int, observed *[]int) func(string) ([]view.AiValidationIssue, error) {
	completed := make([]chan struct{}, testOperationCount)
	for i := range completed {
		completed[i] = make(chan struct{})
	}
	var mu sync.Mutex
	return func(docStr string) ([]view.AiValidationIssue, error) {
		path, err := operationPath(docStr)
		if err != nil {
			return nil, err
		}
		index, err := strconv.Atoi(strings.TrimPrefix(path, "/op-"))
		if err != nil {
			return nil, err
		}
		if position := slices.Index(completionOrder, index); position > 0 {
			<-completed[completionOrder[position-1]]
		}
		issues, err := lintByOperation(docStr)
		mu.Lock()
		*observed = append(*observed, index)
		mu.Unlock()
		close(completed[index])
		return issues, err
	}
}

func TestLintDocumentWithAiIsDeterministic(t *testing.T) {
	completionOrders := [][]int{{0, 1, 2, 3}, {3, 2, 1, 0}, {1, 0, 3, 2}}

	var results [][]view.ValidationIssue
	var requests [][]view.AiDeduplicationRequest
	for _, order := range completionOrders {
		var observed []int
		llm := &fakeLlmClient{lint: lintInOrder(order, &observed)}
		d := newTestProcessor(llm, fakeApihubClient{}, nil, &fakeAiLintStatsRepository{})

		issues, _, err := d.lintDocumentWithAi(context.Background(), testTask, testOperations(), view.AiRuleset{Prompt: "p"})
		if err != nil {
			t.Fatalf("completion order %v: %v", order, err)
		}
		if !slices.Equal(observed, order) {
			t.Fatalf("lints completed in order %v, expected %v", observed, order)
		}
		results = append(results, issues)
		requests = append(requests, llm.recordedRequests())
	}

	for i := 1; i < len(completionOrders); i++ {
		if !reflect.DeepEqual(results[0], results[i]) {
			t.Fatalf("issue order depends on completion order %v:\n%+v\n%+v", completionOrders[i], results[0], results[i])
		}
		if !reflect.DeepEqual(requests[0], requests[i]) {
			t.Fatalf("issue ids depend on completion order %v:\n%+v\n%+v", completionOrders[i], requests[0], requests[i])
		}
	}

	// One shared issue survives exact pre-deduplication, then each operation keeps its first description issue.
	if len(results[0]) != 1+testOperationCount || results[0][0].Code != "shared" {
		t.Fatalf("unexpected issues %+v", results[0])
	}
	for i := range testOperationCount {
		issue := results[0][1+i]
		if issue.Path[1] != "/"+testOperationId(i) || issue.Message != "Description is vague" {
			t.Fatalf("expected the first description issue of %s at position %d, got %+v", testOperationId(i), 1+i, issue)
		}
	}
	// The shared info group is a singleton after pre-deduplication, so only description groups are sent.
	if len(requests[0]) != 1 || len(requests[0][0].Groups) != testOperationCount {
		t.Fatalf("expected one request with %d groups, got %+v", testOperationCount, requests[0])
	}
}

func TestSingletonGroupsNeverReachTheClient(t *testing.T) {
	lintDistinctResolvedPaths := func(docStr string) ([]view.AiValidationIssue, error) {
		path, err := operationPath(docStr)
		if err != nil {
			return nil, err
		}
		return []view.AiValidationIssue{
			{Path: []string{"paths", path, "get"}, Code: "operation", Severity: "warning", Message: "Operation has no summary"},
			{Path: []string{"paths", path, "get", "description"}, Code: "description", Severity: "warning", Message: "Description is vague"},
		}, nil
	}
	llm := &fakeLlmClient{lint: lintDistinctResolvedPaths}
	d := newTestProcessor(llm, fakeApihubClient{}, nil, &fakeAiLintStatsRepository{})

	issues, _, err := d.lintDocumentWithAi(context.Background(), testTask, testOperations(), view.AiRuleset{Prompt: "p"})
	if err != nil {
		t.Fatal(err)
	}

	if calls := len(llm.recordedRequests()); calls != 0 {
		t.Fatalf("expected no deduplication requests, got %d", calls)
	}
	var want []view.ValidationIssue
	for i := range testOperationCount {
		modelIssues, err := lintDistinctResolvedPaths(fmt.Sprintf(`{"paths":{"/%s":{}}}`, testOperationId(i)))
		if err != nil {
			t.Fatal(err)
		}
		for _, issue := range modelIssues {
			want = append(want, view.ValidationIssue{Path: issue.Path, Code: issue.Code, Severity: issue.Severity, Message: issue.Message})
		}
	}
	if !reflect.DeepEqual(issues, want) {
		t.Fatalf("expected the input issues in order:\n%+v\ngot:\n%+v", want, issues)
	}
}

type fakeRulesetRepository struct {
	repository.RulesetRepository
}

func (fakeRulesetRepository) GetRulesetWithData(context.Context, string) (*entity.RulesetWithData, error) {
	return &entity.RulesetWithData{Ruleset: entity.Ruleset{FileName: "ruleset.yaml"}, Data: []byte(`prompt: "check descriptions"`)}, nil
}

type savedLintResult struct {
	status    view.LintedDocumentStatus
	published bool
}

type fakeDocResultRepository struct {
	repository.DocResultRepository
	mu    sync.Mutex
	saved []savedLintResult
}

func (f *fakeDocResultRepository) SaveLintResult(_ context.Context, _ string, status view.LintedDocumentStatus, _ string, _ int64,
	_ entity.LintedVersion, _ entity.LintedDocument, lintFileResult *entity.LintFileResult, _ string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.saved = append(f.saved, savedLintResult{status: status, published: lintFileResult != nil})
	return nil
}

type fakeAiLintStatsRepository struct {
	err  error
	rows []entity.AiLintStats
}

func (f *fakeAiLintStatsRepository) Save(_ context.Context, stats entity.AiLintStats) error {
	f.rows = append(f.rows, stats)
	return f.err
}

func TestProcessDocTaskSavesAiLintStats(t *testing.T) {
	// lintByOperation returns three issues per operation: one exact repeat across operations and two duplicates.
	wantDedupDetails := entity.AiDeduplicationStageDetails{IssuesIn: 1 + 2*testOperationCount, Groups: 1 + testOperationCount, MultiIssueGroups: testOperationCount}
	failLastOperation := lintInOrder([]int{0, 1, 2, 3}, &[]int{})
	tests := []struct {
		name           string
		lint           func(string) ([]view.AiValidationIssue, error)
		dedup          func(int, view.AiDeduplicationRequest) ([]view.AiDuplicatePair, error)
		statsErr       error
		wantStatus     view.LintedDocumentStatus
		wantLintClass  entity.AiRequestErrorClass
		wantDedupClass entity.AiRequestErrorClass
		wantDedup      *entity.AiDeduplicationStageDetails
	}{
		{
			name:       "success",
			wantStatus: view.StatusSuccess,
			wantDedup:  &entity.AiDeduplicationStageDetails{DuplicatesRemoved: testOperationCount},
		},
		{
			name: "deduplication failure keeps the failed request",
			dedup: func(int, view.AiDeduplicationRequest) ([]view.AiDuplicatePair, error) {
				return nil, aiError(exception.AiRequestRefused)
			},
			wantStatus:     view.StatusError,
			wantDedupClass: entity.AiRequestErrorClassRefusal,
			wantDedup:      &entity.AiDeduplicationStageDetails{},
		},
		{
			name: "one failed operation keeps the completed reports and publishes no result",
			lint: func(docStr string) ([]view.AiValidationIssue, error) {
				issues, err := failLastOperation(docStr)
				if strings.Contains(docStr, testOperationId(testOperationCount-1)) {
					return nil, aiError(exception.AiRequestRefused)
				}
				return issues, err
			},
			wantStatus:    view.StatusError,
			wantLintClass: entity.AiRequestErrorClassRefusal,
		},
		{
			name:       "failed stats insert does not change the status",
			statsErr:   errors.New("database is unavailable"),
			wantStatus: view.StatusSuccess,
			wantDedup:  &entity.AiDeduplicationStageDetails{DuplicatesRemoved: testOperationCount},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			lint := tt.lint
			if lint == nil {
				lint = lintByOperation
			}
			llm := &fakeLlmClient{lint: lint, dedup: tt.dedup}
			docResults := &fakeDocResultRepository{}
			statsRepo := &fakeAiLintStatsRepository{err: tt.statsErr}

			newTestProcessor(llm, fakeApihubClient{}, docResults, statsRepo).processDocTask(context.Background(), testTask)

			wantSaved := []savedLintResult{{status: tt.wantStatus, published: tt.wantStatus == view.StatusSuccess}}
			if !reflect.DeepEqual(docResults.saved, wantSaved) {
				t.Fatalf("expected saved results %+v, got %+v", wantSaved, docResults.saved)
			}
			wantRows := 1
			if tt.wantDedup != nil {
				wantRows = 2
			}
			if len(statsRepo.rows) != wantRows {
				t.Fatalf("expected %d stats rows, got %+v", wantRows, statsRepo.rows)
			}

			lintRow := statsRepo.rows[0]
			var lintDetails entity.AiLintStageDetails
			if err := json.Unmarshal(lintRow.Details, &lintDetails); err != nil {
				t.Fatal(err)
			}
			wantLintStatus := entity.AiRequestStatusSuccess
			if tt.wantLintClass != "" {
				wantLintStatus = entity.AiRequestStatusError
			}
			if lintRow.Stage != entity.AiLintStageLint || lintRow.Model != testModelName || lintRow.Requests != testOperationCount ||
				lintRow.Status != wantLintStatus || lintRow.ErrorClass != tt.wantLintClass {
				t.Fatalf("unexpected lint row %+v with details %s", lintRow, lintRow.Details)
			}
			for i, operation := range lintDetails.Operations {
				if operation.OperationId != testOperationId(i) {
					t.Fatalf("expected operations in document order, got %s at %d", operation.OperationId, i)
				}
			}
			if tt.wantDedup == nil {
				return
			}

			dedupRow := statsRepo.rows[1]
			var dedupDetails entity.AiDeduplicationStageDetails
			if err := json.Unmarshal(dedupRow.Details, &dedupDetails); err != nil {
				t.Fatal(err)
			}
			want := wantDedupDetails
			want.DuplicatesRemoved = tt.wantDedup.DuplicatesRemoved
			want.Requests = dedupDetails.Requests
			if dedupRow.Stage != entity.AiLintStageDeduplication || dedupRow.ErrorClass != tt.wantDedupClass || dedupRow.Requests != 1 ||
				len(dedupDetails.Requests) != 1 || !reflect.DeepEqual(dedupDetails, want) {
				t.Fatalf("expected deduplication details %+v, got %+v", want, dedupDetails)
			}
		})
	}
}
