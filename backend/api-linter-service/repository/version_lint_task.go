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
	"github.com/go-pg/pg/v10/orm"
)

type VersionLintTaskRepository interface {
	GetTaskById(ctx context.Context, taskId string) (*entity.VersionLintTask, error)
	GetTaskByValidationProcessId(ctx context.Context, validationProcessId string) (*entity.VersionLintTask, error)
	GetRunningTaskForVersion(ctx context.Context, packageId, version string, revision int) ([]entity.VersionLintTask, error)
	IncOwnedRestartCount(ctx context.Context, taskId string, executorId string) (owned bool, err error)
	IncWaitingRestartCount(ctx context.Context, taskId string) (waiting bool, err error)
	FindFreeVersionTask(ctx context.Context, executorId string) (*entity.VersionLintTask, error)
	GetWaitingForDocTasks(ctx context.Context, executorId string) ([]entity.VersionLintTask, error)
	CompleteOwnedLint(ctx context.Context, taskId string, executorId string, lintStatus view.LintedVersionStatus, lintDetails string) (completed bool, err error)
	CompleteWaitingLint(ctx context.Context, taskId string, lintStatus view.LintedVersionStatus, lintDetails string) (completed bool, err error)
	FailOwnedLint(ctx context.Context, taskId string, executorId string, details string) (failed bool, err error)
	FailWaitingLint(ctx context.Context, taskId string, details string) (failed bool, err error)
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

func (r *versionLintTaskRepositoryImpl) IncOwnedRestartCount(ctx context.Context, taskId string, executorId string) (bool, error) {
	res, err := r.cp.GetConnection().ExecContext(ctx, `update version_lint_task
		set restart_count = restart_count + 1
		where id = ? and executor_id = ? and status = ?`,
		taskId, executorId, view.TaskStatusProcessing)
	if err != nil {
		return false, err
	}
	return res.RowsAffected() > 0, nil
}

func (r *versionLintTaskRepositoryImpl) IncWaitingRestartCount(ctx context.Context, taskId string) (bool, error) {
	res, err := r.cp.GetConnection().ExecContext(ctx, `update version_lint_task
		set restart_count = restart_count + 1
		where id = ? and status = ?`,
		taskId, view.TaskStatusWaitingForDocs)
	if err != nil {
		return false, err
	}
	return res.RowsAffected() > 0, nil
}

func (r *versionLintTaskRepositoryImpl) GetWaitingForDocTasks(ctx context.Context, executorId string) ([]entity.VersionLintTask, error) {
	var result []entity.VersionLintTask
	err := r.cp.GetConnection().ModelContext(ctx, &result).
		Where("status = ?", view.TaskStatusWaitingForDocs).
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

func (r *versionLintTaskRepositoryImpl) CompleteOwnedLint(ctx context.Context, taskId string, executorId string, lintStatus view.LintedVersionStatus, lintDetails string) (bool, error) {
	completed := false
	err := r.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		var task entity.VersionLintTask
		_, err := tx.QueryOne(&task, `update version_lint_task
			set status = ?, last_active = now()
			where id = ? and executor_id = ? and status = ?
			returning package_id, version, revision, validation_process_id`,
			view.TaskStatusSuccess, taskId, executorId, view.TaskStatusProcessing)
		if err != nil {
			if errors.Is(err, pg.ErrNoRows) {
				return nil
			}
			return fmt.Errorf("failed to complete version lint task %s: %w", taskId, err)
		}
		_, err = tx.Exec(`insert into linted_version (package_id, version, revision, lint_status, lint_details, linted_at, validation_process_id)
			values (?, ?, ?, ?, ?, ?, ?)
			on conflict (package_id, version, revision) do update
			set lint_status           = excluded.lint_status,
				lint_details          = excluded.lint_details,
				linted_at             = excluded.linted_at,
				validation_process_id = excluded.validation_process_id`,
			task.PackageId, task.Version, task.Revision, lintStatus, lintDetails, time.Now(), task.ValidationProcessId)
		if err != nil {
			return fmt.Errorf("failed to write the linted version of version lint task %s: %w", taskId, err)
		}
		completed = true
		return nil
	})
	if err != nil {
		return false, err
	}
	return completed, nil
}

