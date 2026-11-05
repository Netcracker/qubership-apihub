package service

import (
	"context"
	"errors"
	"fmt"
	"reflect"
	"slices"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/entity"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/repository"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/view"
)

const (
	testPackageId       = "QS.PKG"
	testVersion         = "2.0"
	testRevision        = 1
	testLintTaskId      = "lint-1"
	testSpectralRuleset = "ruleset-spectral"
	testAiRuleset       = "ruleset-ai"

	testExecutorId      = "executor-1"
	testOtherExecutorId = "executor-2"
	testScoringTaskId   = "scoring-1"
	testPreviousVersion = "1.0@1"

	testOtherScoringTaskId = "scoring-other"
	testOtherLintTaskId    = "lint-other"
	testOtherRevision      = testRevision + 1
	testQualityPanic       = "unexpected document task"

	testSupersedingTaskId = "scoring-2"
	testSupersededDetails = "superseded by scoring task " + testSupersedingTaskId

	testWaitTimeout               = 5 * time.Second
	testPollInterval              = time.Millisecond
	testSettleDelay               = 20 * time.Millisecond
	testRestartCountRetryInterval = time.Millisecond
)

var testVersionWithRevision = fmt.Sprintf("%s@%d", testVersion, testRevision)

type processorFixture struct {
	processor *scoringTaskProcessorImpl
	score     *inMemoryScore
	tasks     *scoringTaskRepoStub
	lintTasks *versionLintTaskRepoStub
	docTasks  *docLintTaskRepoStub
	apihub    *apihubClientStub

	lintResults *lintResultRepoStub
	verResults  *versionResultRepoStub
	rulesets    *rulesetRepoStub
	linters     *linterConfigServiceStub
	scoreReads  *scoringRepoStub

	previousVersionErr error
	beforeBwc          func() error
}

func newProcessorFixture() *processorFixture {
	f := &processorFixture{
		score: &inMemoryScore{row: &entity.VersionScore{
			PackageId:                   testPackageId,
			Version:                     testVersion,
			Revision:                    testRevision,
			Status:                      "",
			Reasons:                     []string{},
			Debug:                       []string{},
			ScoringTaskId:               testScoringTaskId,
			ProcessStatus:               view.ScoringProcessInProgress,
			PublicationIntegrityStatus:  view.ScoringProcessPending,
			BackwardCompatibilityStatus: view.ScoringProcessPending,
			QualityCheckStatus:          view.ScoringProcessPending,
		}},
		lintTasks: &versionLintTaskRepoStub{tasks: map[string]*entity.VersionLintTask{
			testLintTaskId: lintTask(view.TaskStatusWaitingForDocs, ""),
		}},
		docTasks:    &docLintTaskRepoStub{},
		lintResults: &lintResultRepoStub{summaries: map[lintResultKey]map[string]interface{}{}},
		verResults:  &versionResultRepoStub{},
		rulesets: &rulesetRepoStub{rulesets: map[string]entity.Ruleset{
			testSpectralRuleset: {Id: testSpectralRuleset, Linter: view.SpectralLinter},
			testAiRuleset:       {Id: testAiRuleset, Linter: view.AiLinter},
		}},
		linters: &linterConfigServiceStub{optional: map[view.Linter]bool{view.AiLinter: true}},
	}
	scores := map[int]*inMemoryScore{testRevision: f.score}
	f.scoreReads = &scoringRepoStub{scores: scores}
	f.tasks = &scoringTaskRepoStub{
		scores: scores,
		tasks: map[string]*entity.VersionScoringTask{
			testScoringTaskId: {
				Id:                testScoringTaskId,
				VersionLintTaskId: testLintTaskId,
				PackageId:         testPackageId,
				Version:           testVersion,
				Revision:          testRevision,
				Status:            view.TaskStatusProcessing,
				ExecutorId:        testExecutorId,
			},
		},
	}
	f.apihub = &apihubClientStub{getVersion: func(packageId, version string) (*view.VersionContent, error) {
		if version == testPreviousVersion {
			if f.previousVersionErr != nil {
				return nil, f.previousVersionErr
			}
			return &view.VersionContent{PackageId: packageId, Version: version}, nil
		}
		if version == testVersionWithRevision && f.beforeBwc != nil {
			if err := f.beforeBwc(); err != nil {
				return nil, err
			}
		}
		return &view.VersionContent{
			PackageId:       packageId,
			Version:         version,
			PreviousVersion: testPreviousVersion,
			OperationTypes:  []view.VersionOperationType{{ApiType: view.RestApiType}},
		}, nil
	}}
	f.processor = &scoringTaskProcessorImpl{
		scoringTaskRepo:           f.tasks,
		scoringRepo:               f.scoreReads,
		verTaskRepo:               f.lintTasks,
		docTaskRepo:               f.docTasks,
		versionResultRepo:         f.verResults,
		lintResultRepo:            f.lintResults,
		rulesetRepo:               f.rulesets,
		linterConfigService:       f.linters,
		apihubClient:              f.apihub,
		executorId:                testExecutorId,
		runningTasks:              make(map[string]bool),
		startRun:                  func(run func()) { run() },
		restartCountRetryInterval: testRestartCountRetryInterval,
	}
	return f
}

func (f *processorFixture) task() entity.VersionScoringTask {
	return f.tasks.task(testScoringTaskId)
}

func (f *processorFixture) addLintedDocument(fileId string, rulesetId string, dataHash string, errorCount, warningCount float64) {
	f.verResults.docs = append(f.verResults.docs, entity.LintedDocument{
		PackageId:  testPackageId,
		Version:    testVersion,
		Revision:   testRevision,
		FileId:     fileId,
		Slug:       fileId,
		RulesetId:  rulesetId,
		DataHash:   dataHash,
		LintStatus: view.StatusSuccess,
	})
	f.lintResults.summaries[lintResultKey{dataHash: dataHash, rulesetId: rulesetId}] = map[string]interface{}{
		"errorCount":   errorCount,
		"warningCount": warningCount,
	}
}

func TestProcessTick_IntegrityIsPersistedBeforeBwcStarts(t *testing.T) {
	f := newProcessorFixture()
	var integrityAtBwcStart []view.ScoringProcessStatus
	f.apihub.getVersionChanges = func(int) (*view.VersionChangesView, error) {
		integrityAtBwcStart = append(integrityAtBwcStart, f.score.get().PublicationIntegrityStatus)
		return &view.VersionChangesView{}, nil
	}

	f.processor.processTick(context.Background())

	if len(integrityAtBwcStart) == 0 {
		t.Fatal("BWC did not request the changes")
	}
	for _, status := range integrityAtBwcStart {
		if status != view.ScoringProcessCompleted {
			t.Fatalf("integrity was %s in the stored row when BWC started, want completed", status)
		}
	}
}

func TestProcessTick_BwcAttemptErrorIsRetriedOnTheNextTick(t *testing.T) {
	f := newProcessorFixture()
	f.previousVersionErr = errors.New("APIHUB unavailable")

	f.processor.processTick(context.Background())

	row := f.score.get()
	if row.BackwardCompatibilityStatus != view.ScoringProcessPending || row.BackwardCompatibilityDetails != nil {
		t.Fatalf("BWC = %s %#v, want pending without a section after an attempt error", row.BackwardCompatibilityStatus, row.BackwardCompatibilityDetails)
	}
	if f.task().RestartCount != 1 {
		t.Fatalf("restart count = %d, want 1", f.task().RestartCount)
	}

	f.previousVersionErr = nil
	f.processor.processTick(context.Background())

	row = f.score.get()
	if row.BackwardCompatibilityStatus != view.ScoringProcessCompleted || row.BackwardCompatibilityDetails == nil {
		t.Fatalf("BWC must be written on the next tick: %#v", row)
	}
}

func TestProcessTick_OperationListErrorIsAnAttemptError(t *testing.T) {
	tests := []struct {
		name       string
		version    string
		failedPage int
		failure    error
	}{
		{name: "current version, first page", version: testVersionWithRevision, failedPage: 0, failure: errors.New("APIHUB unavailable")},
		{name: "current version, later page", version: testVersionWithRevision, failedPage: 1, failure: errors.New("APIHUB unavailable")},
		{name: "previous version, first page", version: testPreviousVersion, failedPage: 0, failure: errors.New("APIHUB unavailable")},
		{name: "previous version, later page", version: testPreviousVersion, failedPage: 1, failure: errors.New("APIHUB unavailable")},
		{name: "current version, first page not found", version: testVersionWithRevision, failedPage: 0},
		{name: "current version, later page not found", version: testVersionWithRevision, failedPage: 1},
		{name: "previous version, first page not found", version: testPreviousVersion, failedPage: 0},
		{name: "previous version, later page not found", version: testPreviousVersion, failedPage: 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newProcessorFixture()
			f.apihub.getOperationsList = func(version string, page int) (*view.CommonOperations, error) {
				if version == tt.version && page == tt.failedPage {
					// A nil failure stands for the client's 404 contract: no response and no error.
					return nil, tt.failure
				}
				if page > 0 {
					return &view.CommonOperations{}, nil
				}
				return &view.CommonOperations{Operations: []view.OperationListView{
					{CommonOperationView: view.CommonOperationView{OperationId: "get-pets", ApiAudience: view.ApiAudienceExternal}},
				}}, nil
			}

			f.processor.processTick(context.Background())

			row := f.score.get()
			if row.BackwardCompatibilityStatus != view.ScoringProcessPending || row.BackwardCompatibilityDetails != nil {
				t.Fatalf("BWC = %s %#v, want no verdict after an operation list error", row.BackwardCompatibilityStatus, row.BackwardCompatibilityDetails)
			}
			if f.task().RestartCount != 1 {
				t.Fatalf("restart count = %d, want 1", f.task().RestartCount)
			}
		})
	}
}

func TestProcessTick_MissingChangesPageIsAnAttemptError(t *testing.T) {
	fullPage := make([]view.OperationComparisonChangelogView, versionChangesPageLimit)
	for i := range fullPage {
		fullPage[i].CurrentOperation = &view.ComparisonOperationView{
			GenericComparisonOperationView: view.GenericComparisonOperationView{OperationId: fmt.Sprintf("op-%d", i)},
		}
	}
	tests := []struct {
		name       string
		failedPage int
	}{
		{name: "first page", failedPage: 0},
		{name: "later page", failedPage: 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newProcessorFixture()
			f.apihub.getVersionChanges = func(page int) (*view.VersionChangesView, error) {
				if page == tt.failedPage {
					return nil, nil
				}
				return &view.VersionChangesView{Operations: fullPage}, nil
			}

			f.processor.processTick(context.Background())

			row := f.score.get()
			if row.BackwardCompatibilityStatus != view.ScoringProcessPending || row.BackwardCompatibilityDetails != nil {
				t.Fatalf("BWC = %s %#v, want no verdict after a missing changes page", row.BackwardCompatibilityStatus, row.BackwardCompatibilityDetails)
			}
			if f.task().RestartCount != 1 {
				t.Fatalf("restart count = %d, want 1", f.task().RestartCount)
			}
		})
	}
}

func TestRunIntegrityAndBwc_FetchErrorWritesNothing(t *testing.T) {
	f := newProcessorFixture()
	f.apihub.getVersion = func(string, string) (*view.VersionContent, error) { return nil, nil }

	refused, err := f.processor.runIntegrityAndBwcChecks(context.Background(), f.task(), *f.score.get())

	if refused || err == nil {
		t.Fatalf("refused = %t, err = %v, want an error", refused, err)
	}
	if f.score.writes != 0 {
		t.Fatalf("score written %d times, want 0", f.score.writes)
	}
}

