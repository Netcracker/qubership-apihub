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

type SchemaMigrationEntity struct {
	tableName struct{} `pg:"stored_schema_migration, alias:stored_schema_migration"`

	Num      int    `pg:"num, pk, type:integer"`
	UpHash   string `pg:"up_hash, type:varchar"`
	SqlUp    string `pg:"sql_up, type:varchar"`
	DownHash string `pg:"down_hash, type:varchar"`
	SqlDown  string `pg:"sql_down, type:varchar"`
}

type MigrationEntity struct {
	tableName struct{} `pg:"schema_migrations"`

	Version int  `pg:"version, pk, type:bigint"`
	Dirty   bool `pg:"dirty, type:boolean, use_zero"`
}
