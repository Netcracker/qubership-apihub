package stages

import (
	"fmt"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	mView "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/view"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/go-pg/pg/v10"
	log "github.com/sirupsen/logrus"
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
		log.Infof("migration %s stage %s: %d relaxed version builds found", d.ent.Id, mView.MigrationStageRebuildRelaxedBuilds, vCount)
		_, err = d.waitForBuilds(mView.MigrationStageRebuildRelaxedBuilds, 1)
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
		log.Infof("migration %s stage %s: %d relaxed comparisons found", d.ent.Id, mView.MigrationStageRebuildRelaxedBuilds, vCount)
		_, err = d.waitForBuilds(mView.MigrationStageRebuildRelaxedBuilds, 1)
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
		  )
		  /* the previous version must not have errors, otherwise the calculated changes are unreliable */
		  and not exists (
		  	select 1 from published_version prev_ver
		  	/* the changelog of the previous version, calculated against the latest revision of its own previous version */
		  	left join lateral (
		  		select max(pp.revision) as revision from published_version pp
		  		where pp.package_id = coalesce(nullif(prev_ver.previous_version_package_id, ''), prev_ver.package_id)
		  			and pp.version = prev_ver.previous_version
		  			and pp.deleted_at is null
		  	) prev_ver_prev on true
		  	left join version_comparison prev_ver_changelog
		  		on prev_ver_changelog.package_id = prev_ver.package_id
		  		and prev_ver_changelog.version = prev_ver.version
		  		and prev_ver_changelog.revision = prev_ver.revision
		  		and prev_ver_changelog.previous_package_id = coalesce(nullif(prev_ver.previous_version_package_id, ''), prev_ver.package_id)
		  		and prev_ver_changelog.previous_version = prev_ver.previous_version
		  		and prev_ver_changelog.previous_revision = prev_ver_prev.revision
		  	where prev_ver.package_id = coalesce(nullif(pv.previous_version_package_id, ''), pv.package_id)
		  		and prev_ver.version = pv.previous_version
		  		and prev_ver.deleted_at is null
		  		/* the build resolves the previous version to its latest revision, like GetVersion does */
		  		and prev_ver.revision = (
		  			select max(pr.revision) from published_version pr
		  			where pr.package_id = prev_ver.package_id and pr.version = prev_ver.version and pr.deleted_at is null
		  		)
		  		and (coalesce((prev_ver.metadata ->> 'has_errors')::boolean, false)
		  			or coalesce((prev_ver_changelog.metadata ->> 'has_errors')::boolean, false))
		  )
		  /* only a dashboard carries references, and a release one that references a version with errors cannot be published */
		  and not (pkg.kind = '%s' and pv.status = '%s' and exists (
		  	select 1 from published_version_reference ref_src
		  	inner join published_version ref_ver
		  		on ref_ver.package_id = ref_src.reference_id
		  		and ref_ver.version = ref_src.reference_version
		  		and ref_ver.revision = ref_src.reference_revision
		  		and ref_ver.deleted_at is null
		  	/* the changelog of the referenced version, calculated against the latest revision of its previous version */
		  	left join lateral (
		  		select max(rp.revision) as revision from published_version rp
		  		where rp.package_id = coalesce(nullif(ref_ver.previous_version_package_id, ''), ref_ver.package_id)
		  			and rp.version = ref_ver.previous_version
		  			and rp.deleted_at is null
		  	) ref_ver_prev on true
		  	left join version_comparison ref_ver_changelog
		  		on ref_ver_changelog.package_id = ref_ver.package_id
		  		and ref_ver_changelog.version = ref_ver.version
		  		and ref_ver_changelog.revision = ref_ver.revision
		  		and ref_ver_changelog.previous_package_id = coalesce(nullif(ref_ver.previous_version_package_id, ''), ref_ver.package_id)
		  		and ref_ver_changelog.previous_version = ref_ver.previous_version
		  		and ref_ver_changelog.previous_revision = ref_ver_prev.revision
		  	where ref_src.package_id = pv.package_id
		  		and ref_src.version = pv.version
		  		and ref_src.revision = pv.revision
		  		and ref_src.excluded = false
		  		and (coalesce((ref_ver.metadata ->> 'has_errors')::boolean, false)
		  			or coalesce((ref_ver_changelog.metadata ->> 'has_errors')::boolean, false))
		  ))`,
		entity.PREVIOUS_VERSION_BUILDER_VERSION_KEY,
		entity.CURRENT_VERSION_BUILDER_VERSION_KEY,
		wherePackageIn,
		whereVersionIn,
		migrationId,
		string(mView.MigrationStageRebuildRelaxedBuilds),
		entity.KIND_DASHBOARD,
		string(view.Release))
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
		  )
		  /* the previous version must not have errors, otherwise the calculated changes are unreliable */
		  and not exists (
		  	select 1 from published_version prev_ver
		  	/* the changelog of the previous version, calculated against the latest revision of its own previous version */
		  	left join lateral (
		  		select max(pp.revision) as revision from published_version pp
		  		where pp.package_id = coalesce(nullif(prev_ver.previous_version_package_id, ''), prev_ver.package_id)
		  			and pp.version = prev_ver.previous_version
		  			and pp.deleted_at is null
		  	) prev_ver_prev on true
		  	left join version_comparison prev_ver_changelog
		  		on prev_ver_changelog.package_id = prev_ver.package_id
		  		and prev_ver_changelog.version = prev_ver.version
		  		and prev_ver_changelog.revision = prev_ver.revision
		  		and prev_ver_changelog.previous_package_id = coalesce(nullif(prev_ver.previous_version_package_id, ''), prev_ver.package_id)
		  		and prev_ver_changelog.previous_version = prev_ver.previous_version
		  		and prev_ver_changelog.previous_revision = prev_ver_prev.revision
		  	/* the comparison row pins the revision of the previous version */
		  	where prev_ver.package_id = vc.previous_package_id
		  		and prev_ver.version = vc.previous_version
		  		and prev_ver.revision = vc.previous_revision
		  		and (coalesce((prev_ver.metadata ->> 'has_errors')::boolean, false)
		  			or coalesce((prev_ver_changelog.metadata ->> 'has_errors')::boolean, false))
		  )`,
		entity.PREVIOUS_VERSION_BUILDER_VERSION_KEY,
		entity.CURRENT_VERSION_BUILDER_VERSION_KEY,
		wherePackageIn,
		whereVersionIn,
		migrationId,
		string(mView.MigrationStageRebuildRelaxedBuilds))
	return query, params
}
