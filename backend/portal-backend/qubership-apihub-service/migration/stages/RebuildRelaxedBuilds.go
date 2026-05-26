package stages

import (
	"fmt"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	mView "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/view"
	"github.com/go-pg/pg/v10"
)

func (d OpsMigration) StageRebuildRelaxedBuilds() error {
	_, err := d.waitForBuilds(mView.MigrationStageRebuildRelaxedBuilds, 1) // for recovery
	if err != nil {
		return err
	}

	// Phase 1: rebuild versions published with a relaxed builder-version check
	vQuery, vParams := makeRelaxedVersionsQuery(d.ent.PackageIds, d.ent.Versions, d.ent.Id)
	vCount, err := d.createBuilds(vQuery, vParams, d.ent.Id, mView.MigrationStageRebuildRelaxedBuilds)
	if err != nil {
		return fmt.Errorf("migration %s stage %s (versions): %w", d.ent.Id, mView.MigrationStageRebuildRelaxedBuilds, err)
	}
	if vCount > 0 {
		_, err = d.waitForBuilds(mView.MigrationStageRebuildRelaxedBuilds, 2)
		if err != nil {
			return err
		}
	}

	// Phase 2: rebuild comparisons produced with a relaxed builder-version check
	cQuery, cParams := makeRelaxedComparisonsQuery(d.ent.PackageIds, d.ent.Versions, d.ent.Id)
	cCount, err := d.createComparisonBuilds(cQuery, cParams, d.ent.Id, mView.MigrationStageRebuildRelaxedBuilds)
	if err != nil {
		return fmt.Errorf("migration %s stage %s (comparisons): %w", d.ent.Id, mView.MigrationStageRebuildRelaxedBuilds, err)
	}
	if cCount > 0 {
		_, err = d.waitForBuilds(mView.MigrationStageRebuildRelaxedBuilds, 3)
		if err != nil {
			return err
		}
	}
	return nil
}

// makeRelaxedVersionsQuery returns versions whose metadata carries either
// previous_version_builder_version or current_version_builder_version and that
// have not yet been rebuilt in this migration stage.
func makeRelaxedVersionsQuery(packageIds []string, versionsIn []string, migrationId string) (string, []interface{}) {
	params := make([]interface{}, 0)
	wherePackageIn := ""
	if len(packageIds) > 0 {
		wherePackageIn = " AND pv.package_id in (?)"
		params = append(params, pg.In(packageIds))
	}

	whereVersionIn := ""
	extractedVersions := extractVersions(versionsIn)
	if len(extractedVersions) > 0 {
		whereVersionIn = " AND pv.version in (?)"
		params = append(params, pg.In(extractedVersions))
	}

	query := fmt.Sprintf(`
		SELECT pv.* FROM published_version pv
		INNER JOIN package_group pkg ON pv.package_id = pkg.id
		WHERE pv.deleted_at IS NULL AND pkg.deleted_at IS NULL
		  AND pkg.kind = '%s'
		  AND (pv.metadata \? '%s' OR pv.metadata \? '%s')
		  %s
		  %s
		  AND NOT EXISTS (
		      SELECT 1 FROM build b
		      WHERE b.package_id = pv.package_id
		        AND (string_to_array(b.version, '@'))[1] = pv.version
		        AND (string_to_array(b.version, '@'))[2]::int = pv.revision
		        AND b.metadata->>'build_type' = 'build'
		        AND b.metadata->>'migration_id' = '%s'
		        AND b.metadata->>'migration_stage' = '%s'
		  )`,
		entity.KIND_PACKAGE,
		entity.PREVIOUS_VERSION_BUILDER_VERSION_KEY,
		entity.CURRENT_VERSION_BUILDER_VERSION_KEY,
		wherePackageIn,
		whereVersionIn,
		migrationId,
		string(mView.MigrationStageRebuildRelaxedBuilds))
	return query, params
}

// makeRelaxedComparisonsQuery returns version_comparison rows whose metadata
// carries either relaxed-build key and that have not yet been rebuilt in this
// migration stage.
func makeRelaxedComparisonsQuery(packageIds []string, versionsIn []string, migrationId string) (string, []interface{}) {
	params := make([]interface{}, 0)
	wherePackageIn := ""
	if len(packageIds) > 0 {
		wherePackageIn = " AND vc.package_id in (?)"
		params = append(params, pg.In(packageIds))
	}

	whereVersionIn := ""
	extractedVersions := extractVersions(versionsIn)
	if len(extractedVersions) > 0 {
		whereVersionIn = " AND vc.version in (?)"
		params = append(params, pg.In(extractedVersions))
	}

	query := fmt.Sprintf(`
		SELECT vc.* FROM version_comparison vc
		WHERE (vc.metadata \? '%s' OR vc.metadata \? '%s')
		  %s
		  %s
		  AND NOT EXISTS (
		      SELECT 1 FROM build b
		      WHERE b.package_id = vc.package_id
		        AND b.version = concat(vc.version, '@', vc.revision)
		        AND b.metadata->>'build_type' = 'changelog'
		        AND b.metadata->>'migration_id' = '%s'
		        AND b.metadata->>'migration_stage' = '%s'
		        AND b.metadata->>'previous_version' = concat(vc.previous_version, '@', vc.previous_revision)
		        AND b.metadata->>'previous_version_package_id' = vc.previous_package_id
		  )`,
		entity.PREVIOUS_VERSION_BUILDER_VERSION_KEY,
		entity.CURRENT_VERSION_BUILDER_VERSION_KEY,
		wherePackageIn,
		whereVersionIn,
		migrationId,
		string(mView.MigrationStageRebuildRelaxedBuilds))
	return query, params
}
