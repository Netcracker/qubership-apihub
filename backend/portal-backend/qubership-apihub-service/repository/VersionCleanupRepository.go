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
	"context"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/go-pg/pg/v10"
)

type VersionCleanupRepository interface {
	GetVersionCleanupRun(id string) (*entity.VersionCleanupEntity, error)
	StoreVersionCleanupRun(ctx context.Context, entity entity.VersionCleanupEntity) error
	UpdateVersionCleanupRun(ctx context.Context, runId string, status string, details string, deletedItems int, finishedAt *time.Time) error
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

func (v versionCleanupRepositoryImpl) StoreVersionCleanupRun(ctx context.Context, entity entity.VersionCleanupEntity) error {
	_, err := v.cp.GetConnection().ModelContext(ctx, &entity).Insert()
	return err
}

func (v versionCleanupRepositoryImpl) UpdateVersionCleanupRun(ctx context.Context, runId string, status string, details string, deletedItems int, finishedAt *time.Time) error {
	query := v.cp.GetConnection().ModelContext(ctx, &entity.VersionCleanupEntity{}).
		Set("deleted_items=?", deletedItems)
	
	if status != "" {
		query = query.Set("status=?", status)
	}
	
	if details != "" {
		query = query.Set("details=?", details)
	}

	if finishedAt != nil {
		query = query.Set("finished_at=?", finishedAt)
	}

	_, err := query.Where("run_id = ?", runId).Update()
	return err
}
