package stages

import (
	"fmt"
	"strings"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	mView "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/view"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/go-pg/pg/v10"
)

func (d OpsMigration) StageDashboardVersions() error {
	round := 1

	_, err := d.waitForBuilds(mView.MigrationStageDashboardVersions, round) // for recovery
	if err != nil {
		return err
	}

	count := 1
	for count > 0 {
		query, params := makeDashboardVersionsQuery(d.ent.PackageIds, d.ent.Versions, d.ent.Id)

		count, err = d.createBuilds(query, params, d.ent.Id, mView.MigrationStageDashboardVersions)
		if err != nil {
			return fmt.Errorf("migration %s stage %s round %d: %w", d.ent.Id, mView.MigrationStageDashboardVersions, round, err)
		}

		if count > 0 {
			_, err = d.waitForBuilds(mView.MigrationStageDashboardVersions, round)
			if err != nil {
				return err
			}
		}
		round += 1
	}

	return nil
}

func makeDashboardVersionsQuery(packageIds []string, versionsIn []string, migrationId string) (string, []interface{}) {
	params := make([]interface{}, 0)
	var wherePackageIn string
	if len(packageIds) > 0 {
		wherePackageIn = " and pv.package_id in (?) "
		params = append(params, pg.In(packageIds))
	}

	var whereVersionIn string
	if len(versionsIn) > 0 {
		extractedVersions := make([]string, 0, len(versionsIn))
		for _, ver := range versionsIn {
			verSplit := strings.Split(ver, "@")
			if len(verSplit) > 0 && verSplit[0] != "" {
				extractedVersions = append(extractedVersions, verSplit[0])
			}
		}
		if len(extractedVersions) > 0 {
			whereVersionIn = " and pv.version in (?) "
			params = append(params, pg.In(extractedVersions))
		}
	}

	query := `
	select pv.* from
		published_version pv
		inner join package_group pkg on pv.package_id = pkg.id
	where
		pv.deleted_at is null
		and pkg.deleted_at is null
		and pkg.kind = '` + entity.KIND_DASHBOARD + `'`

	if wherePackageIn != "" {
		query += wherePackageIn
	}
	if whereVersionIn != "" {
		query += whereVersionIn
	}

	query += fmt.Sprintf(`
		/* if has previous_version, its latest revision must be migrated */
		and (
			pv.previous_version is null
			or exists (
				select 1 from build b
				inner join (
					select package_id, version, max(revision) as max_revision
					from published_version
					where deleted_at is null
					group by package_id, version
				) prev_max on prev_max.package_id = (CASE WHEN (pv.previous_version_package_id IS NULL OR pv.previous_version_package_id = '') THEN pv.package_id ELSE pv.previous_version_package_id END)
					and prev_max.version = pv.previous_version
				where b.package_id = prev_max.package_id
					and b.version = concat(prev_max.version, '@', prev_max.max_revision)
					and b.metadata->>'migration_id' = '%s'
					and b.metadata->>'build_type' = 'build'
					and b.status = '%s'
			)
		)
		/* all refs must be migrated */
		and not exists (
			select 1 from published_version_reference pvr
			inner join package_group ref_pkg on pvr.reference_id = ref_pkg.id
			inner join published_version ref_pv on pvr.reference_id = ref_pv.package_id
				and pvr.reference_version = ref_pv.version
				and pvr.reference_revision = ref_pv.revision
			where pvr.package_id = pv.package_id
			and pvr.version = pv.version
			and pvr.revision = pv.revision
			and ref_pkg.deleted_at is null
			and ref_pv.deleted_at is null
			and not exists (
				select 1 from build b
				where (string_to_array(b.version, '@'))[1] = pvr.reference_version
				and b.package_id = pvr.reference_id
				and (string_to_array(b.version, '@'))[2]::int = pvr.reference_revision
				and b.metadata->>'build_type' = 'build'
				and b.metadata->>'migration_id' = '%s'
				and b.status = '%s'
			)
		)
		/* version is not migrated yet */
		and not exists (
			select 1 from build b
			where (string_to_array(b.version, '@'))[1] = pv.version
			and b.package_id = pv.package_id
			and (string_to_array(b.version, '@'))[2]::int = pv.revision
			and b.metadata->>'build_type' = 'build'
			and b.metadata->>'migration_id' = '%s'
		)
		order by pv.published_at asc, pv.package_id asc, pv.version asc, pv.revision asc
	`, migrationId, view.StatusComplete,
		migrationId, view.StatusComplete,
		migrationId)

	return query, params
}
