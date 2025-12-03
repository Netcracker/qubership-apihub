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
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/metrics"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/go-pg/pg/v10"
	log "github.com/sirupsen/logrus"
)

const typeAndTitleMigrationVersion = 22

// SoftMigrateDb The function implements migrations that can't be made via SQL query.
// Executes only required migrations based on current vs new versions.
func (d dbMigrationServiceImpl) SoftMigrateDb(currentVersion int, newVersion int, migrationRequired bool) error {
	if (currentVersion < typeAndTitleMigrationVersion && typeAndTitleMigrationVersion <= newVersion) ||
		(migrationRequired && typeAndTitleMigrationVersion == currentVersion && typeAndTitleMigrationVersion == newVersion) {
		//async migration because it could take a lot of time to execute
		utils.SafeAsync(func() {
			err := d.fixReleaseVersionsPublishedMetricFromPatches()
			if err != nil {
				log.Errorf("Failed to fix release_versions_published metric: %v", err)
			} else {
				log.Infof("Successfully fixed release_versions_published metric")
			}
		})
	}

	return nil
}

func (d dbMigrationServiceImpl) fixReleaseVersionsPublishedMetricFromPatches() error {
	log.Infof("Starting release_versions_published metric fix from activity tracking...")

	ctx := context.Background()

	type statusChange struct {
		PackageId     string    `pg:"package_id"`
		Version       string    `pg:"version"`
		Revision      int       `pg:"revision"`
		PublishedAt   time.Time `pg:"published_at"`
		CreatedBy     string    `pg:"created_by"`
		InitialStatus string    `pg:"initial_status"`
		CurrentStatus string    `pg:"current_status"`
	}

	var changes []statusChange
	query := `
		WITH status_changes AS (
			SELECT
				at.package_id,
				at.data->>'version' as version,
				(at.data->>'revision')::int as revision,
				(array_agg(at.data->>'oldStatus' ORDER BY at.date ASC))[1] as initial_status
			FROM activity_tracking at
			WHERE at.e_type = 'patch_version_meta'
				AND at.data->>'oldStatus' IS NOT NULL
				AND at.data->>'newStatus' IS NOT NULL
				AND at.data->>'oldStatus' != at.data->>'newStatus'
			GROUP BY at.package_id, at.data->>'version', at.data->>'revision'
		)
		SELECT
			sc.package_id,
			sc.version,
			sc.revision,
			pv.published_at,
			pv.created_by,
			sc.initial_status,
			pv.status as current_status
		FROM status_changes sc
		JOIN published_version pv ON
			sc.package_id = pv.package_id AND
			sc.version = pv.version AND
			sc.revision = pv.revision
		ORDER BY pv.published_at ASC`

	_, err := d.cp.GetConnection().QueryContext(ctx, &changes, query)
	if err != nil {
		return fmt.Errorf("failed to query status changes: %w", err)
	}

	if len(changes) == 0 {
		log.Infof("No status changes found, nothing to fix")
	} else {
		log.Infof("Found %d package revisions with status changes to process", len(changes))
	}

	processed := 0
	skipped := 0

	err = d.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		for _, change := range changes {
			year := change.PublishedAt.Year()
			month := int(change.PublishedAt.Month())
			day := change.PublishedAt.Day()

			initialWasRelease := change.InitialStatus == "release"
			currentIsRelease := change.CurrentStatus == "release"

			if initialWasRelease == currentIsRelease {
				log.Debugf("Skipping %s/%s@%d: status unchanged (both release=%v)",
					change.PackageId, change.Version, change.Revision, currentIsRelease)
				skipped++
				continue
			}

			if !initialWasRelease && currentIsRelease {
				increaseQuery := `
					INSERT INTO business_metric (year, month, day, metric, data, user_id)
					VALUES (?, ?, ?, ?, ?::jsonb, ?)
					ON CONFLICT (year, month, day, user_id, metric)
					DO UPDATE
					SET data = coalesce(business_metric.data, '{}'::jsonb) ||
						jsonb_build_object(?, coalesce((business_metric.data ->> ?)::int, 0) + 1)`

				_, err := tx.Exec(increaseQuery,
					year, month, day, metrics.ReleaseVersionsPublished,
					fmt.Sprintf(`{"%s": 1}`, change.PackageId), change.CreatedBy,
					change.PackageId, change.PackageId)
				if err != nil {
					return fmt.Errorf("failed to increase metric for %s/%s@%d: %w",
						change.PackageId, change.Version, change.Revision, err)
				}
				log.Debugf("Increased counter for %s/%s@%d", change.PackageId, change.Version, change.Revision)
				processed++
			} else if initialWasRelease && !currentIsRelease {
				updateQuery := `
					UPDATE business_metric
					SET data = CASE
						WHEN (data ->> ?)::int > 1 THEN
							jsonb_set(data, ARRAY[?], to_jsonb((data ->> ?)::int - 1))
						WHEN (data ->> ?)::int = 1 THEN
							data - ?
						ELSE data
					END
					WHERE year = ? AND month = ? AND day = ? AND metric = ? AND user_id = ?
					AND (data ->> ?) IS NOT NULL`

				_, err := tx.Exec(updateQuery,
					change.PackageId, change.PackageId, change.PackageId, change.PackageId, change.PackageId,
					year, month, day, metrics.ReleaseVersionsPublished, change.CreatedBy,
					change.PackageId)
				if err != nil {
					return fmt.Errorf("failed to decrease metric for %s/%s@%d: %w",
						change.PackageId, change.Version, change.Revision, err)
				}

				deleteEmptyQuery := `
					DELETE FROM business_metric
					WHERE year = ? AND month = ? AND day = ? AND metric = ? AND user_id = ?
					AND (data IS NULL OR data = '{}'::jsonb)`

				_, err = tx.Exec(deleteEmptyQuery, year, month, day, metrics.ReleaseVersionsPublished, change.CreatedBy)
				if err != nil {
					return fmt.Errorf("failed to cleanup empty metric for %s/%s@%d: %w",
						change.PackageId, change.Version, change.Revision, err)
				}
				log.Debugf("Decreased counter for %s/%s@%d", change.PackageId, change.Version, change.Revision)
				processed++
			}
		}
		return nil
	})

	if err != nil {
		return fmt.Errorf("failed to process status changes: %w", err)
	}

	log.Infof("release_versions_published metric fix completed. Processed: %d, Skipped: %d", processed, skipped)

	log.Infof("Starting release_versions_deleted metric creation for soft-deleted revisions...")

	type deletedRevision struct {
		PackageId string    `pg:"package_id"`
		Version   string    `pg:"version"`
		Revision  int       `pg:"revision"`
		DeletedAt time.Time `pg:"deleted_at"`
		DeletedBy string    `pg:"deleted_by"`
	}

	var deletedRevisions []deletedRevision
	deletedQuery := `
		SELECT
			package_id,
			version,
			revision,
			deleted_at,
			deleted_by
		FROM published_version
		WHERE deleted_at IS NOT NULL
			AND status = 'release'
		ORDER BY deleted_at ASC`

	_, err = d.cp.GetConnection().QueryContext(ctx, &deletedRevisions, deletedQuery)
	if err != nil {
		return fmt.Errorf("failed to query deleted revisions: %w", err)
	}

	if len(deletedRevisions) == 0 {
		log.Infof("No deleted release revisions found")
		return nil
	}

	log.Infof("Found %d deleted release revisions to process", len(deletedRevisions))

	deletedProcessed := 0
	err = d.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		for _, deleted := range deletedRevisions {
			year := deleted.DeletedAt.Year()
			month := int(deleted.DeletedAt.Month())
			day := deleted.DeletedAt.Day()

			increaseQuery := `
				INSERT INTO business_metric (year, month, day, metric, data, user_id)
				VALUES (?, ?, ?, ?, ?::jsonb, ?)
				ON CONFLICT (year, month, day, user_id, metric)
				DO UPDATE
				SET data = coalesce(business_metric.data, '{}'::jsonb) ||
					jsonb_build_object(?, coalesce((business_metric.data ->> ?)::int, 0) + 1)`

			_, err := tx.Exec(increaseQuery,
				year, month, day, metrics.ReleaseVersionsDeleted,
				fmt.Sprintf(`{"%s": 1}`, deleted.PackageId), deleted.DeletedBy,
				deleted.PackageId, deleted.PackageId)
			if err != nil {
				return fmt.Errorf("failed to create deleted metric for %s/%s@%d: %w",
					deleted.PackageId, deleted.Version, deleted.Revision, err)
			}
			log.Debugf("Created deleted metric for %s/%s@%d", deleted.PackageId, deleted.Version, deleted.Revision)
			deletedProcessed++
		}
		return nil
	})

	if err != nil {
		return fmt.Errorf("failed to process deleted revisions: %w", err)
	}

	log.Infof("ReleaseVersionsDeleted metric creation completed. Processed: %d", deletedProcessed)
	return nil
}
