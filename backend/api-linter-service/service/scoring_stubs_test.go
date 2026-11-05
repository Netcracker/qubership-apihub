package service

import (
	"context"
	"maps"
	"slices"
	"sort"
	"sync"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/client"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/entity"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/repository"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/view"
)

type inMemoryScore struct {
	mu     sync.Mutex
	row    *entity.VersionScore
	writes int
}

func (s *inMemoryScore) get() *entity.VersionScore {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.row == nil {
		return nil
	}
	return detachedScore(s.row)
}

func (s *inMemoryScore) replaceTaskId(taskId string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.row.ScoringTaskId = taskId
}

func (s *inMemoryScore) delete() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.row = nil
}

func (s *inMemoryScore) writeCount() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.writes
}

// A database read returns independent rows, so no map or slice is shared between the stored and the returned row.
func detachedScore(row *entity.VersionScore) *entity.VersionScore {
	detached := *row
	detached.Reasons = slices.Clone(row.Reasons)
	detached.Debug = slices.Clone(row.Debug)
	detached.BackwardCompatibilityDetails = maps.Clone(row.BackwardCompatibilityDetails)
	detached.QualityCheckDetails = maps.Clone(row.QualityCheckDetails)
	for apiType, entries := range detached.QualityCheckDetails {
		detached.QualityCheckDetails[apiType] = slices.Clone(entries)
	}
	if row.PublicationIntegrityDetails != nil {
		integrity := *row.PublicationIntegrityDetails
		detached.PublicationIntegrityDetails = &integrity
	}
	return &detached
}

type scoringRepoStub struct {
	scores     map[int]*inMemoryScore
	err        error
	beforeRead func(read int) error

	mu    sync.Mutex
	reads int
}

func (r *scoringRepoStub) GetScoringForVersion(_ context.Context, _ string, _ string, revision int) (*entity.VersionScore, error) {
	r.mu.Lock()
	r.reads++
	read := r.reads
	r.mu.Unlock()
	if r.beforeRead != nil {
		if err := r.beforeRead(read); err != nil {
			return nil, err
		}
	}
	if r.err != nil {
		return nil, r.err
	}
	score, ok := r.scores[revision]
	if !ok {
		return nil, nil
	}
	return score.get(), nil
}

type scoringTaskRepoStub struct {
	scores map[int]*inMemoryScore

	mu    sync.Mutex
	tasks map[string]*entity.VersionScoringTask
	free  []string

	scoringFailedErrs []error

	listedTasks        []entity.VersionScoringTask
	beforeGetTask      func() error
	beforeInc          func() error
	beforeComplete     func() error
	updateScoreFault   func() (refused bool, err error)
	updateQualityFault func() (refused bool, err error)
}

func detachedTask(task *entity.VersionScoringTask) entity.VersionScoringTask {
	detached := *task
	detached.HandledDocTaskIds = slices.Clone(task.HandledDocTaskIds)
	return detached
}

func (r *scoringTaskRepoStub) setOwner(taskId string, executorId string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.tasks[taskId].ExecutorId = executorId
}

func (r *scoringTaskRepoStub) task(id string) entity.VersionScoringTask {
	r.mu.Lock()
	defer r.mu.Unlock()
	return detachedTask(r.tasks[id])
}

func (r *scoringTaskRepoStub) ClaimFreeScoringTask(_ context.Context, executorId string) (*entity.VersionScoringTask, bool, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if len(r.free) == 0 {
		return nil, false, nil
	}
	task := r.tasks[r.free[0]]
	r.free = r.free[1:]
	if task.Status == view.TaskStatusProcessing {
		task.RestartCount++
	}
	task.Status = view.TaskStatusProcessing
	task.ExecutorId = executorId
	claimed := detachedTask(task)
	return &claimed, claimed.RestartCount >= repository.MaxScoringTaskRestarts, nil
}

func (r *scoringTaskRepoStub) GetProcessingTasks(_ context.Context, executorId string) ([]entity.VersionScoringTask, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.listedTasks != nil {
		return r.listedTasks, nil
	}
	var result []entity.VersionScoringTask
	for _, task := range r.tasks {
		if task.ExecutorId == executorId && task.Status == view.TaskStatusProcessing {
			result = append(result, detachedTask(task))
		}
	}
	sort.Slice(result, func(i, j int) bool { return result[i].Id < result[j].Id })
	return result, nil
}

