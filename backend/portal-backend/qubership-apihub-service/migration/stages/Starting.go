// Copyright 2024-2025 NetCracker Technology Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
	return nil
}
