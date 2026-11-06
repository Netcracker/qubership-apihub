package repository

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/db"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/entity"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/exception"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/view"
	"github.com/go-pg/pg/v10"
	"github.com/go-pg/pg/v10/orm"
)

type VersionLintTaskRepository interface {
	SaveVersionTask(ctx context.Context, lintTask entity.VersionLintTask, scoringTask entity.VersionScoringTask, score entity.VersionScore) error
	GetTaskById(ctx context.Context, taskId string) (*entity.VersionLintTask, error)
	GetRunningTaskForVersion(ctx context.Context, packageId, version string, revision int) ([]entity.VersionLintTask, error)
	IncRestartCount(ctx context.Context, taskId string) error
	FindFreeVersionTask(ctx context.Context, executorId string) (*entity.VersionLintTask, error)
	GetWaitingForDocTasks(ctx context.Context, executorId string) ([]entity.VersionLintTask, error)
	VersionLintCompleted(ctx context.Context, taskId string, ver *entity.LintedVersion) error
	VersionLintFailed(ctx context.Context, taskId string, details string) error
	UpdateLastActive(ctx context.Context, taskId string, executorId string) error
}

type versionLintTaskRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (r *versionLintTaskRepositoryImpl) UpdateLastActive(ctx context.Context, taskId string, executorId string) error {
	var ent entity.VersionLintTask
	_, err := r.cp.GetConnection().ModelContext(ctx, &ent).
		Set("last_active = ?", time.Now()).
		Where("id = ?", taskId).
		Where("executor_id = ?", executorId).
		Update()
	if err != nil {
		return err
	}
	return nil
}

func NewVersionLintTaskRepository(cp db.ConnectionProvider) VersionLintTaskRepository {
	return &versionLintTaskRepositoryImpl{cp: cp}
}

func (r *versionLintTaskRepositoryImpl) IncRestartCount(ctx context.Context, taskId string) error {
	return r.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		var task entity.VersionLintTask
		err := tx.Model(&task).
			Where("id = ?", taskId).
			Select()
		if err != nil {
			return err
		}

		task.RestartCount += 1

		_, err = tx.Model(&task).WherePK().Update()
		if err != nil {
			return err
		}
		return nil
	})
}

func (r *versionLintTaskRepositoryImpl) GetWaitingForDocTasks(ctx context.Context, executorId string) ([]entity.VersionLintTask, error) {
	var result []entity.VersionLintTask
	err := r.cp.GetConnection().ModelContext(ctx, &result).
		Where("status = ?", view.TaskStatusWaitingForDocs).
		//Where("executor_id = ?", executorId). // FIXME: problem here: the tasks couldn't be complete after executor restart
		// TODO: limit here?
		// TODO: order here?
		Select()
	if err != nil {
		if errors.Is(err, pg.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (r *versionLintTaskRepositoryImpl) SaveVersionTask(ctx context.Context, lintTask entity.VersionLintTask, scoringTask entity.VersionScoringTask, score entity.VersionScore) error {
	return r.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		// The lint task goes first: a replayed event fails here and leaves the existing score untouched.
		_, err := tx.Model(&lintTask).Insert()
		if err != nil {
			var pgerr pg.Error
			if errors.As(err, &pgerr) {
				if pgerr.Field('C') == "23505" && strings.Contains(err.Error(), "version_lint_task_event_id_unique") { // ERROR #23505 duplicate key value violates unique constraint "version_lint_task_event_id_unique"
					return &exception.CustomError{
						Status:  http.StatusInternalServerError,
						Code:    exception.DuplicateEvent,
						Message: exception.DuplicateEventMsg,
						Params:  map[string]interface{}{"event_id": lintTask.EventId},
					}
				}
			}
			return err
		}

		if _, err = tx.Model(&scoringTask).Insert(); err != nil {
			return fmt.Errorf("failed to insert scoring task: %w", err)
		}

		if _, err = tx.Model(&score).OnConflict("(package_id, version, revision) do update").Insert(); err != nil {
			return fmt.Errorf("failed to reset score: %w", err)
		}
		return nil
	})
}

func (r *versionLintTaskRepositoryImpl) VersionLintCompleted(ctx context.Context, taskId string, ver *entity.LintedVersion) error {
	return r.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		var taskEnt entity.VersionLintTask
		_, err := tx.Model(&taskEnt).
			Set("status = ?", view.TaskStatusSuccess).
			Set("last_active = ?", time.Now()).
			Where("id = ?", taskId).
			Update()
		if err != nil {
			return err
		}

		// Upsert rather than update: a version with no lintable documents has no row yet.
		_, err = tx.Model(ver).OnConflict("(package_id, version, revision) do update").Insert()
		if err != nil {
			return err
		}
		return nil
	})
}

