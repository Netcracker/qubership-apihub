package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"reflect"
	"slices"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/entity"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/repository"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/utils"
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

	testValidationProcessId      = "process-1"
	testOtherValidationProcessId = "process-other"
	testSupersedingProcessId     = "process-2"
	testSupersededDetails        = "superseded by validation process " + testSupersedingProcessId

	testWaitTimeout               = 5 * time.Second
	testPollInterval              = time.Millisecond
	testSettleDelay               = 20 * time.Millisecond
	testRestartCountRetryInterval = time.Millisecond
	testAttemptTimeout            = 50 * time.Millisecond
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
			PackageId:           testPackageId,
			Version:             testVersion,
			Revision:            testRevision,
			Status:              "",
			Reasons:             []string{},
			ValidationProcessId: testValidationProcessId,
			ProcessDetails:      startedProcessDetails(),
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
				Id:                  testScoringTaskId,
				ValidationProcessId: testValidationProcessId,
				PackageId:           testPackageId,
				Version:             testVersion,
				Revision:            testRevision,
				Status:              view.TaskStatusProcessing,
				ExecutorId:          testExecutorId,
			},
		},
	}
	f.apihub = &apihubClientStub{getVersion: func(_ context.Context, packageId, version string) (*view.VersionContent, error) {
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
		attemptSlots:              make(chan struct{}, maxConcurrentScoringAttempts),
		startRun:                  func(run func()) { run() },
		attemptTimeout:            scoringAttemptTimeout,
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
		integrityAtBwcStart = append(integrityAtBwcStart, f.score.get().ProcessDetails.PublicationIntegrity.ProcessStatus)
		return &view.VersionChangesView{}, nil
	}

	f.processor.processTick(context.Background())

	if len(integrityAtBwcStart) == 0 {
		t.Fatal("BWC did not request the changes")
	}
	for _, status := range integrityAtBwcStart {
		if status != view.ScoringProcessSuccess {
			t.Fatalf("integrity was %s in the stored row when BWC started, want success", status)
		}
	}
}

func TestProcessTick_BwcAttemptErrorIsRetriedOnTheNextTick(t *testing.T) {
	f := newProcessorFixture()
	f.previousVersionErr = errors.New("APIHUB unavailable")

	f.processor.processTick(context.Background())

	row := f.score.get()
	if row.ProcessDetails.BackwardsCompatibility.ProcessStatus != view.ScoringProcessNotStarted || row.ProcessDetails.BackwardsCompatibility.Details != nil {
		t.Fatalf("BWC = %s %#v, want not_started without a section after an attempt error", row.ProcessDetails.BackwardsCompatibility.ProcessStatus, row.ProcessDetails.BackwardsCompatibility.Details)
	}
	if f.task().RestartCount != 1 {
		t.Fatalf("restart count = %d, want 1", f.task().RestartCount)
	}

	f.previousVersionErr = nil
	f.processor.processTick(context.Background())

	row = f.score.get()
	if row.ProcessDetails.BackwardsCompatibility.ProcessStatus != view.ScoringProcessSuccess || row.ProcessDetails.BackwardsCompatibility.Details == nil {
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
			if row.ProcessDetails.BackwardsCompatibility.ProcessStatus != view.ScoringProcessNotStarted || row.ProcessDetails.BackwardsCompatibility.Details != nil {
				t.Fatalf("BWC = %s %#v, want no verdict after an operation list error", row.ProcessDetails.BackwardsCompatibility.ProcessStatus, row.ProcessDetails.BackwardsCompatibility.Details)
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
			if row.ProcessDetails.BackwardsCompatibility.ProcessStatus != view.ScoringProcessNotStarted || row.ProcessDetails.BackwardsCompatibility.Details != nil {
				t.Fatalf("BWC = %s %#v, want no verdict after a missing changes page", row.ProcessDetails.BackwardsCompatibility.ProcessStatus, row.ProcessDetails.BackwardsCompatibility.Details)
			}
			if f.task().RestartCount != 1 {
				t.Fatalf("restart count = %d, want 1", f.task().RestartCount)
			}
		})
	}
}

func TestRunIntegrityAndBwc_FetchErrorWritesNothing(t *testing.T) {
	f := newProcessorFixture()
	f.apihub.getVersion = func(context.Context, string, string) (*view.VersionContent, error) { return nil, nil }

	refused, err, attemptErrors := f.processor.runIntegrityAndBwcChecks(context.Background(), f.task(), *f.score.get())

	if refused || err == nil {
		t.Fatalf("refused = %t, err = %v, want an error", refused, err)
	}
	if attemptErrors.PublicationIntegrity != err.Error() || attemptErrors.BackwardsCompatibility != err.Error() {
		t.Fatalf("attemptErrors = %#v, want both integrity and BWC attributed to %q", attemptErrors, err.Error())
	}
	if f.score.writes != 0 {
		t.Fatalf("score written %d times, want 0", f.score.writes)
	}
}

func TestRunIntegrityAndBwc_PanicIsReturnedAsAnError(t *testing.T) {
	f := newProcessorFixture()
	f.apihub.getVersion = func(context.Context, string, string) (*view.VersionContent, error) { panic("unexpected response") }

	refused, err, attemptErrors := f.processor.runIntegrityAndBwcChecks(context.Background(), f.task(), *f.score.get())

	if refused || err == nil || err.Error() != "panic: unexpected response" {
		t.Fatalf("refused = %t, err = %v, want the panic as an error", refused, err)
	}
	if attemptErrors.PublicationIntegrity != err.Error() || attemptErrors.BackwardsCompatibility != err.Error() {
		t.Fatalf("attemptErrors = %#v, want panic attributed to unfinished checks", attemptErrors)
	}
	if f.task().RestartCount != 0 {
		t.Fatalf("restart count = %d, want 0: only the attempt increments it", f.task().RestartCount)
	}
}

func TestProcessTick_ExhaustedTaskFailsUnfinishedPartsAndKeepsTerminalOnes(t *testing.T) {
	f := newProcessorFixture()
	f.tasks.tasks[testScoringTaskId].RestartCount = repository.MaxScoringTaskRestarts
	f.tasks.tasks[testScoringTaskId].Details = "failed to get version content: timeout"
	qualityDetails := map[view.OpApiType][]view.QualityCheckDetails{view.RestApiType: {{Linter: view.SpectralLinter, Status: view.ScoringPassed}}}
	f.score.row.ProcessDetails.QualityCheck.ProcessStatus = view.ScoringProcessSuccess
	f.score.row.ProcessDetails.QualityCheck.Details = qualityDetails

	f.processor.processTick(context.Background())

	task := f.task()
	wantDetails := "restart count exceeded limit, last error: failed to get version content: timeout"
	if task.Status != view.TaskStatusError || task.Details != wantDetails {
		t.Fatalf("task = %s %q, want error %q", task.Status, task.Details, wantDetails)
	}
	row := f.score.get()
	if row.ProcessDetails.ProcessStatus != view.ScoringProcessError {
		t.Fatalf("process status = %s, want error", row.ProcessDetails.ProcessStatus)
	}
	wantDebug := []string{"scoring task failed: " + wantDetails}
	if !slices.Equal(row.ProcessDetails.Debug, wantDebug) || !slices.Equal(row.FlattenDebug(), wantDebug) {
		t.Fatalf("debug = %#v / flat %#v, want %#v with each line once", row.ProcessDetails.Debug, row.FlattenDebug(), wantDebug)
	}
	if integrity := row.ProcessDetails.PublicationIntegrity; integrity.ProcessStatus != view.ScoringProcessError || integrity.Details != nil {
		t.Fatalf("integrity = %s %#v, want error without details", integrity.ProcessStatus, integrity.Details)
	}
	if bwc := row.ProcessDetails.BackwardsCompatibility; bwc.ProcessStatus != view.ScoringProcessError || bwc.Details != nil {
		t.Fatalf("BWC = %s %#v, want error without details", bwc.ProcessStatus, bwc.Details)
	}
	if wantReasons := []string{bwcInternalErrorReason, entity.VersionContentInternalErrorReason}; !slices.Equal(row.Reasons, wantReasons) {
		t.Fatalf("reasons = %#v, want %#v", row.Reasons, wantReasons)
	}
	if row.ProcessDetails.QualityCheck.ProcessStatus != view.ScoringProcessSuccess || len(row.ProcessDetails.QualityCheck.Details[view.RestApiType]) != 1 {
		t.Fatalf("a terminal quality part must be kept: %s %#v", row.ProcessDetails.QualityCheck.ProcessStatus, row.ProcessDetails.QualityCheck.Details)
	}
	if row.Status != view.ScoringNotPassed {
		t.Fatalf("status = %q, want not_passed", row.Status)
	}
}

