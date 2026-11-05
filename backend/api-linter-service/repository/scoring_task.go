package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/db"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/entity"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/view"
	"github.com/go-pg/pg/v10"
)

const MaxScoringTaskRestarts = 2

type ScoringTaskRepository interface {
	ClaimFreeScoringTask(ctx context.Context, executorId string) (task *entity.VersionScoringTask, exhausted bool, err error)
	GetProcessingTasks(ctx context.Context, executorId string) ([]entity.VersionScoringTask, error)
	GetProcessingTask(ctx context.Context, taskId string, executorId string) (*entity.VersionScoringTask, error)
	RefreshLeases(ctx context.Context, executorId string) error
	IncRestartCount(ctx context.Context, taskId string, executorId string, details string) (owned bool, err error)
	CloseLostTask(ctx context.Context, taskId string, executorId string, details string) error

	UpdateScore(ctx context.Context, task entity.VersionScoringTask, apply func(score *entity.VersionScore)) (*entity.VersionScore, error)
	UpdateQualityCheck(ctx context.Context, task entity.VersionScoringTask, handledDocTaskIds []string, apply func(score *entity.VersionScore)) (*entity.VersionScore, error)
	CompleteScoring(ctx context.Context, task entity.VersionScoringTask, recompute func(score *entity.VersionScore)) (completed bool, err error)
	ScoringFailed(ctx context.Context, task entity.VersionScoringTask, details string, apply func(score *entity.VersionScore)) (failed bool, err error)
}

func NewScoringTaskRepository(cp db.ConnectionProvider) ScoringTaskRepository {
	return &scoringTaskRepositoryImpl{cp: cp}
}

type scoringTaskRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (r *scoringTaskRepositoryImpl) ClaimFreeScoringTask(ctx context.Context, executorId string) (*entity.VersionScoringTask, bool, error) {
	var result *entity.VersionScoringTask
	err := r.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		var ents []entity.VersionScoringTask
		_, err := tx.Query(&ents, `select * from version_scoring_task t
			where (t.status = ? or (t.status = ? and t.last_active < now() - ? * interval '1 second'))
			order by t.created_at asc limit 1 for no key update skip locked`,
			view.TaskStatusNotStarted, view.TaskStatusProcessing, buildKeepaliveTimeoutSec)
		if err != nil {
			return fmt.Errorf("failed to claim free scoring task: %w", err)
		}
		if len(ents) == 0 {
			return nil
		}
		// A claim of a task that is still processing takes over an expired lease, which counts as an attempt. The status
		// on the right-hand side is the old value.
		var claimed entity.VersionScoringTask
		if _, err := tx.QueryOne(&claimed, `update version_scoring_task
			set status = ?, executor_id = ?, last_active = now(),
				restart_count = restart_count + case when status = ? then 1 else 0 end
			where id = ? returning *`,
			view.TaskStatusProcessing, executorId, view.TaskStatusProcessing, ents[0].Id); err != nil {
			return fmt.Errorf("failed to claim scoring task %s: %w", ents[0].Id, err)
		}
		result = &claimed
		return nil
	})
	if err != nil || result == nil {
		return nil, false, err
	}
	return result, result.RestartCount >= MaxScoringTaskRestarts, nil
}

