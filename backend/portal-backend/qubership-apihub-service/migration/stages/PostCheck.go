package stages

import (
	"fmt"
	"time"

	mEntity "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/go-pg/pg/v10"
	"github.com/go-pg/pg/v10/orm"
	log "github.com/sirupsen/logrus"
)

const (
	skipReasonPreviousVersionHasErrors   = "previous version has errors"
	skipReasonReferenceHasErrors         = "release dashboard references a version with errors"
	skipReasonPreviousVersionNotMigrated = "previous version not migrated"
	skipReasonVersionNotMigrated         = "version not migrated"
	skipReasonReferenceNotMigrated       = "referenced version not migrated"
	skipReasonVersionBuildFailed         = "version build failed"
	skipReasonChangelogBuildFailed       = "changelog build failed"
	skipReasonUnknown                    = "unknown"
)

// StagePostCheck check that migration affected all required versions and comparisons!
func (d OpsMigration) StagePostCheck() error {
	// self-check

	actualBuilderVersion, err := d.getActualBuilderVersion()
	if err != nil {
		return fmt.Errorf("failed to determine actual builder version for post-check: %v", err.Error())
	}
	if actualBuilderVersion == "" {
		log.Warnf("Migration %s post-check: could not determine actual builder version, falling back to strict migration_id-only check", d.ent.Id)
	}

	postCheckResult := &mEntity.PostCheckResultEntity{
		NotMigratedVersions:    make([]mEntity.MigrationVersionEntity, 0),
		NotMigratedComparisons: make([]mEntity.MigrationChangelogEntity, 0),
	}

	if !d.ent.IsRebuildChangelogOnly {
		query, params := makeNotMigratedVersionsQuery(d.ent.PackageIds, d.ent.Versions, d.ent.Id, d.ent.StartedAt, actualBuilderVersion)
		_, err := withDBRetry(d, func() (orm.Result, error) {
			return d.cp.GetConnection().QueryContext(d.migrationCtx, &postCheckResult.NotMigratedVersions, query, params...)
		})
		if err != nil {
			return fmt.Errorf("failed to query not migrated versions: %v", err.Error())
		}
	}

	cQuery, cParams := makeNotMigratedComparisonsQuery(d.ent.PackageIds, d.ent.Versions, d.ent.Id, d.ent.StartedAt, actualBuilderVersion, d.ent.IsRebuildChangelogOnly)
	_, err = withDBRetry(d, func() (orm.Result, error) {
		return d.cp.GetConnection().QueryContext(d.migrationCtx, &postCheckResult.NotMigratedComparisons, cQuery, cParams...)
	})
	if err != nil {
		return fmt.Errorf("failed to query not migrated comparisons: %v", err.Error())
	}

	if len(postCheckResult.NotMigratedVersions) > 0 || len(postCheckResult.NotMigratedComparisons) > 0 {
		_, err := withDBRetry(d, func() (orm.Result, error) {
			return d.cp.GetConnection().Model(&mEntity.MigrationRunEntity{}).
				Set("post_check_result = ?", postCheckResult).
				Where("id = ?", d.ent.Id).Update()
		})
		if err != nil {
			return fmt.Errorf("failed to store post-check result: %v", err.Error())
		}
	}

	log.Infof("Migration post-check result: found %d not migrated versions and %d not migrated comparisons. ",
		len(postCheckResult.NotMigratedVersions), len(postCheckResult.NotMigratedComparisons))

	return nil
}

func (d OpsMigration) getActualBuilderVersion() (string, error) {
	var query string
	if d.ent.IsRebuildChangelogOnly {
		query = `
			select v.builder_version from version_comparison v
			where v.metadata->>'migration_id' = ? and v.builder_version is not null
			limit 1`
	} else {
		query = `
			select v.metadata->>'builder_version' from published_version v
			where v.metadata->>'migration_id' = ? and v.metadata \? 'builder_version'
			limit 1`
	}

	var results []string
	_, err := withDBRetry(d, func() (orm.Result, error) {
		return d.cp.GetConnection().QueryContext(d.migrationCtx, &results, query, d.ent.Id)
	})
	if err != nil {
		return "", err
	}
	if len(results) == 0 {
		return "", nil
	}
	return results[0], nil
}