func (r *versionLintTaskRepositoryImpl) VersionLintFailed(ctx context.Context, taskId string, details string) error {
	return r.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		var taskEnt entity.VersionLintTask
		err := tx.Model(&taskEnt).Where("id = ?", taskId).Select()
		if err != nil {
			return fmt.Errorf("failed to get version lint task %s: %w", taskId, err)
		}

		_, err = tx.Model(&taskEnt).
			Set("status = ?", view.TaskStatusError).
			Set("details = ?", details).
			Set("last_active = ?", time.Now()).
			WherePK().
			Update()
		if err != nil {
			return err
		}

		ver := entity.LintedVersion{
			PackageId:   taskEnt.PackageId,
			Version:     taskEnt.Version,
			Revision:    taskEnt.Revision,
			LintStatus:  view.VersionStatusError,
			LintDetails: details,
			LintedAt:    time.Now(),
		}
		_, err = tx.Model(&ver).OnConflict("(package_id, version, revision) do update").
			Set("lint_status = EXCLUDED.lint_status").
			Set("lint_details = EXCLUDED.lint_details").
			Insert()
		return err
	})
}

func (r *versionLintTaskRepositoryImpl) GetTaskById(ctx context.Context, taskId string) (*entity.VersionLintTask, error) {
	var task entity.VersionLintTask
	err := r.cp.GetConnection().ModelContext(ctx, &task).
		Where("id = ?", taskId).
		Select()
	if err != nil {
		if errors.Is(err, pg.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &task, nil
}

func (r *versionLintTaskRepositoryImpl) GetRunningTaskForVersion(ctx context.Context, packageId, version string, revision int) ([]entity.VersionLintTask, error) {
	var tasks []entity.VersionLintTask
	q := r.cp.GetConnection().ModelContext(ctx, &tasks)
	err := applyRunningTaskFilter(q, packageId, version, revision).Select()
	if err != nil {
		if errors.Is(err, pg.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return tasks, nil
}

// applyRunningTaskFilter restricts the query to the given package/version/revision and groups the
// status predicates with WhereGroup so they render as a single parenthesised OR clause ANDed onto
// the package/version/revision filter, instead of escaping it as bare OR conditions.
func applyRunningTaskFilter(q *orm.Query, packageId, version string, revision int) *orm.Query {
	return q.
		Where("package_id = ?", packageId).
		Where("version = ?", version).
		Where("revision = ?", revision).
		WhereGroup(func(q *orm.Query) (*orm.Query, error) {
			return q.
				WhereOr("status = ?", view.TaskStatusNotStarted).
				WhereOr("status = ?", view.TaskStatusProcessing).
				WhereOr("status = ?", view.TaskStatusWaitingForDocs), nil
		})
}

// Tasks in waiting_for_docs are never reclaimed: checkDocReady finishes them on every executor, and a reclaim
// would fan out a second set of document tasks.
var queryVersionTask = fmt.Sprintf("select * from version_lint_task b where "+
	"(b.status='%s' or (b.status='%s' and b.last_active < (now() - interval '%d seconds'))) "+
	"order by b.created_at ASC limit 1 for no key update skip locked", view.TaskStatusNotStarted, view.TaskStatusProcessing, buildKeepaliveTimeoutSec)

func (r *versionLintTaskRepositoryImpl) FindFreeVersionTask(ctx context.Context, executorId string) (*entity.VersionLintTask, error) {
	var result *entity.VersionLintTask
	var err error

	for {
		taskFailed := false
		err = r.cp.GetConnection().RunInTransaction(context.Background(), func(tx *pg.Tx) error {
			var ents []entity.VersionLintTask

			_, err := tx.Query(&ents, queryVersionTask)
			if err != nil {
				if errors.Is(err, pg.ErrNoRows) {
					return nil
				}
				return fmt.Errorf("failed to find free build: %w", err)
			}
			if len(ents) > 0 {
				result = &ents[0]

				if result.RestartCount >= 2 {
					query := tx.Model(result).
						Where("id = ?", result.Id).
						Set("status = ?", view.TaskStatusError).
						Set("details = ?", fmt.Sprintf("Restart count exceeded limit. Details: %v", result.Details)).
						Set("last_active = now()")
					_, err := query.Update()
					if err != nil {
						return err
					}
					taskFailed = true
					result = nil
					return nil
				}

				// take free task
				isFirstRun := result.Status == view.TaskStatusNotStarted

				if !isFirstRun {
					result.RestartCount += 1
				}

				result.Status = view.TaskStatusProcessing
				result.ExecutorId = executorId

				_, err = tx.Model(result).
					Set("status = ?status").
					Set("executor_id = ?executor_id").
					Set("restart_count = ?restart_count").
					Set("last_active = now()").
					Where("id = ?", result.Id).
					Update()
				if err != nil {
					return fmt.Errorf("unable to update doc task status during takeTask: %w", err)
				}

				return nil
			}
			return nil
		})
		if taskFailed {
			continue
		}
		break
	}
	if err != nil {
		return nil, err
	}
	return result, nil
}
