package repository

import (
	"context"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
)

type VersionCleanupRepository interface {
	StoreVersionCleanupRun(ctx context.Context, entity entity.VersionCleanupEntity) error
	UpdateVersionCleanupRun(ctx context.Context, runId string, status string, details string, deletedItems int, finishedAt *time.Time) error
}

func NewVersionCleanupRepository(cp db.ConnectionProvider) VersionCleanupRepository {
	return &versionCleanupRepositoryImpl{cp: cp}
}

type versionCleanupRepositoryImpl struct {
	cp db.ConnectionProvider
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
