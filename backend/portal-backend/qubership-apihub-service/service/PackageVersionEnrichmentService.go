package service

import (
	"context"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type PackageVersionEnrichmentService interface {
	GetPackageVersionRefsMap(ctx context.Context, packageRefs map[string][]string) (map[string]view.PackageVersionRef, error)
}

func NewPackageVersionEnrichmentService(publishedRepo repository.PublishedRepository) PackageVersionEnrichmentService {
	return packageVersionEnrichmentServiceImpl{publishedRepo: publishedRepo}
}

type packageVersionEnrichmentServiceImpl struct {
	publishedRepo repository.PublishedRepository
}

func (p packageVersionEnrichmentServiceImpl) GetPackageVersionRefsMap(ctx context.Context, packageRefs map[string][]string) (map[string]view.PackageVersionRef, error) {
	richPackageVersions := make([]*entity.PackageVersionRichEntity, 0)
	versionKeys := make([]entity.PublishedVersionKeyEntity, 0)
	for packageId, versions := range packageRefs {
		uniqueVersions := utils.UniqueSet(versions)
		for _, version := range uniqueVersions {
			richPackageVersion, err := p.publishedRepo.GetRichPackageVersion(ctx, packageId, version)
			if err != nil {
				return nil, err
			}
			if richPackageVersion == nil {
				continue
			}
			richPackageVersions = append(richPackageVersions, richPackageVersion)
			versionKeys = append(versionKeys, entity.PublishedVersionKeyEntity{
				PackageId: richPackageVersion.PackageId,
				Version:   richPackageVersion.Version,
				Revision:  richPackageVersion.Revision,
			})
		}
	}

	errorSummaries, err := p.publishedRepo.GetVersionsErrorSummary(ctx, versionKeys, false)
	if err != nil {
		return nil, err
	}

	packageVersionRefs := make(map[string]view.PackageVersionRef, len(richPackageVersions))
	for i, richPackageVersion := range richPackageVersions {
		packageAndVersionData := entity.MakePackageVersionRef(richPackageVersion)
		if errorSummary, exists := errorSummaries[versionKeys[i]]; exists {
			packageAndVersionData.HasErrors = errorSummary.VersionHasErrors()
			if richPackageVersion.PreviousVersion != "" {
				changelogHasErrors := errorSummary.ChangelogHasAnyErrors()
				packageAndVersionData.ChangelogHasErrors = &changelogHasErrors
			}
		}
		refId := view.MakePackageRefKey(richPackageVersion.PackageId, richPackageVersion.Version, richPackageVersion.Revision)
		packageVersionRefs[refId] = packageAndVersionData
	}
	return packageVersionRefs, nil
}