func TestRunIntegrityAndBwc_PanicIsReturnedAsAnError(t *testing.T) {
	f := newProcessorFixture()
	f.apihub.getVersion = func(string, string) (*view.VersionContent, error) { panic("unexpected response") }

	refused, err := f.processor.runIntegrityAndBwcChecks(context.Background(), f.task(), *f.score.get())

	if refused || err == nil || err.Error() != "panic: unexpected response" {
		t.Fatalf("refused = %t, err = %v, want the panic as an error", refused, err)
	}
	if f.task().RestartCount != 0 {
		t.Fatalf("restart count = %d, want 0: only the attempt increments it", f.task().RestartCount)
	}
}

func TestProcessTick_ExhaustedTaskFailsPendingPartsAndKeepsTerminalOnes(t *testing.T) {
	f := newProcessorFixture()
	f.tasks.tasks[testScoringTaskId].RestartCount = repository.MaxScoringTaskRestarts
	f.tasks.tasks[testScoringTaskId].Details = "failed to get version content: timeout"
	qualityDetails := map[view.OpApiType][]view.QualityCheckDetails{view.RestApiType: {{Linter: view.SpectralLinter, Status: view.ScoringPassed}}}
	f.score.row.QualityCheckStatus = view.ScoringProcessCompleted
	f.score.row.QualityCheckDetails = qualityDetails

	f.processor.processTick(context.Background())

	task := f.task()
	wantDetails := "restart count exceeded limit, last error: failed to get version content: timeout"
	if task.Status != view.TaskStatusError || task.Details != wantDetails {
		t.Fatalf("task = %s %q, want error %q", task.Status, task.Details, wantDetails)
	}
	row := f.score.get()
	if row.ProcessStatus != view.ScoringProcessCompleted {
		t.Fatalf("process status = %s, want completed", row.ProcessStatus)
	}
	if row.PublicationIntegrityStatus != view.ScoringProcessError || row.PublicationIntegrityError != "scoring task failed: "+wantDetails {
		t.Fatalf("integrity = %s %q", row.PublicationIntegrityStatus, row.PublicationIntegrityError)
	}
	if row.PublicationIntegrityDetails == nil || row.PublicationIntegrityDetails.Reason != versionContentInternalErrorReason {
		t.Fatalf("integrity must get the legacy section, got %#v", row.PublicationIntegrityDetails)
	}
	if row.BackwardCompatibilityStatus != view.ScoringProcessError || row.BackwardCompatibilityError != versionContentMissingError {
		t.Fatalf("BWC = %s %q", row.BackwardCompatibilityStatus, row.BackwardCompatibilityError)
	}
	if row.QualityCheckStatus != view.ScoringProcessCompleted || len(row.QualityCheckDetails[view.RestApiType]) != 1 {
		t.Fatalf("a terminal quality part must be kept: %s %#v", row.QualityCheckStatus, row.QualityCheckDetails)
	}
	if row.Status != view.ScoringNotPassed {
		t.Fatalf("status = %q, want not_passed", row.Status)
	}
}

func TestProcessTick_ScoringFailedIsRetriedOnTheNextTick(t *testing.T) {
	f := newProcessorFixture()
	f.tasks.tasks[testScoringTaskId].RestartCount = repository.MaxScoringTaskRestarts
	f.tasks.scoringFailedErrs = []error{errors.New("connection reset")}

	f.processor.processTick(context.Background())
	if f.task().Status != view.TaskStatusProcessing {
		t.Fatalf("task status = %s, want processing after a failed finalisation", f.task().Status)
	}

	f.processor.processTick(context.Background())
	if f.task().Status != view.TaskStatusError {
		t.Fatalf("task status = %s, want error after the retry", f.task().Status)
	}
}

func TestProcessTick_CompletesScoringWhenAllPartsAreTerminal(t *testing.T) {
	f := newProcessorFixture()
	f.lintTasks.tasks[testLintTaskId].Status = view.TaskStatusSuccess

	f.processor.processTick(context.Background())

	if f.task().Status != view.TaskStatusSuccess {
		t.Fatalf("task status = %s, want success", f.task().Status)
	}
	row := f.score.get()
	if row.ProcessStatus != view.ScoringProcessCompleted || row.Status != view.ScoringPassed {
		t.Fatalf("score = %s %q, want completed and passed", row.ProcessStatus, row.Status)
	}
}

func TestProcessTick_ClosesLostTasks(t *testing.T) {
	tests := []struct {
		name         string
		restartCount int
		modify       func(score *inMemoryScore)
		wantDetails  string
	}{
		{
			name:        "superseded row",
			modify:      func(score *inMemoryScore) { score.row.ScoringTaskId = testSupersedingTaskId },
			wantDetails: testSupersededDetails,
		},
		{
			name:        "missing row",
			modify:      func(score *inMemoryScore) { score.row = nil },
			wantDetails: "score row missing",
		},
		{
			name:         "exhausted task, superseded row",
			restartCount: repository.MaxScoringTaskRestarts,
			modify:       func(score *inMemoryScore) { score.row.ScoringTaskId = testSupersedingTaskId },
			wantDetails:  testSupersededDetails,
		},
		{
			name:         "exhausted task, missing row",
			restartCount: repository.MaxScoringTaskRestarts,
			modify:       func(score *inMemoryScore) { score.row = nil },
			wantDetails:  "score row missing",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newProcessorFixture()
			f.tasks.tasks[testScoringTaskId].RestartCount = tt.restartCount
			tt.modify(f.score)

			f.processor.processTick(context.Background())

			task := f.task()
			if task.Status != view.TaskStatusError || task.Details != tt.wantDetails {
				t.Fatalf("task = %s %q, want error %q", task.Status, task.Details, tt.wantDetails)
			}
			if task.RestartCount != tt.restartCount {
				t.Fatalf("restart count = %d, want %d", task.RestartCount, tt.restartCount)
			}
			if f.score.writes != 0 {
				t.Fatalf("score written %d times, want 0", f.score.writes)
			}
		})
	}
}

func TestProcessTick_RefusedWriteIsNotCountedAndTheNextTickClosesTheTask(t *testing.T) {
	tests := []struct {
		name    string
		prepare func(f *processorFixture)
	}{
		{
			name: "quality",
			prepare: func(f *processorFixture) {
				f.lintTasks.tasks[testLintTaskId].Status = view.TaskStatusSuccess
				f.score.row.PublicationIntegrityStatus = view.ScoringProcessCompleted
				f.score.row.BackwardCompatibilityStatus = view.ScoringProcessCompleted
				f.docTasks.tasks = append(f.docTasks.tasks, docTask("d1", "a.yaml", view.SpectralLinter, testSpectralRuleset, view.TaskStatusSuccess))
				f.addLintedDocument("a.yaml", testSpectralRuleset, "hash-a", 0, 0)
			},
		},
		{
			name: "completion",
			prepare: func(f *processorFixture) {
				f.score.row.PublicationIntegrityStatus = view.ScoringProcessCompleted
				f.score.row.BackwardCompatibilityStatus = view.ScoringProcessCompleted
				f.score.row.QualityCheckStatus = view.ScoringProcessCompleted
			},
		},
		{
			name: "final failure",
			prepare: func(f *processorFixture) {
				f.tasks.tasks[testScoringTaskId].RestartCount = repository.MaxScoringTaskRestarts
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newProcessorFixture()
			tt.prepare(f)
			wantRestarts := f.task().RestartCount
			// The processor reads the row before the takeover, so its writes reach the fence of the repository.
			stale := *f.score.get()
			currentReads := f.processor.scoringRepo
			f.processor.scoringRepo = &scoringRepoStub{scores: map[int]*inMemoryScore{testRevision: {row: &stale}}}
			f.score.row.ScoringTaskId = testSupersedingTaskId
			newer := *f.score.get()

			f.processor.processTick(context.Background())

			task := f.task()
			if task.Status != view.TaskStatusProcessing || task.RestartCount != wantRestarts {
				t.Fatalf("task = %s with %d restarts, want processing with %d", task.Status, task.RestartCount, wantRestarts)
			}
			if f.score.writes != 0 || !reflect.DeepEqual(*f.score.get(), newer) {
				t.Fatalf("the newer score was written %d times: %#v", f.score.writes, f.score.get())
			}
			if len(task.HandledDocTaskIds) != 0 {
				t.Fatalf("handled ids = %v, want none after a refused write", task.HandledDocTaskIds)
			}

			f.processor.scoringRepo = currentReads
			f.processor.processTick(context.Background())

			task = f.task()
			if task.Status != view.TaskStatusError || task.Details != testSupersededDetails {
				t.Fatalf("task = %s %q, want error %q", task.Status, task.Details, testSupersededDetails)
			}
		})
	}
}

func TestRunIntegrityAndBwc_RefusedIntegrityWriteStopsAndTheNextTickClosesTheTask(t *testing.T) {
	f := newProcessorFixture()
	bwcStarted := false
	f.apihub.getVersionChanges = func(int) (*view.VersionChangesView, error) {
		bwcStarted = true
		return &view.VersionChangesView{}, nil
	}
	snapshot := *f.score.get()
	f.score.row.ScoringTaskId = testSupersedingTaskId

	refused, err := f.processor.runIntegrityAndBwcChecks(context.Background(), f.task(), snapshot)

	if !refused || err != nil {
		t.Fatalf("refused = %t, err = %v, want a refusal", refused, err)
	}
	task := f.task()
	if f.score.writes != 0 || bwcStarted {
		t.Fatalf("score written %d times, BWC started = %t, want neither", f.score.writes, bwcStarted)
	}
	if task.Status != view.TaskStatusProcessing || task.RestartCount != 0 {
		t.Fatalf("task = %s with %d restarts, want processing with 0", task.Status, task.RestartCount)
	}

	f.processor.processTick(context.Background())

	task = f.task()
	if task.Status != view.TaskStatusError || task.Details != testSupersededDetails {
		t.Fatalf("task = %s %q, want error %q", task.Status, task.Details, testSupersededDetails)
	}
}

func TestRunIntegrityAndBwc_RefusedBwcWriteIsNotCounted(t *testing.T) {
	f := newProcessorFixture()
	f.apihub.getVersionChanges = func(int) (*view.VersionChangesView, error) {
		f.score.row.ScoringTaskId = testSupersedingTaskId
		return &view.VersionChangesView{}, nil
	}

	refused, err := f.processor.runIntegrityAndBwcChecks(context.Background(), f.task(), *f.score.get())

	if !refused || err != nil {
		t.Fatalf("refused = %t, err = %v, want a refusal", refused, err)
	}
	row := f.score.get()
	if f.score.writes != 1 || row.BackwardCompatibilityStatus != view.ScoringProcessPending {
		t.Fatalf("score written %d times with BWC %s, want only the integrity write", f.score.writes, row.BackwardCompatibilityStatus)
	}
	if task := f.task(); task.Status != view.TaskStatusProcessing || task.RestartCount != 0 {
		t.Fatalf("task = %s with %d restarts, want processing with 0", task.Status, task.RestartCount)
	}
}

func TestRunIntegrityAndBwc_LostOwnershipWritesNothing(t *testing.T) {
	f := newProcessorFixture()
	task := f.task()
	f.tasks.tasks[testScoringTaskId].ExecutorId = testOtherExecutorId

	refused, err := f.processor.runIntegrityAndBwcChecks(context.Background(), task, *f.score.get())

	if !refused || err != nil {
		t.Fatalf("refused = %t, err = %v, want a refusal", refused, err)
	}
	if f.score.writes != 0 {
		t.Fatalf("score written %d times, want 0", f.score.writes)
	}
	stored := f.task()
	if stored.Status != view.TaskStatusProcessing || stored.RestartCount != 0 {
		t.Fatalf("the new owner's task must be untouched, got %s with %d restarts", stored.Status, stored.RestartCount)
	}
}

