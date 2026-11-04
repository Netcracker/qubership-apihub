package service

import (
	"context"
	"errors"
	"fmt"
	"reflect"
	"slices"
	"sort"
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

	previousVersionErr error
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
		return &view.VersionContent{
			PackageId:       packageId,
			Version:         version,
			PreviousVersion: testPreviousVersion,
			OperationTypes:  []view.VersionOperationType{{ApiType: view.RestApiType}},
		}, nil
	}}
	f.processor = &scoringTaskProcessorImpl{
		scoringTaskRepo:     f.tasks,
		scoringRepo:         &scoringRepoStub{scores: scores},
		verTaskRepo:         f.lintTasks,
		docTaskRepo:         f.docTasks,
		versionResultRepo:   f.verResults,
		lintResultRepo:      f.lintResults,
		rulesetRepo:         f.rulesets,
		linterConfigService: f.linters,
		apihubClient:        f.apihub,
		executorId:          testExecutorId,
		runningBwc:          make(map[string]bool),
		startBwcRun:         func(run func()) { run() },
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

	f.processor.runIntegrityAndBwcChecks(context.Background(), f.task(), *f.score.get())

	if f.score.writes != 0 {
		t.Fatalf("score written %d times, want 0", f.score.writes)
	}
	if f.task().RestartCount != 1 {
		t.Fatalf("restart count = %d, want 1", f.task().RestartCount)
	}
}

func TestRunIntegrityAndBwc_PanicCountsAsFailedAttempt(t *testing.T) {
	f := newProcessorFixture()
	f.apihub.getVersion = func(string, string) (*view.VersionContent, error) { panic("unexpected response") }

	f.processor.runIntegrityAndBwcChecks(context.Background(), f.task(), *f.score.get())

	if f.task().RestartCount != 1 {
		t.Fatalf("restart count = %d, want 1", f.task().RestartCount)
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

	f.processor.runIntegrityAndBwcChecks(context.Background(), f.task(), snapshot)

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

	f.processor.runIntegrityAndBwcChecks(context.Background(), f.task(), *f.score.get())

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

	f.processor.runIntegrityAndBwcChecks(context.Background(), task, *f.score.get())

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

	f.processor.runIntegrityAndBwcChecks(context.Background(), f.task(), stale)

	if f.score.get().PublicationIntegrityDetails != written {
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
