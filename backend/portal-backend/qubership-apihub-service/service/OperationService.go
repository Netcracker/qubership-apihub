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
	"fmt"
	"net/http"
	"strings"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type OperationService interface {
	GetOperations(packageId string, version string, skipRefs bool, searchReq view.OperationListReq) (*view.Operations, error)
	GetOperation(searchReq view.OperationBasicSearchReq) (interface{}, error)
	GetOperationsTags(searchReq view.OperationBasicSearchReq, skipRefs bool) (*view.OperationTags, error)
	GetOperationChanges(packageId string, version string, operationId string, previousPackageId string, previousVersion string, severities []string) (*view.OperationChangesView, error)
	GetVersionChanges_deprecated(packageId string, version string, apiType string, searchReq view.VersionChangesReq) (*view.VersionChangesView, error)
	GetVersionChanges(packageId string, version string, apiType string, searchReq view.VersionChangesReq) (*view.VersionChangesView, error)
	SearchForOperations_deprecated(searchReq view.SearchQueryReq) (*view.SearchResult_deprecated, error)
	SearchForOperations(searchReq view.SearchQueryReq) (*view.SearchResult, error)
	GetDeprecatedOperations(packageId string, version string, searchReq view.DeprecatedOperationListReq) (*view.Operations, error)
	GetOperationDeprecatedItems(searchReq view.OperationBasicSearchReq) (*view.DeprecatedItems, error)
	GetDeprecatedOperationsSummary(packageId string, version string) (*view.DeprecatedOperationsSummary, error)
	GetOperationModelUsages(packageId string, version string, apiType string, operationId string, modelName string) (*view.OperationModelUsages, error)
}

func NewOperationService(
	operationRepository repository.OperationRepository,
	publishedRepo repository.PublishedRepository,
	packageVersionEnrichmentService PackageVersionEnrichmentService) OperationService {
	return &operationServiceImpl{
		operationRepository:             operationRepository,
		publishedRepo:                   publishedRepo,
		packageVersionEnrichmentService: packageVersionEnrichmentService,
	}
}

type operationServiceImpl struct {
	operationRepository             repository.OperationRepository
	publishedRepo                   repository.PublishedRepository
	packageVersionEnrichmentService PackageVersionEnrichmentService
}

func (o operationServiceImpl) GetDeprecatedOperationsSummary(packageId string, version string) (*view.DeprecatedOperationsSummary, error) {
	packageEnt, err := o.publishedRepo.GetPackage(packageId)
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
	versionEnt, err := o.publishedRepo.GetVersion(packageId, version)
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
	result := new(view.DeprecatedOperationsSummary)

	if packageEnt.Kind == entity.KIND_PACKAGE {
		deprecatedOperationsSummaryEnts, err := o.operationRepository.GetDeprecatedOperationsSummary(packageId, versionEnt.Version, versionEnt.Revision)
		if err != nil {
			return nil, err
		}
		deprecatedOperationTypes := make([]view.DeprecatedOperationType, 0)
		for _, ent := range deprecatedOperationsSummaryEnts {
			deprecatedOperationTypes = append(deprecatedOperationTypes, entity.MakeDeprecatedOperationType(ent))
		}
		result.OperationTypes = &deprecatedOperationTypes
	}
	if packageEnt.Kind == entity.KIND_DASHBOARD {
		deprecatedOperationsRefsSummaryEnts, err := o.operationRepository.GetDeprecatedOperationsRefsSummary(packageId, versionEnt.Version, versionEnt.Revision)
		if err != nil {
			return nil, err
		}

		deprecatedOperationTypesMap := make(map[string][]entity.DeprecatedOperationsSummaryEntity)
		packageVersions := make(map[string][]string)
		for _, ent := range deprecatedOperationsRefsSummaryEnts {
			packageRefKey := view.MakePackageRefKey(ent.PackageId, ent.Version, ent.Revision)
			if deprecatedOperationTypesMap[packageRefKey] == nil {
				deprecatedOperationTypesMap[packageRefKey] = make([]entity.DeprecatedOperationsSummaryEntity, 0)
			}
			deprecatedOperationTypesMap[packageRefKey] = append(deprecatedOperationTypesMap[packageRefKey], ent)
			packageVersions[ent.PackageId] = append(packageVersions[ent.PackageId], view.MakeVersionRefKey(ent.Version, ent.Revision))
		}

		deprecatedOperationTypesRef := make([]view.DeprecatedOperationTypesRef, 0)
		for packageRefKey, operationTypes := range deprecatedOperationTypesMap {
			deprecatedOperationTypesRef = append(deprecatedOperationTypesRef, entity.MakeDeprecatedOperationTypesRef(packageRefKey, operationTypes))
		}
		packagesRefs, err := o.packageVersionEnrichmentService.GetPackageVersionRefsMap(packageVersions)
		if err != nil {
			return nil, err
		}
		result.Refs = &deprecatedOperationTypesRef
		result.Packages = &packagesRefs
	}

	return result, nil
}

