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

package repository

import (
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/go-pg/pg/v10"
)

func NewApihubApiKeyRepositoryPG(cp db.ConnectionProvider) (ApihubApiKeyRepository, error) {
	return &apihubApiKeyRepositoryImpl{cp: cp}, nil
}

type apihubApiKeyRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (r apihubApiKeyRepositoryImpl) SaveApiKey_deprecated(apihubApiKeyEntity *entity.ApihubApiKeyEntity_deprecated) error {
	_, err := r.cp.GetConnection().Model(apihubApiKeyEntity).Insert()
	return err
}

func (r apihubApiKeyRepositoryImpl) SaveApiKey(apihubApiKeyEntity *entity.ApihubApiKeyEntity) error {
	_, err := r.cp.GetConnection().Model(apihubApiKeyEntity).Insert()
	return err
}

func (r apihubApiKeyRepositoryImpl) RevokeApiKey(id string, userId string) error {
	timeNow := time.Now()
	_, err := r.cp.GetConnection().Model(&entity.ApihubApiKeyEntity{DeletedBy: userId, DeletedAt: &timeNow}).
		Where("id = ?", id).
		Set("deleted_by = ?deleted_by").
		Set("deleted_at = ?deleted_at").
		Update()
	return err
}

func (r apihubApiKeyRepositoryImpl) GetPackageApiKeys_deprecated(packageId string) ([]entity.ApihubApiKeyEntity_deprecated, error) {
	var result []entity.ApihubApiKeyEntity_deprecated
	err := r.cp.GetConnection().Model(&result).
		Where("package_id = ?", packageId).
		Select()
	if err != nil {
		if err != pg.ErrNoRows {
			return nil, err
		}
	}
	return result, nil
}

func (r apihubApiKeyRepositoryImpl) GetPackageApiKeys_v3_deprecated(packageId string) ([]entity.ApihubApiKeyUserEntity_deprecated, error) {
	var result []entity.ApihubApiKeyUserEntity_deprecated
	err := r.cp.GetConnection().Model(&result).
		ColumnExpr("apihub_api_keys.*").
		ColumnExpr("coalesce(u.name, '') as user_name").
		ColumnExpr("coalesce(u.email, '') as user_email").
		ColumnExpr("coalesce(u.avatar_url, '') as user_avatar_url").
		Join("left join user_data u").
		JoinOn("u.user_id = apihub_api_keys.created_by").
		Where("apihub_api_keys.package_id = ?", packageId).
		Select()
	if err != nil {
		if err != pg.ErrNoRows {
			return nil, err
		}
	}
	return result, nil
}

func (r apihubApiKeyRepositoryImpl) GetPackageApiKeys(packageId string) ([]entity.ApihubApiKeyUserEntity, error) {
	var result []entity.ApihubApiKeyUserEntity
	err := r.cp.GetConnection().Model(&result).
		ColumnExpr("apihub_api_keys.*").
		ColumnExpr("coalesce(u.name, '') as user_name").
		ColumnExpr("coalesce(u.email, '') as user_email").
		ColumnExpr("coalesce(u.avatar_url, '') as user_avatar_url").
		Join("left join user_data u").
		JoinOn("u.user_id = apihub_api_keys.created_by").
		ColumnExpr("coalesce(cfu.name, '') as created_for_user_name").
		ColumnExpr("coalesce(cfu.email, '') as created_for_user_email").
		ColumnExpr("coalesce(cfu.avatar_url, '') as created_for_user_avatar_url").
		Join("left join user_data cfu").
		JoinOn("cfu.user_id = apihub_api_keys.created_for").
		Where("apihub_api_keys.package_id = ?", packageId).
		Select()
	if err != nil {
		if err != pg.ErrNoRows {
			return nil, err
		}
	}
	return result, nil
}

func (r apihubApiKeyRepositoryImpl) GetApiKeyByHash(apiKeyHash string) (*entity.ApihubApiKeyEntity, error) {
	ent := new(entity.ApihubApiKeyEntity)
	err := r.cp.GetConnection().Model(ent).
		Where("api_key = ?", apiKeyHash).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return ent, nil
}

func (r apihubApiKeyRepositoryImpl) GetPackageApiKey_deprecated(apiKeyId string, packageId string) (*entity.ApihubApiKeyUserEntity_deprecated, error) {
	ent := new(entity.ApihubApiKeyUserEntity_deprecated)
	err := r.cp.GetConnection().Model(ent).
		ColumnExpr("apihub_api_keys.*").
		ColumnExpr("coalesce(u.name, '') as user_name").
		ColumnExpr("coalesce(u.email, '') as user_email").
		ColumnExpr("coalesce(u.avatar_url, '') as user_avatar_url").
		Join("left join user_data u").
		JoinOn("u.user_id = apihub_api_keys.created_by").
		Where("apihub_api_keys.id = ?", apiKeyId).
		Where("apihub_api_keys.package_id = ?", packageId).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return ent, nil
}

func (r apihubApiKeyRepositoryImpl) GetPackageApiKey(apiKeyId string, packageId string) (*entity.ApihubApiKeyUserEntity, error) {
	ent := new(entity.ApihubApiKeyUserEntity)
	err := r.cp.GetConnection().Model(ent).
		ColumnExpr("apihub_api_keys.*").
		ColumnExpr("coalesce(u.name, '') as user_name").
		ColumnExpr("coalesce(u.email, '') as user_email").
		ColumnExpr("coalesce(u.avatar_url, '') as user_avatar_url").
		Join("left join user_data u").
		JoinOn("u.user_id = apihub_api_keys.created_by").
		ColumnExpr("coalesce(cfu.name, '') as created_for_user_name").
		ColumnExpr("coalesce(cfu.email, '') as created_for_user_email").
		ColumnExpr("coalesce(cfu.avatar_url, '') as created_for_user_avatar_url").
		Join("left join user_data cfu").
		JoinOn("cfu.user_id = apihub_api_keys.created_for").
		Where("apihub_api_keys.id = ?", apiKeyId).
		Where("apihub_api_keys.package_id = ?", packageId).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return ent, nil
}

func (r apihubApiKeyRepositoryImpl) GetApiKey(apiKeyId string) (*entity.ApihubApiKeyEntity, error) {
	ent := new(entity.ApihubApiKeyEntity)
	err := r.cp.GetConnection().Model(ent).
		Where("id = ?", apiKeyId).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return ent, nil
}
