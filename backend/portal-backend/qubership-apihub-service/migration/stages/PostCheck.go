package stages

import (
	"fmt"
	"strings"

	mEntity "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/entity"
	"github.com/go-pg/pg/v10"
	log "github.com/sirupsen/logrus"
)

// StagePostCheck check that migration affected all required versions and comparisons!
func (d OpsMigration) StagePostCheck() error {
	// self-check

	var wherePackageIn string
	var whereVersionIn string
	queryParams := make([]interface{}, 0)

	if len(d.ent.PackageIds) > 0 {
		wherePackageIn = " and v.package_id in (?) "
		queryParams = append(queryParams, pg.In(d.ent.PackageIds))
	}

	if len(d.ent.Versions) > 0 {
		extractedVersions := make([]string, 0, len(d.ent.Versions))
		for _, ver := range d.ent.Versions {
			verSplit := strings.Split(ver, "@")
			if len(verSplit) > 0 && verSplit[0] != "" {
				extractedVersions = append(extractedVersions, verSplit[0])
			}
		}
		if len(extractedVersions) > 0 {
			whereVersionIn = " and v.version in (?) "
			queryParams = append(queryParams, pg.In(extractedVersions))
		}
	}

	postCheckResult := &mEntity.PostCheckResultEntity{
		NotMigratedVersions:    make([]mEntity.MigrationVersionEntity, 0),
		NotMigratedComparisons: make([]mEntity.MigrationChangelogEntity, 0),
	}

	if !d.ent.IsRebuildChangelogOnly {
		notMigratedVersionsQuery := fmt.Sprintf(`
			select v.package_id, v.version, v.revision, v.previous_version, v.previous_version_package_id from published_version v
			inner join package_group pkg on v.package_id = pkg.id
			where v.deleted_at is null and pkg.deleted_at is null
			and (v.metadata is null or not (v.metadata \? 'migration_id') or v.metadata->>'migration_id' is distinct from '%s') %s %s`,
			d.ent.Id, wherePackageIn, whereVersionIn)

		_, err := d.cp.GetConnection().QueryContext(d.migrationCtx, &postCheckResult.NotMigratedVersions, notMigratedVersionsQuery, queryParams...)
		if err != nil {
			return fmt.Errorf("failed to query not migrated versions: %v", err.Error())
		}
	}

	notMigratedComparisonsQuery := fmt.Sprintf(`
		select v.package_id, v.version, v.revision, v.previous_package_id, v.previous_version, v.previous_revision from version_comparison v
		inner join published_version pv1 on v.package_id=pv1.package_id and v.version=pv1.version and v.revision=pv1.revision
		inner join published_version pv2 on v.previous_package_id=pv2.package_id and v.previous_version=pv2.version and v.previous_revision=pv2.revision
		inner join package_group pg1 on v.package_id=pg1.id
		inner join package_group pg2 on v.previous_package_id=pg2.id
		where pv1.deleted_at is null and pv2.deleted_at is null and pg1.deleted_at is null and pg2.deleted_at is null
		  and (v.metadata is null or not (v.metadata \? 'migration_id') or v.metadata->>'migration_id' is distinct from '%s') %s %s`,
		d.ent.Id, wherePackageIn, whereVersionIn)

	_, err := d.cp.GetConnection().QueryContext(d.migrationCtx, &postCheckResult.NotMigratedComparisons, notMigratedComparisonsQuery, queryParams...)
	if err != nil {
		return fmt.Errorf("failed to query not migrated comparisons: %v", err.Error())
	}

	if len(postCheckResult.NotMigratedVersions) > 0 || len(postCheckResult.NotMigratedComparisons) > 0 {
		_, err := d.cp.GetConnection().Model(&mEntity.MigrationRunEntity{}).
			Set("post_check_result = ?", postCheckResult).
			Where("id = ?", d.ent.Id).Update()
		if err != nil {
			return fmt.Errorf("failed to store post-check result: %v", err.Error())
		}
	}

	log.Infof("Migration post-check result: found %d not migrated versions and %d not migrated comparisons. ",
		len(postCheckResult.NotMigratedVersions), len(postCheckResult.NotMigratedComparisons))

	return nil
}
