package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/metrics"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/go-pg/pg/v10"
	log "github.com/sirupsen/logrus"
)

const typeAndTitleMigrationVersion = 22
const transitionFixMigrationVersion = 30

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

	if (currentVersion < transitionFixMigrationVersion && transitionFixMigrationVersion <= newVersion) ||
		(migrationRequired && transitionFixMigrationVersion == currentVersion && transitionFixMigrationVersion == newVersion) {
		utils.SafeAsync(func() {
			err := d.fixDataAfterTransitions()
			if err != nil {
				log.Errorf("Failed to fix data after transitions: %v", err)
			} else {
				log.Infof("Successfully fixed data after transitions")
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

// fixDataAfterTransitions fixes data in tables that were not properly updated during package transitions.
//
// Assumption: no new package was created under an old package ID (from_id) after a transition.
func (d dbMigrationServiceImpl) fixDataAfterTransitions() error {
	log.Infof("Starting data fix after package transitions")
	ctx := context.Background()

	transitions, err := d.loadCompletedTransitions(ctx)
	if err != nil {
		return err
	}
	if len(transitions) == 0 {
		log.Infof("No completed transitions found, nothing to fix")
		return nil
	}
	log.Infof("Found %d completed transitions to process", len(transitions))

	d.logWarningsForExistingFromIds(ctx, transitions)

	for _, transition := range transitions {
		log.Infof("Applying data fixes for transition: %s -> %s", transition.FromId, transition.ToId)
		if err := d.fixLiteSearchPackageId(ctx, transition.FromId, transition.ToId); err != nil {
			return fmt.Errorf("failed to fix fts_latest_release_operation_data for %s -> %s: %w", transition.FromId, transition.ToId, err)
		}
		if err := d.fixDashboardParentReferenceId(ctx, transition.FromId, transition.ToId); err != nil {
			return fmt.Errorf("failed to fix published_version_reference for %s -> %s: %w", transition.FromId, transition.ToId, err)
		}
		if err := d.fixTransformedDataPackageId(ctx, transition.FromId, transition.ToId); err != nil {
			return fmt.Errorf("failed to fix transformed_content_data for %s -> %s: %w", transition.FromId, transition.ToId, err)
		}
	}

	resolvedMap := resolveTransitionChains(transitions) // this is required to iterate over published source only once

	updated, err := d.fixPublishedSourcesConfigRefs(ctx, resolvedMap)
	if err != nil {
		return fmt.Errorf("failed to fix published_sources config refs: %w", err)
	}
	if updated > 0 {
		log.Infof("Updated %d published_sources configs total", updated)
	}

	return nil
}

type completedTransition struct {
	FromId string `pg:"from_id"`
	ToId   string `pg:"to_id"`
}

// resolveTransitionChains takes a list of transitions and resolves chains
func resolveTransitionChains(transitions []completedTransition) map[string]string {
	forward := make(map[string]string, len(transitions))
	for _, tr := range transitions {
		forward[tr.FromId] = tr.ToId
	}

	resolved := make(map[string]string, len(forward))
	//every fromId maps to the final toId
	for fromId := range forward {
		inProgress := make(map[string]bool)
		current := fromId
		for {
			inProgress[current] = true
			next, ok := forward[current]
			if !ok {
				break
			}
			if inProgress[next] {
				log.Warnf("Cycle detected in transition chain at %s -> %s, breaking chain", current, next)
				break
			}
			current = next
		}
		resolved[fromId] = current
	}
	return resolved
}

func (d dbMigrationServiceImpl) loadCompletedTransitions(ctx context.Context) ([]completedTransition, error) {
	var rows []completedTransition
	_, err := d.cp.GetConnection().QueryContext(ctx, &rows,
		`SELECT from_id, to_id
		 FROM activity_tracking_transition
		 WHERE status = ?
		 ORDER BY completed_serial_number ASC`, "complete")
	if err != nil {
		return nil, fmt.Errorf("failed to query completed transitions: %w", err)
	}
	return rows, nil
}

func (d dbMigrationServiceImpl) logWarningsForExistingFromIds(ctx context.Context, transitions []completedTransition) {
	fromIds := make([]string, 0, len(transitions))
	for _, transition := range transitions {
		fromIds = append(fromIds, transition.FromId)
	}

	type existingPkg struct {
		Id string `pg:"id"`
	}
	var existing []existingPkg
	_, err := d.cp.GetConnection().QueryContext(ctx, &existing,
		`SELECT id FROM package_group WHERE id IN (?)`, pg.In(fromIds))
	if err != nil {
		log.Warnf("Failed to check for existing from_ids in package_group: %v", err)
		return
	}

	// If such cases are found during testing, the implementation should be changed to handle them or make a manual fix for such packages.
	// For now we keep it simple to avoid slowing down the migration.
	for _, pkg := range existing {
		log.Warnf("Transition from_id '%s' still exists in package_group. "+
			"Data fix may incorrectly affect this package's data.", pkg.Id)
	}
}

func (d dbMigrationServiceImpl) fixLiteSearchPackageId(ctx context.Context, fromId, toId string) error {
	_, err := d.cp.GetConnection().ExecContext(ctx,
		`UPDATE fts_latest_release_operation_data SET package_id = ? WHERE package_id = ?`,
		toId, fromId)
	if err != nil {
		return fmt.Errorf("failed to update fts_latest_release_operation_data for %s -> %s: %w", fromId, toId, err)
	}
	return nil
}

func (d dbMigrationServiceImpl) fixDashboardParentReferenceId(ctx context.Context, fromId, toId string) error {
	_, err := d.cp.GetConnection().ExecContext(ctx,
		`UPDATE published_version_reference SET parent_reference_id = ? WHERE parent_reference_id = ?`,
		toId, fromId)
	if err != nil {
		return fmt.Errorf("failed to update published_version_reference for %s -> %s: %w", fromId, toId, err)
	}
	return nil
}

func (d dbMigrationServiceImpl) fixTransformedDataPackageId(ctx context.Context, fromId, toId string) error {
	// Delete old rows where new_id rows already exist (can be created for new package id  by ops group publish)
	_, err := d.cp.GetConnection().ExecContext(ctx,
		`DELETE FROM transformed_content_data old
		 WHERE old.package_id = ?
		   AND EXISTS (
		     SELECT 1 FROM transformed_content_data new
		     WHERE new.package_id = ?
		       AND new.version = old.version
		       AND new.revision = old.revision
		       AND new.api_type = old.api_type
		       AND new.group_id = old.group_id
		       AND new.build_type = old.build_type
		       AND new.format = old.format
		   )`,
		fromId, toId)
	if err != nil {
		return fmt.Errorf("failed to delete duplicate transformed_content_data for %s -> %s: %w", fromId, toId, err)
	}

	// Update remaining old rows to new_id
	_, err = d.cp.GetConnection().ExecContext(ctx,
		`UPDATE transformed_content_data SET package_id = ? WHERE package_id = ?`,
		toId, fromId)
	if err != nil {
		return fmt.Errorf("failed to update transformed_content_data for %s -> %s: %w", fromId, toId, err)
	}
	return nil
}

type publishedSourceRow struct {
	PackageId string `pg:"package_id"`
	Version   string `pg:"version"`
	Revision  int    `pg:"revision"`
	Config    []byte `pg:"config"`
}

func (d dbMigrationServiceImpl) fixPublishedSourcesConfigRefs(ctx context.Context, resolvedMap map[string]string) (int, error) {
	const batchSize = 500
	totalUpdated := 0

	fromIdBytes := make([][]byte, 0, len(resolvedMap))
	for fromId := range resolvedMap {
		fromIdBytes = append(fromIdBytes, []byte(fromId))
	}

	for offset := 0; ; offset += batchSize {
		var sources []publishedSourceRow
		_, err := d.cp.GetConnection().QueryContext(ctx, &sources,
			`SELECT package_id, version, revision, config
			 FROM published_sources
			 WHERE config IS NOT NULL
			 ORDER BY package_id, version, revision
			 LIMIT ? OFFSET ?`, batchSize, offset)
		if err != nil {
			return totalUpdated, fmt.Errorf("failed to fetch published_sources batch: %w", err)
		}
		if len(sources) == 0 {
			break
		}
		log.Infof("Processing published_sources config refs: rows %d-%d", offset, offset+len(sources))

		updated, err := d.fixConfigRefsInBatch(ctx, sources, resolvedMap, fromIdBytes)
		if err != nil {
			return totalUpdated, err
		}
		if updated > 0 {
			log.Infof("Updated %d published_sources configs in current batch", updated)
		}
		totalUpdated += updated

		if len(sources) < batchSize {
			break
		}
	}

	return totalUpdated, nil
}

func (d dbMigrationServiceImpl) fixConfigRefsInBatch(ctx context.Context, sources []publishedSourceRow, resolvedMap map[string]string, fromIdBytes [][]byte) (int, error) {
	updated := 0
	err := d.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		for _, src := range sources {
			if !bytesContainsAny(src.Config, fromIdBytes) {
				continue
			}

			var config view.BuildConfig
			if err := json.Unmarshal(src.Config, &config); err != nil {
				log.Warnf("Failed to unmarshal config for %s/%s@%d, skipping: %v",
					src.PackageId, src.Version, src.Revision, err)
				continue
			}

			if !replaceConfigRefs(&config, resolvedMap) {
				continue
			}

			updatedConfig, err := json.Marshal(config)
			if err != nil {
				return fmt.Errorf("failed to marshal config for %s/%s@%d: %w",
					src.PackageId, src.Version, src.Revision, err)
			}

			_, err = tx.Exec(
				`UPDATE published_sources SET config = ?
				 WHERE package_id = ? AND version = ? AND revision = ?`,
				updatedConfig, src.PackageId, src.Version, src.Revision)
			if err != nil {
				return fmt.Errorf("failed to update config for %s/%s@%d: %w",
					src.PackageId, src.Version, src.Revision, err)
			}
			updated++
		}
		return nil
	})
	return updated, err
}

func replaceConfigRefs(config *view.BuildConfig, resolvedMap map[string]string) bool {
	changed := false
	for i := range config.Refs {
		if toId, ok := resolvedMap[config.Refs[i].RefId]; ok {
			config.Refs[i].RefId = toId
			changed = true
		}
		if toId, ok := resolvedMap[config.Refs[i].ParentRefId]; ok {
			config.Refs[i].ParentRefId = toId
			changed = true
		}
	}
	return changed
}

func bytesContainsAny(data []byte, patterns [][]byte) bool {
	for _, p := range patterns {
		if bytes.Contains(data, p) {
			return true
		}
	}
	return false
}
