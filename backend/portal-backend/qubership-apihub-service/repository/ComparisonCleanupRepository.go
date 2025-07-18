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

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
)

type ComparisonCleanupRepository interface {
	StoreComparisonCleanupRun(ctx context.Context, entity entity.ComparisonCleanupEntity) error
	UpdateComparisonCleanupRun(ctx context.Context, runId string, status string, details string, deletedItems int) error
}

func NewComparisonCleanupRepository(cp db.ConnectionProvider) ComparisonCleanupRepository {
	return &comparisonCleanupRepositoryImpl{cp: cp}
}

type comparisonCleanupRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (c comparisonCleanupRepositoryImpl) StoreComparisonCleanupRun(ctx context.Context, entity entity.ComparisonCleanupEntity) error {
	_, err := c.cp.GetConnection().ModelContext(ctx, &entity).Insert()
	return err
}

func (c comparisonCleanupRepositoryImpl) UpdateComparisonCleanupRun(ctx context.Context, runId string, status string, details string, deletedItems int) error {
	_, err := c.cp.GetConnection().ModelContext(ctx, &entity.ComparisonCleanupEntity{}).
		Set("status=?", status).
		Set("details=?", details).
		Set("deleted_items=?", deletedItems).
		Where("run_id = ?", runId).Update()
	return err
}
