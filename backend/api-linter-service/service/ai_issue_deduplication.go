package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
	"sync"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/client"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/config"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/entity"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/exception"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/view"
	log "github.com/sirupsen/logrus"
	"golang.org/x/sync/errgroup"
)

const (
	// The token estimate needs no tokenizer and errs on the high side: JSON with English text averages more
	// than three bytes per token, and the safety factor covers denser input.
	bytesPerToken             = 3
	tokenEstimateSafetyFactor = 1.2

	// maxRepacks limits the reductions after length errors and invalid responses in one lineage of requests.
	maxRepacks = 3

	// emptyRequestBytes is the size of a serialised view.AiDeduplicationRequest without groups.
	emptyRequestBytes = len(`{"groups":[]}`)
)

// issueDeduplicationInstructions is the code-owned part of the deduplication system prompt. The configured
// criterion that decides whether two issues describe the same problem is appended to it.
const issueDeduplicationInstructions = `You find duplicate issues reported by an OpenAPI linter.

The input is a JSON object with a "groups" array. Each group has a "path" and two lists of issues, "known" and "new". Every issue has a unique integer "id", a "code", a "severity" and a "message".

Rules:
1. Compare issues only within one group. Issues from different groups are never duplicates.
2. Issues in "known" are already confirmed to be distinct problems. Never report a "known" issue as a duplicate.
3. Go through the "new" issues of a group in ascending id. Compare each one with every "known" issue of its group and with every earlier "new" issue of its group that you have not reported as a duplicate.
4. When several issues describe the same problem, keep the first one: the "known" issue if there is one, otherwise the "new" issue with the smallest id. Report every other issue of that problem as a duplicate of the kept issue.
5. Report each duplicate exactly once as {"duplicateId": <id of the duplicate>, "keptId": <id of the kept issue>}. "duplicateId" must come from "new" and must not appear twice in your answer. "keptId" must come from the same group and must never appear as a "duplicateId" anywhere in your answer.
6. Return {"duplicates": []} when there are no duplicates.

Example: issues 40, 52 and 162 of one group describe the same problem, and 40 is the earliest. Correct: {"duplicates": [{"duplicateId": 52, "keptId": 40}, {"duplicateId": 162, "keptId": 40}]}. Wrong: {"duplicates": [{"duplicateId": 162, "keptId": 52}]}, because 52 is itself a duplicate and cannot be the kept issue.

Two issues describe the same problem according to the following criterion.`

func estimateTokens(bytes int) int {
	return int(math.Ceil(math.Ceil(float64(bytes)/bytesPerToken) * tokenEstimateSafetyFactor))
}

// issueWithResolvedPath is an AI linter issue with the path it resolves to in the operation data: its own path when
// that exists, otherwise the parent path.
type issueWithResolvedPath struct {
	Issue        view.ValidationIssue
	ResolvedPath []string
}

// numberedIssue is an issue that survived exact pre-deduplication. Id is its position in the document's issue
// list; later stages refer to the issue only by this id.
type numberedIssue struct {
	Id int
	issueWithResolvedPath
}

type issueGroup struct {
	ResolvedPath []string
	Issues       []numberedIssue
}

// numberUniqueIssues drops exact repeats, keeping the first occurrence, and numbers the remaining issues in order.
func numberUniqueIssues(issues []issueWithResolvedPath) ([]numberedIssue, error) {
	seen := make(map[string]struct{}, len(issues))
	unique := make([]numberedIssue, 0, len(issues))
	for _, issue := range issues {
		key, err := json.Marshal(issue.Issue)
		if err != nil {
			return nil, fmt.Errorf("failed to build pre-deduplication key: %w", err)
		}
		if _, exists := seen[string(key)]; exists {
			continue
		}
		seen[string(key)] = struct{}{}
		unique = append(unique, numberedIssue{Id: len(unique), issueWithResolvedPath: issue})
	}
	return unique, nil
}

