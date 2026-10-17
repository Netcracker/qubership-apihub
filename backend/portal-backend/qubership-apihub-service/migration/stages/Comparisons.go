package stages

import (
	"fmt"
	"strings"

	mView "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/view"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"

	"github.com/go-pg/pg/v10"
)

func (d OpsMigration) StageComparisonsOther() error {
	_, err := d.waitForBuilds(mView.MigrationStageComparisonsOther, 1) // for recovery
	if err != nil {
		return err
	}

	query, params := makeComparisonsQuery(d.ent.PackageIds, d.ent.Versions, d.ent.Id, false, d.restartStage == mView.MigrationStageComparisonsOther)

	count, err := d.createComparisonBuilds(query, params, d.ent.Id, mView.MigrationStageComparisonsOther)
	if err != nil {
		return fmt.Errorf("migration %s stage %s round %d: %w", d.ent.Id, mView.MigrationStageComparisonsOther, 1, err)
	}

	if count > 0 {
		_, err = d.waitForBuilds(mView.MigrationStageComparisonsOther, 1)
		if err != nil {
			return err
		}
	}

	return nil
}

func (d OpsMigration) StageComparisonsOnly() error {
	_, err := d.waitForBuilds(mView.MigrationStageComparisonsOnly, 1) // for recovery
	if err != nil {
		return err
	}

	query, params := makeComparisonsQuery(d.ent.PackageIds, d.ent.Versions, d.ent.Id, true, d.restartStage == mView.MigrationStageComparisonsOnly)

	count, err := d.createComparisonBuilds(query, params, d.ent.Id, mView.MigrationStageComparisonsOnly)
	if err != nil {
		return fmt.Errorf("migration %s stage %s round %d: %w", d.ent.Id, mView.MigrationStageComparisonsOnly, 1, err)
	}

	if count > 0 {
		_, err = d.waitForBuilds(mView.MigrationStageComparisonsOnly, 1)
		if err != nil {
			return err
		}
	}

	return nil
}

func makeComparisonsQuery(packageIds []string, versionsIn []string, migrationId string, isComparisonsOnly bool, isRestart bool) (string, []interface{}) {
	params := make([]interface{}, 0)
	var wherePackageIn string
	if len(packageIds) > 0 {
		wherePackageIn = " and vc.package_id in (?) "
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
			whereVersionIn = " and vc.version in (?) "
			params = append(params, pg.In(extractedVersions))
		}
	}

	query := fmt.Sprintf(
		`select vc.* from version_comparison vc
		inner join published_version pv1 on vc.package_id=pv1.package_id and vc.version=pv1.version and vc.revision=pv1.revision
		inner join published_version pv2 on vc.previous_package_id=pv2.package_id and vc.previous_version=pv2.version and vc.previous_revision=pv2.revision
		inner join package_group pg1 on vc.package_id=pg1.id
		inner join package_group pg2 on vc.previous_package_id=pg2.id
		where pv1.deleted_at is null and pv2.deleted_at is null and pg1.deleted_at is null and pg2.deleted_at is null
		and (vc.metadata is null or not (vc.metadata \? 'migration_id') or vc.metadata->>'migration_id' is distinct from '%s') %s %s`,
		migrationId, wherePackageIn, whereVersionIn)

	if !isComparisonsOnly {
		//both versions should be migrated
		query += fmt.Sprintf(`
		and exists (select 1 from build b1 where b1.package_id = vc.package_id and b1.version = concat(vc.version,'@',vc.revision) and b1.metadata->>'migration_id' = '%s' and b1.metadata->>'build_type' = 'build' and  b1.status='%s')
		and exists (select 1 from build b2 where b2.package_id = vc.previous_package_id and b2.version = concat(vc.previous_version,'@',previous_revision) and b2.metadata->>'migration_id' = '%s' and b2.metadata->>'build_type' = 'build' and b2.status='%s')`,
			migrationId, view.StatusComplete, migrationId, view.StatusComplete)
	}

	if isRestart {
		//Allows avoiding re-creation of failed changelog builds during recovery
		query += fmt.Sprintf(`
		and not exists(
			select 1 from build b
			where b.package_id = vc.package_id
			  and b.version = concat(vc.version, '@', vc.revision)
			  and b.metadata->>'build_type' = 'changelog'
			  and b.metadata->>'migration_id' = '%s'
			  and b.metadata->>'previous_version' = concat(vc.previous_version, '@', vc.previous_revision)
			  and b.metadata->>'previous_version_package_id' = vc.previous_package_id
		)`, migrationId)
	}

	query += `
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
		)`

	return query, params
}