func (o operationServiceImpl) GetDeprecatedOperations(packageId string, version string, searchReq view.DeprecatedOperationListReq) (*view.Operations, error) {
	if searchReq.RefPackageId != "" {
		packageEnt, err := o.publishedRepo.GetPackage(packageId)
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
		if packageEnt.Kind != entity.KIND_DASHBOARD {
			return nil, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.UnsupportedQueryParam,
				Message: exception.UnsupportedQueryParamMsg,
				Params:  map[string]interface{}{"param": "refPackageId"}}
		}
	}
	versionEnt, err := o.publishedRepo.GetVersion(packageId, version)
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
	if searchReq.Kind == "all" {
		searchReq.Kind = ""
	}
	deprecatedOperationEnts, err := o.operationRepository.GetDeprecatedOperations(packageId, versionEnt.Version, versionEnt.Revision, searchReq.ApiType, searchReq)
	if err != nil {
		return nil, err
	}
	deprecatedOperationList := make([]interface{}, 0)
	packageVersions := make(map[string][]string)
	for _, ent := range deprecatedOperationEnts {
		deprecatedOperationList = append(deprecatedOperationList, entity.MakeDeprecatedOperationView(ent, searchReq.IncludeDeprecatedItems))
		packageVersions[ent.PackageId] = append(packageVersions[ent.PackageId], fmt.Sprintf("%v@%v", ent.Version, ent.Revision))
	}
	packagesRefs, err := o.packageVersionEnrichmentService.GetPackageVersionRefsMap(packageVersions)
	if err != nil {
		return nil, err
	}
	operations := view.Operations{
		Operations: deprecatedOperationList,
		Packages:   packagesRefs,
	}
	return &operations, nil
}

func (o operationServiceImpl) GetOperations(packageId string, version string, skipRefs bool, searchReq view.OperationListReq) (*view.Operations, error) {
	if searchReq.RefPackageId != "" {
		packageEnt, err := o.publishedRepo.GetPackage(packageId)
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
		if packageEnt.Kind != entity.KIND_DASHBOARD {
			return nil, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.UnsupportedQueryParam,
				Message: exception.UnsupportedQueryParamMsg,
				Params:  map[string]interface{}{"param": "refPackageId"}}
		}
	}
	versionEnt, err := o.publishedRepo.GetVersion(packageId, version)
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
	if searchReq.Kind == "all" {
		searchReq.Kind = ""
	}

	searchReq.CustomTagKey, searchReq.CustomTagValue, err = parseTextFilterToCustomTagKeyValue(searchReq.TextFilter)
	if err != nil {
		return nil, err
	}
	operationEnts, err := o.operationRepository.GetOperations(packageId, versionEnt.Version, versionEnt.Revision, searchReq.ApiType, skipRefs, searchReq)
	if err != nil {
		return nil, err
	}
	operationList := make([]interface{}, 0)
	packageVersions := make(map[string][]string, 0)
	for _, ent := range operationEnts {
		operationList = append(operationList, entity.MakeOperationView(ent))
		packageVersions[ent.PackageId] = append(packageVersions[ent.PackageId], view.MakeVersionRefKey(ent.Version, ent.Revision))
	}
	packagesRefs, err := o.packageVersionEnrichmentService.GetPackageVersionRefsMap(packageVersions)
	if err != nil {
		return nil, err
	}
	operations := view.Operations{
		Operations: operationList,
		Packages:   packagesRefs,
	}
	return &operations, nil
}

