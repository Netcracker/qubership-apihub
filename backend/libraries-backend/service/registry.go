package service

import (
	"context"
	"fmt"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/config"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/repository"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/view"

	log "github.com/sirupsen/logrus"
)

// RegistryService exposes the registries and repositories the service is configured to track. They are
// read-only over HTTP: the configuration is the source of truth, and the tables only hold what the library
// foreign keys need to resolve.
type RegistryService interface {
	// SyncFromConfig writes the configured registries and their repositories into the database. It runs at
	// startup, before the service serves traffic, so a library can reference a repository row.
	SyncFromConfig(ctx context.Context) error
	ListRegistries(ctx context.Context) (*view.Registries, error)
	ListRepositories(ctx context.Context, registryId string) (*view.Repositories, error)
	RepositoryExists(ctx context.Context, repository string) (bool, error)
	// RegistryForRepository resolves the registry a repository belongs to, including the credentials that
	// never leave the configuration.
	RegistryForRepository(ctx context.Context, repository string) (*config.RegistryConfig, error)
}

func NewRegistryService(registryRepository repository.RegistryRepository, systemInfoService SystemInfoService) RegistryService {
	return registryServiceImpl{
		registryRepository: registryRepository,
		systemInfoService:  systemInfoService,
	}
}

type registryServiceImpl struct {
	registryRepository repository.RegistryRepository
	systemInfoService  SystemInfoService
}

func (r registryServiceImpl) SyncFromConfig(ctx context.Context) error {
	configured := r.systemInfoService.GetRegistries()
	now := time.Now()

	registries := make([]entity.RegistryEntity, 0, len(configured))
	repositories := make([]entity.RepositoryEntity, 0)
	for _, registry := range configured {
		registries = append(registries, entity.RegistryEntity{
			Id:        registry.Id,
			Type:      registry.Type,
			BaseUrl:   registry.BaseUrl,
			Name:      registry.Name,
			CreatedAt: now,
			CreatedBy: systemUser,
		})
		for _, repositoryName := range registry.Repositories {
			repositories = append(repositories, entity.RepositoryEntity{
				Repository: repositoryName,
				RegistryId: registry.Id,
			})
		}
	}

	if err := r.registryRepository.Sync(ctx, registries, repositories); err != nil {
		return fmt.Errorf("failed to synchronise the configured registries: %w", err)
	}
	log.Infof("Synchronised %d registries and %d repositories from the configuration", len(registries), len(repositories))
	return nil
}

func (r registryServiceImpl) ListRegistries(ctx context.Context) (*view.Registries, error) {
	ents, err := r.registryRepository.ListRegistries(ctx)
	if err != nil {
		return nil, err
	}
	result := view.Registries{Registries: make([]view.Registry, 0, len(ents))}
	for _, ent := range ents {
		result.Registries = append(result.Registries, entity.MakeRegistryView(ent))
	}
	return &result, nil
}

func (r registryServiceImpl) ListRepositories(ctx context.Context, registryId string) (*view.Repositories, error) {
	ents, err := r.registryRepository.ListRepositories(ctx, registryId)
	if err != nil {
		return nil, err
	}
	result := view.Repositories{Repositories: make([]view.Repository, 0, len(ents))}
	for _, ent := range ents {
		result.Repositories = append(result.Repositories, entity.MakeRepositoryView(ent))
	}
	return &result, nil
}

func (r registryServiceImpl) RepositoryExists(ctx context.Context, repository string) (bool, error) {
	ent, err := r.registryRepository.GetRepository(ctx, repository)
	if err != nil {
		return false, err
	}
	return ent != nil, nil
}

func (r registryServiceImpl) RegistryForRepository(ctx context.Context, repository string) (*config.RegistryConfig, error) {
	ent, err := r.registryRepository.GetRepository(ctx, repository)
	if err != nil {
		return nil, err
	}
	if ent == nil {
		return nil, nil
	}
	for _, registry := range r.systemInfoService.GetRegistries() {
		if registry.Id == ent.RegistryId {
			return &registry, nil
		}
	}
	// The row survives a configuration change that drops its registry; the caller decides how to react.
	return nil, nil
}
