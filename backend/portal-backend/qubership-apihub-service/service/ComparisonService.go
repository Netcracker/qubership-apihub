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
	"net/http"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type ComparisonService interface {
	ValidComparisonResultExists(packageId string, version string, previousVersionPackageId string, previousVersion string) (bool, error)
	GetComparisonResult(packageId string, version string, previousVersionPackageId string, previousVersion string) (*view.VersionComparisonSummary, error)
}

func NewComparisonService(publishedRepo repository.PublishedRepository, operationRepo repository.OperationRepository, packageVersionEnrichmentService PackageVersionEnrichmentService) ComparisonService {
	return &comparisonServiceImpl{
		publishedRepo:                   publishedRepo,
		operationRepo:                   operationRepo,
		packageVersionEnrichmentService: packageVersionEnrichmentService,
	}
}

type comparisonServiceImpl struct {
	publishedRepo                   repository.PublishedRepository
	operationRepo                   repository.OperationRepository
	packageVersionEnrichmentService PackageVersionEnrichmentService
}

func (c comparisonServiceImpl) GetComparisonResult(packageId string, version string, previousVersionPackageId string, previousVersion string) (*view.VersionComparisonSummary, error) {
	packageEnt, err := c.publishedRepo.GetPackage(packageId)
	if err != nil {
		return nil, err
	}
	if packageEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PackageNotFound,
			Message: exception.PackageNotFoundMsg,
			Params:  map[string]interface{}{"packageId": packageId},
		}
	}
	versionEnt, err := c.publishedRepo.GetVersion(packageId, version)
	if err != nil {
		return nil, err
	}
	if versionEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedPackageVersionNotFound,
			Message: exception.PublishedPackageVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": version, "packageId": packageId},
		}
	}
	if previousVersion == "" || previousVersionPackageId == "" {
		if versionEnt.PreviousVersion == "" {
			return nil, &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.NoPreviousVersion,
				Message: exception.NoPreviousVersionMsg,
				Params:  map[string]interface{}{"version": version},
			}
		}
		previousVersion = versionEnt.PreviousVersion
		if versionEnt.PreviousVersionPackageId != "" {
			previousVersionPackageId = versionEnt.PreviousVersionPackageId
		} else {
			previousVersionPackageId = packageId
		}
	}
	previousVersionEnt, err := c.publishedRepo.GetVersion(previousVersionPackageId, previousVersion)
	if err != nil {
		return nil, err
	}
	if previousVersionEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedPackageVersionNotFound,
			Message: exception.PublishedPackageVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": previousVersion, "packageId": previousVersionPackageId},
		}
	}
	comparisonId := view.MakeVersionComparisonId(
		versionEnt.PackageId, versionEnt.Version, versionEnt.Revision,
		previousVersionEnt.PackageId, previousVersionEnt.Version, previousVersionEnt.Revision,
	)
	comparisonEnt, err := c.publishedRepo.GetVersionComparison(comparisonId)
	if err != nil {
		return nil, err
	}
	if comparisonEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.ComparisonNotFound,
			Message: exception.ComparisonNotFoundMsg,
			Params: map[string]interface{}{
				"comparisonId":      comparisonId,
				"packageId":         versionEnt.PackageId,
				"version":           versionEnt.Version,
				"revision":          versionEnt.Revision,
				"previousPackageId": previousVersionEnt.PackageId,
				"previousVersion":   previousVersionEnt.Version,
				"previousRevision":  previousVersionEnt.Revision,
			},
		}
	}
	result := new(view.VersionComparisonSummary)

	if packageEnt.Kind == entity.KIND_PACKAGE {
		result.NoContent = comparisonEnt.NoContent
		result.OperationTypes = &comparisonEnt.OperationTypes
	}
	if packageEnt.Kind == entity.KIND_DASHBOARD {
		refsComparisonEnts, err := c.publishedRepo.GetVersionRefsComparisons(comparisonId)
		if err != nil {
			return nil, err
		}
		refComparisons := make([]view.RefComparison, 0)
		packageVersions := make(map[string][]string, 0)
		for _, refEnt := range refsComparisonEnts {
			refView := entity.MakeRefComparisonView(refEnt)
			if refView.PackageRef != "" {
				packageVersions[refEnt.PackageId] = append(packageVersions[refEnt.PackageId], view.MakeVersionRefKey(refEnt.Version, refEnt.Revision))
			}
			if refView.PreviousPackageRef != "" {
				packageVersions[refEnt.PreviousPackageId] = append(packageVersions[refEnt.PreviousPackageId], view.MakeVersionRefKey(refEnt.PreviousVersion, refEnt.PreviousRevision))
			}
			refComparisons = append(refComparisons, *refView)
		}
		packagesRefs, err := c.packageVersionEnrichmentService.GetPackageVersionRefsMap(packageVersions)
		if err != nil {
			return nil, err
		}
		result.Refs = &refComparisons
		result.Packages = &packagesRefs
	}

	return result, nil
}

func (c comparisonServiceImpl) ValidComparisonResultExists(packageId string, version string, previousVersionPackageId string, previousVersion string) (bool, error) {
	versionEnt, err := c.publishedRepo.GetVersion(packageId, version)
	if err != nil {
		return false, err
	}
	if versionEnt == nil {
		return false, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedPackageVersionNotFound,
			Message: exception.PublishedPackageVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": version, "packageId": packageId},
		}
	}
	if previousVersion == "" || previousVersionPackageId == "" {
		if versionEnt.PreviousVersion == "" {
			return false, &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.NoPreviousVersion,
				Message: exception.NoPreviousVersionMsg,
				Params:  map[string]interface{}{"version": version},
			}
		}
		previousVersion = versionEnt.PreviousVersion
		if versionEnt.PreviousVersionPackageId != "" {
			previousVersionPackageId = versionEnt.PreviousVersionPackageId
		} else {
			previousVersionPackageId = packageId
		}
	}
	previousVersionEnt, err := c.publishedRepo.GetVersion(previousVersionPackageId, previousVersion)
	if err != nil {
		return false, err
	}
	if previousVersionEnt == nil {
		return false, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedPackageVersionNotFound,
			Message: exception.PublishedPackageVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": previousVersion, "packageId": previousVersionPackageId},
		}
	}
	comparisonId := view.MakeVersionComparisonId(
		versionEnt.PackageId, versionEnt.Version, versionEnt.Revision,
		previousVersionEnt.PackageId, previousVersionEnt.Version, previousVersionEnt.Revision,
	)
	comparisonEnt, err := c.publishedRepo.GetVersionComparison(comparisonId)
	if err != nil {
		return false, err
	}
	if comparisonEnt == nil || comparisonEnt.NoContent {
		return false, nil
	}
	if len(comparisonEnt.Refs) != 0 {
		comparisonRefs, err := c.publishedRepo.GetVersionRefsComparisons(comparisonId)
		if err != nil {
			return false, err
		}
		for _, comparison := range comparisonRefs {
			if comparison.NoContent {
				return false, nil
			}
		}
	}
	return true, nil
}