func makeNotMigratedVersionsQuery(packageIds []string, versionsIn []string, migrationId string, startedAt time.Time, actualBuilderVersion string) (string, []interface{}) {
	params := make([]interface{}, 0)
	params = append(params, migrationId)

	relaxClause := ""
	if actualBuilderVersion != "" {
		relaxClause = " and not (v.published_at > ? and v.metadata->>'builder_version' = ?) "
		params = append(params, startedAt, actualBuilderVersion)
	}

	wherePackageIn, whereVersionIn := appendScopeFilters(&params, packageIds, versionsIn)

	query := fmt.Sprintf(`
		select v.package_id, v.version, v.revision, v.previous_version, v.previous_version_package_id,
		/* why the migration left this version as it was */
		case
			when exists (
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
				where prev_ver.package_id = coalesce(nullif(v.previous_version_package_id, ''), v.package_id)
					and prev_ver.version = v.previous_version
					and prev_ver.deleted_at is null
					and prev_ver.revision = (
						select max(pr.revision) from published_version pr
						where pr.package_id = prev_ver.package_id and pr.version = prev_ver.version and pr.deleted_at is null
					)
					and (coalesce((prev_ver.metadata ->> 'has_errors')::boolean, false)
						or coalesce((prev_ver_changelog.metadata ->> 'has_errors')::boolean, false))
			) then '%s'
			when v.status = '%s' and exists (
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
				where ref_src.package_id = v.package_id
					and ref_src.version = v.version
					and ref_src.revision = v.revision
					and ref_src.excluded = false
					and (coalesce((ref_ver.metadata ->> 'has_errors')::boolean, false)
						or coalesce((ref_ver_changelog.metadata ->> 'has_errors')::boolean, false))
			) then '%s'
			when v.previous_version is not null and not exists (
				select 1 from published_version prev_ver
				where prev_ver.package_id = coalesce(nullif(v.previous_version_package_id, ''), v.package_id)
					and prev_ver.version = v.previous_version
					and prev_ver.deleted_at is null
					and prev_ver.revision = (
						select max(pr.revision) from published_version pr
						where pr.package_id = prev_ver.package_id and pr.version = prev_ver.version and pr.deleted_at is null
					)
					and prev_ver.metadata->>'migration_id' = '%s'
			) then '%s'
			when exists (
				select 1 from published_version_reference pvr
				inner join package_group ref_pkg on pvr.reference_id = ref_pkg.id
				inner join published_version ref_pv on pvr.reference_id = ref_pv.package_id
					and pvr.reference_version = ref_pv.version
					and pvr.reference_revision = ref_pv.revision
				where pvr.package_id = v.package_id
					and pvr.version = v.version
					and pvr.revision = v.revision
					and ref_pkg.deleted_at is null
					and ref_pv.deleted_at is null
					and ref_pv.metadata->>'migration_id' is distinct from '%s'
			) then '%s'
			when exists (
				select 1 from build b
				where b.package_id = v.package_id
					and b.version = concat(v.version, '@', v.revision)
					and b.metadata->>'build_type' = '%s'
					and b.metadata->>'migration_id' = '%s'
					and b.status = '%s'
			) then '%s'
			else '%s'
		end as skip_reason from published_version v
		inner join package_group pkg on v.package_id = pkg.id
		where v.deleted_at is null and pkg.deleted_at is null
		and (v.metadata is null or not (v.metadata \? 'migration_id') or v.metadata->>'migration_id' is distinct from ?)%s%s%s`,
		skipReasonPreviousVersionHasErrors, string(view.Release), skipReasonReferenceHasErrors,
		migrationId, skipReasonPreviousVersionNotMigrated,
		migrationId, skipReasonReferenceNotMigrated,
		view.PublishType, migrationId, view.StatusError, skipReasonVersionBuildFailed,
		skipReasonUnknown,
		relaxClause, wherePackageIn, whereVersionIn)
	return query, params
}