func parseTextFilterToCustomTagKeyValue(textFilter string) (string, string, error) {
	if strings.Contains(textFilter, ": ") {
		if len(strings.Split(textFilter, ": ")) != 2 {
			return "", "", &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidTextFilterFormatForOperationCustomTag,
				Message: exception.InvalidTextFilterFormatForOperationCustomTagMsg,
				Params:  map[string]interface{}{"textFilter": textFilter},
			}
		}
		return strings.Split(textFilter, ": ")[0], strings.Split(textFilter, ": ")[1], nil
	}
	return "", "", nil
}

func (o operationServiceImpl) GetOperation(searchReq view.OperationBasicSearchReq) (interface{}, error) {
	versionEnt, err := o.publishedRepo.GetVersion(searchReq.PackageId, searchReq.Version)
	if err != nil {
		return nil, err
	}
	if versionEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedPackageVersionNotFound,
			Message: exception.PublishedPackageVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": searchReq.Version, "packageId": searchReq.PackageId},
		}
	}
	operationEnt, err := o.operationRepository.GetOperationById(searchReq.PackageId, versionEnt.Version, versionEnt.Revision, searchReq.ApiType, searchReq.OperationId)
	if err != nil {
		return nil, err
	}
	if operationEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.OperationNotFound,
			Message: exception.OperationNotFoundMsg,
			Params:  map[string]interface{}{"operationId": searchReq.OperationId, "version": searchReq.Version, "packageId": searchReq.PackageId},
		}
	}
	operationView := entity.MakeSingleOperationView(*operationEnt)

	return &operationView, nil
}

func (o operationServiceImpl) GetOperationDeprecatedItems(searchReq view.OperationBasicSearchReq) (*view.DeprecatedItems, error) {
	versionEnt, err := o.publishedRepo.GetVersion(searchReq.PackageId, searchReq.Version)
	if err != nil {
		return nil, err
	}
	if versionEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedPackageVersionNotFound,
			Message: exception.PublishedPackageVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": searchReq.Version, "packageId": searchReq.PackageId},
		}
	}
	operationEnt, err := o.operationRepository.GetOperationDeprecatedItems(searchReq.PackageId, versionEnt.Version, versionEnt.Revision, searchReq.ApiType, searchReq.OperationId)
	if err != nil {
		return nil, err
	}
	if operationEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.OperationNotFound,
			Message: exception.OperationNotFoundMsg,
			Params:  map[string]interface{}{"operationId": searchReq.OperationId, "version": searchReq.Version, "packageId": searchReq.PackageId},
		}
	}
	if operationEnt.DeprecatedItems == nil {
		return &view.DeprecatedItems{DeprecatedItems: make([]view.DeprecatedItem, 0)}, nil
	}
	operationView := entity.MakeSingleOperationDeprecatedItemsView(*operationEnt)

	return &operationView, nil
}

func (o operationServiceImpl) GetOperationsTags(searchReq view.OperationBasicSearchReq, skipRefs bool) (*view.OperationTags, error) {
	versionEnt, err := o.publishedRepo.GetVersion(searchReq.PackageId, searchReq.Version)
	if err != nil {
		return nil, err
	}
	if versionEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedPackageVersionNotFound,
			Message: exception.PublishedPackageVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": searchReq.Version, "packageId": searchReq.PackageId},
		}
	}

	searchQuery := entity.OperationTagsSearchQueryEntity{
		PackageId:   searchReq.PackageId,
		Version:     versionEnt.Version,
		Revision:    versionEnt.Revision,
		Type:        searchReq.ApiType,
		Kind:        searchReq.ApiKind,
		TextFilter:  searchReq.TextFilter,
		ApiAudience: searchReq.ApiAudience,
		Limit:       searchReq.Limit,
		Offset:      searchReq.Offset,
	}
	tags, err := o.operationRepository.GetOperationsTags(searchQuery, skipRefs)
	if err != nil {
		return nil, err
	}

	return &view.OperationTags{Tags: tags}, nil
}

