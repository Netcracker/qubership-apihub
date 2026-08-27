package repository

import (
	"context"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	mEntity "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/view"
	"github.com/go-pg/pg/v10"
)

type MigrationRunRepository interface {
	GetMigrationRun(ctx context.Context, migrationId string) (*mEntity.MigrationRunEntity, error)
	GetRunningMigrations(ctx context.Context) ([]*mEntity.MigrationRunEntity, error)
	GetRunningFullMigrations(ctx context.Context) ([]*mEntity.MigrationRunEntity, error)
}

func NewMigrationRunRepository(cp db.ConnectionProvider) MigrationRunRepository {
	return &migrationRunRepositoryImpl{cp: cp}
}

type migrationRunRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (m migrationRunRepositoryImpl) GetMigrationRun(ctx context.Context, migrationId string) (*mEntity.MigrationRunEntity, error) {
	mRunEnt := new(mEntity.MigrationRunEntity)
	err := m.cp.GetConnection().WithContext(ctx).Model(mRunEnt).
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

func (m migrationRunRepositoryImpl) GetRunningMigrations(ctx context.Context) ([]*mEntity.MigrationRunEntity, error) {
	ents := make([]*mEntity.MigrationRunEntity, 0)
	err := m.cp.GetConnection().WithContext(ctx).Model(&ents).
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

func (m migrationRunRepositoryImpl) GetRunningFullMigrations(ctx context.Context) ([]*mEntity.MigrationRunEntity, error) {
	ents := make([]*mEntity.MigrationRunEntity, 0)
	err := m.cp.GetConnection().WithContext(ctx).Model(&ents).
		Where("status = ?", view.MigrationStatusRunning).
		Where("started_at > ?", time.Now().Add(-7*24*time.Hour)).
		Where("(package_ids IS NULL OR package_ids = '{}')").
		Where("(versions IS NULL OR versions = '{}')").
		Select()
	if err != nil {
		if err != pg.ErrNoRows {
			return nil, err
		}
	}
	return ents, nil
}