// groupIssuesByResolvedPath groups issues by their exact resolved path. Groups are ordered by their first issue.
func groupIssuesByResolvedPath(issues []numberedIssue) ([]issueGroup, error) {
	groupIndex := make(map[string]int)
	var groups []issueGroup
	for _, issue := range issues {
		key, err := json.Marshal(issue.ResolvedPath)
		if err != nil {
			return nil, fmt.Errorf("failed to build issue group key: %w", err)
		}
		i, exists := groupIndex[string(key)]
		if !exists {
			i = len(groups)
			groupIndex[string(key)] = i
			groups = append(groups, issueGroup{ResolvedPath: issue.ResolvedPath})
		}
		groups[i].Issues = append(groups[i].Issues, issue)
	}
	return groups, nil
}

// withoutDuplicates rebuilds the issue list from the original issue objects in id order.
func withoutDuplicates(issues []numberedIssue, duplicates map[int]int) []view.ValidationIssue {
	var result []view.ValidationIssue
	for _, issue := range issues {
		if _, duplicate := duplicates[issue.Id]; !duplicate {
			result = append(result, issue.Issue)
		}
	}
	return result
}

// aiIssueDeduplicator finds duplicate AI linter issues within one document. Issues are compared only inside a group
// with the same resolved path; the comparison itself is delegated to the LLM, with groups packed into requests under
// the configured token budget.
type aiIssueDeduplicator struct {
	llmClient           client.LLMClient
	systemPrompt        string
	requestTokenBudget  int
	maxCompletionTokens int
}

func newAiIssueDeduplicator(llmClient client.LLMClient, cfg config.AIDeduplicationConfig) *aiIssueDeduplicator {
	return &aiIssueDeduplicator{
		llmClient:           llmClient,
		systemPrompt:        issueDeduplicationInstructions + "\n\n" + cfg.CriteriaPrompt,
		requestTokenBudget:  cfg.RequestTokenBudget,
		maxCompletionTokens: cfg.MaxCompletionTokens,
	}
}

func (d *aiIssueDeduplicator) findDuplicates(ctx context.Context, groups []issueGroup) (map[int]int, []entity.AiDeduplicationRequestStats, error) {
	prepared := make([]preparedGroup, 0, len(groups))
	for _, group := range groups {
		p, err := prepareGroup(group)
		if err != nil {
			return nil, nil, err
		}
		prepared = append(prepared, p)
	}

	run := &issueDeduplicationRun{aiIssueDeduplicator: d, duplicates: make(map[int]int)}
	g, gCtx := errgroup.WithContext(ctx)
	for _, request := range d.plan(prepared, d.requestTokenBudget) {
		g.Go(func() error {
			return run.execute(gCtx, request, d.requestTokenBudget, 0)
		})
	}
	if err := g.Wait(); err != nil {
		return nil, run.stats, err
	}
	return run.duplicates, run.stats, nil
}

type preparedGroup struct {
	path   []string
	issues []view.AiDeduplicationIssue
	// sizes are the serialised sizes of issues, emptySize the size of the group with empty "known" and "new".
	sizes     []int
	emptySize int
}

func prepareGroup(group issueGroup) (preparedGroup, error) {
	empty, err := json.Marshal(view.AiDeduplicationGroup{Path: group.ResolvedPath, Known: []view.AiDeduplicationIssue{}, New: []view.AiDeduplicationIssue{}})
	if err != nil {
		return preparedGroup{}, fmt.Errorf("failed to serialise deduplication group: %w", err)
	}
	p := preparedGroup{path: group.ResolvedPath, emptySize: len(empty)}
	for _, issue := range group.Issues {
		wire := view.AiDeduplicationIssue{Id: issue.Id, Code: issue.Issue.Code, Severity: issue.Issue.Severity, Message: issue.Issue.Message}
		serialised, err := json.Marshal(wire)
		if err != nil {
			return preparedGroup{}, fmt.Errorf("failed to serialise issue %d for deduplication: %w", issue.Id, err)
		}
		p.issues = append(p.issues, wire)
		p.sizes = append(p.sizes, len(serialised))
	}
	return p, nil
}