func TestRunIntegrityAndBwc_TerminalPartIsNeverRewritten(t *testing.T) {
	f := newProcessorFixture()
	stale := *f.score.get()
	written := &view.PublicationIntegrityDetails{Status: view.ScoringNotPassed, Reason: "written first"}
	f.score.row.PublicationIntegrityStatus = view.ScoringProcessCompleted
	f.score.row.PublicationIntegrityDetails = written

	if _, err := f.processor.runIntegrityAndBwcChecks(context.Background(), f.task(), stale); err != nil {
		t.Fatalf("unexpected error: %s", err)
	}

	if f.score.get().PublicationIntegrityDetails.Reason != written.Reason {
		t.Fatalf("a terminal integrity part was rewritten: %#v", f.score.get().PublicationIntegrityDetails)
	}
}

func newQualityFixture() *processorFixture {
	f := newProcessorFixture()
	f.score.row.PublicationIntegrityStatus = view.ScoringProcessCompleted
	f.score.row.BackwardCompatibilityStatus = view.ScoringProcessCompleted
	return f
}

func assertQualityReads(t *testing.T, f *processorFixture, wantRulesets, wantVersionSummaries, wantLintSummaries int) {
	t.Helper()
	if f.rulesets.reads != wantRulesets || f.verResults.reads != wantVersionSummaries || f.lintResults.reads != wantLintSummaries {
		t.Fatalf("reads: rulesets %d, version summaries %d, lint summaries %d; want %d, %d, %d",
			f.rulesets.reads, f.verResults.reads, f.lintResults.reads, wantRulesets, wantVersionSummaries, wantLintSummaries)
	}
}

func assertHandledIds(t *testing.T, f *processorFixture, want ...string) {
	t.Helper()
	if got := f.task().HandledDocTaskIds; !slices.Equal(got, want) {
		t.Fatalf("handled ids = %v, want %v", got, want)
	}
}

func TestProcessTick_ScoresEachDocTaskOnce(t *testing.T) {
	f := newQualityFixture()
	ctx := context.Background()

	f.processor.processTick(ctx)
	row := f.score.get()
	if row.QualityCheckStatus != view.ScoringProcessInProgress || row.QualityCheckDetails == nil || len(row.QualityCheckDetails) != 0 {
		t.Fatalf("tick 1: quality = %s %#v, want in_progress with an empty map", row.QualityCheckStatus, row.QualityCheckDetails)
	}
	if f.score.writes != 1 {
		t.Fatalf("tick 1: score written %d times, want 1", f.score.writes)
	}
	assertQualityReads(t, f, 0, 0, 0)

	f.processor.processTick(ctx)
	if f.score.writes != 1 {
		t.Fatalf("tick 2: score written %d times, want 1", f.score.writes)
	}
	assertQualityReads(t, f, 0, 0, 0)

	f.docTasks.tasks = []entity.DocumentLintTask{
		docTask("d1", "a.yaml", view.SpectralLinter, testSpectralRuleset, view.TaskStatusSuccess),
		docTask("d2", "b.yaml", view.SpectralLinter, testSpectralRuleset, view.TaskStatusProcessing),
	}
	f.addLintedDocument("a.yaml", testSpectralRuleset, "hash-a", 0, 1)
	f.processor.processTick(ctx)
	row = f.score.get()
	if row.QualityCheckStatus != view.ScoringProcessInProgress || len(row.QualityCheckDetails[view.RestApiType]) != 1 {
		t.Fatalf("tick 3: quality = %s %#v, want in_progress with one entry", row.QualityCheckStatus, row.QualityCheckDetails)
	}
	if row.ProcessStatus != view.ScoringProcessInProgress || row.Status != "" {
		t.Fatalf("tick 3: score = %s %q, want in_progress with an empty status", row.ProcessStatus, row.Status)
	}
	if f.score.writes != 2 {
		t.Fatalf("tick 3: score written %d times, want 2", f.score.writes)
	}
	assertHandledIds(t, f, "d1")
	assertQualityReads(t, f, 1, 1, 1)

	f.processor.processTick(ctx)
	if f.score.writes != 2 {
		t.Fatalf("tick 4: score written %d times, want 2", f.score.writes)
	}
	assertHandledIds(t, f, "d1")
	assertQualityReads(t, f, 1, 1, 1)

	f.docTasks.tasks[1].Status = view.TaskStatusError
	f.docTasks.tasks[1].Details = "spectral crashed"
	f.lintTasks.tasks[testLintTaskId].Status = view.TaskStatusSuccess
	f.processor.processTick(ctx)
	row = f.score.get()
	if row.QualityCheckStatus != view.ScoringProcessCompleted || len(row.QualityCheckDetails[view.RestApiType]) != 2 {
		t.Fatalf("tick 5: quality = %s %#v, want completed with two entries", row.QualityCheckStatus, row.QualityCheckDetails)
	}
	if f.score.writes != 4 {
		t.Fatalf("tick 5: score written %d times, want 4 with the quality and the completion writes", f.score.writes)
	}
	if f.task().Status != view.TaskStatusSuccess {
		t.Fatalf("tick 5: task status = %s, want success", f.task().Status)
	}
	assertHandledIds(t, f, "d1", "d2")
	assertQualityReads(t, f, 1, 2, 1)
}

func TestProcessTick_LintSuccessWithNoNewDocumentWritesTheStatusOnly(t *testing.T) {
	f := newQualityFixture()
	ctx := context.Background()

	f.processor.processTick(ctx)
	f.lintTasks.tasks[testLintTaskId].Status = view.TaskStatusSuccess
	f.processor.processTick(ctx)

	row := f.score.get()
	if row.QualityCheckStatus != view.ScoringProcessCompleted || row.QualityCheckDetails == nil || len(row.QualityCheckDetails) != 0 {
		t.Fatalf("quality = %s %#v, want completed with an empty map", row.QualityCheckStatus, row.QualityCheckDetails)
	}
	if f.score.writes != 3 {
		t.Fatalf("score written %d times, want 3: in_progress, completed, and the completion", f.score.writes)
	}
	if f.task().Status != view.TaskStatusSuccess {
		t.Fatalf("task status = %s, want success", f.task().Status)
	}
	assertQualityReads(t, f, 0, 0, 0)
}

func TestProcessTick_LintErrorKeepsStoredEntries(t *testing.T) {
	f := newQualityFixture()
	ctx := context.Background()
	f.docTasks.tasks = []entity.DocumentLintTask{docTask("d1", "a.yaml", view.SpectralLinter, testSpectralRuleset, view.TaskStatusSuccess)}
	f.addLintedDocument("a.yaml", testSpectralRuleset, "hash-a", 0, 0)

	f.processor.processTick(ctx)
	f.lintTasks.tasks[testLintTaskId].Status = view.TaskStatusError
	f.lintTasks.tasks[testLintTaskId].Details = "restart count exceeded"
	f.processor.processTick(ctx)

	row := f.score.get()
	if row.QualityCheckStatus != view.ScoringProcessError || row.QualityCheckError != "lint task failed: restart count exceeded" {
		t.Fatalf("quality = %s %q, want error from the lint task", row.QualityCheckStatus, row.QualityCheckError)
	}
	if len(row.QualityCheckDetails[view.RestApiType]) != 1 {
		t.Fatalf("details = %#v, want the stored entry", row.QualityCheckDetails)
	}
	assertHandledIds(t, f, "d1")
	assertQualityReads(t, f, 1, 1, 1)
}

func TestProcessTick_LintFailureWithNoEntryStoresNullDetails(t *testing.T) {
	tests := []struct {
		name        string
		runningTick bool
		fail        func(f *processorFixture)
		wantPartErr string
	}{
		{
			name: "lint error on the first tick",
			fail: func(f *processorFixture) {
				f.lintTasks.tasks[testLintTaskId].Status = view.TaskStatusError
				f.lintTasks.tasks[testLintTaskId].Details = "failed to save doc tasks"
			},
			wantPartErr: "lint task failed: failed to save doc tasks",
		},
		{
			name:        "lint error after an empty running tick",
			runningTick: true,
			fail: func(f *processorFixture) {
				f.lintTasks.tasks[testLintTaskId].Status = view.TaskStatusError
				f.lintTasks.tasks[testLintTaskId].Details = "failed to save doc tasks"
			},
			wantPartErr: "lint task failed: failed to save doc tasks",
		},
		{
			name: "lint error with only unfinished document tasks",
			fail: func(f *processorFixture) {
				f.lintTasks.tasks[testLintTaskId].Status = view.TaskStatusError
				f.lintTasks.tasks[testLintTaskId].Details = "failed to save doc tasks"
				f.docTasks.tasks = []entity.DocumentLintTask{docTask("d1", "a.yaml", view.SpectralLinter, testSpectralRuleset, view.TaskStatusProcessing)}
			},
			wantPartErr: "lint task failed: failed to save doc tasks",
		},
		{
			name:        "lint task missing on the first tick",
			fail:        func(f *processorFixture) { delete(f.lintTasks.tasks, testLintTaskId) },
			wantPartErr: "lint task not found",
		},
		{
			name:        "lint task missing after an empty running tick",
			runningTick: true,
			fail:        func(f *processorFixture) { delete(f.lintTasks.tasks, testLintTaskId) },
			wantPartErr: "lint task not found",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newQualityFixture()
			ctx := context.Background()
			if tt.runningTick {
				f.processor.processTick(ctx)
				if f.score.get().QualityCheckDetails == nil {
					t.Fatal("the running tick must store an empty map")
				}
			}

			tt.fail(f)
			f.processor.processTick(ctx)

			row := f.score.get()
			if row.QualityCheckStatus != view.ScoringProcessError || row.QualityCheckError != tt.wantPartErr {
				t.Fatalf("quality = %s %q, want error %q", row.QualityCheckStatus, row.QualityCheckError, tt.wantPartErr)
			}
			if row.QualityCheckDetails != nil {
				t.Fatalf("details = %#v, want nil", row.QualityCheckDetails)
			}
			assertHandledIds(t, f)
			assertQualityReads(t, f, 0, 0, 0)
		})
	}
}

func TestProcessTick_AttemptErrorStoresNothingAndTheNextTickScoresTheBatchOnce(t *testing.T) {
	f := newQualityFixture()
	ctx := context.Background()
	f.docTasks.tasks = []entity.DocumentLintTask{docTask("d1", "a.yaml", view.SpectralLinter, testSpectralRuleset, view.TaskStatusSuccess)}
	f.addLintedDocument("a.yaml", testSpectralRuleset, "hash-a", 0, 0)
	f.processor.processTick(ctx)
	writes := f.score.writes

	f.docTasks.tasks = append(f.docTasks.tasks,
		docTask("d2", "b.yaml", view.SpectralLinter, testSpectralRuleset, view.TaskStatusSuccess),
		docTask("d3", "c.yaml", view.SpectralLinter, testSpectralRuleset, view.TaskStatusSuccess),
	)
	f.addLintedDocument("b.yaml", testSpectralRuleset, "hash-b", 0, 0)
	f.addLintedDocument("c.yaml", testSpectralRuleset, "hash-c", 0, 0)
	missingSummary := lintResultKey{dataHash: "hash-c", rulesetId: testSpectralRuleset}
	storedSummary := f.lintResults.summaries[missingSummary]
	delete(f.lintResults.summaries, missingSummary)

	f.processor.processTick(ctx)

	row := f.score.get()
	if f.score.writes != writes || len(row.QualityCheckDetails[view.RestApiType]) != 1 {
		t.Fatalf("score written %d more times with %#v, want the stored entry only", f.score.writes-writes, row.QualityCheckDetails)
	}
	assertHandledIds(t, f, "d1")
	if f.task().RestartCount != 1 {
		t.Fatalf("restart count = %d, want 1", f.task().RestartCount)
	}

	f.lintResults.summaries[missingSummary] = storedSummary
	f.processor.processTick(ctx)

	row = f.score.get()
	if f.score.writes != writes+1 || len(row.QualityCheckDetails[view.RestApiType]) != 3 {
		t.Fatalf("score written %d more times with %#v, want one write and three entries", f.score.writes-writes, row.QualityCheckDetails)
	}
	assertHandledIds(t, f, "d1", "d2", "d3")
	if f.task().RestartCount != 1 {
		t.Fatalf("restart count = %d, want 1", f.task().RestartCount)
	}
}

