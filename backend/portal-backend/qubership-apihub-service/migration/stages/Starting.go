package stages

import (
	"fmt"
	"strings"

	"github.com/go-pg/pg/v10"
)

func (d OpsMigration) StageStarting() error {
	err := d.createTempTables()
	if err != nil {
		return fmt.Errorf("ops migration %s: failed to create temp tables: %w", d.ent.Id, err)
	}

	return nil
}

func (d OpsMigration) createTempTables() error {
	// create temporary tables required for suspicious builds analysis
	_, err := d.cp.GetConnection().ExecContext(d.migrationCtx, `create schema if not exists migration;`)
	if err != nil {
		return err
	}

	isPartialMigration := len(d.ent.PackageIds) > 0 || len(d.ent.Versions) > 0

	if isPartialMigration {
		whereClauses := ""
		params := make([]interface{}, 0)

		if len(d.ent.PackageIds) > 0 {
			whereClauses += " where package_id in (?)"
			params = append(params, pg.In(d.ent.PackageIds))
		}

		if len(d.ent.Versions) > 0 {
			extractedVersions := extractVersions(d.ent.Versions)
			if len(extractedVersions) > 0 {
				if len(params) == 0 {
					whereClauses += " where version in (?)"
				} else {
					whereClauses += " and version in (?)"
				}
				params = append(params, pg.In(extractedVersions))
			}
		}

		vcQuery := fmt.Sprintf(
			`create table migration."version_comparison_%s" as select * from version_comparison%s;`,
			d.ent.Id, whereClauses)
		_, err = d.cp.GetConnection().ExecContext(d.migrationCtx, vcQuery, params...)
	} else {
		_, err = d.cp.GetConnection().ExecContext(d.migrationCtx,
			fmt.Sprintf(`create table migration."version_comparison_%s" as select * from version_comparison;`, d.ent.Id))
	}
	if err != nil {
		return err
	}

	_, err = d.cp.GetConnection().ExecContext(d.migrationCtx, fmt.Sprintf(`create index "ix_ver_comp_%s"
on migration."version_comparison_%s"(package_id,version,revision,previous_package_id,previous_version,previous_revision);`, d.ent.Id, d.ent.Id))
	if err != nil {
		return err
	}
	_, err = d.cp.GetConnection().ExecContext(d.migrationCtx, fmt.Sprintf(`create index "ix_compid_%s" on migration."version_comparison_%s"(comparison_id)`, d.ent.Id, d.ent.Id))
	if err != nil {
		return err
	}

	if isPartialMigration {
		ocQuery := fmt.Sprintf(
			`create table migration."operation_comparison_%s" as select oc.* from operation_comparison oc where oc.comparison_id in (select comparison_id from migration."version_comparison_%s");`,
			d.ent.Id, d.ent.Id)
		_, err = d.cp.GetConnection().ExecContext(d.migrationCtx, ocQuery)
	} else {
		_, err = d.cp.GetConnection().ExecContext(d.migrationCtx,
			fmt.Sprintf(`create table migration."operation_comparison_%s" as select * from operation_comparison;`, d.ent.Id))
	}
	if err != nil {
		return err
	}

	_, err = d.cp.GetConnection().ExecContext(d.migrationCtx, fmt.Sprintf(`create index "operation_comparison_%s_comparison_id_index" on migration."operation_comparison_%s" (comparison_id);`, d.ent.Id, d.ent.Id))
	if err != nil {
		return err
	}

	_, err = d.cp.GetConnection().ExecContext(d.migrationCtx, fmt.Sprintf(`create table migration."expired_ts_operation_data_%s" (package_id varchar, version varchar, revision integer);`, d.ent.Id))
	if err != nil {
		return err
	}
	return nil
}

func extractVersions(versionsIn []string) []string {
	extractedVersions := make([]string, 0, len(versionsIn))
	for _, ver := range versionsIn {
		verSplit := strings.Split(ver, "@")
		if len(verSplit) > 0 && verSplit[0] != "" {
			extractedVersions = append(extractedVersions, verSplit[0])
		}
	}
	return extractedVersions
}
