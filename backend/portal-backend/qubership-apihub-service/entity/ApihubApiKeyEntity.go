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

type ApihubApiKeyEntity_deprecated struct {
	tableName struct{} `pg:"apihub_api_keys"`

	Id        string     `pg:"id, pk, type:varchar"`
	PackageId string     `pg:"package_id, type:varchar"`
	Name      string     `pg:"name, type:varchar"`
	CreatedBy string     `pg:"created_by, type:varchar"`
	CreatedAt time.Time  `pg:"created_at, type:timestamp without time zone"`
	DeletedBy string     `pg:"deleted_by, type:varchar"`
	DeletedAt *time.Time `pg:"deleted_at, type:timestamp without time zone"`
	ApiKey    string     `pg:"api_key, type:varchar"` // hash
	Roles     []string   `pg:"roles, type:varchar array, array"`
}
type ApihubApiKeyEntity struct {
	tableName struct{} `pg:"apihub_api_keys"`

	Id         string     `pg:"id, pk, type:varchar"`
	PackageId  string     `pg:"package_id, type:varchar"`
	Name       string     `pg:"name, type:varchar"`
	CreatedBy  string     `pg:"created_by, type:varchar"`
	CreatedFor string     `pg:"created_for, type:varchar"`
	CreatedAt  time.Time  `pg:"created_at, type:timestamp without time zone"`
	DeletedBy  string     `pg:"deleted_by, type:varchar"`
	DeletedAt  *time.Time `pg:"deleted_at, type:timestamp without time zone"`
	ApiKey     string     `pg:"api_key, type:varchar"` // hash
	Roles      []string   `pg:"roles, type:varchar array, array"`
}

type ApihubApiKeyUserEntity_deprecated struct {
	tableName struct{} `pg:"apihub_api_keys, alias:apihub_api_keys"`

	ApihubApiKeyEntity_deprecated
	UserName      string `pg:"user_name, type:varchar"`
	UserEmail     string `pg:"user_email, type:varchar"`
	UserAvatarUrl string `pg:"user_avatar_url, type:varchar"`
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

func MakeApihubApiKeyView_deprecated(entity ApihubApiKeyEntity_deprecated) *view.ApihubApiKey_deprecated {
	return &view.ApihubApiKey_deprecated{
		Id:        entity.Id,
		PackageId: entity.PackageId,
		Name:      entity.Name,
		CreatedBy: entity.CreatedBy,
		CreatedAt: entity.CreatedAt,
		DeletedBy: entity.DeletedBy,
		DeletedAt: entity.DeletedAt,
		Roles:     entity.Roles,
	}
}

func MakeApihubApiKeyView_v3_deprecated(entity ApihubApiKeyUserEntity_deprecated) *view.ApihubApiKey_v3_deprecated {
	return &view.ApihubApiKey_v3_deprecated{
		Id:        entity.Id,
		PackageId: entity.PackageId,
		Name:      entity.Name,
		CreatedBy: view.User{
			Id:        entity.CreatedBy,
			Name:      entity.UserName,
			Email:     entity.UserEmail,
			AvatarUrl: entity.UserAvatarUrl,
		},
		CreatedAt: entity.CreatedAt,
		DeletedBy: entity.DeletedBy,
		DeletedAt: entity.DeletedAt,
		Roles:     entity.Roles,
	}
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

func MakeApihubApiKeyEntity_deprecated(apihubApiKeyView view.ApihubApiKey_deprecated, apiKey string) *ApihubApiKeyEntity_deprecated {
	return &ApihubApiKeyEntity_deprecated{
		Id:        apihubApiKeyView.Id,
		PackageId: apihubApiKeyView.PackageId,
		Name:      apihubApiKeyView.Name,
		CreatedBy: apihubApiKeyView.CreatedBy,
		CreatedAt: apihubApiKeyView.CreatedAt,
		DeletedBy: apihubApiKeyView.DeletedBy,
		DeletedAt: apihubApiKeyView.DeletedAt,
		ApiKey:    apiKey,
		Roles:     apihubApiKeyView.Roles,
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