// fittingCount returns how many leading elements of a JSON array with the given sizes can be added to a request of
// requestBytes without exceeding budget.
func (d *aiIssueDeduplicator) fittingCount(requestBytes int, sizes []int, budget int) int {
	for n, size := range sizes {
		requestBytes += size + min(n, 1) // a comma precedes every element but the first
		if estimateTokens(len(d.systemPrompt)+requestBytes) > budget {
			return n
		}
	}
	return len(sizes)
}

// plannedRequest is either whole groups packed into one request or one group too large for a request, which is streamed.
type plannedRequest struct {
	groups   []preparedGroup
	streamed bool
}

func (d *aiIssueDeduplicator) plan(groups []preparedGroup, budget int) []plannedRequest {
	sizes := make([]int, 0, len(groups))
	for _, group := range groups {
		size := group.emptySize + len(group.sizes) - 1 // commas between issues
		for _, issueSize := range group.sizes {
			size += issueSize
		}
		sizes = append(sizes, size)
	}
	var requests []plannedRequest
	for len(groups) > 0 {
		count := d.fittingCount(emptyRequestBytes, sizes, budget)
		if count == 0 {
			requests = append(requests, plannedRequest{groups: groups[:1], streamed: true})
			count = 1
		} else {
			requests = append(requests, plannedRequest{groups: groups[:count]})
		}
		groups, sizes = groups[count:], sizes[count:]
	}
	return requests
}

// aiErrorCode returns the exception code of an AI client error, or an empty string for any other error.
func aiErrorCode(err error) string {
	var customError *exception.CustomError
	if errors.As(err, &customError) {
		return customError.Code
	}
	return ""
}

func isContextLengthError(err error) bool {
	return aiErrorCode(err) == exception.AiContextLengthExceeded
}

// isReducibleError reports an error after which the request is sent again reduced. The model breaks the response
// contract more often on large requests, so a malformed or invalid response is reduced like an output length error.
func isReducibleError(err error) bool {
	switch aiErrorCode(err) {
	case exception.AiContextLengthExceeded, exception.AiOutputLengthExceeded, exception.AiMalformedOutput, exception.AiInvalidDeduplicationResponse:
		return true
	default:
		return false
	}
}

const repacksExhaustedFormat = "deduplication request still fails after %d repacks: %w"

type issueDeduplicationRun struct {
	*aiIssueDeduplicator

	mu         sync.Mutex
	duplicates map[int]int
	stats      []entity.AiDeduplicationRequestStats
}

func (r *issueDeduplicationRun) execute(ctx context.Context, request plannedRequest, budget int, repacks int) error {
	if request.streamed {
		group := request.groups[0]
		return r.stream(ctx, group, budget, len(group.issues), repacks)
	}
	return r.sendGroups(ctx, request.groups, budget, repacks)
}

// sendGroups sends whole groups in one request. After a context length error the groups are planned again with
// half the estimated size of the failed request; after an output length error or an invalid response they are sent
// as two requests with half the groups each, and a single group is streamed with half its issues per request.
func (r *issueDeduplicationRun) sendGroups(ctx context.Context, groups []preparedGroup, budget int, repacks int) error {
	request := view.AiDeduplicationRequest{Groups: make([]view.AiDeduplicationGroup, 0, len(groups))}
	for _, group := range groups {
		request.Groups = append(request.Groups, view.AiDeduplicationGroup{Path: group.path, Known: []view.AiDeduplicationIssue{}, New: group.issues})
	}
	_, estimatedTokens, err := r.send(ctx, request)
	if err == nil {
		return nil
	}
	if !isReducibleError(err) {
		return err
	}
	if repacks == maxRepacks {
		return fmt.Errorf(repacksExhaustedFormat, maxRepacks, err)
	}

	if isContextLengthError(err) {
		for _, smaller := range r.plan(groups, estimatedTokens/2) {
			if err := r.execute(ctx, smaller, estimatedTokens/2, repacks+1); err != nil {
				return err
			}
		}
		return nil
	}
	if len(groups) == 1 {
		return r.stream(ctx, groups[0], budget, len(groups[0].issues)/2, repacks+1)
	}
	half := len(groups) / 2
	if err := r.sendGroups(ctx, groups[:half], budget, repacks+1); err != nil {
		return err
	}
	return r.sendGroups(ctx, groups[half:], budget, repacks+1)
}