func TestProcessTick_ExhaustedTaskWithFinishedPartsEndsInError(t *testing.T) {
	const lastError = "failed to complete the score: connection reset"
	const failureText = "scoring task failed: restart count exceeded limit, last error: " + lastError
	tests := []struct {
		name       string
		modify     func(row *entity.VersionScore)
		wantStatus view.ScoringStatus
		wantDebug  []string
	}{
		{
			name:       "all parts success",
			modify:     func(row *entity.VersionScore) {},
			wantStatus: view.ScoringPassed,
			wantDebug:  []string{failureText},
		},
		{
			name: "quality error with another text",
			modify: func(row *entity.VersionScore) {
				row.ProcessDetails.QualityCheck.ProcessStatus = view.ScoringProcessError
				row.ProcessDetails.QualityCheck.Debug = []string{"lint task failed: x"}
			},
			wantStatus: view.ScoringNotPassed,
			wantDebug:  []string{"qualityCheck: lint task failed: x", failureText},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newProcessorFixture()
			f.tasks.tasks[testScoringTaskId].RestartCount = repository.MaxScoringTaskRestarts
			f.tasks.tasks[testScoringTaskId].Details = lastError
			finished := finishedScore()
			f.score.row.ProcessDetails.PublicationIntegrity.ProcessStatus = finished.ProcessDetails.PublicationIntegrity.ProcessStatus
			f.score.row.ProcessDetails.PublicationIntegrity.Details = finished.ProcessDetails.PublicationIntegrity.Details
			f.score.row.ProcessDetails.BackwardsCompatibility.ProcessStatus = finished.ProcessDetails.BackwardsCompatibility.ProcessStatus
			f.score.row.ProcessDetails.BackwardsCompatibility.Details = finished.ProcessDetails.BackwardsCompatibility.Details
			f.score.row.ProcessDetails.QualityCheck.ProcessStatus = finished.ProcessDetails.QualityCheck.ProcessStatus
			f.score.row.ProcessDetails.QualityCheck.Details = finished.ProcessDetails.QualityCheck.Details
			tt.modify(f.score.row)

			f.processor.processTick(context.Background())

			if task := f.task(); task.Status != view.TaskStatusError {
				t.Fatalf("task status = %s, want error", task.Status)
			}
			row := f.score.get()
			if row.ProcessDetails.ProcessStatus != view.ScoringProcessError {
				t.Fatalf("process status = %s, want error", row.ProcessDetails.ProcessStatus)
			}
			if row.Status != tt.wantStatus {
				t.Fatalf("status = %q, want %q computed from the parts", row.Status, tt.wantStatus)
			}
			if !slices.Equal(row.ProcessDetails.Debug, []string{failureText}) {
				t.Fatalf("process debug = %#v, want %#v", row.ProcessDetails.Debug, []string{failureText})
			}
			if !slices.Equal(row.FlattenDebug(), tt.wantDebug) {
				t.Fatalf("flat debug = %#v, want %#v", row.FlattenDebug(), tt.wantDebug)
			}
		})
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
	tests := []struct {
		name         string
		lintErrors   float64
		wantStatus   view.ScoringStatus
		retryDetails string
	}{
		{name: "passed", wantStatus: view.ScoringPassed},
		{name: "not passed after a failed attempt", lintErrors: 2, wantStatus: view.ScoringNotPassed, retryDetails: "failed to get version content: timeout"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newProcessorFixture()
			f.lintTasks.tasks[testLintTaskId].Status = view.TaskStatusSuccess
			f.docTasks.tasks = []entity.DocumentLintTask{docTask("d1", "a.yaml", view.SpectralLinter, testSpectralRuleset, view.TaskStatusSuccess)}
			f.addLintedDocument("a.yaml", testSpectralRuleset, "hash-a", tt.lintErrors, 0)
			f.tasks.tasks[testScoringTaskId].RestartCount = 1
			f.tasks.tasks[testScoringTaskId].Details = tt.retryDetails

			f.processor.processTick(context.Background())

			if task := f.task(); task.Status != view.TaskStatusSuccess || task.Details != "" {
				t.Fatalf("task = %s %q, want success with empty details", task.Status, task.Details)
			}
			row := f.score.get()
			if row.ProcessDetails.ProcessStatus != view.ScoringProcessSuccess || row.Status != tt.wantStatus {
				t.Fatalf("score = %s %q, want success and %s", row.ProcessDetails.ProcessStatus, row.Status, tt.wantStatus)
			}
		})
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
			modify:      func(score *inMemoryScore) { score.row.ValidationProcessId = testSupersedingProcessId },
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
			modify:       func(score *inMemoryScore) { score.row.ValidationProcessId = testSupersedingProcessId },
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
				f.score.row.ProcessDetails.PublicationIntegrity.ProcessStatus = view.ScoringProcessSuccess
				f.score.row.ProcessDetails.BackwardsCompatibility.ProcessStatus = view.ScoringProcessSuccess
				f.docTasks.tasks = append(f.docTasks.tasks, docTask("d1", "a.yaml", view.SpectralLinter, testSpectralRuleset, view.TaskStatusSuccess))
				f.addLintedDocument("a.yaml", testSpectralRuleset, "hash-a", 0, 0)
			},
		},
		{
			name: "completion",
			prepare: func(f *processorFixture) {
				f.score.row.ProcessDetails.PublicationIntegrity.ProcessStatus = view.ScoringProcessSuccess
				f.score.row.ProcessDetails.BackwardsCompatibility.ProcessStatus = view.ScoringProcessSuccess
				f.score.row.ProcessDetails.QualityCheck.ProcessStatus = view.ScoringProcessSuccess
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
			f.score.row.ValidationProcessId = testSupersedingProcessId
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
	f.score.row.ValidationProcessId = testSupersedingProcessId

	refused, err, _ := f.processor.runIntegrityAndBwcChecks(context.Background(), f.task(), snapshot)

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
		f.score.row.ValidationProcessId = testSupersedingProcessId
		return &view.VersionChangesView{}, nil
	}

	refused, err, _ := f.processor.runIntegrityAndBwcChecks(context.Background(), f.task(), *f.score.get())

	if !refused || err != nil {
		t.Fatalf("refused = %t, err = %v, want a refusal", refused, err)
	}
	row := f.score.get()
	if f.score.writes != 1 || row.ProcessDetails.BackwardsCompatibility.ProcessStatus != view.ScoringProcessNotStarted {
		t.Fatalf("score written %d times with BWC %s, want only the integrity write", f.score.writes, row.ProcessDetails.BackwardsCompatibility.ProcessStatus)
	}
	if task := f.task(); task.Status != view.TaskStatusProcessing || task.RestartCount != 0 {
		t.Fatalf("task = %s with %d restarts, want processing with 0", task.Status, task.RestartCount)
	}
}

func TestRunIntegrityAndBwc_LostOwnershipWritesNothing(t *testing.T) {
	f := newProcessorFixture()
	task := f.task()
	f.tasks.tasks[testScoringTaskId].ExecutorId = testOtherExecutorId

	refused, err, _ := f.processor.runIntegrityAndBwcChecks(context.Background(), task, *f.score.get())

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
	f.score.row.ProcessDetails.PublicationIntegrity.ProcessStatus = view.ScoringProcessSuccess
	f.score.row.ProcessDetails.PublicationIntegrity.Details = written

	if _, err, _ := f.processor.runIntegrityAndBwcChecks(context.Background(), f.task(), stale); err != nil {
		t.Fatalf("unexpected error: %s", err)
	}

	if f.score.get().ProcessDetails.PublicationIntegrity.Details.Reason != written.Reason {
		t.Fatalf("a terminal integrity part was rewritten: %#v", f.score.get().ProcessDetails.PublicationIntegrity.Details)
	}
}