func (o operationServiceImpl) GetOperationChanges(packageId string, version string, operationId string, previousPackageId string, previousVersion string, severities []string) (*view.OperationChangesView, error) {
	versionEnt, err := o.publishedRepo.GetVersion(packageId, version)
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

	if previousVersion == "" || previousPackageId == "" {
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
			previousPackageId = versionEnt.PreviousVersionPackageId
		} else {
			previousPackageId = packageId
		}
	}
	previousVersionEnt, err := o.publishedRepo.GetVersion(previousPackageId, previousVersion)
	if err != nil {
		return nil, err
	}
	if previousVersionEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedPackageVersionNotFound,
			Message: exception.PublishedPackageVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": previousVersion, "packageId": previousPackageId},
		}
	}

	comparisonId := view.MakeVersionComparisonId(
		versionEnt.PackageId, versionEnt.Version, versionEnt.Revision,
		previousVersionEnt.PackageId, previousVersionEnt.Version, previousVersionEnt.Revision,
	)
	versionComparison, err := o.publishedRepo.GetVersionComparison(comparisonId)
	if err != nil {
		return nil, err
	}
	if versionComparison == nil || versionComparison.NoContent {
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

	changes := make([]interface{}, 0)
	changedOperationEnt, err := o.operationRepository.GetOperationChanges(comparisonId, operationId, severities)
	if err != nil {
		return nil, err
	}
	if changedOperationEnt != nil {
		changesView := entity.MakeOperationChangesListView(*changedOperationEnt)
		for _, changeView := range changesView {
			if len(severities) == 0 {
				changes = append(changes, changeView)
			} else {
				if utils.SliceContains(severities, view.GetSingleOperationChangeCommon(changeView).Severity) {
					changes = append(changes, changeView)

				}
			}
		}
	}
	return &view.OperationChangesView{Changes: changes}, nil
}

