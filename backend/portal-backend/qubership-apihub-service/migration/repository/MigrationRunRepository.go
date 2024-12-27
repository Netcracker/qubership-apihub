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
	mEntity "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/view"
	"github.com/go-pg/pg/v10"
)

type MigrationRunRepository interface {
	GetMigrationRun(migrationId string) (*mEntity.MigrationRunEntity, error)
	UpdateMigrationRun(entity *mEntity.MigrationRunEntity) error
	GetRunningMigrations() ([]*mEntity.MigrationRunEntity, error)
}

func NewMigrationRunRepository(cp db.ConnectionProvider) MigrationRunRepository {
	return &migrationRunRepositoryImpl{cp: cp}
}

type migrationRunRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (m migrationRunRepositoryImpl) GetMigrationRun(migrationId string) (*mEntity.MigrationRunEntity, error) {
	mRunEnt := new(mEntity.MigrationRunEntity)
	err := m.cp.GetConnection().Model(mRunEnt).
		Where("id = ?", migrationId).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return mRunEnt, nil
}

func (m migrationRunRepositoryImpl) UpdateMigrationRun(ent *mEntity.MigrationRunEntity) error {
	ent.UpdatedAt = time.Now()
	_, err := m.cp.GetConnection().Model(ent).Where("id = ?", ent.Id).Update()
	return err
}

func (m migrationRunRepositoryImpl) GetRunningMigrations() ([]*mEntity.MigrationRunEntity, error) {
	ents := make([]*mEntity.MigrationRunEntity, 0)
	err := m.cp.GetConnection().Model(&ents).
		Where("status = ?", view.MigrationStatusRunning).
		Where("started_at > ?", time.Now().Add(-7*24*time.Hour)).
		Select()
	if err != nil {
		if err != pg.ErrNoRows {
			return nil, err
		}
	}
	return ents, nil
}