func TestProcessTick_ReclaimedTaskScoresOnlyTheUnhandledDocuments(t *testing.T) {
	f := newQualityFixture()
	ctx := context.Background()
	f.docTasks.tasks = []entity.DocumentLintTask{docTask("d1", "a.yaml", view.SpectralLinter, testSpectralRuleset, view.TaskStatusSuccess)}
	f.addLintedDocument("a.yaml", testSpectralRuleset, "hash-a", 0, 0)
	f.processor.processTick(ctx)

	f.processor.executorId = testOtherExecutorId
	f.tasks.free = []string{testScoringTaskId}
	f.processor.acquireTasks(ctx)
	f.docTasks.tasks = append(f.docTasks.tasks, docTask("d2", "b.yaml", view.SpectralLinter, testSpectralRuleset, view.TaskStatusSuccess))
	f.addLintedDocument("b.yaml", testSpectralRuleset, "hash-b", 0, 0)
	lintSummaryReads := f.lintResults.reads

	f.processor.processTick(ctx)

	if f.task().ExecutorId != testOtherExecutorId {
		t.Fatalf("executor = %s, want %s", f.task().ExecutorId, testOtherExecutorId)
	}
	if entries := f.score.get().QualityCheckDetails[view.RestApiType]; len(entries) != 2 {
		t.Fatalf("got %d entries, want 2: %#v", len(entries), entries)
	}
	assertHandledIds(t, f, "d1", "d2")
	if f.lintResults.reads != lintSummaryReads+1 {
		t.Fatalf("lint summary reads = %d, want %d", f.lintResults.reads, lintSummaryReads+1)
	}
}

func TestAcquireTasks_ClaimsEveryFreeTask(t *testing.T) {
	tests := []struct {
		name             string
		exhaustedFree    int
		free             int
		failFinalisation bool
	}{
		{name: "all free tasks", free: 3},
		{
			name:             "an exhausted claim that could not be failed stays owned and does not stop the loop",
			exhaustedFree:    1,
			free:             3,
			failFinalisation: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newProcessorFixture()
			f.tasks.tasks = map[string]*entity.VersionScoringTask{}
			for i := 0; i < tt.exhaustedFree+tt.free; i++ {
				task := &entity.VersionScoringTask{Id: fmt.Sprintf("free-%02d", i), Status: view.TaskStatusNotStarted}
				if i < tt.exhaustedFree {
					task.Id = testScoringTaskId
					task.Revision = testRevision
					task.RestartCount = repository.MaxScoringTaskRestarts
				}
				f.tasks.tasks[task.Id] = task
				f.tasks.free = append(f.tasks.free, task.Id)
			}
			if tt.failFinalisation {
				f.tasks.scoringFailedErrs = []error{errors.New("connection reset")}
			}

			f.processor.acquireTasks(context.Background())

			if len(f.tasks.free) != 0 {
				t.Fatalf("%d free tasks are left, want none", len(f.tasks.free))
			}
			owned, _ := f.tasks.GetProcessingTasks(context.Background(), testExecutorId)
			if len(owned) != tt.exhaustedFree+tt.free {
				t.Fatalf("executor owns %d tasks, want %d", len(owned), tt.exhaustedFree+tt.free)
			}
			if !tt.failFinalisation {
				return
			}
			if len(f.tasks.scoringFailedErrs) != 0 {
				t.Fatalf("the injected finalisation error was not consumed")
			}
			if task := f.task(); task.Status != view.TaskStatusProcessing || task.ExecutorId != testExecutorId {
				t.Fatalf("exhausted task = %s owned by %q, want processing owned by %q", task.Status, task.ExecutorId, testExecutorId)
			}
		})
	}
}

func TestAcquireTasks_FailsAnExhaustedTask(t *testing.T) {
	f := newProcessorFixture()
	task := f.tasks.tasks[testScoringTaskId]
	task.Status = view.TaskStatusNotStarted
	task.ExecutorId = ""
	task.RestartCount = repository.MaxScoringTaskRestarts
	f.tasks.free = []string{testScoringTaskId}

	f.processor.acquireTasks(context.Background())

	if f.task().Status != view.TaskStatusError {
		t.Fatalf("task status = %s, want error", f.task().Status)
	}
	if f.score.get().ProcessStatus != view.ScoringProcessCompleted {
		t.Fatalf("the score of an exhausted task must be completed with failed parts")
	}
}

func TestAcquireTasks_ExhaustedLostTaskIsClosedByTheNextTick(t *testing.T) {
	f := newProcessorFixture()
	task := f.tasks.tasks[testScoringTaskId]
	task.Status = view.TaskStatusNotStarted
	task.ExecutorId = ""
	task.RestartCount = repository.MaxScoringTaskRestarts
	f.tasks.free = []string{testScoringTaskId}
	f.score.row.ScoringTaskId = testSupersedingTaskId

	f.processor.acquireTasks(context.Background())

	if f.task().Status != view.TaskStatusProcessing {
		t.Fatalf("task status = %s, want processing after a refused failure", f.task().Status)
	}

	f.processor.processTick(context.Background())

	if got := f.task(); got.Status != view.TaskStatusError || got.Details != testSupersededDetails {
		t.Fatalf("task = %s %q, want error %q", got.Status, got.Details, testSupersededDetails)
	}
	if f.score.writes != 0 {
		t.Fatalf("score written %d times, want 0", f.score.writes)
	}
}

type panickingScoringTaskRepoStub struct {
	*scoringTaskRepoStub

	calls int
}

func (r *panickingScoringTaskRepoStub) GetProcessingTasks(ctx context.Context, executorId string) ([]entity.VersionScoringTask, error) {
	r.calls++
	if r.calls == 1 {
		panic("unexpected nil row")
	}
	return r.scoringTaskRepoStub.GetProcessingTasks(ctx, executorId)
}

func TestWorkLoop_ContinuesAfterAPanickingTick(t *testing.T) {
	f := newProcessorFixture()
	repo := &panickingScoringTaskRepoStub{scoringTaskRepoStub: f.tasks}
	f.processor.scoringTaskRepo = repo
	ticks := make(chan time.Time, 2)
	ticks <- time.Now()
	ticks <- time.Now()
	close(ticks)

	f.processor.workLoop(context.Background(), ticks)

	if repo.calls != 2 {
		t.Fatalf("processTick ran %d times, want 2", repo.calls)
	}
	if f.score.get().PublicationIntegrityStatus != view.ScoringProcessCompleted {
		t.Fatal("the tick after the panic must process the owned task")
	}
}

type panickingVersionResultRepoStub struct {
	*versionResultRepoStub

	panicRevision int
}

func (r *panickingVersionResultRepoStub) GetVersionAndDocsSummary(ctx context.Context, packageId string, version string, revision int) (*entity.LintedVersion, []entity.LintedDocument, error) {
	if revision == r.panicRevision {
		panic(testQualityPanic)
	}
	return r.versionResultRepoStub.GetVersionAndDocsSummary(ctx, packageId, version, revision)
}

func TestProcessTick_TaskPanicIsCountedAndOtherTasksContinue(t *testing.T) {
	f := newProcessorFixture()
	f.processor.versionResultRepo = &panickingVersionResultRepoStub{versionResultRepoStub: f.verResults, panicRevision: testRevision}
	f.docTasks.tasks = append(f.docTasks.tasks, docTask("d1", "a.yaml", view.SpectralLinter, testSpectralRuleset, view.TaskStatusSuccess))
	otherScore := f.addOtherTask()

	for tick := 1; tick <= repository.MaxScoringTaskRestarts+1; tick++ {
		otherWrites := otherScore.writes
		otherDocTask := docTask(fmt.Sprintf("other-%d", tick), "a.yaml", view.SpectralLinter, "", view.TaskStatusError)
		otherDocTask.VersionLintTaskId = testOtherLintTaskId
		f.docTasks.tasks = append(f.docTasks.tasks, otherDocTask)

		f.processor.processTick(context.Background())

		if otherScore.writes == otherWrites {
			t.Fatalf("tick %d: the task after the panicking one was not processed", tick)
		}
		task := f.task()
		if tick <= repository.MaxScoringTaskRestarts {
			if task.Status != view.TaskStatusProcessing || task.RestartCount != tick {
				t.Fatalf("tick %d: task = %s with %d restarts, want processing with %d", tick, task.Status, task.RestartCount, tick)
			}
			continue
		}
		wantDetails := fmt.Sprintf("restart count exceeded limit, last error: %s", fmt.Sprintf("panic: %v", testQualityPanic))
		if task.Status != view.TaskStatusError || task.Details != wantDetails {
			t.Fatalf("tick %d: task = %s %q, want error %q", tick, task.Status, task.Details, wantDetails)
		}
		if f.score.get().ProcessStatus != view.ScoringProcessCompleted {
			t.Fatalf("the score of the exhausted task must be completed with failed parts")
		}
	}
	if other := f.tasks.task(testOtherScoringTaskId); other.Status != view.TaskStatusProcessing || other.RestartCount != 0 {
		t.Fatalf("other task = %s with %d restarts, want processing without restarts", other.Status, other.RestartCount)
	}
}

func lintTask(status view.TaskStatus, details string) *entity.VersionLintTask {
	return &entity.VersionLintTask{
		Id:        testLintTaskId,
		PackageId: testPackageId,
		Version:   testVersion,
		Revision:  testRevision,
		Status:    status,
		Details:   details,
	}
}

func docTask(id string, fileId string, linter view.Linter, rulesetId string, status view.TaskStatus) entity.DocumentLintTask {
	return entity.DocumentLintTask{
		Id:                id,
		VersionLintTaskId: testLintTaskId,
		PackageId:         testPackageId,
		Version:           testVersion,
		Revision:          testRevision,
		FileId:            fileId,
		FileSlug:          fileId,
		APIType:           view.OpenAPI30Type,
		Linter:            linter,
		RulesetId:         rulesetId,
		Status:            status,
	}
}

func TestQualityCheck_SuccessTasksWithRowsAndSummaries(t *testing.T) {
	f := newProcessorFixture()
	f.addLintedDocument("a.yaml", testSpectralRuleset, "hash-a", 0, 3)
	f.addLintedDocument("b.yaml", testSpectralRuleset, "hash-b", 2, 0)
	tasks := []entity.DocumentLintTask{
		docTask("d2", "b.yaml", view.SpectralLinter, testSpectralRuleset, view.TaskStatusSuccess),
		docTask("d1", "a.yaml", view.SpectralLinter, testSpectralRuleset, view.TaskStatusSuccess),
	}

	details, status, partErr, err := f.processor.calculateQualityCheck(context.Background(), lintTask(view.TaskStatusSuccess, ""), tasks)
	if err != nil {
		t.Fatalf("unexpected error: %s", err)
	}
	if status != view.ScoringProcessCompleted || partErr != "" {
		t.Fatalf("status = %s, partErr = %q, want completed and no error", status, partErr)
	}
	want := []view.QualityCheckDetails{
		{Linter: view.SpectralLinter, Status: view.ScoringPassedWithDefects, Reason: "Version contain 3 warnings for linter spectral.", WarningsCount: 3},
		{Linter: view.SpectralLinter, Status: view.ScoringNotPassed, Reason: "Version contain 2 errors for linter spectral.", ErrorsCount: 2},
	}
	if !reflect.DeepEqual(details[view.RestApiType], want) {
		t.Fatalf("details = %#v, want %#v", details[view.RestApiType], want)
	}
}