func makeNotMigratedComparisonsQuery(packageIds []string, versionsIn []string, migrationId string, startedAt time.Time, actualBuilderVersion string, isRebuildChangelogOnly bool) (string, []interface{}) {
	params := make([]interface{}, 0)
	params = append(params, migrationId)

	relaxClause := ""
	if actualBuilderVersion != "" {
		relaxClause = " and not (v.last_active > ? and v.builder_version = ?) "
		params = append(params, startedAt, actualBuilderVersion)
	}

	wherePackageIn, whereVersionIn := appendScopeFilters(&params, packageIds, versionsIn)

	versionsNotMigratedCases := ""
	if !isRebuildChangelogOnly {
		versionsNotMigratedCases = fmt.Sprintf(`
			when pv2.metadata->>'migration_id' is distinct from '%s' then '%s'
			when pv1.metadata->>'migration_id' is distinct from '%s' then '%s'`,
			migrationId, skipReasonPreviousVersionNotMigrated,
			migrationId, skipReasonVersionNotMigrated)
	}

	query := fmt.Sprintf(`
		select v.package_id, v.version, v.revision, v.previous_package_id, v.previous_version, v.previous_revision,
		/* why the migration left this comparison as it was */
		case
			when exists (
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
				where prev_ver.package_id = v.previous_package_id
					and prev_ver.version = v.previous_version
					and prev_ver.revision = v.previous_revision
					and (coalesce((prev_ver.metadata ->> 'has_errors')::boolean, false)
						or coalesce((prev_ver_changelog.metadata ->> 'has_errors')::boolean, false))
			) then '%s'%s
			when exists (
				select 1 from build b
				where b.package_id = v.package_id
					and b.version = concat(v.version, '@', v.revision)
					and b.metadata->>'build_type' = '%s'
					and b.metadata->>'migration_id' = '%s'
					and b.metadata->>'previous_version' = concat(v.previous_version, '@', v.previous_revision)
					and b.metadata->>'previous_version_package_id' = v.previous_package_id
					and b.status = '%s'
			) then '%s'
			else '%s'
		end as skip_reason from version_comparison v
		inner join published_version pv1 on v.package_id=pv1.package_id and v.version=pv1.version and v.revision=pv1.revision
		inner join published_version pv2 on v.previous_package_id=pv2.package_id and v.previous_version=pv2.version and v.previous_revision=pv2.revision
		inner join package_group pg1 on v.package_id=pg1.id
		inner join package_group pg2 on v.previous_package_id=pg2.id
		where pv1.deleted_at is null and pv2.deleted_at is null and pg1.deleted_at is null and pg2.deleted_at is null
		  and (v.metadata is null or not (v.metadata \? 'migration_id') or v.metadata->>'migration_id' is distinct from ?)%s%s%s`,
		skipReasonPreviousVersionHasErrors, versionsNotMigratedCases,
		view.ChangelogType, migrationId, view.StatusError, skipReasonChangelogBuildFailed,
		skipReasonUnknown,
		relaxClause, wherePackageIn, whereVersionIn)
	return query, params
}

// appendScopeFilters appends optional package/version IN-filter parameters (aliased to "v") and returns the
// matching SQL fragments. Both queries scope by the same package/version filters.
func appendScopeFilters(params *[]interface{}, packageIds []string, versionsIn []string) (string, string) {
	wherePackageIn := ""
	if len(packageIds) > 0 {
		wherePackageIn = " and v.package_id in (?) "
		*params = append(*params, pg.In(packageIds))
	}

	whereVersionIn := ""
	extractedVersions := extractVersions(versionsIn)
	if len(extractedVersions) > 0 {
		whereVersionIn = " and v.version in (?) "
		*params = append(*params, pg.In(extractedVersions))
	}
	return wherePackageIn, whereVersionIn
}