// A lint task waiting for documents completes only when none of its document tasks is still running.
func (r *versionLintTaskRepositoryImpl) CompleteWaitingLint(ctx context.Context, taskId string, lintStatus view.LintedVersionStatus, lintDetails string) (bool, error) {
	completed := false
	err := r.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		var task entity.VersionLintTask
		_, err := tx.QueryOne(&task, `update version_lint_task t
			set status = ?, last_active = now()
			where t.id = ? and t.status = ?
				and not exists (select 1
					from document_lint_task d
					where d.version_lint_task_id = t.id and d.status in (?, ?))
			returning t.package_id, t.version, t.revision, t.validation_process_id`,
			view.TaskStatusSuccess, taskId, view.TaskStatusWaitingForDocs,
			view.TaskStatusNotStarted, view.TaskStatusProcessing)
		if err != nil {
			if errors.Is(err, pg.ErrNoRows) {
				return nil
			}
			return fmt.Errorf("failed to complete version lint task %s: %w", taskId, err)
		}
		_, err = tx.Exec(`insert into linted_version (package_id, version, revision, lint_status, lint_details, linted_at, validation_process_id)
			values (?, ?, ?, ?, ?, ?, ?)
			on conflict (package_id, version, revision) do update
			set lint_status           = excluded.lint_status,
				lint_details          = excluded.lint_details,
				linted_at             = excluded.linted_at,
				validation_process_id = excluded.validation_process_id`,
			task.PackageId, task.Version, task.Revision, lintStatus, lintDetails, time.Now(), task.ValidationProcessId)
		if err != nil {
			return fmt.Errorf("failed to write the linted version of version lint task %s: %w", taskId, err)
		}
		completed = true
		return nil
	})
	if err != nil {
		return false, err
	}
	return completed, nil
}

func (r *versionLintTaskRepositoryImpl) FailOwnedLint(ctx context.Context, taskId string, executorId string, details string) (bool, error) {
	failed := false
	err := r.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		var task entity.VersionLintTask
		_, err := tx.QueryOne(&task, `update version_lint_task
			set status = ?, details = ?, last_active = now()
			where id = ? and executor_id = ? and status = ?
			returning package_id, version, revision, validation_process_id`,
			view.TaskStatusError, details, taskId, executorId, view.TaskStatusProcessing)
		if err != nil {
			if errors.Is(err, pg.ErrNoRows) {
				return nil
			}
			return fmt.Errorf("failed to fail version lint task %s: %w", taskId, err)
		}
		_, err = tx.Exec(`insert into linted_version (package_id, version, revision, lint_status, lint_details, linted_at, validation_process_id)
			values (?, ?, ?, ?, ?, ?, ?)
			on conflict (package_id, version, revision) do update
			set lint_status           = excluded.lint_status,
				lint_details          = excluded.lint_details,
				linted_at             = excluded.linted_at,
				validation_process_id = excluded.validation_process_id`,
			task.PackageId, task.Version, task.Revision, view.VersionStatusError, details, time.Now(), task.ValidationProcessId)
		if err != nil {
			return fmt.Errorf("failed to write the linted version of version lint task %s: %w", taskId, err)
		}
		failed = true
		return nil
	})
	if err != nil {
		return false, err
	}
	return failed, nil
}