func (o operationServiceImpl) GetVersionChanges_deprecated(packageId string, version string, apiType string, searchReq view.VersionChangesReq) (*view.VersionChangesView, error) {
	versionEnt, err := o.publishedRepo.GetVersion(packageId, version)
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

	if searchReq.PreviousVersion == "" || searchReq.PreviousVersionPackageId == "" {
		if versionEnt.PreviousVersion == "" {
			return nil, &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.NoPreviousVersion,
				Message: exception.NoPreviousVersionMsg,
				Params:  map[string]interface{}{"version": version},
			}
		}
		searchReq.PreviousVersion = versionEnt.PreviousVersion
		if versionEnt.PreviousVersionPackageId != "" {
			searchReq.PreviousVersionPackageId = versionEnt.PreviousVersionPackageId
		} else {
			searchReq.PreviousVersionPackageId = packageId
		}
	}
	previousVersionEnt, err := o.publishedRepo.GetVersion(searchReq.PreviousVersionPackageId, searchReq.PreviousVersion)
	if err != nil {
		return nil, err
	}
	if previousVersionEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedPackageVersionNotFound,
			Message: exception.PublishedPackageVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": searchReq.PreviousVersion, "packageId": searchReq.PreviousVersionPackageId},
		}
	}

	comparisonId := view.MakeVersionComparisonId(
		versionEnt.PackageId, versionEnt.Version, versionEnt.Revision,
		previousVersionEnt.PackageId, previousVersionEnt.Version, previousVersionEnt.Revision,
	)

	versionComparison, err := o.publishedRepo.GetVersionComparison(comparisonId)
	if err != nil {
		return nil, err
	}
	if versionComparison == nil || versionComparison.NoContent {
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
	searchQuery := entity.ChangelogSearchQueryEntity{
		ComparisonId:   comparisonId,
		ApiType:        apiType,
		ApiKind:        searchReq.ApiKind,
		TextFilter:     searchReq.TextFilter,
		DocumentSlug:   searchReq.DocumentSlug,
		Tags:           searchReq.Tags,
		EmptyTag:       searchReq.EmptyTag,
		RefPackageId:   searchReq.RefPackageId,
		Limit:          searchReq.Limit,
		Offset:         searchReq.Offset,
		EmptyGroup:     searchReq.EmptyGroup,
		Group:          searchReq.Group,
		GroupPackageId: versionEnt.PackageId,
		GroupVersion:   versionEnt.Version,
		GroupRevision:  versionEnt.Revision,
		Severities:     searchReq.Severities,
	}
	operationComparisons := make([]interface{}, 0)
	changelogOperationEnts, err := o.operationRepository.GetChangelog_deprecated(searchQuery)
	if err != nil {
		return nil, err
	}

	packageVersions := make(map[string][]string, 0)
	for _, changelogOperationEnt := range changelogOperationEnts {
		operationComparisons = append(operationComparisons, entity.MakeOperationComparisonChangelogView_deprecated(changelogOperationEnt))
		if packageRefKey := view.MakePackageRefKey(changelogOperationEnt.PackageId, changelogOperationEnt.Version, changelogOperationEnt.Revision); packageRefKey != "" {
			packageVersions[changelogOperationEnt.PackageId] = append(packageVersions[changelogOperationEnt.PackageId], view.MakeVersionRefKey(changelogOperationEnt.Version, changelogOperationEnt.Revision))
		}
		if previousPackageRefKey := view.MakePackageRefKey(changelogOperationEnt.PreviousPackageId, changelogOperationEnt.PreviousVersion, changelogOperationEnt.PreviousRevision); previousPackageRefKey != "" {
			packageVersions[changelogOperationEnt.PreviousPackageId] = append(packageVersions[changelogOperationEnt.PreviousPackageId], view.MakeVersionRefKey(changelogOperationEnt.PreviousVersion, changelogOperationEnt.PreviousRevision))
		}
	}
	packagesRefs, err := o.packageVersionEnrichmentService.GetPackageVersionRefsMap(packageVersions)
	if err != nil {
		return nil, err
	}
	changelog := &view.VersionChangesView{
		PreviousVersion:          view.MakeVersionRefKey(previousVersionEnt.Version, previousVersionEnt.Revision),
		PreviousVersionPackageId: previousVersionEnt.PackageId,
		Operations:               operationComparisons,
		Packages:                 packagesRefs,
	}
	return changelog, nil
}

