// Copyright 2024-2025 NetCracker Technology Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package service

import (
	"context"
	"fmt"

	"github.com/Netcracker/qubership-api-linter-service/db"
	"github.com/Netcracker/qubership-api-linter-service/entity"
	"github.com/Netcracker/qubership-api-linter-service/utils"
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

		_, err = tx.Model((*entity.LintFileResult)(nil)).
			Where("ruleset_id IN (?)", pg.In(rulesetIds)).
			Delete()
		if err != nil {
			return fmt.Errorf("failed to delete lint_file_result records: %w", err)
		}

		_, err = tx.Exec(`
			DELETE FROM linted_version
			WHERE (package_id, version, revision) IN (
				SELECT DISTINCT package_id, version, revision
				FROM linted_document
				WHERE ruleset_id IN (?)
			)`, pg.In(rulesetIds))
		if err != nil {
			return fmt.Errorf("failed to delete linted_version records: %w", err)
		}

		_, err = tx.Model((*entity.LintedDocument)(nil)).
			Where("ruleset_id IN (?)", pg.In(rulesetIds)).
			Delete()
		if err != nil {
			return fmt.Errorf("failed to delete linted_document records: %w", err)
		}

		var versionLintTaskIds []string
		err = tx.Model((*entity.DocumentLintTask)(nil)).
			ColumnExpr("DISTINCT version_lint_task_id").
			Where("ruleset_id IN (?)", pg.In(rulesetIds)).
			Select(&versionLintTaskIds)
		if err != nil {
			return fmt.Errorf("failed to get version_lint_task_id records: %w", err)
		}

		if len(versionLintTaskIds) > 0 {
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