func (r *versionLintTaskRepositoryImpl) FailWaitingLint(ctx context.Context, taskId string, details string) (bool, error) {
	failed := false
	err := r.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		var task entity.VersionLintTask
		_, err := tx.QueryOne(&task, `update version_lint_task t
			set status = ?, details = ?, last_active = now()
			where t.id = ? and t.status = ?
				and not exists (select 1
					from document_lint_task d
					where d.version_lint_task_id = t.id and d.status in (?, ?))
			returning t.package_id, t.version, t.revision, t.validation_process_id`,
			view.TaskStatusError, details, taskId, view.TaskStatusWaitingForDocs,
			view.TaskStatusNotStarted, view.TaskStatusProcessing)
		if err != nil {
			if errors.Is(err, pg.ErrNoRows) {
				return nil
			}
			return fmt.Errorf("failed to fail version lint task %s: %w", taskId, err)
		}
		_, err = tx.Exec(`insert into linted_version (package_id, version, revision, lint_status, lint_details, linted_at, validation_process_id)
			values (?, ?, ?, ?, ?, ?, ?)
			on conflict (package_id, version, revision) do update
			set lint_status           = excluded.lint_status,
				lint_details          = excluded.lint_details,
				linted_at             = excluded.linted_at,
				validation_process_id = excluded.validation_process_id`,
			task.PackageId, task.Version, task.Revision, view.VersionStatusError, details, time.Now(), task.ValidationProcessId)
		if err != nil {
			return fmt.Errorf("failed to write the linted version of version lint task %s: %w", taskId, err)
		}
		failed = true
		return nil
	})
	if err != nil {
		return false, err
	}
	return failed, nil
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

func (r *versionLintTaskRepositoryImpl) GetTaskByValidationProcessId(ctx context.Context, validationProcessId string) (*entity.VersionLintTask, error) {
	var task entity.VersionLintTask
	err := r.cp.GetConnection().ModelContext(ctx, &task).
		Where("validation_process_id = ?", validationProcessId).
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
// would fan out a second set of document tasks. Only tasks of a started validation process are claimed.
func (r *versionLintTaskRepositoryImpl) FindFreeVersionTask(ctx context.Context, executorId string) (*entity.VersionLintTask, error) {
	var result *entity.VersionLintTask
	var err error

	for {
		taskFailed := false
		err = r.cp.GetConnection().RunInTransaction(context.Background(), func(tx *pg.Tx) error {
			var ents []entity.VersionLintTask

			_, err := tx.Query(&ents, `select b.*
				from version_lint_task b
				join version_validation_process r on r.id = b.validation_process_id
				where (b.status = ?
						or (b.status = ? and b.last_active < now() - ? * interval '1 second'))
					and r.status = ?
				order by b.created_at asc
				limit 1
				for no key update of b skip locked`,
				view.TaskStatusNotStarted, view.TaskStatusProcessing, buildKeepaliveTimeoutSec, view.ValidationProcessProcessing)
			if err != nil {
				if errors.Is(err, pg.ErrNoRows) {
					return nil
				}
				return fmt.Errorf("failed to find free build: %w", err)
			}
			if len(ents) > 0 {
				result = &ents[0]

				if result.RestartCount >= 2 {
					details := fmt.Sprintf("Restart count exceeded limit. Details: %v", result.Details)
					query := tx.Model(result).
						Where("id = ?", result.Id).
						Set("status = ?", view.TaskStatusError).
						Set("details = ?", details).
						Set("last_active = now()")
					_, err := query.Update()
					if err != nil {
						return err
					}
					_, err = tx.Exec(`insert into linted_version (package_id, version, revision, lint_status, lint_details, linted_at, validation_process_id)
						values (?, ?, ?, ?, ?, ?, ?)
						on conflict (package_id, version, revision) do update
						set lint_status           = excluded.lint_status,
							lint_details          = excluded.lint_details,
							linted_at             = excluded.linted_at,
							validation_process_id = excluded.validation_process_id`,
						result.PackageId, result.Version, result.Revision, view.VersionStatusError, details, time.Now(), result.ValidationProcessId)
					if err != nil {
						return fmt.Errorf("failed to write the linted version of version lint task %s: %w", result.Id, err)
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
