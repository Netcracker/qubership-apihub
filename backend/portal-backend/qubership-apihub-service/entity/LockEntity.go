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
	"time"
)

type LockEntity struct {
	tableName struct{} `pg:"locks"`

	Name       string    `pg:"name, pk, type:varchar"`
	InstanceId string    `pg:"instance_id, type:varchar, notnull"`
	AcquiredAt time.Time `pg:"acquired_at, type:timestamp without time zone, notnull"`
	ExpiresAt  time.Time `pg:"expires_at, type:timestamp without time zone, notnull"`
	Version    int64     `pg:"version, type:bigint, notnull, default:1"`
}
