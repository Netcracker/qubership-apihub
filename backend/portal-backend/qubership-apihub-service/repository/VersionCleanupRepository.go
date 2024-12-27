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
	"github.com/go-pg/pg/v10"
)

type VersionCleanupRepository interface {
	GetVersionCleanupRun(id string) (*entity.VersionCleanupEntity, error)
	StoreVersionCleanupRun(entity entity.VersionCleanupEntity) error
	UpdateVersionCleanupRun(runId string, status string, details string, deletedItems int) error
}

func NewVersionCleanupRepository(cp db.ConnectionProvider) VersionCleanupRepository {
	return &versionCleanupRepositoryImpl{cp: cp}
}

type versionCleanupRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (v versionCleanupRepositoryImpl) GetVersionCleanupRun(id string) (*entity.VersionCleanupEntity, error) {
	var ent *entity.VersionCleanupEntity
	err := v.cp.GetConnection().Model(ent).Where("run_id = ?", id).First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return ent, nil
}

func (v versionCleanupRepositoryImpl) StoreVersionCleanupRun(entity entity.VersionCleanupEntity) error {
	_, err := v.cp.GetConnection().Model(&entity).Insert()
	return err
}

func (v versionCleanupRepositoryImpl) UpdateVersionCleanupRun(runId string, status string, details string, deletedItems int) error {
	_, err := v.cp.GetConnection().Model(&entity.VersionCleanupEntity{}).
		Set("status=?", status).
		Set("details=?", details).
		Set("deleted_items=?", deletedItems).
		Where("run_id = ?", runId).Update()
	return err
}
