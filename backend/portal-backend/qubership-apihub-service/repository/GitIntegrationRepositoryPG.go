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
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/go-pg/pg/v10"
)

func NewGitIntegrationRepositoryPG(cp db.ConnectionProvider) (GitIntegrationRepository, error) {
	return &gitIntegrationRepositoryImpl{cp: cp}, nil
}

type gitIntegrationRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (i gitIntegrationRepositoryImpl) SaveUserApiKey(apiKeyEntity entity.ApiKeyEntity) (*entity.ApiKeyEntity, error) {
	_, err := i.cp.GetConnection().Model(&apiKeyEntity).
		OnConflict("(\"user_id\", \"integration_type\") DO UPDATE").
		Insert()
	return &apiKeyEntity, err
}

func (i gitIntegrationRepositoryImpl) DeleteUserApiKey(integration view.GitIntegrationType, userId string) error {
	_, err := i.cp.GetConnection().Model(&entity.ApiKeyEntity{}).
		Where("integration_type = ?", integration).
		Where("user_id = ?", userId).
		Delete()
	return err
}

func (i gitIntegrationRepositoryImpl) GetUserApiKey(integration view.GitIntegrationType, userId string) (*entity.ApiKeyEntity, error) {
	result := new(entity.ApiKeyEntity)
	err := i.cp.GetConnection().Model(result).
		Where("user_id = ?", userId).
		Where("integration_type = ?", integration).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (i gitIntegrationRepositoryImpl) AddFailedRefreshAttempt(integration view.GitIntegrationType, userId string) error {
	result := new(entity.ApiKeyEntity)
	_, err := i.cp.GetConnection().Model(result).
		Where("user_id = ?", userId).
		Where("integration_type = ?", integration).
		Set("failed_refresh_attempts = failed_refresh_attempts + 1").
		Update()
	if err != nil {
		return err
	}
	return nil
}