func TestQualityCheck_AttemptErrors(t *testing.T) {
	tests := []struct {
		name  string
		setup func(f *processorFixture) []entity.DocumentLintTask
	}{
		{
			name: "success task without a linted document row",
			setup: func(f *processorFixture) []entity.DocumentLintTask {
				return []entity.DocumentLintTask{docTask("d1", "a.yaml", view.SpectralLinter, testSpectralRuleset, view.TaskStatusSuccess)}
			},
		},
		{
			name: "summary read fails",
			setup: func(f *processorFixture) []entity.DocumentLintTask {
				f.addLintedDocument("a.yaml", testSpectralRuleset, "hash-a", 0, 0)
				f.lintResults.err = errors.New("connection reset")
				return []entity.DocumentLintTask{docTask("d1", "a.yaml", view.SpectralLinter, testSpectralRuleset, view.TaskStatusSuccess)}
			},
		},
		{
			name: "summary missing",
			setup: func(f *processorFixture) []entity.DocumentLintTask {
				f.addLintedDocument("a.yaml", testSpectralRuleset, "hash-a", 0, 0)
				f.lintResults.summaries = map[lintResultKey]map[string]interface{}{}
				return []entity.DocumentLintTask{docTask("d1", "a.yaml", view.SpectralLinter, testSpectralRuleset, view.TaskStatusSuccess)}
			},
		},
		{
			name: "ruleset missing",
			setup: func(f *processorFixture) []entity.DocumentLintTask {
				f.addLintedDocument("a.yaml", "ruleset-deleted", "hash-a", 0, 0)
				return []entity.DocumentLintTask{docTask("d1", "a.yaml", view.SpectralLinter, "ruleset-deleted", view.TaskStatusSuccess)}
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newProcessorFixture()
			tasks := tt.setup(f)
			_, _, _, err := f.processor.calculateQualityCheck(context.Background(), lintTask(view.TaskStatusSuccess, ""), tasks)
			if err == nil {
				t.Fatal("expected an attempt error")
			}
		})
	}
}

func TestQualityCheck_FailedTasks(t *testing.T) {
	f := newProcessorFixture()
	// An older successful run left a passing row; the failed task of this run wins over it.
	f.addLintedDocument("a.yaml", testSpectralRuleset, "hash-a", 0, 0)
	pre := docTask("d1", "a.yaml", view.SpectralLinter, testSpectralRuleset, view.TaskStatusError)
	pre.Details = "spectral crashed"
	optional := docTask("d2", "a.yaml", view.AiLinter, "", view.TaskStatusError)
	optional.Details = "No suitable ruleset was found. Linter=ai_linter"

	details, status, _, err := f.processor.calculateQualityCheck(context.Background(), lintTask(view.TaskStatusSuccess, ""), []entity.DocumentLintTask{pre, optional})
	if err != nil {
		t.Fatalf("unexpected error: %s", err)
	}
	if status != view.ScoringProcessCompleted {
		t.Fatalf("status = %s, want completed", status)
	}
	want := []view.QualityCheckDetails{
		{Linter: view.AiLinter, Status: view.ScoringPassed, Optional: true, InternalError: optional.Details},
		{Linter: view.SpectralLinter, Status: view.ScoringNotPassed, Reason: "Validation internal error for linter spectral.", InternalError: pre.Details},
	}
	if !reflect.DeepEqual(details[view.RestApiType], want) {
		t.Fatalf("details = %#v, want %#v", details[view.RestApiType], want)
	}
}

func TestQualityCheck_LintersWithoutRulesetAreNotMerged(t *testing.T) {
	f := newProcessorFixture()
	spectral := docTask("d1", "a.yaml", view.SpectralLinter, "", view.TaskStatusError)
	spectral.Details = "No suitable ruleset was found. Linter=spectral"
	ai := docTask("d2", "a.yaml", view.AiLinter, "", view.TaskStatusError)
	ai.Details = "No suitable ruleset was found. Linter=ai_linter"

	details, _, _, err := f.processor.calculateQualityCheck(context.Background(), lintTask(view.TaskStatusSuccess, ""), []entity.DocumentLintTask{spectral, ai})
	if err != nil {
		t.Fatalf("unexpected error: %s", err)
	}
	entries := details[view.RestApiType]
	if len(entries) != 2 || entries[0].Linter != view.AiLinter || entries[1].Linter != view.SpectralLinter {
		t.Fatalf("want one entry per linter, got %#v", entries)
	}
}

func TestQualityCheck_LintTaskStates(t *testing.T) {
	tests := []struct {
		name           string
		lintTask       *entity.VersionLintTask
		tasks          []entity.DocumentLintTask
		wantStatus     view.ScoringProcessStatus
		wantPartErr    string
		wantEntries    int
		wantNilDetails bool
	}{
		{
			name:     "lint error keeps the evidence that finished",
			lintTask: lintTask(view.TaskStatusError, "restart count exceeded"),
			tasks: []entity.DocumentLintTask{
				docTask("d1", "a.yaml", view.SpectralLinter, testSpectralRuleset, view.TaskStatusSuccess),
			},
			wantStatus:  view.ScoringProcessError,
			wantPartErr: "lint task failed: restart count exceeded",
			wantEntries: 1,
		},
		{
			name:           "lint running with an empty batch",
			lintTask:       lintTask(view.TaskStatusWaitingForDocs, ""),
			wantStatus:     view.ScoringProcessInProgress,
			wantNilDetails: true,
		},
		{
			name:           "lint error with an empty batch",
			lintTask:       lintTask(view.TaskStatusError, "failed to save doc tasks"),
			wantStatus:     view.ScoringProcessError,
			wantPartErr:    "lint task failed: failed to save doc tasks",
			wantNilDetails: true,
		},
		{
			name:           "lint success with an empty batch",
			lintTask:       lintTask(view.TaskStatusSuccess, ""),
			wantStatus:     view.ScoringProcessCompleted,
			wantNilDetails: true,
		},
		{
			name:           "lint task missing",
			lintTask:       nil,
			wantStatus:     view.ScoringProcessError,
			wantPartErr:    "lint task not found",
			wantNilDetails: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newProcessorFixture()
			f.addLintedDocument("a.yaml", testSpectralRuleset, "hash-a", 0, 0)

			details, status, partErr, err := f.processor.calculateQualityCheck(context.Background(), tt.lintTask, tt.tasks)
			if err != nil {
				t.Fatalf("unexpected error: %s", err)
			}
			if status != tt.wantStatus || partErr != tt.wantPartErr {
				t.Fatalf("status = %s, partErr = %q, want %s and %q", status, partErr, tt.wantStatus, tt.wantPartErr)
			}
			if (details == nil) != tt.wantNilDetails {
				t.Fatalf("details = %#v, want nil = %t", details, tt.wantNilDetails)
			}
			entries := details[view.RestApiType]
			if len(entries) != tt.wantEntries {
				t.Fatalf("got %d entries, want %d: %#v", len(entries), tt.wantEntries, entries)
			}
			for _, entry := range entries {
				if entry.Status != view.ScoringPassed {
					t.Fatalf("entry %#v must come from the success task", entry)
				}
			}
			if len(tt.tasks) == 0 {
				assertQualityReads(t, f, 0, 0, 0)
			}
		})
	}
}

func completedScore() *entity.VersionScore {
	return &entity.VersionScore{
		ProcessStatus:               view.ScoringProcessCompleted,
		PublicationIntegrityStatus:  view.ScoringProcessCompleted,
		BackwardCompatibilityStatus: view.ScoringProcessCompleted,
		QualityCheckStatus:          view.ScoringProcessCompleted,
		PublicationIntegrityDetails: &view.PublicationIntegrityDetails{Status: view.ScoringPassed},
		BackwardCompatibilityDetails: map[view.OpApiType]view.BackwardCompatibilityDetails{
			view.RestApiType: {Status: view.ScoringPassed},
		},
		QualityCheckDetails: map[view.OpApiType][]view.QualityCheckDetails{
			view.RestApiType: {{Linter: view.SpectralLinter, Status: view.ScoringPassed}},
		},
	}
}

func sortedCopy(values []string) []string {
	result := append([]string{}, values...)
	sort.Strings(result)
	return result
}

func TestOverallStatus(t *testing.T) {
	const bwcDefectReason = "Version contains breaking change(s) in internal(2) operation(s)."
	const qualityErrorsReason = "Version contain 3 errors for linter spectral."
	const integrityReason = "Version has publication errors."

	tests := []struct {
		name        string
		modify      func(score *entity.VersionScore)
		wantStatus  view.ScoringStatus
		wantReasons []string
		wantDebug   []string
	}{
		{
			name:        "all parts passed",
			modify:      func(score *entity.VersionScore) {},
			wantStatus:  view.ScoringPassed,
			wantReasons: []string{},
			wantDebug:   []string{},
		},
		{
			name: "BWC passed with defects and quality errors",
			modify: func(score *entity.VersionScore) {
				score.BackwardCompatibilityDetails[view.RestApiType] = view.BackwardCompatibilityDetails{Status: view.ScoringPassedWithDefects, Reason: bwcDefectReason}
				score.QualityCheckDetails[view.RestApiType] = []view.QualityCheckDetails{{Status: view.ScoringNotPassed, Reason: qualityErrorsReason}}
			},
			wantStatus:  view.ScoringNotPassed,
			wantReasons: []string{bwcDefectReason, qualityErrorsReason},
			wantDebug:   []string{},
		},
		{
			name: "integrity not passed",
			modify: func(score *entity.VersionScore) {
				score.PublicationIntegrityDetails = &view.PublicationIntegrityDetails{Status: view.ScoringNotPassed, Reason: integrityReason, HasErrors: true}
			},
			wantStatus:  view.ScoringNotPassed,
			wantReasons: []string{integrityReason},
			wantDebug:   []string{},
		},
		{
			name: "integrity error without a section gets the legacy section",
			modify: func(score *entity.VersionScore) {
				score.PublicationIntegrityStatus = view.ScoringProcessError
				score.PublicationIntegrityError = "scoring task failed: boom"
				score.PublicationIntegrityDetails = nil
			},
			wantStatus:  view.ScoringNotPassed,
			wantReasons: []string{versionContentInternalErrorReason},
			wantDebug:   []string{"scoring task failed: boom"},
		},
		{
			name: "BWC error and quality error",
			modify: func(score *entity.VersionScore) {
				score.BackwardCompatibilityStatus = view.ScoringProcessError
				score.BackwardCompatibilityError = "bwc failed"
				score.BackwardCompatibilityDetails = nil
				score.QualityCheckStatus = view.ScoringProcessError
				score.QualityCheckError = "lint task failed: x"
			},
			wantStatus:  view.ScoringNotPassed,
			wantReasons: []string{bwcInternalErrorReason, qualityInternalErrorReason},
			wantDebug:   []string{"bwc failed", "lint task failed: x"},
		},
		{
			name: "in progress keeps status and reasons empty while debug is filled",
			modify: func(score *entity.VersionScore) {
				score.ProcessStatus = view.ScoringProcessInProgress
				score.QualityCheckStatus = view.ScoringProcessInProgress
				score.BackwardCompatibilityStatus = view.ScoringProcessError
				score.BackwardCompatibilityError = "bwc failed"
				score.Status = view.ScoringPassed
				score.Reasons = []string{"stale"}
			},
			wantStatus:  "",
			wantReasons: []string{},
			wantDebug:   []string{"bwc failed"},
		},
		{
			name: "duplicate reasons across API types",
			modify: func(score *entity.VersionScore) {
				score.BackwardCompatibilityDetails = map[view.OpApiType]view.BackwardCompatibilityDetails{
					view.RestApiType:     {Status: view.ScoringPassedWithDefects, Reason: bwcDefectReason},
					view.AsyncapiApiType: {Status: view.ScoringPassedWithDefects, Reason: bwcDefectReason},
				}
			},
			wantStatus:  view.ScoringPassedWithDefects,
			wantReasons: []string{bwcDefectReason},
			wantDebug:   []string{},
		},
		{
			name: "debug lists the part errors in part order",
			modify: func(score *entity.VersionScore) {
				score.QualityCheckStatus = view.ScoringProcessError
				score.QualityCheckError = "quality failed"
				score.PublicationIntegrityStatus = view.ScoringProcessError
				score.PublicationIntegrityError = "integrity failed"
				score.PublicationIntegrityDetails = nil
				score.Debug = []string{"stale"}
			},
			wantStatus:  view.ScoringNotPassed,
			wantReasons: []string{versionContentInternalErrorReason, qualityInternalErrorReason},
			wantDebug:   []string{"integrity failed", "quality failed"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := completedScore()
			tt.modify(score)
			recomputeOverallStatus(score)

			if score.Status != tt.wantStatus {
				t.Errorf("status = %q, want %q", score.Status, tt.wantStatus)
			}
			if score.Reasons == nil || !reflect.DeepEqual(sortedCopy(score.Reasons), sortedCopy(tt.wantReasons)) {
				t.Errorf("reasons = %#v, want the set %#v", score.Reasons, tt.wantReasons)
			}
			if score.Debug == nil || !reflect.DeepEqual(score.Debug, tt.wantDebug) {
				t.Errorf("debug = %#v, want %#v", score.Debug, tt.wantDebug)
			}
		})
	}
}

