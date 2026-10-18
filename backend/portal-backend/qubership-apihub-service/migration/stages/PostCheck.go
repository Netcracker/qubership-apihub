package stages

import (
	"fmt"
	"time"

	mEntity "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/entity"
	"github.com/go-pg/pg/v10"
	"github.com/go-pg/pg/v10/orm"
	log "github.com/sirupsen/logrus"
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

	cQuery, cParams := makeNotMigratedComparisonsQuery(d.ent.PackageIds, d.ent.Versions, d.ent.Id, d.ent.StartedAt, actualBuilderVersion)
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
		select v.package_id, v.version, v.revision, v.previous_version, v.previous_version_package_id from published_version v
		inner join package_group pkg on v.package_id = pkg.id
		where v.deleted_at is null and pkg.deleted_at is null
		and (v.metadata is null or not (v.metadata \? 'migration_id') or v.metadata->>'migration_id' is distinct from ?)%s%s%s`,
		relaxClause, wherePackageIn, whereVersionIn)
	return query, params
}

func makeNotMigratedComparisonsQuery(packageIds []string, versionsIn []string, migrationId string, startedAt time.Time, actualBuilderVersion string) (string, []interface{}) {
	params := make([]interface{}, 0)
	params = append(params, migrationId)

	relaxClause := ""
	if actualBuilderVersion != "" {
		relaxClause = " and not (v.last_active > ? and v.builder_version = ?) "
		params = append(params, startedAt, actualBuilderVersion)
	}

	wherePackageIn, whereVersionIn := appendScopeFilters(&params, packageIds, versionsIn)

	query := fmt.Sprintf(`
		select v.package_id, v.version, v.revision, v.previous_package_id, v.previous_version, v.previous_revision from version_comparison v
		inner join published_version pv1 on v.package_id=pv1.package_id and v.version=pv1.version and v.revision=pv1.revision
		inner join published_version pv2 on v.previous_package_id=pv2.package_id and v.previous_version=pv2.version and v.previous_revision=pv2.revision
		inner join package_group pg1 on v.package_id=pg1.id
		inner join package_group pg2 on v.previous_package_id=pg2.id
		where pv1.deleted_at is null and pv2.deleted_at is null and pg1.deleted_at is null and pg2.deleted_at is null
		  and (v.metadata is null or not (v.metadata \? 'migration_id') or v.metadata->>'migration_id' is distinct from ?)%s%s%s`,
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
