package repository

import (
	"context"
	"errors"
	"fmt"
	"github.com/Netcracker/qubership-api-linter-service/db"
	"github.com/Netcracker/qubership-api-linter-service/entity"
	"github.com/Netcracker/qubership-api-linter-service/view"
	"github.com/go-pg/pg/v10"
	log "github.com/sirupsen/logrus"
	"time"
)

type DocLintTaskRepository interface {
	SetDocTaskStatus(ctx context.Context, docTaskId string, status view.TaskStatus, details string, executorId string) error
	SaveDocTasksAndUpdVer(ctx context.Context, ents []entity.DocumentLintTask, versionTaskId string) error
	FindFreeDocTask(ctx context.Context, executorId string) (*entity.DocumentLintTask, error)
	GetDocTasksForVersionTasks(ctx context.Context, verTaskIds []string) ([]entity.DocumentLintTask, error)
}

func NewDocLintTaskRepository(cp db.ConnectionProvider) DocLintTaskRepository {
	return &docLintTaskRepositoryImpl{cp: cp}
}

type docLintTaskRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (d docLintTaskRepositoryImpl) SetDocTaskStatus(ctx context.Context, docTaskId string, status view.TaskStatus, details string, executorId string) error {
	err := d.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		var docEnt entity.DocumentLintTask
		err := d.cp.GetConnection().WithContext(ctx).Model(&docEnt).Where("id=?", docTaskId).Select()
		if err != nil {
			return err
		}

		if docEnt.Status == view.TaskStatusSuccess || docEnt.Status == view.TaskStatusError {
			log.Debugf("Doc lint task %s is already finished, skipping set status = %s and details = %s", docTaskId, status, details)
			return nil
		}
		if docEnt.ExecutorId != executorId {
			return fmt.Errorf("SetDocTaskStatus: executor in DB is set to %s, but current one is %s", docEnt.ExecutorId, executorId)
		}

		_, err = tx.Model(&docEnt).
			Set("status=?", status).
			Set("details=?", details).
			Set("last_active=?", time.Now()).
			Where("id=?", docTaskId).
			Where("executor_id = ?", executorId).
			Update()
		if err != nil {
			return err
		}
		return nil
	})

	return err
}

func (d docLintTaskRepositoryImpl) SaveDocTasksAndUpdVer(ctx context.Context, ents []entity.DocumentLintTask, versionTaskId string) error {
	err := d.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		_, err := tx.Model(&ents).Insert()
		if err != nil {
			return err
		}

		allFailed := true
		for _, ent := range ents {
			if ent.Status != view.TaskStatusError {
				allFailed = false
				break
			}
		}

		verStatus := view.TaskStatusWaitingForDocs
		if allFailed {
			verStatus = view.TaskStatusError
		}

		var verEnt entity.VersionLintTask
		_, err = tx.Model(&verEnt).
			Set("status=?", verStatus).
			Set("last_active=?", time.Now()).
			Where("id=?", versionTaskId).Update()
		if err != nil {
			return err
		}
		return nil
	})
	return err
}

const buildKeepaliveTimeoutSec = 30

var queryItemToBuild = fmt.Sprintf("select * from document_lint_task b where "+
	"(b.status='%s' or (b.status='%s' and b.last_active < (now() - interval '%d seconds'))) "+
	"order by b.created_at ASC limit 1 for no key update skip locked", view.TaskStatusNotStarted, view.TaskStatusProcessing, buildKeepaliveTimeoutSec)

func (d docLintTaskRepositoryImpl) FindFreeDocTask(ctx context.Context, executorId string) (*entity.DocumentLintTask, error) {
	var result *entity.DocumentLintTask
	var err error

	for {
		taskFailed := false
		err = d.cp.GetConnection().RunInTransaction(context.Background(), func(tx *pg.Tx) error {
			var ents []entity.DocumentLintTask

			_, err := tx.Query(&ents, queryItemToBuild)
			if err != nil {
				if err == pg.ErrNoRows {
					return nil
				}
				return fmt.Errorf("failed to find free build: %w", err)
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
