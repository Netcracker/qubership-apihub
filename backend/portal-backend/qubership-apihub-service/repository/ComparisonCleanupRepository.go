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
	"fmt"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service/cleanup/logger"
)

type ComparisonCleanupRepository interface {
	StoreComparisonCleanupRun(ctx context.Context, entity entity.ComparisonCleanupEntity) error
	UpdateComparisonCleanupRun(ctx context.Context, runId string, status string, details string, deletedItems int, finishedAt *time.Time) error
	VacuumComparisonTables(ctx context.Context) error
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

func (c comparisonCleanupRepositoryImpl) UpdateComparisonCleanupRun(ctx context.Context, runId string, status string, details string, deletedItems int, finishedAt *time.Time) error {
	query := c.cp.GetConnection().ModelContext(ctx, &entity.ComparisonCleanupEntity{}).
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

func (c comparisonCleanupRepositoryImpl) VacuumComparisonTables(ctx context.Context) error {
	var vacuumErrors []string

	_, err := c.cp.GetConnection().ExecContext(ctx, "VACUUM FULL version_comparison")
	if err != nil {
		errorMsg := fmt.Sprintf("Failed to vacuum 'version_comparison' table: %v", err)
		logger.Warn(ctx, errorMsg)
		vacuumErrors = append(vacuumErrors, errorMsg)
	}

	_, err = c.cp.GetConnection().ExecContext(ctx, "VACUUM FULL operation_comparison")
	if err != nil {
		errorMsg := fmt.Sprintf("Failed to vacuum 'operation_comparison' table: %v", err)
		logger.Warn(ctx, errorMsg)
		vacuumErrors = append(vacuumErrors, errorMsg)
	}

	if len(vacuumErrors) > 0 {
		return fmt.Errorf("vacuum operations failed: %s", strings.Join(vacuumErrors, "; "))
	}

	return nil
}
