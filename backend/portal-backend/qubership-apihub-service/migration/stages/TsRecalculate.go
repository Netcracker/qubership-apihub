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

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	log "github.com/sirupsen/logrus"
)

func (d OpsMigration) StageTSRecalculate() error {
	log.Info("Start rebuilding text search tables for changed search scopes")

	log.Info("Calculating ts_rest_operation_data")
	calculateRestTextSearchDataQuery := fmt.Sprintf(`
	insert into ts_rest_operation_data
		select data_hash,
		to_tsvector(jsonb_extract_path_text(search_scope, ?)) scope_request,
		to_tsvector(jsonb_extract_path_text(search_scope, ?)) scope_response,
		to_tsvector(jsonb_extract_path_text(search_scope, ?)) scope_annotation,
		to_tsvector(jsonb_extract_path_text(search_scope, ?)) scope_properties,
		to_tsvector(jsonb_extract_path_text(search_scope, ?)) scope_examples
		from operation_data
		where data_hash in (
			select distinct o.data_hash
			from operation o
			inner join migration."expired_ts_operation_data_%s"  exp
			on exp.package_id = o.package_id
			and exp.version = o.version
			and exp.revision = o.revision
			where o.type = ?
		)
        order by 1
        for update skip locked
	on conflict (data_hash) do update
	set scope_request = EXCLUDED.scope_request,
	scope_response = EXCLUDED.scope_response,
	scope_annotation = EXCLUDED.scope_annotation,
	scope_properties = EXCLUDED.scope_properties,
	scope_examples = EXCLUDED.scope_examples;`, d.ent.Id)
	_, err := d.cp.GetConnection().ExecContext(d.migrationCtx, calculateRestTextSearchDataQuery,
		view.RestScopeRequest, view.RestScopeResponse, view.RestScopeAnnotation, view.RestScopeProperties, view.RestScopeExamples,
		view.RestApiType)
	if err != nil {
		return fmt.Errorf("failed to calculate ts_rest_operation_data: %w", err)
	}

	log.Info("Calculating ts_operation_data")
	calculateAllTextSearchDataQuery := fmt.Sprintf(`
	insert into ts_operation_data
		select data_hash,
		to_tsvector(jsonb_extract_path_text(search_scope, ?)) scope_all
		from operation_data
		where data_hash in (
			select distinct o.data_hash
			from operation o
			inner join migration."expired_ts_operation_data_%s"  exp
			on exp.package_id = o.package_id
			and exp.version = o.version
			and exp.revision = o.revision
		)
        order by 1
        for update skip locked
	on conflict (data_hash) do update
	set scope_all = EXCLUDED.scope_all`, d.ent.Id)
	_, err = d.cp.GetConnection().ExecContext(d.migrationCtx, calculateAllTextSearchDataQuery, view.ScopeAll)
	if err != nil {
		return fmt.Errorf("failed to calculate ts_operation_data: %w", err)
	}

	log.Info("Calculating fts_operation_data")
	calculateFullTextSearchOperationsQuery := fmt.Sprintf(`
	insert into fts_operation_data
		select data_hash,
		to_tsvector(convert_from(data,'UTF-8'))  data_vector
		from operation_data
		where data_hash in (
			select distinct o.data_hash
			from operation o
			inner join migration."expired_ts_operation_data_%s"  exp
			on exp.package_id = o.package_id
			and exp.version = o.version
			and exp.revision = o.revision
		)
        order by 1
        for update skip locked
	on conflict (data_hash) do update
	set data_vector = EXCLUDED.data_vector`, d.ent.Id)
	_, err = d.cp.GetConnection().ExecContext(d.migrationCtx, calculateFullTextSearchOperationsQuery)
	if err != nil {
		return fmt.Errorf("failed to calculate fts_operation_data: %w", err)
	}

	log.Info("Finished rebuilding text search tables for changed search scopes")

	return nil
}
