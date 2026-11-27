package service

import (
	"context"
	"fmt"

	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/db"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/entity"
	"github.com/Netcracker/qubership-apihub/backend/api-linter-service/utils"
	"github.com/go-pg/pg/v10"
	log "github.com/sirupsen/logrus"
)

type CleanupService interface {
	ClearTestData(ctx context.Context, testId string) error
}

type cleanupServiceImpl struct {
	cp db.ConnectionProvider
}

func NewCleanupService(cp db.ConnectionProvider) CleanupService {
	return &cleanupServiceImpl{
		cp: cp,
	}
}

// ClearTestData locks the tasks before it deletes their results, in the lock order of the task processors. Concurrent
// work on the same test rulesets can still end it with a deadlock or a foreign key error; the transaction then rolls
// back as a whole, and the caller is expected to repeat the call.
func (s *cleanupServiceImpl) ClearTestData(ctx context.Context, testId string) error {
	nameFilter := "QS%-" + utils.LikeEscaped(testId) + "%"

	log.Debugf("Starting cleanup for testId: %s with filter: %s", testId, nameFilter)

	return s.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		var rulesetIds []string
		err := tx.Model((*entity.Ruleset)(nil)).
			Column("id").
			Where("name LIKE ? AND status != 'active'", nameFilter).
			Select(&rulesetIds)
		if err != nil {
			return fmt.Errorf("failed to find rulesets: %w", err)
		}

		if len(rulesetIds) == 0 {
			log.Debugf("No inactive rulesets found matching pattern: %s", nameFilter)
			return nil
		}

		log.Debugf("Found %d inactive rulesets to delete", len(rulesetIds))

		var versionLintTaskIds []string
		err = tx.Model((*entity.DocumentLintTask)(nil)).
			ColumnExpr("DISTINCT version_lint_task_id").
			Where("ruleset_id IN (?)", pg.In(rulesetIds)).
			Select(&versionLintTaskIds)
		if err != nil {
			return fmt.Errorf("failed to get version_lint_task_id records: %w", err)
		}

		var validationProcessIds []string
		if len(versionLintTaskIds) > 0 {
			var lintTasks []entity.VersionLintTask
			_, err = tx.Query(&lintTasks, `select id, validation_process_id
				from version_lint_task
				where id in (?)
				order by id
				for update`,
				pg.In(versionLintTaskIds))
			if err != nil {
				return fmt.Errorf("failed to lock version_lint_task records: %w", err)
			}
			for _, lintTask := range lintTasks {
				if lintTask.ValidationProcessId != "" {
					validationProcessIds = append(validationProcessIds, lintTask.ValidationProcessId)
				}
			}
		}

		if len(validationProcessIds) > 0 {
			_, err = tx.Exec(`select id
				from version_scoring_task
				where validation_process_id in (?)
				order by id
				for update`,
				pg.In(validationProcessIds))
			if err != nil {
				return fmt.Errorf("failed to lock version_scoring_task records: %w", err)
			}
		}

		// A row that the next validation process of the revision has already reset names that process and stays.
		_, err = tx.Exec(`delete from version_score
			where validation_process_id = any(?)
				or (validation_process_id is null
					and (package_id, version, revision) in (select distinct package_id, version, revision
						from linted_document
						where ruleset_id in (?)))`,
			pg.Array(validationProcessIds), pg.In(rulesetIds))
		if err != nil {
			return fmt.Errorf("failed to delete version_score records: %w", err)
		}

		_, err = tx.Exec(`delete from linted_version
			where validation_process_id = any(?)
				or (validation_process_id is null
					and (package_id, version, revision) in (select distinct package_id, version, revision
						from linted_document
						where ruleset_id in (?)))`,
			pg.Array(validationProcessIds), pg.In(rulesetIds))
		if err != nil {
			return fmt.Errorf("failed to delete linted_version records: %w", err)
		}

		_, err = tx.Model((*entity.LintedDocument)(nil)).
			Where("ruleset_id IN (?)", pg.In(rulesetIds)).
			Delete()
		if err != nil {
			return fmt.Errorf("failed to delete linted_document records: %w", err)
		}

		_, err = tx.Model((*entity.LintFileResult)(nil)).
			Where("ruleset_id IN (?)", pg.In(rulesetIds)).
			Delete()
		if err != nil {
			return fmt.Errorf("failed to delete lint_file_result records: %w", err)
		}

		if len(validationProcessIds) > 0 {
			_, err = tx.Model((*entity.VersionScoringTask)(nil)).
				Where("validation_process_id IN (?)", pg.In(validationProcessIds)).
				Delete()
			if err != nil {
				return fmt.Errorf("failed to delete version_scoring_task records: %w", err)
			}
		}

		if len(versionLintTaskIds) > 0 {
			_, err = tx.Exec(`
				DELETE FROM ai_lint_stats
				WHERE document_lint_task_id IN (
					SELECT id
					FROM document_lint_task
					WHERE version_lint_task_id IN (?)
				)`, pg.In(versionLintTaskIds))
			if err != nil {
				return fmt.Errorf("failed to delete ai_lint_stats records: %w", err)
			}

			_, err = tx.Model((*entity.DocumentLintTask)(nil)).
				Where("version_lint_task_id IN (?)", pg.In(versionLintTaskIds)).
				Delete()
			if err != nil {
				return fmt.Errorf("failed to delete document_lint_task records: %w", err)
			}

			_, err = tx.Model((*entity.VersionLintTask)(nil)).
				Where("id IN (?)", pg.In(versionLintTaskIds)).
				Delete()
			if err != nil {
				return fmt.Errorf("failed to delete version_lint_task records: %w", err)
			}
		}

		if len(validationProcessIds) > 0 {
			_, err = tx.Model((*entity.VersionValidationProcess)(nil)).
				Where("id IN (?)", pg.In(validationProcessIds)).
				Delete()
			if err != nil {
				return fmt.Errorf("failed to delete version_validation_process records: %w", err)
			}
		}

		_, err = tx.Model((*entity.RulesetActivationHistory)(nil)).
			Where("ruleset_id IN (?)", pg.In(rulesetIds)).
			Delete()
		if err != nil {
			return fmt.Errorf("failed to delete ruleset_activation_history records: %w", err)
		}

		_, err = tx.Model((*entity.Ruleset)(nil)).
			Where("id IN (?)", pg.In(rulesetIds)).
			Delete()
		if err != nil {
			return fmt.Errorf("failed to delete ruleset records: %w", err)
		}

		log.Debugf("Cleanup completed successfully for testId: %s", testId)
		return nil
	})
}