func (o operationServiceImpl) GetVersionChanges(packageId string, version string, apiType string, searchReq view.VersionChangesReq) (*view.VersionChangesView, error) {
	versionEnt, err := o.publishedRepo.GetVersion(packageId, version)
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

	if searchReq.PreviousVersion == "" || searchReq.PreviousVersionPackageId == "" {
		if versionEnt.PreviousVersion == "" {
			return nil, &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.NoPreviousVersion,
				Message: exception.NoPreviousVersionMsg,
				Params:  map[string]interface{}{"version": version},
			}
		}
		searchReq.PreviousVersion = versionEnt.PreviousVersion
		if versionEnt.PreviousVersionPackageId != "" {
			searchReq.PreviousVersionPackageId = versionEnt.PreviousVersionPackageId
		} else {
			searchReq.PreviousVersionPackageId = packageId
		}
	}
	previousVersionEnt, err := o.publishedRepo.GetVersion(searchReq.PreviousVersionPackageId, searchReq.PreviousVersion)
	if err != nil {
		return nil, err
	}
	if previousVersionEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedPackageVersionNotFound,
			Message: exception.PublishedPackageVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": searchReq.PreviousVersion, "packageId": searchReq.PreviousVersionPackageId},
		}
	}

	comparisonId := view.MakeVersionComparisonId(
		versionEnt.PackageId, versionEnt.Version, versionEnt.Revision,
		previousVersionEnt.PackageId, previousVersionEnt.Version, previousVersionEnt.Revision,
	)

	versionComparison, err := o.publishedRepo.GetVersionComparison(comparisonId)
	if err != nil {
		return nil, err
	}
	if versionComparison == nil || versionComparison.NoContent {
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
	searchQuery := entity.ChangelogSearchQueryEntity{
		ComparisonId:   comparisonId,
		ApiType:        apiType,
		ApiKind:        searchReq.ApiKind,
		TextFilter:     searchReq.TextFilter,
		DocumentSlug:   searchReq.DocumentSlug,
		Tags:           searchReq.Tags,
		EmptyTag:       searchReq.EmptyTag,
		RefPackageId:   searchReq.RefPackageId,
		Limit:          searchReq.Limit,
		Offset:         searchReq.Offset,
		EmptyGroup:     searchReq.EmptyGroup,
		Group:          searchReq.Group,
		GroupPackageId: versionEnt.PackageId,
		GroupVersion:   versionEnt.Version,
		GroupRevision:  versionEnt.Revision,
		Severities:     searchReq.Severities,
		ApiAudience:    searchReq.ApiAudience,
	}
	operationComparisons := make([]interface{}, 0)
	changelogOperationEnts, err := o.operationRepository.GetChangelog(searchQuery)
	if err != nil {
		return nil, err
	}

	packageVersions := make(map[string][]string, 0)
	for _, changelogOperationEnt := range changelogOperationEnts {
		operationComparisons = append(operationComparisons, entity.MakeOperationComparisonChangelogView(changelogOperationEnt))
		if packageRefKey := view.MakePackageRefKey(changelogOperationEnt.PackageId, changelogOperationEnt.Version, changelogOperationEnt.Revision); packageRefKey != "" {
			packageVersions[changelogOperationEnt.PackageId] = append(packageVersions[changelogOperationEnt.PackageId], view.MakeVersionRefKey(changelogOperationEnt.Version, changelogOperationEnt.Revision))
		}
		if previousPackageRefKey := view.MakePackageRefKey(changelogOperationEnt.PreviousPackageId, changelogOperationEnt.PreviousVersion, changelogOperationEnt.PreviousRevision); previousPackageRefKey != "" {
			packageVersions[changelogOperationEnt.PreviousPackageId] = append(packageVersions[changelogOperationEnt.PreviousPackageId], view.MakeVersionRefKey(changelogOperationEnt.PreviousVersion, changelogOperationEnt.PreviousRevision))
		}
	}
	packagesRefs, err := o.packageVersionEnrichmentService.GetPackageVersionRefsMap(packageVersions)
	if err != nil {
		return nil, err
	}
	changelog := &view.VersionChangesView{
		PreviousVersion:          view.MakeVersionRefKey(previousVersionEnt.Version, previousVersionEnt.Revision),
		PreviousVersionPackageId: previousVersionEnt.PackageId,
		Operations:               operationComparisons,
		Packages:                 packagesRefs,
	}
	return changelog, nil
}

// deprecated
func (o operationServiceImpl) SearchForOperations_deprecated(searchReq view.SearchQueryReq) (*view.SearchResult_deprecated, error) {
	searchQuery, err := entity.MakeOperationSearchQueryEntity(&searchReq)
	if err != nil {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidSearchParameters,
			Message: exception.InvalidSearchParametersMsg,
			Params:  map[string]interface{}{"error": err.Error()},
		}
	}
	err = setOperationSearchParams(searchReq.OperationSearchParams, searchQuery)
	if err != nil {
		return nil, err
	}
	//todo maybe move to envs
	searchQuery.OperationSearchWeight = entity.OperationSearchWeight{
		ScopeWeight:     13,
		TitleWeight:     3,
		OpenCountWeight: 0.2,
	}
	searchQuery.VersionStatusSearchWeight = entity.VersionStatusSearchWeight{
		VersionReleaseStatus:        string(view.Release),
		VersionReleaseStatusWeight:  4,
		VersionDraftStatus:          string(view.Draft),
		VersionDraftStatusWeight:    0.6,
		VersionArchivedStatus:       string(view.Archived),
		VersionArchivedStatusWeight: 0.1,
	}
	operationEntities, err := o.operationRepository.SearchForOperations_deprecated(searchQuery)
	if err != nil {
		return nil, err
	}
	operations := make([]view.OperationSearchResult_deprecated, 0)
	for _, ent := range operationEntities {
		operations = append(operations, entity.MakeOperationSearchResultView_deprecated(ent))
	}

	return &view.SearchResult_deprecated{Operations: &operations}, nil
}

