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

import (
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"time"
)

type ExportResultEntity struct {
	tableName struct{} `pg:"export_result"`

	ExportId  string           `pg:"export_id, pk, type:varchar"`
	Config    view.BuildConfig `pg:"config, type:json"`
	CreatedAt time.Time        `pg:"created_at, type:timestamp without time zone"`
	CreatedBy string           `pg:"created_by, type:varchar"`
	Filename  string           `pg:"filename, type:varchar"`
	Data      []byte           `pg:"data, type:bytea"`
}
