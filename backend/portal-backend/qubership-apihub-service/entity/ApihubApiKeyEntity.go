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

type ApihubApiKeyEntity struct {
	tableName struct{} `pg:"apihub_api_keys"`

	Id         string     `pg:"id, pk, type:varchar" json:"id"`
	PackageId  string     `pg:"package_id, type:varchar" json:"packageId"`
	Name       string     `pg:"name, type:varchar" json:"name"`
	CreatedBy  string     `pg:"created_by, type:varchar" json:"createdBy"`
	CreatedFor string     `pg:"created_for, type:varchar" json:"createdFor"`
	CreatedAt  time.Time  `pg:"created_at, type:timestamp without time zone" json:"createdAt"`
	DeletedBy  string     `pg:"deleted_by, type:varchar" json:"deletedBy"`
	DeletedAt  *time.Time `pg:"deleted_at, type:timestamp without time zone" json:"deletedAt"`
	ApiKey     string     `pg:"api_key, type:varchar" json:"apiKey"` // hash
	Roles      []string   `pg:"roles, type:varchar array, array" json:"roles"`
}

type ApihubApiKeyUserEntity struct {
	tableName struct{} `pg:"apihub_api_keys, alias:apihub_api_keys"`

	ApihubApiKeyEntity
	UserName                string `pg:"user_name, type:varchar"`
	UserEmail               string `pg:"user_email, type:varchar"`
	UserAvatarUrl           string `pg:"user_avatar_url, type:varchar"`
	CreatedForUserName      string `pg:"created_for_user_name, type:varchar"`
	CreatedForUserEmail     string `pg:"created_for_user_email, type:varchar"`
	CreatedForUserAvatarUrl string `pg:"created_for_user_avatar_url, type:varchar"`
}

func MakeApihubApiKeyView(entity ApihubApiKeyUserEntity) *view.ApihubApiKey {
	return &view.ApihubApiKey{
		Id:        entity.Id,
		PackageId: entity.PackageId,
		Name:      entity.Name,
		CreatedBy: view.User{
			Id:        entity.CreatedBy,
			Name:      entity.UserName,
			Email:     entity.UserEmail,
			AvatarUrl: entity.UserAvatarUrl,
		},
		CreatedFor: &view.User{
			Id:        entity.CreatedFor,
			Name:      entity.CreatedForUserName,
			Email:     entity.CreatedForUserEmail,
			AvatarUrl: entity.CreatedForUserAvatarUrl,
		},
		CreatedAt: entity.CreatedAt,
		DeletedBy: entity.DeletedBy,
		DeletedAt: entity.DeletedAt,
		Roles:     entity.Roles,
	}
}

func MakeApihubApiKeyEntity(apihubApiKeyView view.ApihubApiKey, apiKey string) *ApihubApiKeyEntity {
	createdForId := ""
	if apihubApiKeyView.CreatedFor != nil {
		createdForId = apihubApiKeyView.CreatedFor.Id
	}
	return &ApihubApiKeyEntity{
		Id:         apihubApiKeyView.Id,
		PackageId:  apihubApiKeyView.PackageId,
		Name:       apihubApiKeyView.Name,
		CreatedBy:  apihubApiKeyView.CreatedBy.Id,
		CreatedFor: createdForId,
		CreatedAt:  apihubApiKeyView.CreatedAt,
		DeletedBy:  apihubApiKeyView.DeletedBy,
		DeletedAt:  apihubApiKeyView.DeletedAt,
		ApiKey:     apiKey,
		Roles:      apihubApiKeyView.Roles,
	}
}
