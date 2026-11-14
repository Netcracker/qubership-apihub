package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/db"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/entity"
	"github.com/go-pg/pg/v10"
)

type RegistryRepository interface {
	// Sync makes the registry and repository tables match the service configuration: it upserts what the
	// config names, revives a registry that came back, and soft-deletes the ones it no longer names.
	Sync(ctx context.Context, registries []entity.RegistryEntity, repositories []entity.RepositoryEntity) error
	ListRegistries(ctx context.Context) ([]entity.RegistryEntity, error)
	ListRepositories(ctx context.Context, registryId string) ([]entity.RepositoryEntity, error)
	GetRepository(ctx context.Context, repository string) (*entity.RepositoryEntity, error)
}

func NewRegistryRepository(cp db.ConnectionProvider) RegistryRepository {
	return registryRepositoryImpl{cp: cp}
}

type registryRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (r registryRepositoryImpl) Sync(ctx context.Context, registries []entity.RegistryEntity, repositories []entity.RepositoryEntity) error {
	return r.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		configuredRegistryIds := make([]string, 0, len(registries))
		for i := range registries {
			configuredRegistryIds = append(configuredRegistryIds, registries[i].Id)
			_, err := tx.ModelContext(ctx, &registries[i]).
				OnConflict("(id) DO UPDATE").
				Set("type = EXCLUDED.type").
				Set("base_url = EXCLUDED.base_url").
				Set("name = EXCLUDED.name").
				Set("deleted_at = null").
				Set("deleted_by = null").
				Insert()
			if err != nil {
				return fmt.Errorf("failed to upsert registry %s: %w", registries[i].Id, err)
			}
		}

		softDelete := tx.ModelContext(ctx, (*entity.RegistryEntity)(nil)).
			Set("deleted_at = ?", time.Now()).
			Set("deleted_by = ?", systemUser).
			Where("deleted_at is null")
		if len(configuredRegistryIds) > 0 {
			softDelete = softDelete.Where("id not in (?)", pg.In(configuredRegistryIds))
		}
		if _, err := softDelete.Update(); err != nil {
			return fmt.Errorf("failed to retire registries that are no longer configured: %w", err)
		}

		for i := range repositories {
			_, err := tx.ModelContext(ctx, &repositories[i]).
				OnConflict("(repository) DO UPDATE").
				Set("registry_id = EXCLUDED.registry_id").
				Insert()
			if err != nil {
				return fmt.Errorf("failed to upsert repository %s: %w", repositories[i].Repository, err)
			}
		}
		return nil
	})
}

func (r registryRepositoryImpl) ListRegistries(ctx context.Context) ([]entity.RegistryEntity, error) {
	result := make([]entity.RegistryEntity, 0)
	err := r.cp.GetConnection().ModelContext(ctx, &result).
		Where("deleted_at is null").
		Order("id").
		Select()
	if err != nil && err != pg.ErrNoRows {
		return nil, err
	}
	return result, nil
}

func (r registryRepositoryImpl) ListRepositories(ctx context.Context, registryId string) ([]entity.RepositoryEntity, error) {
	result := make([]entity.RepositoryEntity, 0)
	query := r.cp.GetConnection().ModelContext(ctx, &result).
		Join("inner join registry as reg on reg.id = repository.registry_id").
		Where("reg.deleted_at is null")
	if registryId != "" {
		query = query.Where("repository.registry_id = ?", registryId)
	}
	err := query.Order("repository.repository").Select()
	if err != nil && err != pg.ErrNoRows {
		return nil, err
	}
	return result, nil
}

func (r registryRepositoryImpl) GetRepository(ctx context.Context, repository string) (*entity.RepositoryEntity, error) {
	result := new(entity.RepositoryEntity)
	err := r.cp.GetConnection().ModelContext(ctx, result).
		Where("repository = ?", repository).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}
