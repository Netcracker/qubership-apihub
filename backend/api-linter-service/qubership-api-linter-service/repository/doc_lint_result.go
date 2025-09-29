package repository

import (
	"context"
	"fmt"
	"github.com/Netcracker/qubership-api-linter-service/db"
	"github.com/Netcracker/qubership-api-linter-service/entity"
	"github.com/Netcracker/qubership-api-linter-service/view"
	"github.com/go-pg/pg/v10"
)

type DocResultRepository interface {
	LintResultExists(ctx context.Context, dataHash string) (bool, error)
	SaveLintResult(ctx context.Context, docLintTaskId string, status view.LintedDocumentStatus, details string, lintTimeMs int64, version entity.LintedVersion, document entity.LintedDocument, result *entity.LintFileResult, executorId string) error
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

func (d docResultRepositoryImpl) SaveLintResult(ctx context.Context, docLintTaskId string, status view.LintedDocumentStatus, details string, lintTimeMs int64,
	version entity.LintedVersion, document entity.LintedDocument, result *entity.LintFileResult, executorId string) error {
	return d.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {

		var docLintTask *entity.DocumentLintTask
		res, err := tx.Model(docLintTask).
			Set("status = ?", status).
			Set("details = ?", details).
			Set("last_active = now()").
			Set("lint_time_ms = ?", lintTimeMs).
			Where("id = ?", docLintTaskId).
			Where("executor_id = ?", executorId).
			Update()
		if err != nil {
			return err
		}
		if res.RowsAffected() == 0 {
			var docEnt entity.DocumentLintTask
			err = d.cp.GetConnection().WithContext(ctx).Model(&docEnt).Where("id=?", docLintTaskId).Select()
			if err != nil {
				return err
			}

			return fmt.Errorf("SaveLintResult: executor in DB is set to %s, but current one is %s", docEnt.ExecutorId, executorId)
		}

		_, err = tx.Model(&version).OnConflict("(package_id, version, revision) do update").
			Set("lint_status = EXCLUDED.lint_status").
			Set("lint_details = EXCLUDED.lint_details").
			Set("linted_at = EXCLUDED.linted_at").
			Insert()
		if err != nil {
			return err
		}
		_, err = tx.Model(&document).OnConflict("(package_id, version, revision, file_id) do update").
			Set("slug = EXCLUDED.slug").
			Set("specification_type = EXCLUDED.specification_type").
			Set("ruleset_id = EXCLUDED.ruleset_id").
			Set("data_hash = EXCLUDED.data_hash").
			Set("lint_status = EXCLUDED.lint_status").
			Set("lint_details = EXCLUDED.lint_details").
			Insert()
		if err != nil {
			return err
		}
		if result != nil {
			_, err = tx.Model(result).OnConflict("(data_hash, ruleset_id) do update").
				Set("linter_version = EXCLUDED.linter_version").
				Set("data = EXCLUDED.data").
				Set("summary = EXCLUDED.summary").
				Insert()
			if err != nil {
				return err
			}
		}
		return nil
	})
}