func newQualityFixture() *processorFixture {
	f := newProcessorFixture()
	f.score.row.ProcessDetails.PublicationIntegrity.ProcessStatus = view.ScoringProcessSuccess
	f.score.row.ProcessDetails.BackwardsCompatibility.ProcessStatus = view.ScoringProcessSuccess
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
	if row.ProcessDetails.QualityCheck.ProcessStatus != view.ScoringProcessProcessing || row.ProcessDetails.QualityCheck.Details == nil || len(row.ProcessDetails.QualityCheck.Details) != 0 {
		t.Fatalf("tick 1: quality = %s %#v, want processing with an empty map", row.ProcessDetails.QualityCheck.ProcessStatus, row.ProcessDetails.QualityCheck.Details)
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
	if row.ProcessDetails.QualityCheck.ProcessStatus != view.ScoringProcessProcessing || len(row.ProcessDetails.QualityCheck.Details[view.RestApiType]) != 1 {
		t.Fatalf("tick 3: quality = %s %#v, want processing with one entry", row.ProcessDetails.QualityCheck.ProcessStatus, row.ProcessDetails.QualityCheck.Details)
	}
	if row.ProcessDetails.ProcessStatus != view.ScoringProcessProcessing || row.Status != "" {
		t.Fatalf("tick 3: score = %s %q, want processing with an empty status", row.ProcessDetails.ProcessStatus, row.Status)
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
	if row.ProcessDetails.QualityCheck.ProcessStatus != view.ScoringProcessError || len(row.ProcessDetails.QualityCheck.Details[view.RestApiType]) != 2 {
		t.Fatalf("tick 5: quality = %s %#v, want error with two entries: the failed required task has no result", row.ProcessDetails.QualityCheck.ProcessStatus, row.ProcessDetails.QualityCheck.Details)
	}
	if f.score.writes != 4 {
		t.Fatalf("tick 5: score written %d times, want 4 with the quality and the completion writes", f.score.writes)
	}
	if f.task().Status != view.TaskStatusError {
		t.Fatalf("tick 5: task status = %s, want error", f.task().Status)
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
	if row.ProcessDetails.QualityCheck.ProcessStatus != view.ScoringProcessSuccess || row.ProcessDetails.QualityCheck.Details == nil || len(row.ProcessDetails.QualityCheck.Details) != 0 {
		t.Fatalf("quality = %s %#v, want success with an empty map", row.ProcessDetails.QualityCheck.ProcessStatus, row.ProcessDetails.QualityCheck.Details)
	}
	if f.score.writes != 3 {
		t.Fatalf("score written %d times, want 3: processing, success, and the completion", f.score.writes)
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

	const wantSectionLine = "lint task failed: restart count exceeded"
	const wantFlatLine = "qualityCheck: " + wantSectionLine
	row := f.score.get()
	if row.ProcessDetails.QualityCheck.ProcessStatus != view.ScoringProcessError || !slices.Equal(row.ProcessDetails.QualityCheck.Debug, []string{wantSectionLine}) {
		t.Fatalf("quality = %s %#v, want error from the lint task", row.ProcessDetails.QualityCheck.ProcessStatus, row.ProcessDetails.QualityCheck.Debug)
	}
	if !slices.Equal(row.FlattenDebug(), []string{wantFlatLine}) {
		t.Fatalf("flat debug = %#v, want %q", row.FlattenDebug(), wantFlatLine)
	}
	if len(row.ProcessDetails.QualityCheck.Details[view.RestApiType]) != 1 {
		t.Fatalf("details = %#v, want the stored entry", row.ProcessDetails.QualityCheck.Details)
	}
	if row.ProcessDetails.ProcessStatus != view.ScoringProcessError {
		t.Fatalf("process status = %s, want error", row.ProcessDetails.ProcessStatus)
	}
	if task := f.task(); task.Status != view.TaskStatusError || task.Details != wantFlatLine {
		t.Fatalf("task = %s %q, want error %q", task.Status, task.Details, wantFlatLine)
	}
	assertHandledIds(t, f, "d1")
	assertQualityReads(t, f, 1, 1, 1)
}

func TestProcessTick_LintErrorOnTheTickOfTheLastDocumentsScoresThemAndEndsInError(t *testing.T) {
	f := newQualityFixture()
	ctx := context.Background()
	f.docTasks.tasks = []entity.DocumentLintTask{
		docTask("d1", "a.yaml", view.SpectralLinter, testSpectralRuleset, view.TaskStatusProcessing),
		docTask("d2", "b.yaml", view.SpectralLinter, testSpectralRuleset, view.TaskStatusProcessing),
	}
	f.addLintedDocument("a.yaml", testSpectralRuleset, "hash-a", 0, 0)
	f.addLintedDocument("b.yaml", testSpectralRuleset, "hash-b", 0, 1)

	f.processor.processTick(ctx)
	f.docTasks.setTasks([]entity.DocumentLintTask{
		docTask("d1", "a.yaml", view.SpectralLinter, testSpectralRuleset, view.TaskStatusSuccess),
		docTask("d2", "b.yaml", view.SpectralLinter, testSpectralRuleset, view.TaskStatusSuccess),
	})
	f.lintTasks.tasks[testLintTaskId].Status = view.TaskStatusError
	f.lintTasks.tasks[testLintTaskId].Details = "restart count exceeded"
	f.processor.processTick(ctx)

	const wantSectionLine = "lint task failed: restart count exceeded"
	const wantFlatLine = "qualityCheck: " + wantSectionLine
	row := f.score.get()
	if row.ProcessDetails.QualityCheck.ProcessStatus != view.ScoringProcessError || !slices.Equal(row.ProcessDetails.QualityCheck.Debug, []string{wantSectionLine}) {
		t.Fatalf("quality = %s %#v, want error %q", row.ProcessDetails.QualityCheck.ProcessStatus, row.ProcessDetails.QualityCheck.Debug, wantSectionLine)
	}
	if len(row.ProcessDetails.QualityCheck.Details[view.RestApiType]) != 2 {
		t.Fatalf("details = %#v, want both entries", row.ProcessDetails.QualityCheck.Details)
	}
	if row.ProcessDetails.ProcessStatus != view.ScoringProcessError {
		t.Fatalf("process status = %s, want error", row.ProcessDetails.ProcessStatus)
	}
	if task := f.task(); task.Status != view.TaskStatusError || task.Details != wantFlatLine {
		t.Fatalf("task = %s %q, want error %q", task.Status, task.Details, wantFlatLine)
	}
	assertHandledIds(t, f, "d1", "d2")
}

func TestProcessTick_LintFailureWithNoEntryStoresNullDetails(t *testing.T) {
	tests := []struct {
		name        string
		runningTick bool
		fail        func(f *processorFixture)
		wantLine    string
	}{
		{
			name: "lint error on the first tick",
			fail: func(f *processorFixture) {
				f.lintTasks.tasks[testLintTaskId].Status = view.TaskStatusError
				f.lintTasks.tasks[testLintTaskId].Details = "failed to save doc tasks"
			},
			wantLine: "lint task failed: failed to save doc tasks",
		},
		{
			name:        "lint error after an empty running tick",
			runningTick: true,
			fail: func(f *processorFixture) {
				f.lintTasks.tasks[testLintTaskId].Status = view.TaskStatusError
				f.lintTasks.tasks[testLintTaskId].Details = "failed to save doc tasks"
			},
			wantLine: "lint task failed: failed to save doc tasks",
		},
		{
			name: "lint error with only unfinished document tasks",
			fail: func(f *processorFixture) {
				f.lintTasks.tasks[testLintTaskId].Status = view.TaskStatusError
				f.lintTasks.tasks[testLintTaskId].Details = "failed to save doc tasks"
				f.docTasks.tasks = []entity.DocumentLintTask{docTask("d1", "a.yaml", view.SpectralLinter, testSpectralRuleset, view.TaskStatusProcessing)}
			},
			wantLine: "lint task failed: failed to save doc tasks",
		},
		{
			name:     "lint task missing on the first tick",
			fail:     func(f *processorFixture) { delete(f.lintTasks.tasks, testLintTaskId) },
			wantLine: "lint task not found",
		},
		{
			name:        "lint task missing after an empty running tick",
			runningTick: true,
			fail:        func(f *processorFixture) { delete(f.lintTasks.tasks, testLintTaskId) },
			wantLine:    "lint task not found",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newQualityFixture()
			ctx := context.Background()
			if tt.runningTick {
				f.processor.processTick(ctx)
				if f.score.get().ProcessDetails.QualityCheck.Details == nil {
					t.Fatal("the running tick must store an empty map")
				}
			}

			tt.fail(f)
			f.processor.processTick(ctx)

			row := f.score.get()
			if row.ProcessDetails.QualityCheck.ProcessStatus != view.ScoringProcessError || !slices.Equal(row.ProcessDetails.QualityCheck.Debug, []string{tt.wantLine}) {
				t.Fatalf("quality = %s %#v, want error %q", row.ProcessDetails.QualityCheck.ProcessStatus, row.ProcessDetails.QualityCheck.Debug, tt.wantLine)
			}
			if wantFlat := []string{"qualityCheck: " + tt.wantLine}; !slices.Equal(row.FlattenDebug(), wantFlat) {
				t.Fatalf("flat debug = %#v, want %#v", row.FlattenDebug(), wantFlat)
			}
			if row.ProcessDetails.QualityCheck.Details != nil {
				t.Fatalf("details = %#v, want nil", row.ProcessDetails.QualityCheck.Details)
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
	if f.score.writes != writes || len(row.ProcessDetails.QualityCheck.Details[view.RestApiType]) != 1 {
		t.Fatalf("score written %d more times with %#v, want the stored entry only", f.score.writes-writes, row.ProcessDetails.QualityCheck.Details)
	}
	assertHandledIds(t, f, "d1")
	if f.task().RestartCount != 1 {
		t.Fatalf("restart count = %d, want 1", f.task().RestartCount)
	}

	f.lintResults.summaries[missingSummary] = storedSummary
	f.processor.processTick(ctx)

	row = f.score.get()
	if f.score.writes != writes+1 || len(row.ProcessDetails.QualityCheck.Details[view.RestApiType]) != 3 {
		t.Fatalf("score written %d more times with %#v, want one write and three entries", f.score.writes-writes, row.ProcessDetails.QualityCheck.Details)
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
	if entries := f.score.get().ProcessDetails.QualityCheck.Details[view.RestApiType]; len(entries) != 2 {
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
					task.ValidationProcessId = testValidationProcessId
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
	if f.score.get().ProcessDetails.ProcessStatus != view.ScoringProcessError {
		t.Fatalf("the score of an exhausted task must end in error")
	}
}

func TestAcquireTasks_ExhaustedLostTaskIsClosedByTheNextTick(t *testing.T) {
	f := newProcessorFixture()
	task := f.tasks.tasks[testScoringTaskId]
	task.Status = view.TaskStatusNotStarted
	task.ExecutorId = ""
	task.RestartCount = repository.MaxScoringTaskRestarts
	f.tasks.free = []string{testScoringTaskId}
	f.score.row.ValidationProcessId = testSupersedingProcessId

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
	if f.score.get().ProcessDetails.PublicationIntegrity.ProcessStatus != view.ScoringProcessSuccess {
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
		if f.score.get().ProcessDetails.ProcessStatus != view.ScoringProcessError {
			t.Fatalf("the score of the exhausted task must end in error")
		}
	}
	if other := f.tasks.task(testOtherScoringTaskId); other.Status != view.TaskStatusProcessing || other.RestartCount != 0 {
		t.Fatalf("other task = %s with %d restarts, want processing without restarts", other.Status, other.RestartCount)
	}
}

func lintTask(status view.TaskStatus, details string) *entity.VersionLintTask {
	return &entity.VersionLintTask{
		Id:                  testLintTaskId,
		PackageId:           testPackageId,
		Version:             testVersion,
		Revision:            testRevision,
		Status:              status,
		Details:             details,
		ValidationProcessId: testValidationProcessId,
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

	details, status, cause, err := f.processor.calculateQualityCheck(context.Background(), lintTask(view.TaskStatusSuccess, ""), tasks)
	if err != nil {
		t.Fatalf("unexpected error: %s", err)
	}
	if status != view.ScoringProcessSuccess || cause != "" {
		t.Fatalf("status = %s, cause = %q, want success and no cause", status, cause)
	}
	want := []view.QualityCheckDetails{
		{FileId: "a.yaml", Linter: view.SpectralLinter, Status: view.ScoringPassedWithDefects, Reason: "Version contain 3 warnings for linter spectral.", WarningsCount: 3},
		{FileId: "b.yaml", Linter: view.SpectralLinter, Status: view.ScoringNotPassed, Reason: "Version contain 2 errors for linter spectral.", ErrorsCount: 2},
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
	if status != view.ScoringProcessSuccess {
		t.Fatalf("status = %s, want success", status)
	}
	want := []view.QualityCheckDetails{
		{FileId: "a.yaml", Linter: view.AiLinter, Status: view.ScoringPassed, Optional: true, InternalError: optional.Details},
		{FileId: "a.yaml", Linter: view.SpectralLinter, Status: view.ScoringNotPassed, Reason: "Validation internal error for linter spectral.", InternalError: pre.Details},
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
		wantCause      string
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
			wantCause:   "lint task failed: restart count exceeded",
			wantEntries: 1,
		},
		{
			name:           "lint running with an empty batch",
			lintTask:       lintTask(view.TaskStatusWaitingForDocs, ""),
			wantStatus:     view.ScoringProcessProcessing,
			wantNilDetails: true,
		},
		{
			name:           "lint error with an empty batch",
			lintTask:       lintTask(view.TaskStatusError, "failed to save doc tasks"),
			wantStatus:     view.ScoringProcessError,
			wantCause:      "lint task failed: failed to save doc tasks",
			wantNilDetails: true,
		},
		{
			name:           "lint success with an empty batch",
			lintTask:       lintTask(view.TaskStatusSuccess, ""),
			wantStatus:     view.ScoringProcessSuccess,
			wantNilDetails: true,
		},
		{
			name:           "lint task missing",
			lintTask:       nil,
			wantStatus:     view.ScoringProcessError,
			wantCause:      "lint task not found",
			wantNilDetails: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newProcessorFixture()
			f.addLintedDocument("a.yaml", testSpectralRuleset, "hash-a", 0, 0)

			details, status, cause, err := f.processor.calculateQualityCheck(context.Background(), tt.lintTask, tt.tasks)
			if err != nil {
				t.Fatalf("unexpected error: %s", err)
			}
			if status != tt.wantStatus || cause != tt.wantCause {
				t.Fatalf("status = %s, cause = %q, want %s and %q", status, cause, tt.wantStatus, tt.wantCause)
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

func startedProcessDetails() view.ScoringProcessDetails {
	return view.ScoringProcessDetails{
		ProcessStatus:          view.ScoringProcessProcessing,
		PublicationIntegrity:   view.PublicationIntegrityCheck{ProcessStatus: view.ScoringProcessNotStarted},
		BackwardsCompatibility: view.BackwardsCompatibilityCheck{ProcessStatus: view.ScoringProcessNotStarted},
		QualityCheck:           view.QualityCheck{ProcessStatus: view.ScoringProcessNotStarted},
	}
}

func finishedScore() *entity.VersionScore {
	return &entity.VersionScore{
		ProcessDetails: view.ScoringProcessDetails{
			ProcessStatus: view.ScoringProcessSuccess,
			PublicationIntegrity: view.PublicationIntegrityCheck{
				ProcessStatus: view.ScoringProcessSuccess,
				Details:       &view.PublicationIntegrityDetails{Status: view.ScoringPassed},
			},
			BackwardsCompatibility: view.BackwardsCompatibilityCheck{
				ProcessStatus: view.ScoringProcessSuccess,
				Details: map[view.OpApiType]view.BackwardCompatibilityDetails{
					view.RestApiType: {Status: view.ScoringPassed},
				},
			},
			QualityCheck: view.QualityCheck{
				ProcessStatus: view.ScoringProcessSuccess,
				Details: map[view.OpApiType][]view.QualityCheckDetails{
					view.RestApiType: {{Linter: view.SpectralLinter, Status: view.ScoringPassed}},
				},
			},
		},
	}
}

func TestOverallStatus(t *testing.T) {
	const bwcDefectReason = "Version contains breaking change(s) in internal(2) operation(s)."
	const qualityErrorsReason = "Version contain 3 errors for linter spectral."
	const qualityWarningsReason = "Version contain 3 warnings for linter spectral."
	const integrityReason = "Version has publication errors."
	const unavailableReason = "Validation internal error for linter spectral."
	unavailableEntry := view.QualityCheckDetails{FileId: "a.yaml", Linter: view.SpectralLinter, Status: view.ScoringNotPassed, Reason: unavailableReason, InternalError: "spectral crashed"}

	tests := []struct {
		name        string
		modify      func(score *entity.VersionScore)
		wantStatus  view.ScoringStatus
		wantReasons []string
	}{
		{
			name:        "all checks passed",
			modify:      func(score *entity.VersionScore) {},
			wantStatus:  view.ScoringPassed,
			wantReasons: []string{},
		},
		{
			name: "BWC passed with defects and quality errors",
			modify: func(score *entity.VersionScore) {
				score.ProcessDetails.BackwardsCompatibility.Details[view.RestApiType] = view.BackwardCompatibilityDetails{Status: view.ScoringPassedWithDefects, Reason: bwcDefectReason}
				score.ProcessDetails.QualityCheck.Details[view.RestApiType] = []view.QualityCheckDetails{{Status: view.ScoringNotPassed, Reason: qualityErrorsReason, ErrorsCount: 3}}
			},
			wantStatus:  view.ScoringNotPassed,
			wantReasons: []string{bwcDefectReason, qualityErrorsReason},
		},
		{
			name:        "overall error with all checks in success builds the verdict",
			modify:      func(score *entity.VersionScore) { score.ProcessDetails.ProcessStatus = view.ScoringProcessError },
			wantStatus:  view.ScoringPassed,
			wantReasons: []string{},
		},
		{
			name: "integrity not passed",
			modify: func(score *entity.VersionScore) {
				score.ProcessDetails.PublicationIntegrity.Details = &view.PublicationIntegrityDetails{Status: view.ScoringNotPassed, Reason: integrityReason, HasErrors: true}
			},
			wantStatus:  view.ScoringNotPassed,
			wantReasons: []string{integrityReason},
		},
		{
			name: "integrity error without details",
			modify: func(score *entity.VersionScore) {
				score.ProcessDetails.PublicationIntegrity = view.PublicationIntegrityCheck{ProcessStatus: view.ScoringProcessError}
			},
			wantStatus:  view.ScoringNotPassed,
			wantReasons: []string{entity.VersionContentInternalErrorReason},
		},
		{
			name: "BWC error with clean integrity and quality",
			modify: func(score *entity.VersionScore) {
				score.ProcessDetails.BackwardsCompatibility = view.BackwardsCompatibilityCheck{ProcessStatus: view.ScoringProcessError}
			},
			wantStatus:  view.ScoringNotPassed,
			wantReasons: []string{bwcInternalErrorReason},
		},
		{
			name: "BWC error before the reason of a quality entry with warnings",
			modify: func(score *entity.VersionScore) {
				score.ProcessDetails.BackwardsCompatibility = view.BackwardsCompatibilityCheck{ProcessStatus: view.ScoringProcessError}
				score.ProcessDetails.QualityCheck.Details[view.RestApiType] = []view.QualityCheckDetails{{Status: view.ScoringPassedWithDefects, Reason: qualityWarningsReason, WarningsCount: 3}}
			},
			wantStatus:  view.ScoringNotPassed,
			wantReasons: []string{bwcInternalErrorReason, qualityWarningsReason},
		},
		{
			name: "BWC error and quality error",
			modify: func(score *entity.VersionScore) {
				score.ProcessDetails.BackwardsCompatibility = view.BackwardsCompatibilityCheck{ProcessStatus: view.ScoringProcessError}
				score.ProcessDetails.QualityCheck = view.QualityCheck{ProcessStatus: view.ScoringProcessError}
			},
			wantStatus:  view.ScoringNotPassed,
			wantReasons: []string{bwcInternalErrorReason, qualityInternalErrorReason},
		},
		{
			name: "all checks in error",
			modify: func(score *entity.VersionScore) {
				score.ProcessDetails.PublicationIntegrity = view.PublicationIntegrityCheck{ProcessStatus: view.ScoringProcessError}
				score.ProcessDetails.BackwardsCompatibility = view.BackwardsCompatibilityCheck{ProcessStatus: view.ScoringProcessError}
				score.ProcessDetails.QualityCheck = view.QualityCheck{ProcessStatus: view.ScoringProcessError}
			},
			wantStatus:  view.ScoringNotPassed,
			wantReasons: []string{bwcInternalErrorReason, qualityInternalErrorReason, entity.VersionContentInternalErrorReason},
		},
		{
			name: "quality error with an unavailable required result has the entry reason only",
			modify: func(score *entity.VersionScore) {
				score.ProcessDetails.QualityCheck.ProcessStatus = view.ScoringProcessError
				score.ProcessDetails.QualityCheck.Details[view.RestApiType] = []view.QualityCheckDetails{unavailableEntry}
			},
			wantStatus:  view.ScoringNotPassed,
			wantReasons: []string{unavailableReason},
		},
		{
			name: "processing keeps status and reasons empty",
			modify: func(score *entity.VersionScore) {
				score.ProcessDetails.ProcessStatus = view.ScoringProcessProcessing
				score.ProcessDetails.QualityCheck.ProcessStatus = view.ScoringProcessProcessing
				score.ProcessDetails.BackwardsCompatibility = view.BackwardsCompatibilityCheck{ProcessStatus: view.ScoringProcessError}
				score.Status = view.ScoringPassed
				score.Reasons = []string{"stale"}
			},
			wantStatus:  "",
			wantReasons: []string{},
		},
		{
			name: "duplicate reasons across API types",
			modify: func(score *entity.VersionScore) {
				score.ProcessDetails.BackwardsCompatibility.Details = map[view.OpApiType]view.BackwardCompatibilityDetails{
					view.RestApiType:     {Status: view.ScoringPassedWithDefects, Reason: bwcDefectReason},
					view.AsyncapiApiType: {Status: view.ScoringPassedWithDefects, Reason: bwcDefectReason},
				}
			},
			wantStatus:  view.ScoringPassedWithDefects,
			wantReasons: []string{bwcDefectReason},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := finishedScore()
			score.ProcessDetails.Debug = []string{"legacy debug line"}
			tt.modify(score)
			recomputeOverallStatus(score)

			if score.Status != tt.wantStatus {
				t.Errorf("status = %q, want %q", score.Status, tt.wantStatus)
			}
			if score.Reasons == nil || !slices.Equal(score.Reasons, tt.wantReasons) {
				t.Errorf("reasons = %#v, want %#v", score.Reasons, tt.wantReasons)
			}
			if !slices.Equal(score.ProcessDetails.Debug, []string{"legacy debug line"}) {
				t.Errorf("process debug = %#v, want unchanged", score.ProcessDetails.Debug)
			}
		})
	}
}

func failedDocTask(id string, fileId string, linter view.Linter, details string) entity.DocumentLintTask {
	task := docTask(id, fileId, linter, testSpectralRuleset, view.TaskStatusError)
	task.Details = details
	return task
}

func TestProcessTick_UnavailableRequiredResultEndsQualityInError(t *testing.T) {
	const spectralFailure = "spectral: process exited with code 2"
	const wantSectionLine = "1 required lint result(s) unavailable"
	const wantFlatLine = "qualityCheck: " + wantSectionLine
	const wantReason = "Validation internal error for linter spectral."
	tests := []struct {
		name         string
		arrange      func(f *processorFixture)
		wantInternal string
	}{
		{
			name: "failed document task",
			arrange: func(f *processorFixture) {
				f.docTasks.tasks = []entity.DocumentLintTask{failedDocTask("d1", "a.yaml", view.SpectralLinter, spectralFailure)}
			},
			wantInternal: spectralFailure,
		},
		{
			name: "failed document task with empty details",
			arrange: func(f *processorFixture) {
				f.docTasks.tasks = []entity.DocumentLintTask{failedDocTask("d1", "a.yaml", view.SpectralLinter, "")}
			},
			wantInternal: emptyLinterInternalError,
		},
		{
			name: "failed linted document",
			arrange: func(f *processorFixture) {
				f.docTasks.tasks = []entity.DocumentLintTask{docTask("d1", "a.yaml", view.SpectralLinter, testSpectralRuleset, view.TaskStatusSuccess)}
				f.addLintedDocument("a.yaml", testSpectralRuleset, "hash-a", 0, 0)
				f.verResults.docs[0].LintStatus = view.StatusError
				f.verResults.docs[0].LintDetails = spectralFailure
			},
			wantInternal: spectralFailure,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newQualityFixture()
			f.lintTasks.tasks[testLintTaskId].Status = view.TaskStatusSuccess
			tt.arrange(f)

			f.processor.processTick(context.Background())

			row := f.score.get()
			quality := row.ProcessDetails.QualityCheck
			wantEntries := []view.QualityCheckDetails{{FileId: "a.yaml", Linter: view.SpectralLinter, Status: view.ScoringNotPassed, Reason: wantReason, InternalError: tt.wantInternal}}
			if quality.ProcessStatus != view.ScoringProcessError || !reflect.DeepEqual(quality.Details[view.RestApiType], wantEntries) {
				t.Fatalf("quality = %s %#v, want error with %#v", quality.ProcessStatus, quality.Details, wantEntries)
			}
			if !slices.Equal(quality.Debug, []string{wantSectionLine}) {
				t.Fatalf("quality debug = %#v, want %q", quality.Debug, wantSectionLine)
			}
			if !slices.Equal(row.FlattenDebug(), []string{wantFlatLine}) {
				t.Fatalf("flat debug = %#v, want %q", row.FlattenDebug(), wantFlatLine)
			}
			if !slices.Equal(row.Reasons, []string{wantReason}) {
				t.Fatalf("reasons = %#v, want the entry reason only", row.Reasons)
			}
			if row.ProcessDetails.ProcessStatus != view.ScoringProcessError || row.Status != view.ScoringNotPassed {
				t.Fatalf("score = %s %q, want error and not_passed", row.ProcessDetails.ProcessStatus, row.Status)
			}
			if task := f.task(); task.Status != view.TaskStatusError || task.Details != wantFlatLine {
				t.Fatalf("task = %s %q, want error %q", task.Status, task.Details, wantFlatLine)
			}
		})
	}
}

func TestProcessTick_UnavailableResultScoredWhileTheLintRunsIsCountedWhenTheLintEnds(t *testing.T) {
	f := newQualityFixture()
	ctx := context.Background()
	f.docTasks.tasks = []entity.DocumentLintTask{failedDocTask("d1", "a.yaml", view.SpectralLinter, "spectral crashed")}

	f.processor.processTick(ctx)

	row := f.score.get()
	if row.ProcessDetails.QualityCheck.ProcessStatus != view.ScoringProcessProcessing || len(row.ProcessDetails.QualityCheck.Details[view.RestApiType]) != 1 || len(row.FlattenDebug()) != 0 {
		t.Fatalf("quality = %s %#v, debug = %#v, want processing with one entry and no line",
			row.ProcessDetails.QualityCheck.ProcessStatus, row.ProcessDetails.QualityCheck.Details, row.FlattenDebug())
	}
	assertHandledIds(t, f, "d1")

	f.lintTasks.tasks[testLintTaskId].Status = view.TaskStatusSuccess
	f.processor.processTick(ctx)

	row = f.score.get()
	if row.ProcessDetails.QualityCheck.ProcessStatus != view.ScoringProcessError || len(row.ProcessDetails.QualityCheck.Details[view.RestApiType]) != 1 {
		t.Fatalf("quality = %s %#v, want error with the entry once", row.ProcessDetails.QualityCheck.ProcessStatus, row.ProcessDetails.QualityCheck.Details)
	}
	if wantSection := []string{"1 required lint result(s) unavailable"}; !slices.Equal(row.ProcessDetails.QualityCheck.Debug, wantSection) {
		t.Fatalf("quality debug = %#v, want %#v", row.ProcessDetails.QualityCheck.Debug, wantSection)
	}
	if wantFlat := []string{"qualityCheck: 1 required lint result(s) unavailable"}; !slices.Equal(row.FlattenDebug(), wantFlat) {
		t.Fatalf("flat debug = %#v, want %#v", row.FlattenDebug(), wantFlat)
	}
	assertHandledIds(t, f, "d1")
}

func TestFailScoringTask_LinesAndReasonsOfAGiveUp(t *testing.T) {
	const lastError = "failed to get version content: 503 Service Unavailable"
	const restartDiagnostic = "restart count exceeded limit, last error: " + lastError
	const taskLine = "scoring task failed: " + restartDiagnostic
	const countLine = "1 required lint result(s) unavailable"
	const flatCountLine = "qualityCheck: " + countLine
	const entryReason = "Validation internal error for linter spectral."
	unavailableEntries := map[view.OpApiType][]view.QualityCheckDetails{
		view.RestApiType: {{FileId: "a.yaml", Linter: view.SpectralLinter, Status: view.ScoringNotPassed, Reason: entryReason, InternalError: "spectral crashed"}},
	}
	tests := []struct {
		name        string
		arrange     func(row *entity.VersionScore)
		wantDebug   []string
		wantReasons []string
	}{
		{
			name:        "all checks unfinished",
			arrange:     func(row *entity.VersionScore) {},
			wantDebug:   []string{taskLine},
			wantReasons: []string{bwcInternalErrorReason, qualityInternalErrorReason, entity.VersionContentInternalErrorReason},
		},
		{
			name: "quality already in error by an unavailable result, BWC unfinished",
			arrange: func(row *entity.VersionScore) {
				row.ProcessDetails.PublicationIntegrity = view.PublicationIntegrityCheck{ProcessStatus: view.ScoringProcessSuccess, Details: &view.PublicationIntegrityDetails{Status: view.ScoringPassed}}
				row.ProcessDetails.QualityCheck = view.QualityCheck{ProcessStatus: view.ScoringProcessError, Details: unavailableEntries, Debug: []string{countLine}}
			},
			wantDebug:   []string{flatCountLine, taskLine},
			wantReasons: []string{bwcInternalErrorReason, entryReason},
		},
		{
			name: "quality unfinished with an unavailable result already scored",
			arrange: func(row *entity.VersionScore) {
				row.ProcessDetails.PublicationIntegrity = view.PublicationIntegrityCheck{ProcessStatus: view.ScoringProcessSuccess, Details: &view.PublicationIntegrityDetails{Status: view.ScoringPassed}}
				row.ProcessDetails.BackwardsCompatibility = view.BackwardsCompatibilityCheck{ProcessStatus: view.ScoringProcessSuccess, Details: map[view.OpApiType]view.BackwardCompatibilityDetails{}}
				row.ProcessDetails.QualityCheck = view.QualityCheck{ProcessStatus: view.ScoringProcessProcessing, Details: unavailableEntries}
			},
			wantDebug:   []string{taskLine},
			wantReasons: []string{entryReason},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newProcessorFixture()
			f.tasks.tasks[testScoringTaskId].RestartCount = repository.MaxScoringTaskRestarts
			f.tasks.tasks[testScoringTaskId].Details = lastError
			tt.arrange(f.score.row)

			f.processor.processTick(context.Background())

			row := f.score.get()
			if !slices.Equal(row.FlattenDebug(), tt.wantDebug) {
				t.Fatalf("flat debug = %#v, want %#v", row.FlattenDebug(), tt.wantDebug)
			}
			if !slices.Equal(row.Reasons, tt.wantReasons) {
				t.Fatalf("reasons = %#v, want %#v", row.Reasons, tt.wantReasons)
			}
			if task := f.task(); task.Status != view.TaskStatusError || task.Details != restartDiagnostic {
				t.Fatalf("task = %s %q, want error with the restart diagnostic only", task.Status, task.Details)
			}
		})
	}
}

func TestFailScoringTask_IntegrityErrorHasNoDetailsAndV1GetsTheLegacySection(t *testing.T) {
	f := newProcessorFixture()
	f.tasks.tasks[testScoringTaskId].RestartCount = repository.MaxScoringTaskRestarts

	f.processor.processTick(context.Background())

	row := f.score.get()
	if integrity := row.ProcessDetails.PublicationIntegrity; integrity.ProcessStatus != view.ScoringProcessError || integrity.Details != nil {
		t.Fatalf("integrity = %s %#v, want error without details in the row", integrity.ProcessStatus, integrity.Details)
	}
	body, err := json.Marshal(entity.MakeVersionScoreView(row).ProcessDetails.PublicationIntegrity)
	if err != nil {
		t.Fatalf("unexpected error: %s", err)
	}
	if string(body) != `{"processStatus":"error"}` {
		t.Fatalf("v2 integrity = %s, want no details", body)
	}
	wantSection := &view.PublicationIntegrityDetails{Status: view.ScoringNotPassed, Reason: entity.VersionContentInternalErrorReason}
	if got := entity.MakeVersionScoreView_deprecated(row).PublicationIntegrityDetails; !reflect.DeepEqual(got, wantSection) {
		t.Fatalf("v1 integrity = %#v, want %#v", got, wantSection)
	}
}

func (f *processorFixture) addOtherTask() *inMemoryScore {
	otherLintTask := lintTask(view.TaskStatusWaitingForDocs, "")
	otherLintTask.Id = testOtherLintTaskId
	otherLintTask.Revision = testOtherRevision
	otherLintTask.ValidationProcessId = testOtherValidationProcessId
	f.lintTasks.tasks[testOtherLintTaskId] = otherLintTask
	f.tasks.tasks[testOtherScoringTaskId] = &entity.VersionScoringTask{
		Id:                  testOtherScoringTaskId,
		ValidationProcessId: testOtherValidationProcessId,
		PackageId:           testPackageId,
		Version:             testVersion,
		Revision:            testOtherRevision,
		Status:              view.TaskStatusProcessing,
		ExecutorId:          testExecutorId,
	}
	otherScore := &inMemoryScore{row: &entity.VersionScore{
		PackageId:           testPackageId,
		Version:             testVersion,
		Revision:            testOtherRevision,
		Reasons:             []string{},
		ValidationProcessId: testOtherValidationProcessId,
		ProcessDetails:      startedProcessDetails(),
	}}
	f.tasks.scores[testOtherRevision] = otherScore
	return otherScore
}

// startRunsInBackground starts the attempts with utils.SafeAsync, as production does, so a panic after the attempt
// is recovered instead of crashing the test binary.
func (f *processorFixture) startRunsInBackground() (join func()) {
	var runs sync.WaitGroup
	f.processor.startRun = func(run func()) {
		runs.Add(1)
		utils.SafeAsync(func() {
			defer runs.Done()
			run()
		})
	}
	return runs.Wait
}

func (f *processorFixture) startTick() (done <-chan struct{}) {
	tickDone := make(chan struct{})
	go func() {
		defer close(tickDone)
		f.processor.processTick(context.Background())
	}()
	return tickDone
}

func waitClosed(t *testing.T, what string, done <-chan struct{}) {
	t.Helper()
	select {
	case <-done:
	case <-time.After(testWaitTimeout):
		t.Fatalf("timed out waiting for %s", what)
	}
}

func returned(done <-chan struct{}) bool {
	select {
	case <-done:
		return true
	default:
		return false
	}
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
				if row := f.score.get(); !row.PartsFinished() || row.ProcessDetails.ProcessStatus != view.ScoringProcessSuccess {
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
		return f.score.get().ProcessDetails.QualityCheck.ProcessStatus == view.ScoringProcessProcessing
	})
	waitFor(t, "the other task", func() bool {
		return otherScore.get().ProcessDetails.BackwardsCompatibility.ProcessStatus == view.ScoringProcessSuccess && !f.slotTaken(testOtherScoringTaskId)
	})
	if row := f.score.get(); row.ProcessDetails.BackwardsCompatibility.ProcessStatus != view.ScoringProcessNotStarted {
		t.Fatalf("BWC = %s, want not_started while it is blocked", row.ProcessDetails.BackwardsCompatibility.ProcessStatus)
	}
	qualityReads := f.lintTasks.readCount(testValidationProcessId)

	f.processor.processTick(ctx)
	time.Sleep(testSettleDelay)

	if bwcStarts.Load() != 1 || f.lintTasks.readCount(testValidationProcessId) != qualityReads {
		t.Fatalf("BWC started %d times, quality reads %d, want one start and %d reads: a second attempt ran", bwcStarts.Load(), f.lintTasks.readCount(testValidationProcessId), qualityReads)
	}

	f.docTasks.setTasks([]entity.DocumentLintTask{docTask("d1", "a.yaml", view.SpectralLinter, testSpectralRuleset, view.TaskStatusSuccess)})
	close(release)
	join()
	assertAttemptEnded(t, f, view.TaskStatusProcessing, 0)
	assertHandledIds(t, f)

	for range 2 {
		f.processor.processTick(ctx)
		join()
		if entries := f.score.get().ProcessDetails.QualityCheck.Details[view.RestApiType]; len(entries) != 1 {
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
		return f.score.get().ProcessDetails.BackwardsCompatibility.ProcessStatus == view.ScoringProcessSuccess
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
			if row := f.score.get(); row.ProcessDetails.BackwardsCompatibility.ProcessStatus != view.ScoringProcessSuccess {
				t.Fatalf("BWC = %s, want the part of the child kept", row.ProcessDetails.BackwardsCompatibility.ProcessStatus)
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
				func() bool { return f.score.get().ProcessDetails.QualityCheck.ProcessStatus.IsTerminal() },
				func() bool { return f.score.get().ProcessDetails.BackwardsCompatibility.ProcessStatus.IsTerminal() })

			f.processor.processTick(context.Background())

			assertAttemptEnded(t, f, view.TaskStatusSuccess, 0)
			assertHandledIds(t, f, "d1")
			row := f.score.get()
			if row.ProcessDetails.PublicationIntegrity.Details == nil || row.ProcessDetails.BackwardsCompatibility.Details == nil || len(row.ProcessDetails.QualityCheck.Details[view.RestApiType]) != 1 {
				t.Fatalf("a part was overwritten: %#v", row)
			}
			if row.ProcessDetails.ProcessStatus != view.ScoringProcessSuccess || row.Status != view.ScoringPassedWithDefects {
				t.Fatalf("score = %s %q, want success and passed_with_defects", row.ProcessDetails.ProcessStatus, row.Status)
			}
			if !reflect.DeepEqual(row.Reasons, []string{"Version contain 1 warnings for linter spectral."}) || len(row.FlattenDebug()) != 0 {
				t.Fatalf("reasons = %#v, debug = %#v", row.Reasons, row.FlattenDebug())
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

	if entries := f.score.get().ProcessDetails.QualityCheck.Details[view.RestApiType]; len(entries) != 1 {
		t.Fatalf("got %d entries, want the document once: %#v", len(entries), entries)
	}
	assertHandledIds(t, f, "d1")

	f.tasks.tasks[testScoringTaskId].RestartCount = repository.MaxScoringTaskRestarts
	reads := f.lintTasks.readCount(testValidationProcessId)

	f.processor.processTick(ctx)

	assertAttemptEnded(t, f, view.TaskStatusError, repository.MaxScoringTaskRestarts)
	if f.lintTasks.readCount(testValidationProcessId) != reads {
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
			if bwcStarted || f.lintTasks.readCount(testValidationProcessId) != 0 || f.score.writes != 0 {
				t.Fatalf("a part ran: BWC %t, quality reads %d, writes %d", bwcStarted, f.lintTasks.readCount(testValidationProcessId), f.score.writes)
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

	t.Run("two failures, then the task is given up", func(t *testing.T) {
		const warningsReason = "Version contain 1 warnings for linter spectral."
		const restartDiagnostic = "restart count exceeded limit, last error: connection reset"
		f := newProcessorFixture()
		f.lintTasks.tasks[testLintTaskId].Status = view.TaskStatusSuccess
		f.docTasks.tasks = []entity.DocumentLintTask{docTask("d1", "a.yaml", view.SpectralLinter, testSpectralRuleset, view.TaskStatusSuccess)}
		f.addLintedDocument("a.yaml", testSpectralRuleset, "hash-a", 0, 1)
		f.tasks.beforeComplete = returning(errors.New("connection reset"))

		for attempt := 1; attempt <= repository.MaxScoringTaskRestarts; attempt++ {
			f.processor.processTick(context.Background())
			assertAttemptEnded(t, f, view.TaskStatusProcessing, attempt)
		}
		f.processor.processTick(context.Background())

		assertAttemptEnded(t, f, view.TaskStatusError, repository.MaxScoringTaskRestarts)
		if task := f.task(); task.Details != restartDiagnostic {
			t.Fatalf("task details = %q, want %q", task.Details, restartDiagnostic)
		}
		row := f.score.get()
		wantChecks := view.ScoringProcessDetails{
			ProcessStatus: view.ScoringProcessError,
			Debug:         []string{"scoring task failed: " + restartDiagnostic},
			PublicationIntegrity: view.PublicationIntegrityCheck{
				ProcessStatus: view.ScoringProcessSuccess,
				Details: &view.PublicationIntegrityDetails{
					Status:   view.ScoringPassed,
					ApiTypes: map[view.OpApiType]view.PublicationErrorFlag{view.RestApiType: {}},
				},
			},
			BackwardsCompatibility: view.BackwardsCompatibilityCheck{
				ProcessStatus: view.ScoringProcessSuccess,
				Details:       map[view.OpApiType]view.BackwardCompatibilityDetails{view.RestApiType: {Status: view.ScoringPassed}},
			},
			QualityCheck: view.QualityCheck{
				ProcessStatus: view.ScoringProcessSuccess,
				Details: map[view.OpApiType][]view.QualityCheckDetails{view.RestApiType: {
					{FileId: "a.yaml", Linter: view.SpectralLinter, Status: view.ScoringPassedWithDefects, Reason: warningsReason, WarningsCount: 1},
				}},
			},
		}
		if !reflect.DeepEqual(row.ProcessDetails, wantChecks) {
			t.Fatalf("process details = %#v\nwant %#v", row.ProcessDetails, wantChecks)
		}
		if row.Status != view.ScoringPassedWithDefects || !slices.Equal(row.Reasons, []string{warningsReason}) {
			t.Fatalf("verdict = %q %#v, want passed_with_defects with the warning reason", row.Status, row.Reasons)
		}
		if wantDebug := []string{"scoring task failed: " + restartDiagnostic}; !slices.Equal(row.FlattenDebug(), wantDebug) {
			t.Fatalf("flat debug = %#v, want %#v", row.FlattenDebug(), wantDebug)
		}
	})
}

func TestAttempt_FailedIncrementHoldsTheSlotUntilItIsWritten(t *testing.T) {
	f := newProcessorFixture()
	f.processor.attemptSlots = make(chan struct{}, 1)
	otherScore := f.addOtherTask()
	f.beforeBwc = returning(errors.New("APIHUB unavailable"))
	gate := make(chan struct{})
	release := sync.OnceFunc(func() { close(gate) })
	defer release()
	var increments atomic.Int32
	f.tasks.beforeInc = func() error {
		if increments.Add(1) == 1 {
			return errors.New("connection reset")
		}
		<-gate
		return nil
	}
	join := f.startRunsInBackground()

	tickDone := f.startTick()

	waitFor(t, "the retry of the increment", func() bool { return increments.Load() == 2 })
	waitFor(t, "the first tick to mark the other task", func() bool { return f.slotTaken(testOtherScoringTaskId) })
	reads := f.lintTasks.readCount(testValidationProcessId)
	waitClosed(t, "the second tick, which skips both running tasks", f.startTick())
	time.Sleep(testSettleDelay)
	if f.lintTasks.readCount(testValidationProcessId) != reads || !f.slotTaken(testScoringTaskId) || f.task().RestartCount != 0 {
		t.Fatalf("quality reads %d (want %d), slot taken %t, %d restarts: an attempt started while a failure was unrecorded",
			f.lintTasks.readCount(testValidationProcessId), reads, f.slotTaken(testScoringTaskId), f.task().RestartCount)
	}
	if otherScore.writeCount() != 0 || returned(tickDone) {
		t.Fatalf("other score written %d times, tick returned %t; want the other task to wait for the attempt slot", otherScore.writeCount(), returned(tickDone))
	}

	release()
	waitClosed(t, "the tick", tickDone)
	join()
	assertAttemptEnded(t, f, view.TaskStatusProcessing, 1)
	if row := otherScore.get(); row.ProcessDetails.BackwardsCompatibility.ProcessStatus != view.ScoringProcessSuccess {
		t.Fatalf("other BWC = %s, want the other task to run after the increment is written", row.ProcessDetails.BackwardsCompatibility.ProcessStatus)
	}
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
			f.score.row.ProcessDetails.QualityCheck.ProcessStatus = view.ScoringProcessSuccess
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
	f.score.row.ProcessDetails.QualityCheck.ProcessStatus = view.ScoringProcessProcessing
	f.score.row.ProcessDetails.QualityCheck.Details = map[view.OpApiType][]view.QualityCheckDetails{view.RestApiType: {{Linter: view.SpectralLinter, Status: view.ScoringPassed}}}

	f.processor.processTick(context.Background())

	assertAttemptEnded(t, f, view.TaskStatusProcessing, 0)
	row := f.score.get()
	if row.ProcessDetails.BackwardsCompatibility.ProcessStatus != view.ScoringProcessSuccess || len(row.ProcessDetails.QualityCheck.Details[view.RestApiType]) != 1 {
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
						f.score.replaceProcessId(testSupersedingProcessId)
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
					f.score.replaceProcessId(testSupersedingProcessId)
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
	f.score.row.ProcessDetails.QualityCheck.ProcessStatus = view.ScoringProcessSuccess
	f.beforeBwc = func() error {
		f.score.replaceProcessId(testSupersedingProcessId)
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
		return func() bool { return f.score.get().ProcessDetails.QualityCheck.ProcessStatus.IsTerminal() }
	}
	blockQuality := func(f *processorFixture, release <-chan struct{}) func() bool {
		f.lintTasks.beforeRead = func() error {
			<-release
			return nil
		}
		return func() bool { return f.score.get().ProcessDetails.BackwardsCompatibility.ProcessStatus.IsTerminal() }
	}
	tests := []struct {
		name         string
		block        func(f *processorFixture, release <-chan struct{}) func() bool
		terminalPart func(row *entity.VersionScore) view.ScoringProcessStatus
		blockedPart  func(row *entity.VersionScore) view.ScoringProcessStatus
	}{
		{
			name:  "child blocked",
			block: blockChild,
			terminalPart: func(row *entity.VersionScore) view.ScoringProcessStatus {
				return row.ProcessDetails.QualityCheck.ProcessStatus
			},
			blockedPart: func(row *entity.VersionScore) view.ScoringProcessStatus {
				return row.ProcessDetails.BackwardsCompatibility.ProcessStatus
			},
		},
		{
			name:  "quality blocked",
			block: blockQuality,
			terminalPart: func(row *entity.VersionScore) view.ScoringProcessStatus {
				return row.ProcessDetails.BackwardsCompatibility.ProcessStatus
			},
			blockedPart: func(row *entity.VersionScore) view.ScoringProcessStatus {
				return row.ProcessDetails.QualityCheck.ProcessStatus
			},
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
			if tt.terminalPart(row) != view.ScoringProcessSuccess || tt.blockedPart(row) != view.ScoringProcessError {
				t.Fatalf("terminal part = %s, blocked part = %s, want success and error", tt.terminalPart(row), tt.blockedPart(row))
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
			if row := f.score.get(); tt.terminalPart(row) != view.ScoringProcessSuccess || tt.blockedPart(row) != view.ScoringProcessSuccess {
				t.Fatalf("terminal part = %s, blocked part = %s, want both success", tt.terminalPart(row), tt.blockedPart(row))
			}
		})
	}

	t.Run("failure write fails and the next attempt retries it", func(t *testing.T) {
		f, release, join := arrange(blockChild)
		f.lintTasks.mu.Lock()
		f.lintTasks.tasks[testLintTaskId].Status = view.TaskStatusWaitingForDocs
		f.lintTasks.mu.Unlock()
		f.score.mu.Lock()
		f.score.row.ProcessDetails.QualityCheck.ProcessStatus = view.ScoringProcessProcessing
		f.score.mu.Unlock()
		f.tasks.scoringFailedErrs = []error{errors.New("connection reset")}

		f.processor.acquireTasks(context.Background())

		close(release)
		join()
		assertAttemptEnded(t, f, view.TaskStatusProcessing, repository.MaxScoringTaskRestarts)
		if row := f.score.get(); row.ProcessDetails.BackwardsCompatibility.ProcessStatus != view.ScoringProcessSuccess {
			t.Fatalf("BWC = %s, want the surviving attempt to write it", row.ProcessDetails.BackwardsCompatibility.ProcessStatus)
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
		initialErr   string
		wantStatus   view.TaskStatus
		wantRestarts int
		wantDetails  string
	}{
		{
			name:        "first claim",
			status:      view.TaskStatusNotStarted,
			initialErr:  lastError,
			wantStatus:  view.TaskStatusProcessing,
			wantDetails: lastError,
		},
		{
			name:         "first takeover",
			status:       view.TaskStatusProcessing,
			initialErr:   lastError,
			wantStatus:   view.TaskStatusProcessing,
			wantRestarts: 1,
			wantDetails:  lastError,
		},
		{
			name:         "second takeover gives the task up",
			status:       view.TaskStatusProcessing,
			restartCount: repository.MaxScoringTaskRestarts - 1,
			initialErr:   lastError,
			wantStatus:   view.TaskStatusError,
			wantRestarts: repository.MaxScoringTaskRestarts,
			wantDetails:  "restart count exceeded limit, last error: " + lastError,
		},
		{
			name:         "second takeover with empty details omits last error suffix",
			status:       view.TaskStatusProcessing,
			restartCount: repository.MaxScoringTaskRestarts - 1,
			initialErr:   "",
			wantStatus:   view.TaskStatusError,
			wantRestarts: repository.MaxScoringTaskRestarts,
			wantDetails:  "restart count exceeded limit",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newProcessorFixture()
			task := f.tasks.tasks[testScoringTaskId]
			task.Status = tt.status
			task.RestartCount = tt.restartCount
			task.Details = tt.initialErr
			f.tasks.free = []string{testScoringTaskId}

			f.processor.acquireTasks(context.Background())

			assertAttemptEnded(t, f, tt.wantStatus, tt.wantRestarts)
			if f.task().Details != tt.wantDetails {
				t.Fatalf("details = %q, want %q", f.task().Details, tt.wantDetails)
			}
			if tt.wantStatus == view.TaskStatusError {
				wantDebug := []string{scoringTaskFailedDebugPrefix + tt.wantDetails}
				if got := f.score.get().ProcessDetails.Debug; !slices.Equal(got, wantDebug) {
					t.Fatalf("process debug = %#v, want %#v", got, wantDebug)
				}
			}
			if f.lintTasks.readCount(testValidationProcessId) != 0 {
				t.Fatal("the acquire loop must start no attempt")
			}
		})
	}
}

func TestProcessTick_WaitsForAFreeAttemptSlot(t *testing.T) {
	f := newProcessorFixture()
	f.processor.attemptSlots = make(chan struct{}, 1)
	otherScore := f.addOtherTask()
	bwcStarted := make(chan struct{})
	gate := make(chan struct{})
	release := sync.OnceFunc(func() { close(gate) })
	defer release()
	f.beforeBwc = func() error {
		close(bwcStarted)
		<-gate
		return nil
	}
	join := f.startRunsInBackground()

	tickDone := f.startTick()

	waitClosed(t, "the BWC of the first task", bwcStarted)
	time.Sleep(testSettleDelay)
	if f.lintTasks.readCount(testOtherValidationProcessId) != 0 || otherScore.writeCount() != 0 || returned(tickDone) {
		t.Fatalf("other quality reads %d, other score writes %d, tick returned %t; want no attempt of the other task while the slot is taken",
			f.lintTasks.readCount(testOtherValidationProcessId), otherScore.writeCount(), returned(tickDone))
	}

	release()
	waitClosed(t, "the tick", tickDone)
	join()
	assertAttemptEnded(t, f, view.TaskStatusProcessing, 0)
	if row := otherScore.get(); row.ProcessDetails.BackwardsCompatibility.ProcessStatus != view.ScoringProcessSuccess {
		t.Fatalf("other BWC = %s, want the other task scored after the release", row.ProcessDetails.BackwardsCompatibility.ProcessStatus)
	}
	if taken := len(f.processor.attemptSlots); taken != 0 {
		t.Fatalf("%d attempt slots taken, want 0", taken)
	}
}

func TestProcessTick_FailedAttemptFreesItsSlot(t *testing.T) {
	tests := []struct {
		name  string
		fails func() error
	}{
		{"error", returning(errors.New("APIHUB unavailable"))},
		{"panic", panicking("unexpected response")},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newProcessorFixture()
			f.processor.attemptSlots = make(chan struct{}, 1)
			otherScore := f.addOtherTask()
			f.beforeBwc = tt.fails
			join := f.startRunsInBackground()

			waitClosed(t, "the tick", f.startTick())
			join()

			assertAttemptEnded(t, f, view.TaskStatusProcessing, 1)
			if row := otherScore.get(); row.ProcessDetails.BackwardsCompatibility.ProcessStatus != view.ScoringProcessSuccess {
				t.Fatalf("other BWC = %s, want the other task scored in the same pass", row.ProcessDetails.BackwardsCompatibility.ProcessStatus)
			}

			waitClosed(t, "the second tick", f.startTick())
			join()

			assertAttemptEnded(t, f, view.TaskStatusProcessing, repository.MaxScoringTaskRestarts)
			if taken := len(f.processor.attemptSlots); taken != 0 {
				t.Fatalf("%d attempt slots taken, want 0", taken)
			}
		})
	}
}

func TestProcessTick_PanicAfterTheAttemptFreesItsSlot(t *testing.T) {
	f := newProcessorFixture()
	f.processor.attemptSlots = make(chan struct{}, 1)
	otherScore := f.addOtherTask()
	f.beforeBwc = returning(errors.New("APIHUB unavailable"))
	f.tasks.beforeInc = panicking("unexpected nil row")
	join := f.startRunsInBackground()

	waitClosed(t, "the tick", f.startTick())
	join()

	assertAttemptEnded(t, f, view.TaskStatusProcessing, 0)
	if incs := f.tasks.incCallCount(testScoringTaskId); incs != 1 {
		t.Fatalf("restart write tried %d times, want once: the panic must come from attemptFailed", incs)
	}
	if taken := len(f.processor.attemptSlots); taken != 0 {
		t.Fatalf("%d attempt slots taken, want 0", taken)
	}
	if row := otherScore.get(); row.ProcessDetails.BackwardsCompatibility.ProcessStatus != view.ScoringProcessSuccess {
		t.Fatalf("other BWC = %s, want the next task scored", row.ProcessDetails.BackwardsCompatibility.ProcessStatus)
	}
}

func TestProcessTick_TaskLostWhileItWaitsForASlot(t *testing.T) {
	f := newProcessorFixture()
	f.processor.attemptSlots = make(chan struct{}, 1)
	otherScore := f.addOtherTask()
	bwcStarted := make(chan struct{})
	gate := make(chan struct{})
	release := sync.OnceFunc(func() { close(gate) })
	defer release()
	f.beforeBwc = func() error {
		close(bwcStarted)
		<-gate
		return nil
	}
	join := f.startRunsInBackground()

	tickDone := f.startTick()
	waitClosed(t, "the BWC of the first task", bwcStarted)
	waitFor(t, "the tick to mark the other task", func() bool { return f.slotTaken(testOtherScoringTaskId) })
	time.Sleep(testSettleDelay)
	if reads := f.tasks.taskReadCount(testOtherScoringTaskId); reads != 0 || returned(tickDone) {
		t.Fatalf("other task read %d times, tick returned %t; want the task waiting for a slot when it is lost", reads, returned(tickDone))
	}
	f.tasks.setOwner(testOtherScoringTaskId, testOtherExecutorId)
	if reads := f.tasks.taskReadCount(testOtherScoringTaskId); reads != 0 {
		t.Fatalf("other task read %d times before the release, want 0", reads)
	}

	release()
	waitClosed(t, "the tick", tickDone)
	join()

	if reads := f.tasks.taskReadCount(testOtherScoringTaskId); reads != 1 {
		t.Fatalf("other task read %d times, want one fresh read after the move", reads)
	}
	otherVersion := fmt.Sprintf("%s@%d", testVersion, testOtherRevision)
	if incs, requests := f.tasks.incCallCount(testOtherScoringTaskId), f.apihub.requestCount(otherVersion); incs != 0 || requests != 0 {
		t.Fatalf("other task: %d restart writes tried, %d APIHUB requests; want neither for a task the executor no longer owns", incs, requests)
	}
	if f.lintTasks.readCount(testOtherValidationProcessId) != 0 || otherScore.writeCount() != 0 {
		t.Fatalf("other quality reads %d, other score writes %d; want no part of a task the executor no longer owns",
			f.lintTasks.readCount(testOtherValidationProcessId), otherScore.writeCount())
	}
	if other := f.tasks.task(testOtherScoringTaskId); other.RestartCount != 0 {
		t.Fatalf("other task has %d restarts, want 0", other.RestartCount)
	}
	if f.slotTaken(testOtherScoringTaskId) {
		t.Fatal("the slot of the lost task must be free")
	}
}

func TestAttempt_DeadlineCountsAsAFailedAttempt(t *testing.T) {
	f := newProcessorFixture()
	f.processor.attemptTimeout = testAttemptTimeout
	testEnded := make(chan struct{})
	defer close(testEnded)
	f.apihub.getVersion = func(ctx context.Context, _, _ string) (*view.VersionContent, error) {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-testEnded:
			return nil, errors.New("the test ended before the attempt deadline")
		}
	}

	waitClosed(t, "the tick", f.startTick())

	assertAttemptEnded(t, f, view.TaskStatusProcessing, 1)
	if details := f.task().Details; !strings.Contains(details, context.DeadlineExceeded.Error()) {
		t.Fatalf("details = %q, want the deadline in them", details)
	}
	if taken := len(f.processor.attemptSlots); taken != 0 {
		t.Fatalf("%d attempt slots taken, want 0", taken)
	}
}

func TestFailScoringTask_PerSectionAttribution(t *testing.T) {
	t.Run("GetVersion failure with finished quality attributes integrity and BWC only", func(t *testing.T) {
		f := newProcessorFixture()
		f.lintTasks.tasks[testLintTaskId].Status = view.TaskStatusSuccess
		f.beforeBwc = returning(errors.New("503 Service Unavailable"))

		for range repository.MaxScoringTaskRestarts {
			f.processor.processTick(context.Background())
		}
		f.processor.processTick(context.Background())

		row := f.score.get()
		const wantErr = "failed to get version content: 503 Service Unavailable"
		if row.ProcessDetails.ProcessStatus != view.ScoringProcessError || row.Status != view.ScoringNotPassed {
			t.Fatalf("score = %s %q, want error/not_passed", row.ProcessDetails.ProcessStatus, row.Status)
		}
		if !slices.Equal(row.ProcessDetails.PublicationIntegrity.Debug, []string{wantErr}) {
			t.Fatalf("integrity debug = %#v, want %q", row.ProcessDetails.PublicationIntegrity.Debug, wantErr)
		}
		if !slices.Equal(row.ProcessDetails.BackwardsCompatibility.Debug, []string{wantErr}) {
			t.Fatalf("BWC debug = %#v, want %q", row.ProcessDetails.BackwardsCompatibility.Debug, wantErr)
		}
		if len(row.ProcessDetails.QualityCheck.Debug) != 0 || row.ProcessDetails.QualityCheck.ProcessStatus != view.ScoringProcessSuccess {
			t.Fatalf("quality = %s %#v, want success with no debug", row.ProcessDetails.QualityCheck.ProcessStatus, row.ProcessDetails.QualityCheck.Debug)
		}
		if len(row.ProcessDetails.Debug) != 0 {
			t.Fatalf("process debug = %#v, want omitted when all failed checks are attributed", row.ProcessDetails.Debug)
		}
		wantFlat := []string{
			"publicationIntegrity: " + wantErr,
			"backwardsCompatibility: " + wantErr,
		}
		if !slices.Equal(entity.MakeVersionScoreView_deprecated(row).Debug, wantFlat) {
			t.Fatalf("v1 debug = %#v, want %#v", entity.MakeVersionScoreView_deprecated(row).Debug, wantFlat)
		}
	})

	t.Run("BWC failure while quality waits for lint does not misattribute APIHUB error to quality", func(t *testing.T) {
		f := newProcessorFixture()
		f.apihub.getVersionChanges = func(int) (*view.VersionChangesView, error) {
			return nil, errors.New("status code 500")
		}

		for range repository.MaxScoringTaskRestarts {
			f.processor.processTick(context.Background())
		}
		f.processor.processTick(context.Background())

		row := f.score.get()
		if row.ProcessDetails.PublicationIntegrity.ProcessStatus != view.ScoringProcessSuccess || len(row.ProcessDetails.PublicationIntegrity.Debug) != 0 {
			t.Fatalf("integrity = %s %#v, want success without debug", row.ProcessDetails.PublicationIntegrity.ProcessStatus, row.ProcessDetails.PublicationIntegrity.Debug)
		}
		if row.ProcessDetails.BackwardsCompatibility.ProcessStatus != view.ScoringProcessError || len(row.ProcessDetails.BackwardsCompatibility.Debug) != 1 || !strings.Contains(row.ProcessDetails.BackwardsCompatibility.Debug[0], "status code 500") {
			t.Fatalf("BWC = %s %#v, want error with 500", row.ProcessDetails.BackwardsCompatibility.ProcessStatus, row.ProcessDetails.BackwardsCompatibility.Debug)
		}
		if row.ProcessDetails.QualityCheck.ProcessStatus != view.ScoringProcessError || len(row.ProcessDetails.QualityCheck.Debug) != 0 {
			t.Fatalf("quality = %s %#v, want error without misattributed BWC error", row.ProcessDetails.QualityCheck.ProcessStatus, row.ProcessDetails.QualityCheck.Debug)
		}
		if len(row.ProcessDetails.Debug) != 1 || !strings.HasPrefix(row.ProcessDetails.Debug[0], scoringTaskFailedDebugPrefix) {
			t.Fatalf("process debug = %#v, want scoring task failed line explaining aborted quality", row.ProcessDetails.Debug)
		}
	})

	t.Run("concurrent BWC and quality DB failures attribute each section independently", func(t *testing.T) {
		f := newProcessorFixture()
		f.score.row.ProcessDetails.PublicationIntegrity = view.PublicationIntegrityCheck{
			ProcessStatus: view.ScoringProcessSuccess,
			Details:       &view.PublicationIntegrityDetails{Status: view.ScoringPassed},
		}
		f.apihub.getVersionChanges = func(int) (*view.VersionChangesView, error) {
			return nil, errors.New("apihub 502")
		}
		f.lintTasks.beforeRead = returning(errors.New("db connection refused"))

		for range repository.MaxScoringTaskRestarts {
			f.processor.processTick(context.Background())
		}
		f.processor.processTick(context.Background())

		row := f.score.get()
		if len(row.ProcessDetails.BackwardsCompatibility.Debug) != 1 || !strings.Contains(row.ProcessDetails.BackwardsCompatibility.Debug[0], "apihub 502") {
			t.Fatalf("BWC debug = %#v, want apihub 502", row.ProcessDetails.BackwardsCompatibility.Debug)
		}
		if len(row.ProcessDetails.QualityCheck.Debug) != 1 || !strings.Contains(row.ProcessDetails.QualityCheck.Debug[0], "db connection refused") {
			t.Fatalf("quality debug = %#v, want db connection refused", row.ProcessDetails.QualityCheck.Debug)
		}
		if len(row.ProcessDetails.Debug) != 0 {
			t.Fatalf("process debug = %#v, want omitted when both unfinished checks are attributed", row.ProcessDetails.Debug)
		}
	})
	t.Run("integrity-only panic does not attribute BWC", func(t *testing.T) {
		f := newProcessorFixture()
		f.lintTasks.tasks[testLintTaskId].Status = view.TaskStatusSuccess
		f.tasks.updateScoreFault = func() (bool, error) { panic("integrity write panic") }

		for range repository.MaxScoringTaskRestarts {
			f.processor.processTick(context.Background())
		}
		f.processor.processTick(context.Background())

		row := f.score.get()
		if !slices.Equal(row.ProcessDetails.PublicationIntegrity.Debug, []string{"panic: integrity write panic"}) {
			t.Fatalf("integrity debug = %#v, want integrity panic", row.ProcessDetails.PublicationIntegrity.Debug)
		}
		if len(row.ProcessDetails.BackwardsCompatibility.Debug) != 0 {
			t.Fatalf("BWC debug = %#v, want empty because BWC never started", row.ProcessDetails.BackwardsCompatibility.Debug)
		}
		if len(row.ProcessDetails.Debug) != 1 || !strings.HasPrefix(row.ProcessDetails.Debug[0], scoringTaskFailedDebugPrefix) {
			t.Fatalf("process debug = %#v, want scoring task failed line for aborted BWC", row.ProcessDetails.Debug)
		}
	})

	t.Run("lease expiry after an earlier quality failure reports process-level cause", func(t *testing.T) {
		f := newProcessorFixture()
		f.score.row.ProcessDetails.PublicationIntegrity = view.PublicationIntegrityCheck{
			ProcessStatus: view.ScoringProcessSuccess,
			Details:       &view.PublicationIntegrityDetails{Status: view.ScoringPassed},
		}
		f.score.row.ProcessDetails.BackwardsCompatibility = view.BackwardsCompatibilityCheck{
			ProcessStatus: view.ScoringProcessSuccess,
			Details:       map[view.OpApiType]view.BackwardCompatibilityDetails{},
		}
		f.lintTasks.beforeRead = returning(errors.New("temporary db hiccup"))

		f.processor.processTick(context.Background())
		assertAttemptEnded(t, f, view.TaskStatusProcessing, 1)

		f.lintTasks.beforeRead = nil
		f.tasks.free = []string{testScoringTaskId}
		f.processor.acquireTasks(context.Background())

		row := f.score.get()
		if row.ProcessDetails.QualityCheck.ProcessStatus != view.ScoringProcessError || len(row.ProcessDetails.QualityCheck.Debug) != 0 {
			t.Fatalf("quality = %s %#v, want error without stale attempt 1 error", row.ProcessDetails.QualityCheck.ProcessStatus, row.ProcessDetails.QualityCheck.Debug)
		}
		if len(row.ProcessDetails.Debug) != 1 || !strings.HasPrefix(row.ProcessDetails.Debug[0], scoringTaskFailedDebugPrefix) {
			t.Fatalf("process debug = %#v, want process-level failure line", row.ProcessDetails.Debug)
		}
	})
}

func TestProcessTick_UnexpectedLintTaskStatusEndsQualityInError(t *testing.T) {
	f := newQualityFixture()
	f.lintTasks.tasks[testLintTaskId].Status = view.TaskStatus("unknown_state")
	f.docTasks.tasks = []entity.DocumentLintTask{failedDocTask("d1", "a.yaml", view.SpectralLinter, "spectral crashed")}

	f.processor.processTick(context.Background())

	row := f.score.get()
	wantDebug := []string{"unexpected lint task status: unknown_state", "1 required lint result(s) unavailable"}
	if row.ProcessDetails.QualityCheck.ProcessStatus != view.ScoringProcessError || !slices.Equal(row.ProcessDetails.QualityCheck.Debug, wantDebug) {
		t.Fatalf("quality = %s %#v, want error %#v", row.ProcessDetails.QualityCheck.ProcessStatus, row.ProcessDetails.QualityCheck.Debug, wantDebug)
	}
	if len(row.ProcessDetails.QualityCheck.Details[view.RestApiType]) != 1 {
		t.Fatalf("details = %#v, want finished document entry preserved", row.ProcessDetails.QualityCheck.Details)
	}
	assertHandledIds(t, f, "d1")
	if row.ProcessDetails.ProcessStatus != view.ScoringProcessError || row.Status != view.ScoringNotPassed {
		t.Fatalf("score = %s %q, want error/not_passed", row.ProcessDetails.ProcessStatus, row.Status)
	}
}

func TestProcessTick_FailedOptionalLinterWithEmptyDetailsSetsFallbackInternalError(t *testing.T) {
	f := newQualityFixture()
	f.lintTasks.tasks[testLintTaskId].Status = view.TaskStatusSuccess
	f.docTasks.tasks = []entity.DocumentLintTask{failedDocTask("d1", "a.yaml", view.AiLinter, "")}

	f.processor.processTick(context.Background())

	row := f.score.get()
	entry := row.ProcessDetails.QualityCheck.Details[view.RestApiType][0]
	if entry.Status != view.ScoringPassed || entry.InternalError != emptyLinterInternalError {
		t.Fatalf("entry = %#v, want passed with fallback internalErrors %q", entry, emptyLinterInternalError)
	}
}

func TestSectionReset_ClearsOnlyResetSectionDebug(t *testing.T) {
	score := finishedScore()
	score.ProcessDetails.ProcessStatus = view.ScoringProcessError
	score.ProcessDetails.PublicationIntegrity = view.PublicationIntegrityCheck{
		ProcessStatus: view.ScoringProcessError,
		Debug:         []string{"integrity error"},
	}
	score.ProcessDetails.BackwardsCompatibility = view.BackwardsCompatibilityCheck{
		ProcessStatus: view.ScoringProcessError,
		Debug:         []string{"bwc error"},
	}
	score.ProcessDetails.QualityCheck = view.QualityCheck{
		ProcessStatus: view.ScoringProcessError,
		Debug:         []string{"lint task failed: boom"},
	}
	score.ProcessDetails.Debug = []string{"scoring task failed: timeout"}

	score.ProcessDetails.BackwardsCompatibility = view.BackwardsCompatibilityCheck{
		ProcessStatus: view.ScoringProcessNotStarted,
	}

	wantV1Debug := []string{
		"publicationIntegrity: integrity error",
		"qualityCheck: lint task failed: boom",
		"scoring task failed: timeout",
	}
	if got := entity.MakeVersionScoreView_deprecated(score).Debug; !slices.Equal(got, wantV1Debug) {
		t.Fatalf("v1 debug after BWC reset = %#v, want %#v", got, wantV1Debug)
	}
	v2 := entity.MakeVersionScoreView(score)
	if len(v2.ProcessDetails.BackwardsCompatibility.Debug) != 0 {
		t.Fatalf("reset BWC debug = %#v, want empty", v2.ProcessDetails.BackwardsCompatibility.Debug)
	}
	if !slices.Equal(v2.ProcessDetails.PublicationIntegrity.Debug, []string{"integrity error"}) ||
		!slices.Equal(v2.ProcessDetails.QualityCheck.Debug, []string{"lint task failed: boom"}) ||
		!slices.Equal(v2.ProcessDetails.Debug, []string{"scoring task failed: timeout"}) {
		t.Fatalf("other sections' debug must stay intact: %#v", v2.ProcessDetails)
	}
}