func (o operationServiceImpl) SearchForOperations(searchReq view.SearchQueryReq) (*view.SearchResult, error) {
	searchQuery, err := entity.MakeOperationSearchQueryEntity(&searchReq)
	if err != nil {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidSearchParameters,
			Message: exception.InvalidSearchParametersMsg,
			Params:  map[string]interface{}{"error": err.Error()},
		}
	}
	err = setOperationSearchParams(searchReq.OperationSearchParams, searchQuery)
	if err != nil {
		return nil, err
	}
	//todo maybe move to envs
	searchQuery.OperationSearchWeight = entity.OperationSearchWeight{
		ScopeWeight:     13,
		TitleWeight:     3,
		OpenCountWeight: 0.2,
	}
	searchQuery.VersionStatusSearchWeight = entity.VersionStatusSearchWeight{
		VersionReleaseStatus:        string(view.Release),
		VersionReleaseStatusWeight:  4,
		VersionDraftStatus:          string(view.Draft),
		VersionDraftStatusWeight:    0.6,
		VersionArchivedStatus:       string(view.Archived),
		VersionArchivedStatusWeight: 0.1,
	}
	operationEntities, err := o.operationRepository.SearchForOperations(searchQuery)
	if err != nil {
		return nil, err
	}
	operations := make([]interface{}, 0)
	for _, ent := range operationEntities {
		operations = append(operations, entity.MakeOperationSearchResultView(ent))
	}

	return &view.SearchResult{Operations: &operations}, nil
}

func setOperationSearchParams(operationParams *view.OperationSearchParams, searchQuery *entity.OperationSearchQuery) error {
	if operationParams == nil {
		searchQuery.FilterAll = true
		return nil
	}
	switch operationParams.ApiType {
	case string(view.RestApiType):
		return setRestOperationSearchParams(operationParams, searchQuery)
	case string(view.GraphqlApiType):
		return setGraphqlOperationSearchParams(operationParams, searchQuery)
	default:
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidSearchParameters,
			Message: exception.InvalidSearchParametersMsg,
			Params:  map[string]interface{}{"error": fmt.Sprintf("%v apiType is not supported", operationParams.ApiType)},
		}
	}
}

