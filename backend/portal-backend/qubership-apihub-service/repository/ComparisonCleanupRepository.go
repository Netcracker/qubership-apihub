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

	_, err = c.cp.GetConnection().ExecContext(ctx, "VACUUM FULL comparison_internal_document")
	if err != nil {
		errorMsg := fmt.Sprintf("Failed to vacuum 'comparison_internal_document' table: %v", err)
		logger.Warn(ctx, errorMsg)
		vacuumErrors = append(vacuumErrors, errorMsg)
	}

	if len(vacuumErrors) > 0 {
		return fmt.Errorf("vacuum operations failed: %s", strings.Join(vacuumErrors, "; "))
	}

	return nil
}