func TestOverallStatus_IntegrityErrorKeepsComputedSection(t *testing.T) {
	score := completedScore()
	score.PublicationIntegrityStatus = view.ScoringProcessError
	section := &view.PublicationIntegrityDetails{Status: view.ScoringPassed}
	score.PublicationIntegrityDetails = section

	recomputeOverallStatus(score)

	if score.PublicationIntegrityDetails != section {
		t.Fatalf("an existing integrity section must not be replaced, got %#v", score.PublicationIntegrityDetails)
	}
}

func (f *processorFixture) addOtherTask() *inMemoryScore {
	otherLintTask := lintTask(view.TaskStatusWaitingForDocs, "")
	otherLintTask.Id = testOtherLintTaskId
	otherLintTask.Revision = testOtherRevision
	f.lintTasks.tasks[testOtherLintTaskId] = otherLintTask
	f.tasks.tasks[testOtherScoringTaskId] = &entity.VersionScoringTask{
		Id:                testOtherScoringTaskId,
		VersionLintTaskId: testOtherLintTaskId,
		PackageId:         testPackageId,
		Version:           testVersion,
		Revision:          testOtherRevision,
		Status:            view.TaskStatusProcessing,
		ExecutorId:        testExecutorId,
	}
	otherScore := &inMemoryScore{row: &entity.VersionScore{
		PackageId:                   testPackageId,
		Version:                     testVersion,
		Revision:                    testOtherRevision,
		Reasons:                     []string{},
		Debug:                       []string{},
		ScoringTaskId:               testOtherScoringTaskId,
		ProcessStatus:               view.ScoringProcessInProgress,
		PublicationIntegrityStatus:  view.ScoringProcessPending,
		BackwardCompatibilityStatus: view.ScoringProcessPending,
		QualityCheckStatus:          view.ScoringProcessPending,
	}}
	f.tasks.scores[testOtherRevision] = otherScore
	return otherScore
}

func (f *processorFixture) startRunsInBackground() (join func()) {
	var runs sync.WaitGroup
	f.processor.startRun = func(run func()) {
		runs.Add(1)
		go func() {
			defer runs.Done()
			run()
		}()
	}
	return runs.Wait
}

func (f *processorFixture) slotTaken(taskId string) bool {
	f.processor.runningTasksMu.Lock()
	defer f.processor.runningTasksMu.Unlock()
	return f.processor.runningTasks[taskId]
}

// waitFor reports a timeout with Errorf because the part goroutines call it too.
func waitFor(t *testing.T, what string, condition func() bool) {
	t.Helper()
	deadline := time.Now().Add(testWaitTimeout)
	for !condition() {
		if time.Now().After(deadline) {
			t.Errorf("timed out waiting for %s", what)
			return
		}
		time.Sleep(testPollInterval)
	}
}

func assertAttemptEnded(t *testing.T, f *processorFixture, wantStatus view.TaskStatus, wantRestarts int) {
	t.Helper()
	task := f.task()
	if task.Status != wantStatus || task.RestartCount != wantRestarts {
		t.Fatalf("task = %s with %d restarts (%q), want %s with %d", task.Status, task.RestartCount, task.Details, wantStatus, wantRestarts)
	}
	if f.slotTaken(testScoringTaskId) {
		t.Fatal("the slot of the task must be free after the attempt")
	}
}

func returning(err error) func() error { return func() error { return err } }

func panicking(message string) func() error { return func() error { panic(message) } }

func TestAttempt_TwoPartFailuresCountOnceAndTheNextAttemptRetriesBoth(t *testing.T) {
	const bwcFailure = "APIHUB unavailable"
	const qualityFailure = "connection reset"
	failures := []struct {
		name         string
		bwcFails     func() error
		qualityFails func() error
		wantDetails  []string
	}{
		{"two errors", returning(errors.New(bwcFailure)), returning(errors.New(qualityFailure)), []string{bwcFailure, qualityFailure}},
		{"child panic and quality error", panicking(bwcFailure), returning(errors.New(qualityFailure)), []string{"panic: " + bwcFailure, qualityFailure}},
		{"child error and quality panic", returning(errors.New(bwcFailure)), panicking(qualityFailure), []string{bwcFailure, "panic: " + qualityFailure}},
		{"both panics", panicking(bwcFailure), panicking(qualityFailure), []string{"panic: " + bwcFailure, "panic: " + qualityFailure}},
	}
	for _, failure := range failures {
		for _, bwcFirst := range []bool{true, false} {
			t.Run(fmt.Sprintf("%s, BWC first %t", failure.name, bwcFirst), func(t *testing.T) {
				f := newProcessorFixture()
				bwcFailed := make(chan struct{})
				qualityFailed := make(chan struct{})
				f.beforeBwc = func() error {
					defer close(bwcFailed)
					if !bwcFirst {
						<-qualityFailed
					}
					return failure.bwcFails()
				}
				f.lintTasks.beforeRead = func() error {
					defer close(qualityFailed)
					if bwcFirst {
						<-bwcFailed
					}
					return failure.qualityFails()
				}

				f.processor.processTick(context.Background())

				assertAttemptEnded(t, f, view.TaskStatusProcessing, 1)
				for _, want := range failure.wantDetails {
					if !strings.Contains(f.task().Details, want) {
						t.Fatalf("details = %q, want %q in them", f.task().Details, want)
					}
				}
				if f.score.writes != 0 {
					t.Fatalf("score written %d times, want 0", f.score.writes)
				}

				f.beforeBwc = nil
				f.lintTasks.beforeRead = nil
				f.lintTasks.tasks[testLintTaskId].Status = view.TaskStatusSuccess
				f.processor.processTick(context.Background())

				assertAttemptEnded(t, f, view.TaskStatusSuccess, 1)
				if row := f.score.get(); !row.PartsFinished() || row.ProcessStatus != view.ScoringProcessCompleted {
					t.Fatalf("both parts must be retried, got %#v", row)
				}
			})
		}
	}
}

func TestAttempt_BlockedBwcHoldsNeitherQualityNorOtherTasks(t *testing.T) {
	f := newProcessorFixture()
	otherScore := f.addOtherTask()
	f.addLintedDocument("a.yaml", testSpectralRuleset, "hash-a", 0, 0)
	release := make(chan struct{})
	var bwcStarts atomic.Int32
	f.beforeBwc = func() error {
		bwcStarts.Add(1)
		<-release
		return nil
	}
	join := f.startRunsInBackground()
	ctx := context.Background()

	f.processor.processTick(ctx)

	waitFor(t, "the quality snapshot behind a blocked BWC", func() bool {
		return f.score.get().QualityCheckStatus == view.ScoringProcessInProgress
	})
	waitFor(t, "the other task", func() bool {
		return otherScore.get().BackwardCompatibilityStatus == view.ScoringProcessCompleted && !f.slotTaken(testOtherScoringTaskId)
	})
	if row := f.score.get(); row.BackwardCompatibilityStatus != view.ScoringProcessPending {
		t.Fatalf("BWC = %s, want pending while it is blocked", row.BackwardCompatibilityStatus)
	}
	qualityReads := f.lintTasks.readCount(testLintTaskId)

	f.processor.processTick(ctx)
	time.Sleep(testSettleDelay)

	if bwcStarts.Load() != 1 || f.lintTasks.readCount(testLintTaskId) != qualityReads {
		t.Fatalf("BWC started %d times, quality reads %d, want one start and %d reads: a second attempt ran", bwcStarts.Load(), f.lintTasks.readCount(testLintTaskId), qualityReads)
	}

	f.docTasks.setTasks([]entity.DocumentLintTask{docTask("d1", "a.yaml", view.SpectralLinter, testSpectralRuleset, view.TaskStatusSuccess)})
	close(release)
	join()
	assertAttemptEnded(t, f, view.TaskStatusProcessing, 0)
	assertHandledIds(t, f)

	for range 2 {
		f.processor.processTick(ctx)
		join()
		if entries := f.score.get().QualityCheckDetails[view.RestApiType]; len(entries) != 1 {
			t.Fatalf("got %d entries, want the finished document once: %#v", len(entries), entries)
		}
		assertHandledIds(t, f, "d1")
	}
}

func TestAttempt_BlockedQualityHoldsCompletionAndTheSlot(t *testing.T) {
	f := newProcessorFixture()
	f.lintTasks.tasks[testLintTaskId].Status = view.TaskStatusSuccess
	release := make(chan struct{})
	f.lintTasks.beforeRead = func() error {
		<-release
		return nil
	}
	join := f.startRunsInBackground()

	f.processor.processTick(context.Background())

	waitFor(t, "BWC", func() bool {
		return f.score.get().BackwardCompatibilityStatus == view.ScoringProcessCompleted
	})
	time.Sleep(testSettleDelay)
	if task := f.task(); task.Status != view.TaskStatusProcessing || task.RestartCount != 0 || !f.slotTaken(testScoringTaskId) {
		t.Fatalf("task = %s with %d restarts, slot taken %t; want no decision before quality ends", task.Status, task.RestartCount, f.slotTaken(testScoringTaskId))
	}

	close(release)
	join()
	assertAttemptEnded(t, f, view.TaskStatusSuccess, 0)
}