func (r *scoringTaskRepoStub) GetProcessingTask(_ context.Context, taskId string, executorId string) (*entity.VersionScoringTask, error) {
	if r.beforeGetTask != nil {
		if err := r.beforeGetTask(); err != nil {
			return nil, err
		}
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	task := r.ownedLocked(taskId, executorId)
	if task == nil {
		return nil, nil
	}
	found := detachedTask(task)
	return &found, nil
}

func (r *scoringTaskRepoStub) RefreshLeases(_ context.Context, _ string) error {
	return nil
}

func (r *scoringTaskRepoStub) ownedLocked(taskId string, executorId string) *entity.VersionScoringTask {
	task, ok := r.tasks[taskId]
	if !ok || task.ExecutorId != executorId || task.Status != view.TaskStatusProcessing {
		return nil
	}
	return task
}

func (r *scoringTaskRepoStub) IncRestartCount(_ context.Context, taskId string, executorId string, details string) (bool, error) {
	if r.beforeInc != nil {
		if err := r.beforeInc(); err != nil {
			return false, err
		}
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	task := r.ownedLocked(taskId, executorId)
	if task == nil {
		return false, nil
	}
	task.RestartCount++
	task.Details = details
	return true, nil
}

func (r *scoringTaskRepoStub) CloseLostTask(_ context.Context, taskId string, executorId string, details string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if task := r.ownedLocked(taskId, executorId); task != nil {
		task.Status = view.TaskStatusError
		task.Details = details
	}
	return nil
}

func (r *scoringTaskRepoStub) withOwnedScore(task entity.VersionScoringTask, write func(row *entity.VersionScore, owned *entity.VersionScoringTask) error) (*entity.VersionScore, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	owned := r.ownedLocked(task.Id, task.ExecutorId)
	if owned == nil {
		return nil, nil
	}
	score, ok := r.scores[task.Revision]
	if !ok {
		return nil, nil
	}
	score.mu.Lock()
	defer score.mu.Unlock()
	if score.row == nil || score.row.ScoringTaskId != task.Id {
		return nil, nil
	}
	row := detachedScore(score.row)
	if err := write(row, owned); err != nil {
		return nil, err
	}
	score.row = row
	score.writes++
	return detachedScore(row), nil
}

func (r *scoringTaskRepoStub) UpdateScore(_ context.Context, task entity.VersionScoringTask, apply func(score *entity.VersionScore)) (*entity.VersionScore, error) {
	if r.updateScoreFault != nil {
		if refused, err := r.updateScoreFault(); refused || err != nil {
			return nil, err
		}
	}
	return r.withOwnedScore(task, func(row *entity.VersionScore, _ *entity.VersionScoringTask) error {
		apply(row)
		return nil
	})
}

func (r *scoringTaskRepoStub) UpdateQualityCheck(_ context.Context, task entity.VersionScoringTask, handledDocTaskIds []string, apply func(score *entity.VersionScore)) (*entity.VersionScore, error) {
	if r.updateQualityFault != nil {
		if refused, err := r.updateQualityFault(); refused || err != nil {
			return nil, err
		}
	}
	return r.withOwnedScore(task, func(row *entity.VersionScore, owned *entity.VersionScoringTask) error {
		apply(row)
		owned.HandledDocTaskIds = slices.Clone(handledDocTaskIds)
		return nil
	})
}

func (r *scoringTaskRepoStub) CompleteScoring(_ context.Context, task entity.VersionScoringTask, recompute func(score *entity.VersionScore)) (bool, error) {
	if r.beforeComplete != nil {
		if err := r.beforeComplete(); err != nil {
			return false, err
		}
	}
	completed := false
	_, err := r.withOwnedScore(task, func(row *entity.VersionScore, owned *entity.VersionScoringTask) error {
		if !row.PartsFinished() {
			return nil
		}
		row.ProcessStatus = view.ScoringProcessCompleted
		recompute(row)
		owned.Status = view.TaskStatusSuccess
		completed = true
		return nil
	})
	return completed, err
}

func (r *scoringTaskRepoStub) ScoringFailed(_ context.Context, task entity.VersionScoringTask, details string, apply func(score *entity.VersionScore)) (bool, error) {
	score, err := r.withOwnedScore(task, func(row *entity.VersionScore, owned *entity.VersionScoringTask) error {
		if len(r.scoringFailedErrs) > 0 {
			err := r.scoringFailedErrs[0]
			r.scoringFailedErrs = r.scoringFailedErrs[1:]
			return err
		}
		apply(row)
		owned.Status = view.TaskStatusError
		owned.Details = details
		return nil
	})
	return score != nil, err
}

type apihubClientStub struct {
	client.ApihubClient

	getVersion        func(packageId, version string) (*view.VersionContent, error)
	getVersionChanges func(page int) (*view.VersionChangesView, error)
	getOperationsList func(version string, page int) (*view.CommonOperations, error)
}

func (c *apihubClientStub) GetVersion(_ context.Context, id, version string, _ bool, _ bool) (*view.VersionContent, error) {
	return c.getVersion(id, version)
}

func (c *apihubClientStub) GetVersionChanges(_ context.Context, _ string, _ string, _ string, _ string, _ string, _ int, page int) (*view.VersionChangesView, error) {
	if c.getVersionChanges == nil {
		return &view.VersionChangesView{}, nil
	}
	return c.getVersionChanges(page)
}

func (c *apihubClientStub) GetOperationsList(_ context.Context, _ string, version string, _ view.OpApiType, req view.OperationListRequest) (*view.CommonOperations, error) {
	if c.getOperationsList == nil {
		return &view.CommonOperations{}, nil
	}
	return c.getOperationsList(version, req.Page)
}

type versionLintTaskRepoStub struct {
	repository.VersionLintTaskRepository

	tasks      map[string]*entity.VersionLintTask
	beforeRead func() error

	mu    sync.Mutex
	reads map[string]int
}

func (r *versionLintTaskRepoStub) readCount(taskId string) int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.reads[taskId]
}

func (r *versionLintTaskRepoStub) GetTaskById(_ context.Context, taskId string) (*entity.VersionLintTask, error) {
	r.mu.Lock()
	if r.reads == nil {
		r.reads = map[string]int{}
	}
	r.reads[taskId]++
	r.mu.Unlock()
	if taskId == testLintTaskId && r.beforeRead != nil {
		if err := r.beforeRead(); err != nil {
			return nil, err
		}
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	task, ok := r.tasks[taskId]
	if !ok {
		return nil, nil
	}
	copied := *task
	return &copied, nil
}

type docLintTaskRepoStub struct {
	repository.DocLintTaskRepository

	tasks []entity.DocumentLintTask

	mu sync.Mutex
}

func (r *docLintTaskRepoStub) setTasks(tasks []entity.DocumentLintTask) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.tasks = tasks
}

func (r *docLintTaskRepoStub) GetDocTasksForVersionTasks(_ context.Context, verTaskIds []string) ([]entity.DocumentLintTask, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	var result []entity.DocumentLintTask
	for _, task := range r.tasks {
		for _, id := range verTaskIds {
			if task.VersionLintTaskId == id {
				result = append(result, task)
			}
		}
	}
	return result, nil
}

type versionResultRepoStub struct {
	repository.VersionResultRepository

	docs  []entity.LintedDocument
	reads int
}

func (r *versionResultRepoStub) GetVersionAndDocsSummary(_ context.Context, _ string, _ string, _ int) (*entity.LintedVersion, []entity.LintedDocument, error) {
	r.reads++
	if len(r.docs) == 0 {
		return nil, nil, nil
	}
	return &entity.LintedVersion{}, r.docs, nil
}

type lintResultKey struct {
	dataHash  string
	rulesetId string
}

type lintResultRepoStub struct {
	repository.LintResultRepository

	summaries map[lintResultKey]map[string]interface{}
	err       error
	reads     int
}

func (r *lintResultRepoStub) GetLintResultSummary(_ context.Context, dataHash string, rulesetId string) (*entity.LintFileResultSummary, error) {
	r.reads++
	if r.err != nil {
		return nil, r.err
	}
	summary, ok := r.summaries[lintResultKey{dataHash: dataHash, rulesetId: rulesetId}]
	if !ok {
		return nil, nil
	}
	return &entity.LintFileResultSummary{DataHash: dataHash, RulesetId: rulesetId, Summary: summary}, nil
}

type rulesetRepoStub struct {
	repository.RulesetRepository

	rulesets map[string]entity.Ruleset
	reads    int
}

func (r *rulesetRepoStub) GetRulesetById(_ context.Context, id string) (*entity.Ruleset, error) {
	r.reads++
	ruleset, ok := r.rulesets[id]
	if !ok {
		return nil, nil
	}
	return &ruleset, nil
}

type linterConfigServiceStub struct {
	LinterConfigService

	optional map[view.Linter]bool
}

func (s *linterConfigServiceStub) IsLinterOptional(linter view.Linter) bool {
	return s.optional[linter]
}
