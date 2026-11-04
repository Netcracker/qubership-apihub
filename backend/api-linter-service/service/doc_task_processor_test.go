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
	"sync/atomic"
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

// noOperationsApihubClient serves a document that has no operations.
type noOperationsApihubClient struct {
	fakeApihubClient
}

func (noOperationsApihubClient) GetDocumentDetails(context.Context, string, string, string) (*view.PublishedDocument, error) {
	return &view.PublishedDocument{}, nil
}

// blockingApihubClient returns the data of blockedOperationId only after the context is cancelled, so the lint
// request of that operation is never dispatched.
type blockingApihubClient struct {
	fakeApihubClient
	blockedOperationId string
}

func (b blockingApihubClient) GetOperationWithData(ctx context.Context, packageId, version string, apiType view.OpApiType, operationId string) (*view.Operation, error) {
	if operationId == b.blockedOperationId {
		<-ctx.Done()
	}
	return b.fakeApihubClient.GetOperationWithData(ctx, packageId, version, apiType, operationId)
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
func lintByOperation(_ context.Context, docStr string) ([]view.AiValidationIssue, error) {
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
		aiOasExecutor:       &aiOasExecutor{llmClient: llm, lintConfig: testLintConfig, issueDeduplicator: newTestIssueDeduplicator(llm, largeTestBudget)},
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
func lintInOrder(completionOrder []int, observed *[]int) func(context.Context, string) ([]view.AiValidationIssue, error) {
	completed := make([]chan struct{}, testOperationCount)
	for i := range completed {
		completed[i] = make(chan struct{})
	}
	var mu sync.Mutex
	return func(ctx context.Context, docStr string) ([]view.AiValidationIssue, error) {
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
		issues, err := lintByOperation(ctx, docStr)
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
	lintDistinctResolvedPaths := func(_ context.Context, docStr string) ([]view.AiValidationIssue, error) {
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
	statsRepo := &fakeAiLintStatsRepository{}
	d := newTestProcessor(llm, fakeApihubClient{}, nil, statsRepo)

	issues, _, err := d.lintDocumentWithAi(context.Background(), testTask, testOperations(), view.AiRuleset{Prompt: "p"})
	if err != nil {
		t.Fatal(err)
	}

	if calls := len(llm.recordedRequests()); calls != 0 {
		t.Fatalf("expected no deduplication requests, got %d", calls)
	}
	if len(statsRepo.rows) != 2 {
		t.Fatalf("expected lint and deduplication stats rows, got %+v", statsRepo.rows)
	}
	dedupRow := statsRepo.rows[1]
	var dedupDetails entity.AiDeduplicationStageDetails
	if err := json.Unmarshal(dedupRow.Details, &dedupDetails); err != nil {
		t.Fatal(err)
	}
	wantDedupDetails := entity.AiDeduplicationStageDetails{
		IssuesIn: 2 * testOperationCount, Groups: 2 * testOperationCount, Requests: []entity.AiDeduplicationRequestStats{},
	}
	if dedupRow.Stage != entity.AiLintStageDeduplication || dedupRow.Requests != 0 || dedupRow.Status != entity.AiRequestStatusSuccess ||
		!reflect.DeepEqual(dedupDetails, wantDedupDetails) {
		t.Fatalf("expected a request-free deduplication row with details %+v, got %+v with details %s", wantDedupDetails, dedupRow, dedupRow.Details)
	}
	var want []view.ValidationIssue
	for i := range testOperationCount {
		modelIssues, err := lintDistinctResolvedPaths(context.Background(), fmt.Sprintf(`{"paths":{"/%s":{}}}`, testOperationId(i)))
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
	lintByOperationDedup := func(duplicatesRemoved int) *entity.AiDeduplicationStageDetails {
		return &entity.AiDeduplicationStageDetails{IssuesIn: 1 + 2*testOperationCount, Groups: 1 + testOperationCount,
			MultiIssueGroups: testOperationCount, DuplicatesRemoved: duplicatesRemoved}
	}
	lastOperationId := testOperationId(testOperationCount - 1)
	failLastOperation := lintInOrder([]int{0, 1, 2, 3}, &[]int{})

	// The first two operations are dispatched and wait for the cancellation, the third is cancelled before dispatch,
	// and the last one fails once the first two are dispatched.
	var siblingsDispatched sync.WaitGroup
	siblingsDispatched.Add(2)
	lintCancelledSiblings := func(ctx context.Context, docStr string) ([]view.AiValidationIssue, error) {
		if strings.Contains(docStr, lastOperationId) {
			siblingsDispatched.Wait()
			return nil, aiError(exception.AiRequestRefused)
		}
		siblingsDispatched.Done()
		<-ctx.Done()
		// Like the real client, return the context error with the cancellation cause.
		return nil, fmt.Errorf("%w: %v", ctx.Err(), context.Cause(ctx))
	}

	var retriedOperationFailures atomic.Int32
	const (
		modelOutputKey = "sk-abcdefghij0123456789"
		// storedErrorTextLimit is the length limit of client.SanitiseErrorText.
		storedErrorTextLimit = 1000
	)
	var errRefusedWithKey error = &exception.CustomError{Code: exception.AiRequestRefused, Message: exception.AiRequestRefusedMsg,
		Params: map[string]interface{}{"reason": "I cannot use the key " + modelOutputKey}}
	errLongMalformedOutput := fmt.Errorf("%w (content prefix=%q)", errMalformedOutput, strings.Repeat("loop ", storedErrorTextLimit))
	failLastOperationAfterOthers := func(err error) func(context.Context, string) ([]view.AiValidationIssue, error) {
		var others sync.WaitGroup
		others.Add(testOperationCount - 1)
		return func(ctx context.Context, docStr string) ([]view.AiValidationIssue, error) {
			if strings.Contains(docStr, lastOperationId) {
				others.Wait()
				return nil, err
			}
			defer others.Done()
			return lintByOperation(ctx, docStr)
		}
	}

	tests := []struct {
		name              string
		apihub            client.ApihubClient
		lint              func(context.Context, string) ([]view.AiValidationIssue, error)
		dedup             func(int, view.AiDeduplicationRequest) ([]view.AiDuplicatePair, error)
		statsErr          error
		wantStatus        view.LintedDocumentStatus
		wantLintRequests  int
		wantOperationIds  []string
		wantEntryClasses  []entity.AiRequestErrorClass
		wantLintClass     entity.AiRequestErrorClass
		wantLintMessage   string
		wantDedupClass    entity.AiRequestErrorClass
		wantDedupRequests int
		wantDedup         *entity.AiDeduplicationStageDetails
		// redactedKey must be replaced by *** in every stored error text, and wantCut means that the error texts of
		// the failed stage and its failed requests are cut.
		redactedKey string
		wantCut     bool
	}{
		{
			name:              "success",
			wantStatus:        view.StatusSuccess,
			wantLintRequests:  testOperationCount,
			wantDedupRequests: 1,
			wantDedup:         lintByOperationDedup(testOperationCount),
		},
		{
			name: "retried operation records every attempt",
			lint: func(ctx context.Context, docStr string) ([]view.AiValidationIssue, error) {
				if strings.Contains(docStr, `"/`+testOperationId(1)+`"`) && retriedOperationFailures.Add(1) == 1 {
					return nil, errOutputLength
				}
				return lintByOperation(ctx, docStr)
			},
			wantStatus:        view.StatusSuccess,
			wantLintRequests:  testOperationCount + 1,
			wantOperationIds:  []string{testOperationId(0), testOperationId(1), testOperationId(1), testOperationId(2), testOperationId(3)},
			wantEntryClasses:  []entity.AiRequestErrorClass{"", entity.AiRequestErrorClassOutputLength, "", "", ""},
			wantDedupRequests: 1,
			wantDedup:         lintByOperationDedup(testOperationCount),
		},
		{
			name: "deduplication failure keeps the failed request",
			dedup: func(int, view.AiDeduplicationRequest) ([]view.AiDuplicatePair, error) {
				return nil, aiError(exception.AiRequestRefused)
			},
			wantStatus:        view.StatusError,
			wantLintRequests:  testOperationCount,
			wantDedupClass:    entity.AiRequestErrorClassRefusal,
			wantDedupRequests: 1,
			wantDedup:         lintByOperationDedup(0),
		},
		{
			name: "one failed operation keeps the completed reports and publishes no result",
			lint: func(ctx context.Context, docStr string) ([]view.AiValidationIssue, error) {
				issues, err := failLastOperation(ctx, docStr)
				if strings.Contains(docStr, lastOperationId) {
					return nil, aiError(exception.AiRequestRefused)
				}
				return issues, err
			},
			wantStatus:       view.StatusError,
			wantLintRequests: testOperationCount,
			wantEntryClasses: []entity.AiRequestErrorClass{"", "", "", entity.AiRequestErrorClassRefusal},
			wantLintClass:    entity.AiRequestErrorClassRefusal,
			wantLintMessage:  "AI lint of operation " + lastOperationId,
		},
		{
			name:             "refused operation stores a redacted error text",
			lint:             failLastOperationAfterOthers(errRefusedWithKey),
			wantStatus:       view.StatusError,
			wantLintRequests: testOperationCount,
			wantEntryClasses: []entity.AiRequestErrorClass{"", "", "", entity.AiRequestErrorClassRefusal},
			wantLintClass:    entity.AiRequestErrorClassRefusal,
			wantLintMessage:  "AI lint of operation " + lastOperationId,
			redactedKey:      modelOutputKey,
		},
		{
			name:             "long malformed output is stored cut",
			lint:             failLastOperationAfterOthers(errLongMalformedOutput),
			wantStatus:       view.StatusError,
			wantLintRequests: testOperationCount + testLintConfig.MaxRetriesOnInvalidOutput,
			wantOperationIds: []string{testOperationId(0), testOperationId(1), testOperationId(2), lastOperationId, lastOperationId, lastOperationId},
			wantEntryClasses: []entity.AiRequestErrorClass{"", "", "", entity.AiRequestErrorClassValidation, entity.AiRequestErrorClassValidation, entity.AiRequestErrorClassValidation},
			wantLintClass:    entity.AiRequestErrorClassValidation,
			wantLintMessage:  "AI lint of operation " + lastOperationId + " still fails after 2 retries",
			wantCut:          true,
		},
		{
			name: "refused deduplication stores a redacted error text",
			dedup: func(int, view.AiDeduplicationRequest) ([]view.AiDuplicatePair, error) {
				return nil, errRefusedWithKey
			},
			wantStatus:        view.StatusError,
			wantLintRequests:  testOperationCount,
			wantDedupClass:    entity.AiRequestErrorClassRefusal,
			wantDedupRequests: 1,
			wantDedup:         lintByOperationDedup(0),
			redactedKey:       modelOutputKey,
		},
		{
			name:             "cancelled siblings are classified as cancelled and an undispatched request is not counted",
			apihub:           blockingApihubClient{blockedOperationId: testOperationId(2)},
			lint:             lintCancelledSiblings,
			wantStatus:       view.StatusError,
			wantLintRequests: 3,
			wantOperationIds: []string{testOperationId(0), testOperationId(1), lastOperationId},
			wantEntryClasses: []entity.AiRequestErrorClass{entity.AiRequestErrorClassCancelled, entity.AiRequestErrorClassCancelled, entity.AiRequestErrorClassRefusal},
			wantLintClass:    entity.AiRequestErrorClassRefusal,
			wantLintMessage:  "AI lint of operation " + lastOperationId,
		},
		{
			name:              "failed stats insert does not change the status",
			statsErr:          errors.New("database is unavailable"),
			wantStatus:        view.StatusSuccess,
			wantLintRequests:  testOperationCount,
			wantDedupRequests: 1,
			wantDedup:         lintByOperationDedup(testOperationCount),
		},
		{
			name: "no issues records a deduplication stage without requests",
			lint: func(context.Context, string) ([]view.AiValidationIssue, error) {
				return []view.AiValidationIssue{}, nil
			},
			wantStatus:       view.StatusSuccess,
			wantLintRequests: testOperationCount,
			wantDedup:        &entity.AiDeduplicationStageDetails{},
		},
		{
			name:       "zero operations records both stages without requests",
			apihub:     noOperationsApihubClient{},
			wantStatus: view.StatusSuccess,
			wantDedup:  &entity.AiDeduplicationStageDetails{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			lint := tt.lint
			if lint == nil {
				lint = lintByOperation
			}
			apihub := tt.apihub
			if apihub == nil {
				apihub = fakeApihubClient{}
			}
			llm := &fakeLlmClient{lint: lint, dedup: tt.dedup}
			docResults := &fakeDocResultRepository{}
			statsRepo := &fakeAiLintStatsRepository{err: tt.statsErr}

			newTestProcessor(llm, apihub, docResults, statsRepo).processDocTask(context.Background(), testTask)

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
			if lintRow.Stage != entity.AiLintStageLint || lintRow.Model != testModelName || lintRow.Requests != tt.wantLintRequests ||
				lintRow.Status != wantLintStatus || lintRow.ErrorClass != tt.wantLintClass ||
				lintDetails.Operations == nil || len(lintDetails.Operations) != tt.wantLintRequests {
				t.Fatalf("unexpected lint row %+v with details %s", lintRow, lintRow.Details)
			}
			if lintRow.PromptTokens != tt.wantLintRequests*testLintUsage.PromptTokens || lintRow.CompletionTokens != tt.wantLintRequests*testLintUsage.CompletionTokens {
				t.Fatalf("expected the tokens of %d requests, got %+v", tt.wantLintRequests, lintRow)
			}
			if (tt.wantLintMessage == "") != (lintRow.ErrorMessage == "") || !strings.Contains(lintRow.ErrorMessage, tt.wantLintMessage) {
				t.Fatalf("expected a lint error message with %q, got %q", tt.wantLintMessage, lintRow.ErrorMessage)
			}

			wantOperationIds := tt.wantOperationIds
			if wantOperationIds == nil {
				for i := range tt.wantLintRequests {
					wantOperationIds = append(wantOperationIds, testOperationId(i))
				}
			}
			// failedTexts are the stored error texts of a failed stage and of its failed requests that were not cancelled.
			var failedTexts []string
			checkFailedTexts := func() {
				if (tt.redactedKey != "" || tt.wantCut) && len(failedTexts) == 0 {
					t.Fatal("expected stored error texts to check")
				}
				for _, text := range failedTexts {
					if len(text) > storedErrorTextLimit+len("...") || (tt.redactedKey != "" && (strings.Contains(text, tt.redactedKey) || !strings.Contains(text, "***"))) ||
						tt.wantCut != strings.HasSuffix(text, "...") {
						t.Fatalf("expected a stored error text that is bounded, redacted (%t) and cut (%t), got %d bytes: %q", tt.redactedKey != "", tt.wantCut, len(text), text)
					}
				}
			}
			if lintRow.Status == entity.AiRequestStatusError {
				failedTexts = append(failedTexts, lintRow.ErrorMessage)
			}
			var operationIds []string
			var entryClasses []entity.AiRequestErrorClass
			for i, operation := range lintDetails.Operations {
				operationIds = append(operationIds, operation.OperationId)
				entryClasses = append(entryClasses, operation.ErrorClass)
				if operation.Status == entity.AiRequestStatusError && operation.ErrorClass != entity.AiRequestErrorClassCancelled {
					failedTexts = append(failedTexts, operation.ErrorMessage)
				}
				wantAttempt := 1
				if i > 0 && lintDetails.Operations[i-1].OperationId == operation.OperationId {
					wantAttempt = lintDetails.Operations[i-1].Attempt + 1
				}
				if operation.Attempt != wantAttempt || (operation.Status == entity.AiRequestStatusError && operation.Issues != 0) {
					t.Fatalf("expected attempt %d and no issues for a failed attempt, got %+v at %d", wantAttempt, operation, i)
				}
			}
			if !slices.Equal(operationIds, wantOperationIds) {
				t.Fatalf("expected operations %v, got %v", wantOperationIds, operationIds)
			}
			if tt.wantEntryClasses != nil && !slices.Equal(entryClasses, tt.wantEntryClasses) {
				t.Fatalf("expected request error classes %q, got %q", tt.wantEntryClasses, entryClasses)
			}
			if tt.wantDedup == nil {
				checkFailedTexts()
				return
			}

			dedupRow := statsRepo.rows[1]
			var dedupDetails entity.AiDeduplicationStageDetails
			if err := json.Unmarshal(dedupRow.Details, &dedupDetails); err != nil {
				t.Fatal(err)
			}
			want := *tt.wantDedup
			want.Requests = dedupDetails.Requests
			if dedupRow.Stage != entity.AiLintStageDeduplication || dedupRow.Model != testModelName || dedupRow.ErrorClass != tt.wantDedupClass ||
				dedupRow.Requests != tt.wantDedupRequests || dedupDetails.Requests == nil || len(dedupDetails.Requests) != tt.wantDedupRequests ||
				!reflect.DeepEqual(dedupDetails, want) {
				t.Fatalf("expected deduplication details %+v, got %+v", want, dedupDetails)
			}
			if dedupRow.Status == entity.AiRequestStatusError {
				failedTexts = append(failedTexts, dedupRow.ErrorMessage)
			}
			for _, request := range dedupDetails.Requests {
				if request.Status == entity.AiRequestStatusError {
					failedTexts = append(failedTexts, request.ErrorMessage)
				}
			}
			checkFailedTexts()
			if tt.wantDedupRequests == 0 && (dedupRow.Status != entity.AiRequestStatusSuccess || dedupRow.PromptTokens != 0 || dedupRow.CompletionTokens != 0) {
				t.Fatalf("expected a successful request-free deduplication row, got %+v", dedupRow)
			}
		})
	}
}