func TestAttempt_EarlyQualityFailureWaitsForTheBlockedBwc(t *testing.T) {
	tests := []struct {
		name  string
		fails func() error
	}{
		{"error", returning(errors.New("connection reset"))},
		{"panic", panicking(testQualityPanic)},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newProcessorFixture()
			release := make(chan struct{})
			qualityFailed := make(chan struct{})
			f.beforeBwc = func() error {
				<-release
				return nil
			}
			f.lintTasks.beforeRead = func() error {
				defer close(qualityFailed)
				return tt.fails()
			}
			join := f.startRunsInBackground()

			f.processor.processTick(context.Background())

			<-qualityFailed
			time.Sleep(testSettleDelay)
			if task := f.task(); task.RestartCount != 0 || !f.slotTaken(testScoringTaskId) {
				t.Fatalf("%d restarts, slot taken %t; want no restart before the child is joined", task.RestartCount, f.slotTaken(testScoringTaskId))
			}

			close(release)
			join()
			assertAttemptEnded(t, f, view.TaskStatusProcessing, 1)
			if row := f.score.get(); row.BackwardCompatibilityStatus != view.ScoringProcessCompleted {
				t.Fatalf("BWC = %s, want the part of the child kept", row.BackwardCompatibilityStatus)
			}
		})
	}
}

func TestAttempt_EveryPartWriteOrderKeepsAllPartsAndCompletes(t *testing.T) {
	tests := []struct {
		name    string
		arrange func(t *testing.T, f *processorFixture, qualityWritten, bwcWritten func() bool)
	}{
		{
			name: "quality before integrity",
			arrange: func(t *testing.T, f *processorFixture, qualityWritten, _ func() bool) {
				f.beforeBwc = func() error {
					waitFor(t, "the quality write", qualityWritten)
					return nil
				}
			},
		},
		{
			name: "quality between integrity and BWC",
			arrange: func(t *testing.T, f *processorFixture, qualityWritten, _ func() bool) {
				f.apihub.getVersionChanges = func(int) (*view.VersionChangesView, error) {
					waitFor(t, "the quality write", qualityWritten)
					return &view.VersionChangesView{}, nil
				}
			},
		},
		{
			name: "quality after BWC",
			arrange: func(t *testing.T, f *processorFixture, _, bwcWritten func() bool) {
				f.lintTasks.beforeRead = func() error {
					waitFor(t, "the BWC write", bwcWritten)
					return nil
				}
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newProcessorFixture()
			f.lintTasks.tasks[testLintTaskId].Status = view.TaskStatusSuccess
			f.docTasks.tasks = []entity.DocumentLintTask{docTask("d1", "a.yaml", view.SpectralLinter, testSpectralRuleset, view.TaskStatusSuccess)}
			f.addLintedDocument("a.yaml", testSpectralRuleset, "hash-a", 0, 1)
			tt.arrange(t, f,
				func() bool { return f.score.get().QualityCheckStatus.IsTerminal() },
				func() bool { return f.score.get().BackwardCompatibilityStatus.IsTerminal() })

			f.processor.processTick(context.Background())

			assertAttemptEnded(t, f, view.TaskStatusSuccess, 0)
			assertHandledIds(t, f, "d1")
			row := f.score.get()
			if row.PublicationIntegrityDetails == nil || row.BackwardCompatibilityDetails == nil || len(row.QualityCheckDetails[view.RestApiType]) != 1 {
				t.Fatalf("a part was overwritten: %#v", row)
			}
			if row.ProcessStatus != view.ScoringProcessCompleted || row.Status != view.ScoringPassedWithDefects {
				t.Fatalf("score = %s %q, want completed and passed_with_defects", row.ProcessStatus, row.Status)
			}
			if !reflect.DeepEqual(row.Reasons, []string{"Version contain 1 warnings for linter spectral."}) || len(row.Debug) != 0 {
				t.Fatalf("reasons = %#v, debug = %#v", row.Reasons, row.Debug)
			}
		})
	}
}

func TestAttempt_ATickWithAStaleListReadsTheFreshRow(t *testing.T) {
	f := newQualityFixture()
	ctx := context.Background()
	f.docTasks.tasks = []entity.DocumentLintTask{docTask("d1", "a.yaml", view.SpectralLinter, testSpectralRuleset, view.TaskStatusSuccess)}
	f.addLintedDocument("a.yaml", testSpectralRuleset, "hash-a", 0, 0)
	f.tasks.listedTasks = []entity.VersionScoringTask{f.task()}

	f.processor.processTick(ctx)
	f.processor.processTick(ctx)

	if entries := f.score.get().QualityCheckDetails[view.RestApiType]; len(entries) != 1 {
		t.Fatalf("got %d entries, want the document once: %#v", len(entries), entries)
	}
	assertHandledIds(t, f, "d1")

	f.tasks.tasks[testScoringTaskId].RestartCount = repository.MaxScoringTaskRestarts
	reads := f.lintTasks.readCount(testLintTaskId)

	f.processor.processTick(ctx)

	assertAttemptEnded(t, f, view.TaskStatusError, repository.MaxScoringTaskRestarts)
	if f.lintTasks.readCount(testLintTaskId) != reads {
		t.Fatal("an exhausted task must be failed, not worked on")
	}
}

func TestAttempt_FailedReadsCountOnceAndRunNoPart(t *testing.T) {
	tests := []struct {
		name    string
		arrange func(f *processorFixture)
	}{
		{"task read error", func(f *processorFixture) { f.tasks.beforeGetTask = returning(errors.New("connection reset")) }},
		{"task read panic", func(f *processorFixture) { f.tasks.beforeGetTask = panicking("unexpected row") }},
		{"score read error", func(f *processorFixture) { f.scoreReads.err = errors.New("connection reset") }},
		{"score read panic", func(f *processorFixture) {
			f.scoreReads.beforeRead = func(int) error { panic("unexpected row") }
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newProcessorFixture()
			bwcStarted := false
			f.beforeBwc = func() error {
				bwcStarted = true
				return nil
			}
			tt.arrange(f)

			f.processor.processTick(context.Background())

			assertAttemptEnded(t, f, view.TaskStatusProcessing, 1)
			if bwcStarted || f.lintTasks.readCount(testLintTaskId) != 0 || f.score.writes != 0 {
				t.Fatalf("a part ran: BWC %t, quality reads %d, writes %d", bwcStarted, f.lintTasks.readCount(testLintTaskId), f.score.writes)
			}
		})
	}
}

func TestAttempt_TaskNoLongerOwnedEndsWithoutARestart(t *testing.T) {
	f := newProcessorFixture()
	f.tasks.listedTasks = []entity.VersionScoringTask{f.task()}
	f.tasks.setOwner(testScoringTaskId, testOtherExecutorId)

	f.processor.processTick(context.Background())

	assertAttemptEnded(t, f, view.TaskStatusProcessing, 0)
	if f.scoreReads.reads != 0 || f.score.writes != 0 {
		t.Fatalf("score reads %d, writes %d, want none", f.scoreReads.reads, f.score.writes)
	}
}

func TestAttempt_CompletionFailureIsCountedAndTheNextAttemptCompletes(t *testing.T) {
	tests := []struct {
		name  string
		fails func() error
	}{
		{"error", returning(errors.New("connection reset"))},
		{"panic", panicking("unexpected row")},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newProcessorFixture()
			f.lintTasks.tasks[testLintTaskId].Status = view.TaskStatusSuccess
			f.tasks.beforeComplete = tt.fails

			f.processor.processTick(context.Background())

			assertAttemptEnded(t, f, view.TaskStatusProcessing, 1)

			f.tasks.beforeComplete = nil
			f.processor.processTick(context.Background())

			assertAttemptEnded(t, f, view.TaskStatusSuccess, 1)
		})
	}
}

func TestAttempt_FailedIncrementHoldsTheSlotUntilItIsWritten(t *testing.T) {
	f := newProcessorFixture()
	f.beforeBwc = returning(errors.New("APIHUB unavailable"))
	release := make(chan struct{})
	var increments atomic.Int32
	f.tasks.beforeInc = func() error {
		if increments.Add(1) == 1 {
			return errors.New("connection reset")
		}
		<-release
		return nil
	}
	join := f.startRunsInBackground()

	f.processor.processTick(context.Background())

	waitFor(t, "the retry of the increment", func() bool { return increments.Load() == 2 })
	reads := f.lintTasks.readCount(testLintTaskId)
	f.processor.processTick(context.Background())
	time.Sleep(testSettleDelay)
	if f.lintTasks.readCount(testLintTaskId) != reads || !f.slotTaken(testScoringTaskId) || f.task().RestartCount != 0 {
		t.Fatalf("quality reads %d (want %d), slot taken %t, %d restarts: an attempt started while a failure was unrecorded",
			f.lintTasks.readCount(testLintTaskId), reads, f.slotTaken(testScoringTaskId), f.task().RestartCount)
	}

	close(release)
	join()
	assertAttemptEnded(t, f, view.TaskStatusProcessing, 1)
}

func TestAttempt_RefusedIncrementEndsTheAttempt(t *testing.T) {
	tests := []struct {
		name           string
		arrange        func(f *processorFixture)
		wantIncrements int32
	}{
		{
			name: "ownership lost during the attempt",
			arrange: func(f *processorFixture) {
				f.beforeBwc = func() error {
					f.tasks.setOwner(testScoringTaskId, testOtherExecutorId)
					return errors.New("APIHUB unavailable")
				}
			},
			wantIncrements: 1,
		},
		{
			name: "ownership lost while the restart count update is pending",
			arrange: func(f *processorFixture) {
				f.beforeBwc = returning(errors.New("APIHUB unavailable"))
				countIncrement := f.tasks.beforeInc
				failed := false
				f.tasks.beforeInc = func() error {
					if err := countIncrement(); err != nil {
						return err
					}
					if failed {
						return nil
					}
					failed = true
					f.tasks.setOwner(testScoringTaskId, testOtherExecutorId)
					return errors.New("connection reset")
				}
			},
			wantIncrements: 2,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newProcessorFixture()
			f.score.row.QualityCheckStatus = view.ScoringProcessCompleted
			var increments atomic.Int32
			f.tasks.beforeInc = func() error {
				increments.Add(1)
				return nil
			}
			tt.arrange(f)

			f.processor.processTick(context.Background())

			assertAttemptEnded(t, f, view.TaskStatusProcessing, 0)
			if increments.Load() != tt.wantIncrements {
				t.Fatalf("%d increments, want %d", increments.Load(), tt.wantIncrements)
			}
			if f.task().ExecutorId != testOtherExecutorId {
				t.Fatalf("executor = %s, want the new owner", f.task().ExecutorId)
			}
		})
	}
}

func TestAttempt_RefusedWriteIsNeverCounted(t *testing.T) {
	tests := []struct {
		name           string
		bwcRefused     bool
		refusalArrives bool
	}{
		{name: "BWC refused first, quality fails", bwcRefused: true, refusalArrives: true},
		{name: "quality fails first, BWC refused", bwcRefused: true},
		{name: "quality refused first, BWC fails", refusalArrives: true},
		{name: "BWC fails first, quality refused"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newProcessorFixture()
			first := make(chan struct{})
			refusal := func() (bool, error) {
				if tt.refusalArrives {
					defer close(first)
				} else {
					<-first
				}
				return true, nil
			}
			failure := func() error {
				if tt.refusalArrives {
					<-first
				} else {
					defer close(first)
				}
				return errors.New("part failed")
			}
			if tt.bwcRefused {
				f.tasks.updateScoreFault = refusal
				f.lintTasks.beforeRead = failure
			} else {
				f.tasks.updateQualityFault = refusal
				f.beforeBwc = failure
			}
			var increments atomic.Int32
			f.tasks.beforeInc = func() error {
				increments.Add(1)
				return nil
			}

			f.processor.processTick(context.Background())

			assertAttemptEnded(t, f, view.TaskStatusProcessing, 0)
			if increments.Load() != 0 {
				t.Fatalf("%d increments, want none", increments.Load())
			}
		})
	}
}

