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

type PersonaAccessTokenEntity struct {
	tableName struct{} `pg:"personal_access_tokens, alias:personal_access_tokens"`

	Id        string    `pg:"id, pk, type:varchar"`
	UserId    string    `pg:"user_id, type:varchar"`
	TokenHash string    `pg:"token_hash, type:varchar"`
	Name      string    `pg:"name, type:varchar"`
	CreatedAt time.Time `pg:"created_at, type:timestamp without time zone"`
	ExpiresAt time.Time `pg:"expires_at, type:timestamp without time zone"`
	DeletedAt time.Time `pg:"deleted_at, type:timestamp without time zone"`
}

func MakePersonaAccessTokenView(ent PersonaAccessTokenEntity) view.PersonalAccessTokenItem {
	var expiresAt *time.Time
	if !ent.ExpiresAt.IsZero() {
		expiresAt = &ent.ExpiresAt
	}

	return view.PersonalAccessTokenItem{
		Id:        ent.Id,
		Name:      ent.Name,
		ExpiresAt: expiresAt,
		CreatedAt: ent.CreatedAt,
		Status:    makeStatus(ent),
	}
}

func makeStatus(ent PersonaAccessTokenEntity) view.PersonaAccessTokenStatus {
	if !ent.ExpiresAt.IsZero() && time.Now().After(ent.ExpiresAt) {
		return view.PersonaAccessTokenExpired
	}

	return view.PersonaAccessTokenActive
}
