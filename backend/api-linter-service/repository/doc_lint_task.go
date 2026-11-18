package repository

import (
	"context"
	"errors"
	"fmt"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/db"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/entity"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/view"
	"github.com/go-pg/pg/v10"
	"time"
)

type DocLintTaskRepository interface {
	UpdateLastActive(ctx context.Context, docTaskId string, executorId string) (owned bool, err error)
	SaveDocTasksAndUpdVer(ctx context.Context, ents []entity.DocumentLintTask, versionTaskId string, executorId string) (saved bool, err error)
	FindFreeDocTask(ctx context.Context, executorId string, linters ...view.Linter) (*entity.DocumentLintTask, error)
	GetDocTasksForVersionTasks(ctx context.Context, verTaskIds []string) ([]entity.DocumentLintTask, error)
}

func NewDocLintTaskRepository(cp db.ConnectionProvider) DocLintTaskRepository {
	return &docLintTaskRepositoryImpl{cp: cp}
}

type docLintTaskRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (d docLintTaskRepositoryImpl) UpdateLastActive(ctx context.Context, docTaskId string, executorId string) (bool, error) {
	res, err := d.cp.GetConnection().ExecContext(ctx, `update document_lint_task
		set last_active = now()
		where id = ? and executor_id = ? and status = ?`,
		docTaskId, executorId, view.TaskStatusProcessing)
	if err != nil {
		return false, err
	}
	return res.RowsAffected() > 0, nil
}

// The fenced update cannot repeat for a lint task, so its document tasks are created once.
func (d docLintTaskRepositoryImpl) SaveDocTasksAndUpdVer(ctx context.Context, ents []entity.DocumentLintTask, versionTaskId string, executorId string) (bool, error) {
	allFailed := true
	for _, ent := range ents {
		if ent.Status != view.TaskStatusError {
			allFailed = false
			break
		}
	}
	verStatus := view.TaskStatusWaitingForDocs
	verDetails := ""
	if allFailed {
		verStatus = view.TaskStatusError
		verDetails = fmt.Sprintf("%d doc task(s) failed", len(ents))
	}

	saved := false
	err := d.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		var verTask entity.VersionLintTask
		_, err := tx.QueryOne(&verTask, `update version_lint_task
			set status = ?, details = ?, last_active = now()
			where id = ? and executor_id = ? and status = ?
			returning package_id, version, revision, validation_process_id`,
			verStatus, verDetails, versionTaskId, executorId, view.TaskStatusProcessing)
		if err != nil {
			if errors.Is(err, pg.ErrNoRows) {
				return nil
			}
			return fmt.Errorf("failed to update version lint task %s: %w", versionTaskId, err)
		}

		if _, err = tx.Model(&ents).Insert(); err != nil {
			return err
		}

		if allFailed {
			_, err = tx.Exec(`insert into linted_version (package_id, version, revision, lint_status, lint_details, linted_at, validation_process_id)
				values (?, ?, ?, ?, ?, ?, ?)
				on conflict (package_id, version, revision) do update
				set lint_status           = excluded.lint_status,
					lint_details          = excluded.lint_details,
					linted_at             = excluded.linted_at,
					validation_process_id = excluded.validation_process_id`,
				verTask.PackageId, verTask.Version, verTask.Revision, view.VersionStatusError, verDetails, time.Now(), verTask.ValidationProcessId)
			if err != nil {
				return fmt.Errorf("failed to write the linted version of version lint task %s: %w", versionTaskId, err)
			}
		}
		saved = true
		return nil
	})
	if err != nil {
		return false, err
	}
	return saved, nil
}

const buildKeepaliveTimeoutSec = 30

var queryBase = fmt.Sprintf("select * from document_lint_task b where "+
	"(b.status='%s' or (b.status='%s' and b.last_active < (now() - interval '%d seconds')))",
	view.TaskStatusNotStarted, view.TaskStatusProcessing, buildKeepaliveTimeoutSec)

func (d docLintTaskRepositoryImpl) FindFreeDocTask(ctx context.Context, executorId string, linters ...view.Linter) (*entity.DocumentLintTask, error) {
	var result *entity.DocumentLintTask
	var err error

	query := queryBase
	var queryArgs []interface{}
	if len(linters) > 0 {
		query += " and b.linter in (?)"
		queryArgs = append(queryArgs, pg.In(linters))
	}
	query += " order by b.created_at ASC limit 1 for no key update skip locked"

	for {
		taskFailed := false
		err = d.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
			var ents []entity.DocumentLintTask

			var queryErr error
			if len(queryArgs) > 0 {
				_, queryErr = tx.Query(&ents, query, queryArgs...)
			} else {
				_, queryErr = tx.Query(&ents, query)
			}
			if queryErr != nil {
				if queryErr == pg.ErrNoRows {
					return nil
				}
				return fmt.Errorf("failed to find free build: %w", queryErr)
			}
			if len(ents) > 0 {
				result = &ents[0]

				// we got build candidate
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

func (d docLintTaskRepositoryImpl) GetDocTasksForVersionTasks(ctx context.Context, verTaskIds []string) ([]entity.DocumentLintTask, error) {
	var result []entity.DocumentLintTask

	err := d.cp.GetConnection().WithContext(ctx).Model(&result).Where("version_lint_task_id in (?)", pg.In(verTaskIds)).Select()
	if err != nil {
		if errors.Is(err, pg.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}
