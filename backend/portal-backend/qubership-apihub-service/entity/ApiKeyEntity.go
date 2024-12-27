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

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type ApiKeyEntity struct {
	tableName struct{} `pg:"user_integration"`

	Integration           view.GitIntegrationType `pg:"integration_type, pk, type:varchar"`
	UserId                string                  `pg:"user_id, pk, type:varchar"`
	AccessToken           string                  `pg:"key, type:varchar"`
	RefreshToken          string                  `pg:"refresh_token, type:varchar"`
	FailedRefreshAttempts int                     `pg:"failed_refresh_attempts, type:integer, use_zero"`
	ExpiresAt             time.Time               `pg:"expires_at, type:timestamp without time zone"`
	RedirectUri           string                  `pg:"redirect_uri, type:varchar"`
	IsRevoked             bool                    `pg:"is_revoked, type:boolean, use_zero"`
}
