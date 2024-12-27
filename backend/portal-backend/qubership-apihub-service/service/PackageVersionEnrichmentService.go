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

package service

import (
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type PackageVersionEnrichmentService interface {
	GetPackageVersionRefsMap(packageRefs map[string][]string) (map[string]view.PackageVersionRef, error)
}

func NewPackageVersionEnrichmentService(publishedRepo repository.PublishedRepository) PackageVersionEnrichmentService {
	return packageVersionEnrichmentServiceImpl{publishedRepo: publishedRepo}
}

type packageVersionEnrichmentServiceImpl struct {
	publishedRepo repository.PublishedRepository
}

func (p packageVersionEnrichmentServiceImpl) GetPackageVersionRefsMap(packageRefs map[string][]string) (map[string]view.PackageVersionRef, error) {
	packageVersionRefs := make(map[string]view.PackageVersionRef)
	for packageId, versions := range packageRefs {
		uniqueVersions := utils.UniqueSet(versions)
		for _, version := range uniqueVersions {
			richPackageVersion, err := p.publishedRepo.GetRichPackageVersion(packageId, version)
			if err != nil {
				return nil, err
			}
			if richPackageVersion != nil {
				packageAndVersionData := entity.MakePackageVersionRef(richPackageVersion)
				refId := view.MakePackageRefKey(richPackageVersion.PackageId, richPackageVersion.Version, richPackageVersion.Revision)
				packageVersionRefs[refId] = packageAndVersionData
			}
		}
	}
	return packageVersionRefs, nil
}
