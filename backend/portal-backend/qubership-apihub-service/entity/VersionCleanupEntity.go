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

type VersionCleanupEntity struct {
	tableName struct{} `pg:"versions_cleanup_run"`

	RunId        string    `pg:"run_id, pk, type:uuid"`
	StartedAt    time.Time `pg:"started_at, type:timestamp without time zone"`
	Status       string    `pg:"status, type:varchar"`
	Details      string    `pg:"details, type:varchar"`
	PackageId    string    `pg:"package_id, type:varchar"`
	DeleteBefore time.Time `pg:"delete_before, type:timestamp without time zone"`
	DeletedItems int       `pg:"deleted_items, type:integer"`
}
