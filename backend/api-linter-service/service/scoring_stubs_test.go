package service

import (
	"context"
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
	row := *s.row
	return &row
}

type scoringRepoStub struct {
	scores map[int]*inMemoryScore
	err    error
}

func (r *scoringRepoStub) GetScoringForVersion(_ context.Context, _ string, _ string, revision int) (*entity.VersionScore, error) {
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
}

func (r *scoringTaskRepoStub) task(id string) entity.VersionScoringTask {
	r.mu.Lock()
	defer r.mu.Unlock()
	return *r.tasks[id]
}

func (r *scoringTaskRepoStub) ClaimFreeScoringTask(_ context.Context, executorId string) (*entity.VersionScoringTask, bool, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if len(r.free) == 0 {
		return nil, false, nil
	}
	task := r.tasks[r.free[0]]
	r.free = r.free[1:]
	task.Status = view.TaskStatusProcessing
	task.ExecutorId = executorId
	claimed := *task
	return &claimed, claimed.RestartCount >= repository.MaxScoringTaskRestarts, nil
}

func (r *scoringTaskRepoStub) GetProcessingTasks(_ context.Context, executorId string) ([]entity.VersionScoringTask, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	var result []entity.VersionScoringTask
	for _, task := range r.tasks {
		if task.ExecutorId == executorId && task.Status == view.TaskStatusProcessing {
			result = append(result, *task)
		}
	}
	sort.Slice(result, func(i, j int) bool { return result[i].Id < result[j].Id })
	return result, nil
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
	row := *score.row
	if err := write(&row, owned); err != nil {
		return nil, err
	}
	score.row = &row
	score.writes++
	written := row
	return &written, nil
}

func (r *scoringTaskRepoStub) UpdateScore(_ context.Context, task entity.VersionScoringTask, apply func(score *entity.VersionScore)) (*entity.VersionScore, error) {
	return r.withOwnedScore(task, func(row *entity.VersionScore, _ *entity.VersionScoringTask) error {
		apply(row)
		return nil
	})
}

func (r *scoringTaskRepoStub) UpdateQualityCheck(_ context.Context, task entity.VersionScoringTask, handledDocTaskIds []string, apply func(score *entity.VersionScore)) (*entity.VersionScore, error) {
	return r.withOwnedScore(task, func(row *entity.VersionScore, owned *entity.VersionScoringTask) error {
		apply(row)
		owned.HandledDocTaskIds = handledDocTaskIds
		return nil
	})
}

func (r *scoringTaskRepoStub) CompleteScoring(_ context.Context, task entity.VersionScoringTask, recompute func(score *entity.VersionScore)) (bool, error) {
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

	tasks map[string]*entity.VersionLintTask
}

func (r *versionLintTaskRepoStub) GetTaskById(_ context.Context, taskId string) (*entity.VersionLintTask, error) {
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
}

func (r *docLintTaskRepoStub) GetDocTasksForVersionTasks(_ context.Context, verTaskIds []string) ([]entity.DocumentLintTask, error) {
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