func (r *scoringTaskRepositoryImpl) GetProcessingTasks(ctx context.Context, executorId string) ([]entity.VersionScoringTask, error) {
	var result []entity.VersionScoringTask
	err := r.cp.GetConnection().ModelContext(ctx, &result).
		Where("executor_id = ?", executorId).
		Where("status = ?", view.TaskStatusProcessing).
		Order("created_at ASC").
		Select()
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (r *scoringTaskRepositoryImpl) GetProcessingTask(ctx context.Context, taskId string, executorId string) (*entity.VersionScoringTask, error) {
	var result entity.VersionScoringTask
	err := r.cp.GetConnection().ModelContext(ctx, &result).
		Where("id = ?", taskId).
		Where("executor_id = ?", executorId).
		Where("status = ?", view.TaskStatusProcessing).
		Select()
	if err != nil {
		if errors.Is(err, pg.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &result, nil
}

func (r *scoringTaskRepositoryImpl) RefreshLeases(ctx context.Context, executorId string) error {
	_, err := r.cp.GetConnection().ExecContext(ctx,
		"update version_scoring_task set last_active = now() where executor_id = ? and status = ?",
		executorId, view.TaskStatusProcessing)
	return err
}

func (r *scoringTaskRepositoryImpl) IncRestartCount(ctx context.Context, taskId string, executorId string, details string) (bool, error) {
	res, err := r.cp.GetConnection().ExecContext(ctx,
		"update version_scoring_task set restart_count = restart_count + 1, details = ? where id = ? and executor_id = ? and status = ?",
		details, taskId, executorId, view.TaskStatusProcessing)
	if err != nil {
		return false, err
	}
	return res.RowsAffected() > 0, nil
}

func (r *scoringTaskRepositoryImpl) CloseLostTask(ctx context.Context, taskId string, executorId string, details string) error {
	_, err := r.cp.GetConnection().ExecContext(ctx,
		"update version_scoring_task set status = ?, details = ?, last_active = now() where id = ? and executor_id = ? and status = ?",
		view.TaskStatusError, details, taskId, executorId, view.TaskStatusProcessing)
	return err
}

func (r *scoringTaskRepositoryImpl) UpdateScore(ctx context.Context, task entity.VersionScoringTask, apply func(score *entity.VersionScore)) (*entity.VersionScore, error) {
	return r.withOwnedScoreTx(ctx, task, func(_ *pg.Tx, score *entity.VersionScore) error {
		apply(score)
		return nil
	})
}

func (r *scoringTaskRepositoryImpl) UpdateQualityCheck(ctx context.Context, task entity.VersionScoringTask, handledDocTaskIds []string, apply func(score *entity.VersionScore)) (*entity.VersionScore, error) {
	return r.withOwnedScoreTx(ctx, task, func(tx *pg.Tx, score *entity.VersionScore) error {
		apply(score)
		if _, err := tx.Exec("update version_scoring_task set handled_doc_task_ids = ? where id = ?", pg.Array(handledDocTaskIds), task.Id); err != nil {
			return fmt.Errorf("failed to store the handled document tasks of scoring task %s: %w", task.Id, err)
		}
		return nil
	})
}

func (r *scoringTaskRepositoryImpl) CompleteScoring(ctx context.Context, task entity.VersionScoringTask, recompute func(score *entity.VersionScore)) (bool, error) {
	completed := false
	_, err := r.withOwnedScoreTx(ctx, task, func(tx *pg.Tx, score *entity.VersionScore) error {
		if !score.PartsFinished() {
			return nil
		}
		score.ProcessStatus = view.ScoringProcessCompleted
		recompute(score)
		if _, err := tx.Exec("update version_scoring_task set status = ?, details = ?, last_active = now() where id = ? and executor_id = ? and status = ?",
			view.TaskStatusSuccess, "", task.Id, task.ExecutorId, view.TaskStatusProcessing); err != nil {
			return fmt.Errorf("failed to complete scoring task %s: %w", task.Id, err)
		}
		completed = true
		return nil
	})
	if err != nil {
		return false, err
	}
	return completed, nil
}

func (r *scoringTaskRepositoryImpl) ScoringFailed(ctx context.Context, task entity.VersionScoringTask, details string, apply func(score *entity.VersionScore)) (bool, error) {
	score, err := r.withOwnedScoreTx(ctx, task, func(tx *pg.Tx, score *entity.VersionScore) error {
		apply(score)
		if _, err := tx.Exec("update version_scoring_task set status = ?, details = ?, last_active = now() where id = ? and executor_id = ? and status = ?",
			view.TaskStatusError, details, task.Id, task.ExecutorId, view.TaskStatusProcessing); err != nil {
			return fmt.Errorf("failed to fail scoring task %s: %w", task.Id, err)
		}
		return nil
	})
	return score != nil, err
}

// withOwnedScoreTx locks the task row, then the score row, and runs write only while the task is still
// owned by this executor and the score row still names it. Otherwise it writes nothing and returns nil.
func (r *scoringTaskRepositoryImpl) withOwnedScoreTx(ctx context.Context, task entity.VersionScoringTask, write func(tx *pg.Tx, score *entity.VersionScore) error) (*entity.VersionScore, error) {
	var result *entity.VersionScore
	err := r.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		res, err := tx.Exec("update version_scoring_task set last_active = now() where id = ? and executor_id = ? and status = ?",
			task.Id, task.ExecutorId, view.TaskStatusProcessing)
		if err != nil {
			return fmt.Errorf("failed to fence scoring task %s: %w", task.Id, err)
		}
		if res.RowsAffected() == 0 {
			return nil
		}

		var score entity.VersionScore
		if _, err = tx.QueryOne(&score, "select * from version_score where package_id = ? and version = ? and revision = ? for update",
			task.PackageId, task.Version, task.Revision); err != nil {
			if errors.Is(err, pg.ErrNoRows) {
				return nil
			}
			return fmt.Errorf("failed to lock score row: %w", err)
		}
		if score.ScoringTaskId != task.Id {
			return nil
		}

		if err = write(tx, &score); err != nil {
			return err
		}
		score.ScoredAt = time.Now()
		if _, err = tx.Model(&score).WherePK().Update(); err != nil {
			return fmt.Errorf("failed to update score row: %w", err)
		}
		result = &score
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}