func setRestOperationSearchParams(restOperationParams *view.OperationSearchParams, searchQuery *entity.OperationSearchQuery) error {
	searchQuery.ApiType = restOperationParams.ApiType
	searchQuery.Methods = append(searchQuery.Methods, restOperationParams.Methods...)
	if len(restOperationParams.Scopes)+len(restOperationParams.DetailedScopes) == 0 {
		searchQuery.FilterAll = true
	} else {
		for _, s := range restOperationParams.Scopes {
			switch s {
			case view.RestScopeRequest:
				searchQuery.FilterRequest = true
			case view.RestScopeResponse:
				searchQuery.FilterResponse = true
			default:
				return &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidSearchParameters,
					Message: exception.InvalidSearchParametersMsg,
					Params:  map[string]interface{}{"error": fmt.Sprintf("scope %v is invalid for %v apiType", s, restOperationParams.ApiType)},
				}
			}
		}
		if searchQuery.FilterRequest && searchQuery.FilterResponse {
			searchQuery.FilterRequest = false
			searchQuery.FilterResponse = false
		}
		for _, s := range restOperationParams.DetailedScopes {
			switch s {
			case view.RestScopeAnnotation:
				searchQuery.FilterAnnotation = true
			case view.RestScopeExamples:
				searchQuery.FilterExamples = true
			case view.RestScopeProperties:
				searchQuery.FilterProperties = true
			default:
				return &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidSearchParameters,
					Message: exception.InvalidSearchParametersMsg,
					Params:  map[string]interface{}{"error": fmt.Sprintf("detailed scope %v is invalid", s)},
				}
			}
		}
		if searchQuery.FilterAnnotation && searchQuery.FilterExamples && searchQuery.FilterProperties {
			searchQuery.FilterAnnotation = false
			searchQuery.FilterExamples = false
			searchQuery.FilterProperties = false
		}
		if !searchQuery.FilterRequest && !searchQuery.FilterResponse &&
			!searchQuery.FilterAnnotation && !searchQuery.FilterExamples && !searchQuery.FilterProperties {
			searchQuery.FilterAll = true
		}
	}
	return nil
}

func setGraphqlOperationSearchParams(graphqlOperationParams *view.OperationSearchParams, searchQuery *entity.OperationSearchQuery) error {
	searchQuery.ApiType = graphqlOperationParams.ApiType
	for _, operationType := range graphqlOperationParams.OperationTypes {
		if !view.ValidGraphQLOperationType(operationType) {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidSearchParameters,
				Message: exception.InvalidSearchParametersMsg,
				Params:  map[string]interface{}{"error": fmt.Sprintf("operation type %v is invalid for %v apiType", operationType, graphqlOperationParams.ApiType)},
			}
		}
	}
	searchQuery.OperationTypes = append(searchQuery.OperationTypes, graphqlOperationParams.OperationTypes...)
	if len(graphqlOperationParams.Scopes) == 0 {
		searchQuery.FilterAll = true
	} else {
		for _, s := range graphqlOperationParams.Scopes {
			switch s {
			case view.GraphqlScopeAnnotation:
				searchQuery.FilterAnnotation = true
			case view.GraphqlScopeArgument:
				searchQuery.FilterArgument = true
			case view.GraphqlScopeProperty:
				searchQuery.FilterProperty = true
			default:
				return &exception.CustomError{
					Status:  http.StatusBadRequest,
					Code:    exception.InvalidSearchParameters,
					Message: exception.InvalidSearchParametersMsg,
					Params:  map[string]interface{}{"error": fmt.Sprintf("scope %v is invalid for %v apiType", s, graphqlOperationParams.ApiType)},
				}
			}
		}
	}
	return nil
}

func (o operationServiceImpl) GetOperationModelUsages(packageId string, version string, apiType string, operationId string, modelName string) (*view.OperationModelUsages, error) {
	versionEnt, err := o.publishedRepo.GetVersion(packageId, version)
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
	operationEnt, err := o.operationRepository.GetOperationById(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, apiType, operationId)
	if err != nil {
		return nil, err
	}
	if operationEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.OperationNotFound,
			Message: exception.OperationNotFoundMsg,
			Params:  map[string]interface{}{"operationId": operationId, "version": version, "packageId": packageId},
		}
	}
	modelHash, modelExists := operationEnt.Models[modelName]
	if !modelExists {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.OperationModelNotFound,
			Message: exception.OperationModelNotFoundMsg,
			Params:  map[string]interface{}{"operationId": operationId, "modelName": modelName},
		}
	}
	operationsWithModel, err := o.operationRepository.GetOperationsByModelHash(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, apiType, modelHash)
	if err != nil {
		return nil, err
	}
	modelUsages := make([]view.OperationModels, 0)
	for _, operation := range operationsWithModel {
		modelUsages = append(modelUsages, view.OperationModels{
			OperationId: operation.OperationId,
			ModelNames:  operation.Models,
		})
	}
	return &view.OperationModelUsages{ModelUsages: modelUsages}, nil
}