// stream deduplicates a group that does not fit into one request. Each request carries the issues found unique so
// far as "known" and as many next issues as fit into budget and newLimit. A length error or an invalid response
// reduces budget or newLimit for the rest of the stream and resends the same chunk; "known" is carried unchanged, so
// the validation rules hold.
func (r *issueDeduplicationRun) stream(ctx context.Context, group preparedGroup, budget int, newLimit int, repacks int) error {
	known := []view.AiDeduplicationIssue{}
	knownBytes := 0
	var lengthErr error
	for next := 0; next < len(group.issues); {
		count := min(r.fittingCount(emptyRequestBytes+group.emptySize+knownBytes, group.sizes[next:], budget), newLimit)
		if count == 0 {
			err := fmt.Errorf("deduplication request of %d known issues and one new issue at path %v does not fit into %d tokens", len(known), group.path, budget)
			if lengthErr != nil {
				err = fmt.Errorf("%w: %w", err, lengthErr)
			}
			return err
		}

		request := view.AiDeduplicationRequest{Groups: []view.AiDeduplicationGroup{{Path: group.path, Known: known, New: group.issues[next : next+count]}}}
		pairs, estimatedTokens, err := r.send(ctx, request)
		if err != nil && !isReducibleError(err) {
			return err
		}
		if err != nil {
			if repacks == maxRepacks {
				return fmt.Errorf(repacksExhaustedFormat, maxRepacks, err)
			}
			repacks++
			if isContextLengthError(err) {
				lengthErr = err
				budget = estimatedTokens / 2
			} else if count == 1 {
				return fmt.Errorf("deduplication request of %d known issues and one new issue at path %v still fails: %w", len(known), group.path, err)
			} else {
				newLimit = count / 2
			}
			continue
		}

		duplicateIds := make(map[int]struct{}, len(pairs))
		for _, pair := range pairs {
			duplicateIds[pair.DuplicateId] = struct{}{}
		}
		for position := next; position < next+count; position++ {
			if _, duplicate := duplicateIds[group.issues[position].Id]; !duplicate {
				knownBytes += group.sizes[position] + min(len(known), 1)
				known = append(known, group.issues[position])
			}
		}
		next += count
	}
	return nil
}

// send makes one deduplication request and returns the validated and normalised pairs.
func (r *issueDeduplicationRun) send(ctx context.Context, request view.AiDeduplicationRequest) ([]view.AiDuplicatePair, int, error) {
	serialised, err := json.Marshal(request)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to marshal deduplication request: %w", err)
	}
	estimatedTokens := estimateTokens(len(r.systemPrompt) + len(serialised))
	pairs, report, err := r.llmClient.DeduplicateIssues(ctx, r.systemPrompt, request, r.maxCompletionTokens)
	if err == nil {
		pairs, err = validateDuplicates(request, pairs)
	}
	if err != nil {
		pairs = nil
	}
	r.record(request, pairs, estimatedTokens, report, err)
	return pairs, estimatedTokens, err
}

