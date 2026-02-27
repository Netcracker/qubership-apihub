package stages

import (
	"fmt"
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
	_, err = d.cp.GetConnection().ExecContext(d.migrationCtx, fmt.Sprintf(`create table migration."version_comparison_%s" as select * from version_comparison;`, d.ent.Id))
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

	_, err = d.cp.GetConnection().ExecContext(d.migrationCtx, fmt.Sprintf(`create table migration."operation_comparison_%s" as select * from operation_comparison;`, d.ent.Id))
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
	_, err = d.cp.GetConnection().ExecContext(d.migrationCtx,
		fmt.Sprintf(`create table migration."fts_operation_search_text_tmp_%s" (
			package_id varchar, version varchar, revision integer,
			operation_id varchar, api_type varchar, status varchar,
			search_data_hash varchar, search_text_data bytea, title varchar,
			PRIMARY KEY (package_id, version, revision, operation_id));`, d.ent.Id))
	if err != nil {
		return err
	}
	return nil
}
