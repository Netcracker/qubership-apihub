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

type DocResultRepository interface {
	LintResultExists(ctx context.Context, dataHash string) (bool, error)
	SaveLintResult(ctx context.Context, versionLintTaskId string, docLintTaskId string, status view.LintedDocumentStatus, details string, lintTimeMs int64, document entity.LintedDocument, result *entity.LintFileResult, executorId string) (saved bool, err error)
}

func NewDocResultRepository(cp db.ConnectionProvider) DocResultRepository {
	return &docResultRepositoryImpl{cp: cp}
}

type docResultRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (d docResultRepositoryImpl) LintResultExists(ctx context.Context, dataHash string) (bool, error) {
	//TODO implement me
	panic("implement me")
}

// The shared lock on the lint task keeps it from completing while a result is written, and lets the other document
// tasks of the lint write at the same time. A document task of a finished lint task is closed without a result.
func (d docResultRepositoryImpl) SaveLintResult(ctx context.Context, versionLintTaskId string, docLintTaskId string, status view.LintedDocumentStatus, details string, lintTimeMs int64,
	document entity.LintedDocument, result *entity.LintFileResult, executorId string) (bool, error) {
	saved := false
	err := d.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		var verTask entity.VersionLintTask
		_, err := tx.QueryOne(&verTask, `select status, validation_process_id
			from version_lint_task
			where id = ?
			for share`,
			versionLintTaskId)
		if err != nil && !errors.Is(err, pg.ErrNoRows) {
			return fmt.Errorf("failed to lock version lint task %s: %w", versionLintTaskId, err)
		}

		if verTask.Status != view.TaskStatusWaitingForDocs {
			res, err := tx.Exec(`update document_lint_task
				set status = ?, details = ?, last_active = now(), lint_time_ms = ?
				where id = ? and executor_id = ? and status = ?`,
				view.TaskStatusError, "lint task is already finished", lintTimeMs, docLintTaskId, executorId, view.TaskStatusProcessing)
			if err != nil {
				return fmt.Errorf("failed to update DocumentLintTask: %w", err)
			}
			if res.RowsAffected() == 0 {
				return d.notOwnedError(ctx, docLintTaskId, executorId)
			}
			return nil
		}

		res, err := tx.Exec(`update document_lint_task
			set status = ?, details = ?, last_active = now(), lint_time_ms = ?
			where id = ? and executor_id = ? and status = ?`,
			status, details, lintTimeMs, docLintTaskId, executorId, view.TaskStatusProcessing)
		if err != nil {
			return fmt.Errorf("failed to update DocumentLintTask: %w", err)
		}
		if res.RowsAffected() == 0 {
			return d.notOwnedError(ctx, docLintTaskId, executorId)
		}

		_, err = tx.Exec(`insert into linted_version (package_id, version, revision, lint_status, lint_details, linted_at, validation_process_id)
			values (?, ?, ?, ?, ?, ?, ?)
			on conflict (package_id, version, revision) do update
			set lint_status           = excluded.lint_status,
				lint_details          = excluded.lint_details,
				linted_at             = excluded.linted_at,
				validation_process_id = excluded.validation_process_id`,
			document.PackageId, document.Version, document.Revision, view.VersionStatusInProgress, "", time.Now(), verTask.ValidationProcessId)
		if err != nil {
			return fmt.Errorf("failed to insert LintedVersion: %w", err)
		}
		_, err = tx.Model(&document).OnConflict("(package_id, version, revision, file_id, ruleset_id) do update").
			Set("slug = EXCLUDED.slug").
			Set("specification_type = EXCLUDED.specification_type").
			Set("ruleset_id = EXCLUDED.ruleset_id").
			Set("data_hash = EXCLUDED.data_hash").
			Set("lint_status = EXCLUDED.lint_status").
			Set("lint_details = EXCLUDED.lint_details").
			Insert()
		if err != nil {
			return fmt.Errorf("failed to insert LintedDocument: %w", err)
		}
		if result != nil {
			_, err = tx.Model(result).OnConflict("(data_hash, ruleset_id) do update").
				Set("linter_version = EXCLUDED.linter_version").
				Set("data = EXCLUDED.data").
				Set("summary = EXCLUDED.summary").
				Insert()
			if err != nil {
				return fmt.Errorf("failed to insert LintFileResult: %w", err)
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

func (d docResultRepositoryImpl) notOwnedError(ctx context.Context, docLintTaskId string, executorId string) error {
	var docEnt entity.DocumentLintTask
	if err := d.cp.GetConnection().WithContext(ctx).Model(&docEnt).Where("id=?", docLintTaskId).Select(); err != nil {
		return err
	}
	return fmt.Errorf("SaveLintResult: executor in DB is set to %s, but current one is %s", docEnt.ExecutorId, executorId)
}