func (r *issueDeduplicationRun) record(request view.AiDeduplicationRequest, pairs []view.AiDuplicatePair, estimatedTokens int, report client.RequestReport, err error) {
	stats := entity.AiDeduplicationRequestStats{
		Groups:           len(request.Groups),
		Duplicates:       len(pairs),
		AiRequestMetrics: newAiRequestMetrics(report, estimatedTokens, err),
	}
	for _, group := range request.Groups {
		stats.NewIssues += len(group.New)
		stats.KnownIssues += len(group.Known)
	}
	log.Debugf("AI deduplication request: %d groups, %d new and %d known issues, estimated prompt tokens %d, %d duplicates, error: %v",
		stats.Groups, stats.NewIssues, stats.KnownIssues, estimatedTokens, stats.Duplicates, err)

	r.mu.Lock()
	defer r.mu.Unlock()
	for _, pair := range pairs {
		r.duplicates[pair.DuplicateId] = pair.KeptId
	}
	if report.ProviderAttempts > 0 {
		r.stats = append(r.stats, stats)
	}
}

func invalidDeduplicationResponse(reason string) error {
	return &exception.CustomError{Status: http.StatusBadGateway, Code: exception.AiInvalidDeduplicationResponse,
		Message: exception.AiInvalidDeduplicationResponseMsg, Params: map[string]interface{}{"reason": reason}}
}

// validateDuplicates rejects the whole response if a pair can corrupt the result, and otherwise returns one pair per
// distinct duplicateId with keptId resolved to the kept issue, ignoring repeated ids and pairs of an issue with itself.
func validateDuplicates(request view.AiDeduplicationRequest, pairs []view.AiDuplicatePair) ([]view.AiDuplicatePair, error) {
	if pairs == nil {
		return nil, invalidDeduplicationResponse("the 'duplicates' field is missing or null")
	}

	type issueRef struct {
		group int
		known bool
	}
	refs := make(map[int]issueRef)
	for i, group := range request.Groups {
		for _, issue := range group.Known {
			refs[issue.Id] = issueRef{group: i, known: true}
		}
		for _, issue := range group.New {
			refs[issue.Id] = issueRef{group: i}
		}
	}

	keptOf := make(map[int]int, len(pairs))
	normalised := make([]view.AiDuplicatePair, 0, len(pairs))
	repeated, selfReferences := 0, 0
	for _, pair := range pairs {
		duplicate, ok := refs[pair.DuplicateId]
		if !ok {
			return nil, invalidDeduplicationResponse(fmt.Sprintf("duplicateId %d is not part of the request", pair.DuplicateId))
		}
		if duplicate.known {
			return nil, invalidDeduplicationResponse(fmt.Sprintf("duplicateId %d is a known issue", pair.DuplicateId))
		}
		kept, ok := refs[pair.KeptId]
		if !ok {
			return nil, invalidDeduplicationResponse(fmt.Sprintf("keptId %d of duplicateId %d is not part of the request", pair.KeptId, pair.DuplicateId))
		}
		if kept.group != duplicate.group {
			return nil, invalidDeduplicationResponse(fmt.Sprintf("duplicateId %d and keptId %d belong to different groups", pair.DuplicateId, pair.KeptId))
		}
		if !kept.known && pair.KeptId > pair.DuplicateId {
			return nil, invalidDeduplicationResponse(fmt.Sprintf("duplicateId %d is reported as a duplicate of the later issue %d", pair.DuplicateId, pair.KeptId))
		}
		if pair.KeptId == pair.DuplicateId {
			selfReferences++
			continue
		}
		if _, exists := keptOf[pair.DuplicateId]; exists {
			repeated++
			continue
		}
		keptOf[pair.DuplicateId] = pair.KeptId
		normalised = append(normalised, pair)
	}

	// keptId is always earlier than duplicateId, so following it ends at an issue that is not a duplicate.
	chains := 0
	for i, pair := range normalised {
		for of, chained := keptOf[pair.KeptId]; chained; of, chained = keptOf[of] {
			normalised[i].KeptId = of
		}
		if normalised[i].KeptId != pair.KeptId {
			chains++
		}
	}
	if repeated+selfReferences+chains > 0 {
		log.Debugf("AI deduplication response normalised: %d repeated ids, %d issues reported as duplicates of themselves, %d chains resolved",
			repeated, selfReferences, chains)
	}
	return normalised, nil
}
