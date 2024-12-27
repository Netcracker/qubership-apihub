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

package entity

import "time"

type BuildCleanupEntity struct {
	tableName struct{} `pg:"build_cleanup_run"`

	RunId       int       `pg:"run_id, pk, type:integer"`
	DeletedRows int       `pg:"deleted_rows, type:integer"`
	ScheduledAt time.Time `pg:"scheduled_at, type:timestamp without time zone"`

	BuildResult         int `pg:"build_result, type:integer"`
	BuildSrc            int `pg:"build_src, type:integer"`
	OperationData       int `pg:"operation_data, type:integer"`
	TsOperationData     int `pg:"ts_operation_data, type:integer"`
	TsRestOperationData int `pg:"ts_rest_operation_data, type:integer"`
	TsGQLOperationData  int `pg:"ts_gql_operation_data, type:integer"`
}

type BuildIdEntity struct {
	tableName struct{} `pg:"build"`

	Id string `pg:"build_id, type:varchar"`
}
