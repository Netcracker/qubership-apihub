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
	log "github.com/sirupsen/logrus"
)

type ValidationProcessRepository interface {
	CreateProcess(ctx context.Context, process entity.VersionValidationProcess, lintTask entity.VersionLintTask, scoringTask entity.VersionScoringTask) error
	FinishCompletedProcesses(ctx context.Context) error
	GetQueuedRevisions(ctx context.Context) ([]entity.VersionValidationProcess, error)
	StartNextProcess(ctx context.Context, packageId string, version string, revision int) (started bool, err error)
}

func NewValidationProcessRepository(cp db.ConnectionProvider) ValidationProcessRepository {
	return &validationProcessRepositoryImpl{cp: cp}
}

type validationProcessRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (r *validationProcessRepositoryImpl) CreateProcess(ctx context.Context, process entity.VersionValidationProcess, lintTask entity.VersionLintTask, scoringTask entity.VersionScoringTask) error {
	return r.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		if _, err := tx.Model(&process).Insert(); err != nil {
			return fmt.Errorf("failed to insert validation process: %w", err)
		}

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
		return nil
	})
}

// The subquery locks the processes in id order and skips those another pod holds, so the workers of all pods run this
// statement at the same time without waiting for each other.
func (r *validationProcessRepositoryImpl) FinishCompletedProcesses(ctx context.Context) error {
	_, err := r.cp.GetConnection().ExecContext(ctx, `update version_validation_process r
		set status = case when l.status = ? and s.status = ? then ? else ? end
		from version_lint_task l, version_scoring_task s
		where l.validation_process_id = r.id and s.validation_process_id = r.id
			and r.id in (select c.id
				from version_validation_process c
				where c.status = ?
					and exists (select 1
						from version_lint_task cl
						where cl.validation_process_id = c.id and cl.status in (?, ?))
					and exists (select 1
						from version_scoring_task cs
						where cs.validation_process_id = c.id and cs.status in (?, ?))
				order by c.id
				for update skip locked)`,
		view.TaskStatusSuccess, view.TaskStatusSuccess, view.ValidationProcessSuccess, view.ValidationProcessError,
		view.ValidationProcessProcessing,
		view.TaskStatusSuccess, view.TaskStatusError,
		view.TaskStatusSuccess, view.TaskStatusError)
	if err != nil {
		return fmt.Errorf("failed to finish completed validation processes: %w", err)
	}
	return nil
}

func (r *validationProcessRepositoryImpl) GetQueuedRevisions(ctx context.Context) ([]entity.VersionValidationProcess, error) {
	var result []entity.VersionValidationProcess
	_, err := r.cp.GetConnection().QueryContext(ctx, &result, `select distinct package_id, version, revision
		from version_validation_process
		where status = ?`,
		view.ValidationProcessNotStarted)
	if err != nil {
		return nil, fmt.Errorf("failed to get revisions with queued validation processes: %w", err)
	}
	return result, nil
}

// A unique violation means that another pod has just started a process of the revision. The transaction is unusable
// after it, so nothing else runs in it.
func (r *validationProcessRepositoryImpl) StartNextProcess(ctx context.Context, packageId string, version string, revision int) (bool, error) {
	started := false
	err := r.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		var processId string
		_, err := tx.QueryOne(pg.Scan(&processId), `update version_validation_process r
			set status = ?
			where r.package_id = ? and r.version = ? and r.revision = ?
				and r.status = ?
				and not exists (select 1
					from version_validation_process a
					where a.package_id = r.package_id and a.version = r.version and a.revision = r.revision
						and a.status = ?)
				and not exists (select 1
					from version_validation_process e
					where e.package_id = r.package_id and e.version = r.version and e.revision = r.revision
						and e.status = ?
						and (e.created_at, e.id) < (r.created_at, r.id))
			returning r.id`,
			view.ValidationProcessProcessing,
			packageId, version, revision,
			view.ValidationProcessNotStarted,
			view.ValidationProcessProcessing,
			view.ValidationProcessNotStarted)
		if err != nil {
			if errors.Is(err, pg.ErrNoRows) {
				return nil
			}
			return err
		}

		now := time.Now()
		_, err = tx.Exec(`insert into version_score (package_id, version, revision, scored_at, status, reasons, debug,
				backward_compatibility_details, quality_check_details, publication_integrity_details,
				validation_process_id, process_status,
				publication_integrity_status, publication_integrity_error,
				backward_compatibility_status, backward_compatibility_error,
				quality_check_status, quality_check_error)
			values (?, ?, ?, ?, '', '{}', '{}',
				null, null, null,
				?, ?,
				?, null,
				?, null,
				?, null)
			on conflict (package_id, version, revision) do update
			set scored_at                      = excluded.scored_at,
				status                         = excluded.status,
				reasons                        = excluded.reasons,
				debug                          = excluded.debug,
				backward_compatibility_details = excluded.backward_compatibility_details,
				quality_check_details          = excluded.quality_check_details,
				publication_integrity_details  = excluded.publication_integrity_details,
				validation_process_id          = excluded.validation_process_id,
				process_status                 = excluded.process_status,
				publication_integrity_status   = excluded.publication_integrity_status,
				publication_integrity_error    = excluded.publication_integrity_error,
				backward_compatibility_status  = excluded.backward_compatibility_status,
				backward_compatibility_error   = excluded.backward_compatibility_error,
				quality_check_status           = excluded.quality_check_status,
				quality_check_error            = excluded.quality_check_error`,
			packageId, version, revision, now,
			processId, view.ScoringProcessInProgress,
			view.ScoringProcessPending,
			view.ScoringProcessPending,
			view.ScoringProcessPending)
		if err != nil {
			return fmt.Errorf("failed to reset the score of validation process %s: %w", processId, err)
		}

		_, err = tx.Exec(`insert into linted_version (package_id, version, revision, lint_status, lint_details, linted_at, validation_process_id)
			values (?, ?, ?, ?, ?, ?, ?)
			on conflict (package_id, version, revision) do update
			set lint_status           = excluded.lint_status,
				lint_details          = excluded.lint_details,
				linted_at             = excluded.linted_at,
				validation_process_id = excluded.validation_process_id`,
			packageId, version, revision, view.VersionStatusInProgress, "", now, processId)
		if err != nil {
			return fmt.Errorf("failed to reset the linted version of validation process %s: %w", processId, err)
		}
		started = true
		return nil
	})
	if err != nil {
		var pgErr pg.Error
		if errors.As(err, &pgErr) && pgErr.Field('C') == "23505" && pgErr.Field('n') == "version_validation_process_processing_unique" {
			log.Debugf("Validation process of [ %s | %s@%d ] was not started: another one has just started", packageId, version, revision)
			return false, nil
		}
		return false, err
	}
	return started, nil
}