func TestAttempt_PartDatabaseErrorIsNotARefusal(t *testing.T) {
	tests := []struct {
		name    string
		arrange func(f *processorFixture)
	}{
		{"integrity or BWC write", func(f *processorFixture) {
			f.tasks.updateScoreFault = func() (bool, error) { return false, errors.New("connection reset") }
		}},
		{"quality write", func(f *processorFixture) {
			f.tasks.updateQualityFault = func() (bool, error) { return false, errors.New("connection reset") }
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newProcessorFixture()
			tt.arrange(f)

			f.processor.processTick(context.Background())

			assertAttemptEnded(t, f, view.TaskStatusProcessing, 1)
		})
	}
}

func TestAttempt_QualityWithNothingNewKeepsTheScoreAndTheAttemptContinues(t *testing.T) {
	f := newProcessorFixture()
	f.score.row.QualityCheckStatus = view.ScoringProcessInProgress
	f.score.row.QualityCheckDetails = map[view.OpApiType][]view.QualityCheckDetails{view.RestApiType: {{Linter: view.SpectralLinter, Status: view.ScoringPassed}}}

	f.processor.processTick(context.Background())

	assertAttemptEnded(t, f, view.TaskStatusProcessing, 0)
	row := f.score.get()
	if row.BackwardCompatibilityStatus != view.ScoringProcessCompleted || len(row.QualityCheckDetails[view.RestApiType]) != 1 {
		t.Fatalf("score = %#v, want BWC written and the quality entry kept", row)
	}
	if f.scoreReads.reads != 2 {
		t.Fatalf("%d score reads, want 2: the attempt must reach the read after the parts", f.scoreReads.reads)
	}
}

func TestAttempt_ScoreReadAfterTheParts(t *testing.T) {
	tests := []struct {
		name            string
		arrange         func(f *processorFixture)
		wantStatus      view.TaskStatus
		wantRestarts    int
		wantNextDetails string
	}{
		{
			name:       "both parts terminal",
			arrange:    func(f *processorFixture) { f.lintTasks.tasks[testLintTaskId].Status = view.TaskStatusSuccess },
			wantStatus: view.TaskStatusSuccess,
		},
		{
			name:       "quality unfinished",
			arrange:    func(f *processorFixture) {},
			wantStatus: view.TaskStatusProcessing,
		},
		{
			name: "read error",
			arrange: func(f *processorFixture) {
				f.lintTasks.tasks[testLintTaskId].Status = view.TaskStatusSuccess
				f.scoreReads.beforeRead = func(read int) error {
					if read == 2 {
						return errors.New("connection reset")
					}
					return nil
				}
			},
			wantStatus:   view.TaskStatusProcessing,
			wantRestarts: 1,
		},
		{
			name: "row deleted",
			arrange: func(f *processorFixture) {
				f.lintTasks.tasks[testLintTaskId].Status = view.TaskStatusSuccess
				f.scoreReads.beforeRead = func(read int) error {
					if read == 2 {
						f.score.delete()
					}
					return nil
				}
			},
			wantStatus:      view.TaskStatusProcessing,
			wantNextDetails: "score row missing",
		},
		{
			name: "row replaced",
			arrange: func(f *processorFixture) {
				f.lintTasks.tasks[testLintTaskId].Status = view.TaskStatusSuccess
				f.scoreReads.beforeRead = func(read int) error {
					if read == 2 {
						f.score.replaceTaskId(testSupersedingTaskId)
					}
					return nil
				}
			},
			wantStatus:      view.TaskStatusProcessing,
			wantNextDetails: testSupersededDetails,
		},
		{
			name: "reset after the read",
			arrange: func(f *processorFixture) {
				f.lintTasks.tasks[testLintTaskId].Status = view.TaskStatusSuccess
				f.tasks.beforeComplete = func() error {
					f.score.replaceTaskId(testSupersedingTaskId)
					return nil
				}
			},
			wantStatus:      view.TaskStatusProcessing,
			wantNextDetails: testSupersededDetails,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newProcessorFixture()
			tt.arrange(f)

			f.processor.processTick(context.Background())

			assertAttemptEnded(t, f, tt.wantStatus, tt.wantRestarts)
			if tt.wantNextDetails == "" {
				return
			}
			f.processor.processTick(context.Background())
			assertAttemptEnded(t, f, view.TaskStatusError, tt.wantRestarts)
			if f.task().Details != tt.wantNextDetails {
				t.Fatalf("details = %q, want %q", f.task().Details, tt.wantNextDetails)
			}
		})
	}
}

func TestAttempt_SupersededWhileRunningIsCountedAndClosedByTheNextAttempt(t *testing.T) {
	f := newProcessorFixture()
	f.score.row.QualityCheckStatus = view.ScoringProcessCompleted
	f.beforeBwc = func() error {
		f.score.replaceTaskId(testSupersedingTaskId)
		return errors.New("APIHUB unavailable")
	}

	f.processor.processTick(context.Background())

	assertAttemptEnded(t, f, view.TaskStatusProcessing, 1)

	f.processor.processTick(context.Background())

	assertAttemptEnded(t, f, view.TaskStatusError, 1)
	if f.task().Details != testSupersededDetails {
		t.Fatalf("details = %q, want %q", f.task().Details, testSupersededDetails)
	}
}

func TestAttempt_TaskExhaustedByATakeoverWhileAlive(t *testing.T) {
	blockChild := func(f *processorFixture, release <-chan struct{}) func() bool {
		f.beforeBwc = func() error {
			<-release
			return nil
		}
		return func() bool { return f.score.get().QualityCheckStatus.IsTerminal() }
	}
	blockQuality := func(f *processorFixture, release <-chan struct{}) func() bool {
		f.lintTasks.beforeRead = func() error {
			<-release
			return nil
		}
		return func() bool { return f.score.get().BackwardCompatibilityStatus.IsTerminal() }
	}
	tests := []struct {
		name         string
		block        func(f *processorFixture, release <-chan struct{}) func() bool
		terminalPart func(row *entity.VersionScore) view.ScoringProcessStatus
		blockedPart  func(row *entity.VersionScore) view.ScoringProcessStatus
	}{
		{
			name:         "child blocked",
			block:        blockChild,
			terminalPart: func(row *entity.VersionScore) view.ScoringProcessStatus { return row.QualityCheckStatus },
			blockedPart:  func(row *entity.VersionScore) view.ScoringProcessStatus { return row.BackwardCompatibilityStatus },
		},
		{
			name:         "quality blocked",
			block:        blockQuality,
			terminalPart: func(row *entity.VersionScore) view.ScoringProcessStatus { return row.BackwardCompatibilityStatus },
			blockedPart:  func(row *entity.VersionScore) view.ScoringProcessStatus { return row.QualityCheckStatus },
		},
	}
	arrange := func(block func(f *processorFixture, release <-chan struct{}) func() bool) (*processorFixture, chan struct{}, func()) {
		f := newProcessorFixture()
		f.lintTasks.tasks[testLintTaskId].Status = view.TaskStatusSuccess
		f.tasks.tasks[testScoringTaskId].RestartCount = repository.MaxScoringTaskRestarts - 1
		f.tasks.free = []string{testScoringTaskId}
		release := make(chan struct{})
		terminalWritten := block(f, release)
		join := f.startRunsInBackground()
		f.processor.processTick(context.Background())
		waitFor(t, "the part that is not blocked", terminalWritten)
		return f, release, join
	}

	for _, tt := range tests {
		t.Run(tt.name+", failure committed", func(t *testing.T) {
			f, release, join := arrange(tt.block)

			f.processor.acquireTasks(context.Background())

			row := f.score.get()
			if tt.terminalPart(row) != view.ScoringProcessCompleted || tt.blockedPart(row) != view.ScoringProcessError {
				t.Fatalf("terminal part = %s, blocked part = %s, want completed and error", tt.terminalPart(row), tt.blockedPart(row))
			}
			writes := f.score.writeCount()

			close(release)
			join()

			assertAttemptEnded(t, f, view.TaskStatusError, repository.MaxScoringTaskRestarts)
			if f.score.writeCount() != writes || !reflect.DeepEqual(f.score.get(), row) {
				t.Fatalf("the committed failure must fence later writes, got %#v", f.score.get())
			}
		})

		t.Run(tt.name+", failure write fails and the attempt completes", func(t *testing.T) {
			f, release, join := arrange(tt.block)
			f.tasks.scoringFailedErrs = []error{errors.New("connection reset")}

			f.processor.acquireTasks(context.Background())

			if f.task().Status != view.TaskStatusProcessing {
				t.Fatalf("task status = %s, want processing after a failed failure write", f.task().Status)
			}

			close(release)
			join()

			assertAttemptEnded(t, f, view.TaskStatusSuccess, repository.MaxScoringTaskRestarts)
			if row := f.score.get(); tt.terminalPart(row) != view.ScoringProcessCompleted || tt.blockedPart(row) != view.ScoringProcessCompleted {
				t.Fatalf("terminal part = %s, blocked part = %s, want both completed", tt.terminalPart(row), tt.blockedPart(row))
			}
		})
	}

	t.Run("failure write fails and the next attempt retries it", func(t *testing.T) {
		f, release, join := arrange(blockChild)
		f.lintTasks.mu.Lock()
		f.lintTasks.tasks[testLintTaskId].Status = view.TaskStatusWaitingForDocs
		f.lintTasks.mu.Unlock()
		f.score.mu.Lock()
		f.score.row.QualityCheckStatus = view.ScoringProcessInProgress
		f.score.mu.Unlock()
		f.tasks.scoringFailedErrs = []error{errors.New("connection reset")}

		f.processor.acquireTasks(context.Background())

		close(release)
		join()
		assertAttemptEnded(t, f, view.TaskStatusProcessing, repository.MaxScoringTaskRestarts)
		if row := f.score.get(); row.BackwardCompatibilityStatus != view.ScoringProcessCompleted {
			t.Fatalf("BWC = %s, want the surviving attempt to write it", row.BackwardCompatibilityStatus)
		}

		f.processor.processTick(context.Background())
		join()

		assertAttemptEnded(t, f, view.TaskStatusError, repository.MaxScoringTaskRestarts)
	})
}

func TestAcquireTasks_ExpiredLeaseCountsAsAnAttempt(t *testing.T) {
	const lastError = "failed to get version content: timeout"
	tests := []struct {
		name         string
		status       view.TaskStatus
		restartCount int
		wantStatus   view.TaskStatus
		wantRestarts int
		wantDetails  string
	}{
		{
			name:        "first claim",
			status:      view.TaskStatusNotStarted,
			wantStatus:  view.TaskStatusProcessing,
			wantDetails: lastError,
		},
		{
			name:         "first takeover",
			status:       view.TaskStatusProcessing,
			wantStatus:   view.TaskStatusProcessing,
			wantRestarts: 1,
			wantDetails:  lastError,
		},
		{
			name:         "second takeover gives the task up",
			status:       view.TaskStatusProcessing,
			restartCount: repository.MaxScoringTaskRestarts - 1,
			wantStatus:   view.TaskStatusError,
			wantRestarts: repository.MaxScoringTaskRestarts,
			wantDetails:  "restart count exceeded limit, last error: " + lastError,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newProcessorFixture()
			task := f.tasks.tasks[testScoringTaskId]
			task.Status = tt.status
			task.RestartCount = tt.restartCount
			task.Details = lastError
			f.tasks.free = []string{testScoringTaskId}

			f.processor.acquireTasks(context.Background())

			assertAttemptEnded(t, f, tt.wantStatus, tt.wantRestarts)
			if f.task().Details != tt.wantDetails {
				t.Fatalf("details = %q, want %q", f.task().Details, tt.wantDetails)
			}
			if f.lintTasks.readCount(testLintTaskId) != 0 {
				t.Fatal("the acquire loop must start no attempt")
			}
		})
	}
}
