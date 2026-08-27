package service

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"

	log "github.com/sirupsen/logrus"
)

type OperationService interface {
	GetOperations(ctx context.Context, packageId string, version string, skipRefs bool, searchReq view.OperationListReq) (*view.Operations, error)
	GetOperation(ctx context.Context, searchReq view.OperationBasicSearchReq) (interface{}, error)
	GetOperationsTags(ctx context.Context, searchReq view.OperationBasicSearchReq, skipRefs bool) (*view.OperationTags, error)
	GetOperationChanges(ctx context.Context, packageId string, version string, operationId string, previousPackageId string, previousVersion string, severities []string) (*view.OperationChangesView, error)
	GetVersionChanges(ctx context.Context, packageId string, version string, apiType string, searchReq view.VersionChangesReq) (*view.VersionChangesView, error)
	GlobalSearchForOperations(ctx context.Context, searchReq view.SearchQueryReq) (*view.SearchResult, error)
	GetDeprecatedOperations(ctx context.Context, packageId string, version string, searchReq view.DeprecatedOperationListReq) (*view.Operations, error)
	GetOperationDeprecatedItems(ctx context.Context, searchReq view.OperationBasicSearchReq) (*view.DeprecatedItems, error)
	GetDeprecatedOperationsSummary(ctx context.Context, packageId string, version string) (*view.DeprecatedOperationsSummary, error)
	GetOperationModelUsages(ctx context.Context, packageId string, version string, apiType string, operationId string, modelName string) (*view.OperationModelUsages, error)
	GetOperationChangesSummary(ctx context.Context, packageId string, version string, operationId string, previousPackageId string, previousVersion string, refPackageId string) (*view.ChangeSummary, error)
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

func (o operationServiceImpl) GetDeprecatedOperationsSummary(ctx context.Context, packageId string, version string) (*view.DeprecatedOperationsSummary, error) {
	packageEnt, err := o.publishedRepo.GetPackage(ctx, packageId)
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
	versionEnt, err := o.publishedRepo.GetVersion(ctx, packageId, version)
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
		deprecatedOperationsSummaryEnts, err := o.operationRepository.GetDeprecatedOperationsSummary(ctx, packageId, versionEnt.Version, versionEnt.Revision)
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
		deprecatedOperationsRefsSummaryEnts, err := o.operationRepository.GetDeprecatedOperationsRefsSummary(ctx, packageId, versionEnt.Version, versionEnt.Revision)
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
		packagesRefs, err := o.packageVersionEnrichmentService.GetPackageVersionRefsMap(ctx, packageVersions)
		if err != nil {
			return nil, err
		}
		result.Refs = &deprecatedOperationTypesRef
		result.Packages = &packagesRefs
	}

	return result, nil
}

func (o operationServiceImpl) GetDeprecatedOperations(ctx context.Context, packageId string, version string, searchReq view.DeprecatedOperationListReq) (*view.Operations, error) {
	if searchReq.RefPackageId != "" {
		packageEnt, err := o.publishedRepo.GetPackage(ctx, packageId)
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
	versionEnt, err := o.publishedRepo.GetVersion(ctx, packageId, version)
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
	deprecatedOperationEnts, err := o.operationRepository.GetDeprecatedOperations(ctx, packageId, versionEnt.Version, versionEnt.Revision, searchReq.ApiType, searchReq)
	if err != nil {
		return nil, err
	}
	deprecatedOperationList := make([]interface{}, 0)
	packageVersions := make(map[string][]string)
	for _, ent := range deprecatedOperationEnts {
		deprecatedOperationList = append(deprecatedOperationList, entity.MakeDeprecatedOperationView(ent, searchReq.IncludeDeprecatedItems))
		packageVersions[ent.PackageId] = append(packageVersions[ent.PackageId], fmt.Sprintf("%v@%v", ent.Version, ent.Revision))
	}
	packagesRefs, err := o.packageVersionEnrichmentService.GetPackageVersionRefsMap(ctx, packageVersions)
	if err != nil {
		return nil, err
	}
	operations := view.Operations{
		Operations: deprecatedOperationList,
		Packages:   packagesRefs,
	}
	return &operations, nil
}

func (o operationServiceImpl) GetOperations(ctx context.Context, packageId string, version string, skipRefs bool, searchReq view.OperationListReq) (*view.Operations, error) {
	if searchReq.RefPackageId != "" {
		packageEnt, err := o.publishedRepo.GetPackage(ctx, packageId)
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
	versionEnt, err := o.publishedRepo.GetVersion(ctx, packageId, version)
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
	operationEnts, err := o.operationRepository.GetOperations(ctx, packageId, versionEnt.Version, versionEnt.Revision, searchReq.ApiType, skipRefs, searchReq)
	if err != nil {
		return nil, err
	}
	operationList := make([]interface{}, 0)
	packageVersions := make(map[string][]string, 0)
	for _, ent := range operationEnts {
		operationList = append(operationList, entity.MakeOperationView(ent))
		packageVersions[ent.PackageId] = append(packageVersions[ent.PackageId], view.MakeVersionRefKey(ent.Version, ent.Revision))
	}
	packagesRefs, err := o.packageVersionEnrichmentService.GetPackageVersionRefsMap(ctx, packageVersions)
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

	if strings.HasPrefix(textFilter, "x-") && strings.HasSuffix(textFilter, ":") {
		tagKey := textFilter[:len(textFilter)-1]
		return tagKey, "", nil
	}

	return "", "", nil
}

func (o operationServiceImpl) GetOperation(ctx context.Context, searchReq view.OperationBasicSearchReq) (interface{}, error) {
	versionEnt, err := o.publishedRepo.GetVersion(ctx, searchReq.PackageId, searchReq.Version)
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
	operationEnt, err := o.operationRepository.GetOperationById(ctx, searchReq.PackageId, versionEnt.Version, versionEnt.Revision, searchReq.ApiType, searchReq.OperationId, searchReq.IncludeData)
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

func (o operationServiceImpl) GetOperationDeprecatedItems(ctx context.Context, searchReq view.OperationBasicSearchReq) (*view.DeprecatedItems, error) {
	versionEnt, err := o.publishedRepo.GetVersion(ctx, searchReq.PackageId, searchReq.Version)
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
	operationEnt, err := o.operationRepository.GetOperationDeprecatedItems(ctx, searchReq.PackageId, versionEnt.Version, versionEnt.Revision, searchReq.ApiType, searchReq.OperationId)
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

func (o operationServiceImpl) GetOperationsTags(ctx context.Context, searchReq view.OperationBasicSearchReq, skipRefs bool) (*view.OperationTags, error) {
	versionEnt, err := o.publishedRepo.GetVersion(ctx, searchReq.PackageId, searchReq.Version)
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
	tags, err := o.operationRepository.GetOperationsTags(ctx, searchQuery, skipRefs)
	if err != nil {
		return nil, err
	}

	return &view.OperationTags{Tags: tags}, nil
}

func (o operationServiceImpl) GetOperationChanges(ctx context.Context, packageId string, version string, operationId string, previousPackageId string, previousVersion string, severities []string) (*view.OperationChangesView, error) {
	versionEnt, err := o.publishedRepo.GetVersion(ctx, packageId, version)
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
	previousVersionEnt, err := o.publishedRepo.GetVersion(ctx, previousPackageId, previousVersion)
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
	versionComparison, err := o.publishedRepo.GetVersionComparison(ctx, comparisonId)
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
	changedOperationEnt, err := o.operationRepository.GetOperationChanges(ctx, comparisonId, operationId, severities)
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

func (o operationServiceImpl) GetVersionChanges(ctx context.Context, packageId string, version string, apiType string, searchReq view.VersionChangesReq) (*view.VersionChangesView, error) {
	versionEnt, err := o.publishedRepo.GetVersion(ctx, packageId, version)
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
	previousVersionEnt, err := o.publishedRepo.GetVersion(ctx, searchReq.PreviousVersionPackageId, searchReq.PreviousVersion)
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

	versionComparison, err := o.publishedRepo.GetVersionComparison(ctx, comparisonId)
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
		ComparisonId:     comparisonId,
		ApiType:          apiType,
		ApiKind:          searchReq.ApiKind,
		TextFilter:       searchReq.TextFilter,
		DocumentSlug:     searchReq.DocumentSlug,
		Tags:             searchReq.Tags,
		EmptyTag:         searchReq.EmptyTag,
		RefPackageId:     searchReq.RefPackageId,
		Limit:            searchReq.Limit,
		Offset:           searchReq.Offset,
		EmptyGroup:       searchReq.EmptyGroup,
		Group:            searchReq.Group,
		GroupPackageId:   versionEnt.PackageId,
		GroupVersion:     versionEnt.Version,
		GroupRevision:    versionEnt.Revision,
		Severities:       searchReq.Severities,
		ApiAudience:      searchReq.ApiAudience,
		AsyncapiChannel:  searchReq.AsyncapiChannel,
		AsyncapiProtocol: searchReq.AsyncapiProtocol,
	}
	operationComparisons := make([]interface{}, 0)
	changelogOperationEnts, err := o.operationRepository.GetChangelog(ctx, searchQuery)
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
	packagesRefs, err := o.packageVersionEnrichmentService.GetPackageVersionRefsMap(ctx, packageVersions)
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

func (o operationServiceImpl) GlobalSearchForOperations(ctx context.Context, searchReq view.SearchQueryReq) (*view.SearchResult, error) {
	log.Debugf(
		"GlobalSearchForOperations called: searchString=%q apiType=%s workspace=%s status=%s packageIds=%v versions=%v startDate=%v endDate=%v limit=%d page=%d",
		searchReq.SearchString,
		searchReq.ApiType,
		searchReq.Workspace,
		searchReq.Status,
		searchReq.PackageIds,
		searchReq.Versions,
		searchReq.PublicationDateInterval.StartDate,
		searchReq.PublicationDateInterval.EndDate,
		searchReq.Limit,
		searchReq.Page,
	)

	packages := searchReq.PackageIds
	if packages == nil {
		packages = make([]string, 0)
	}
	versions := searchReq.Versions
	if versions == nil {
		versions = make([]string, 0)
	}

	startDate := searchReq.PublicationDateInterval.StartDate
	endDate := searchReq.PublicationDateInterval.EndDate
	if startDate.IsZero() {
		startDate = time.Unix(0, 0) // January 1, 1970
	}
	if endDate.IsZero() {
		endDate = time.Unix(2556057600, 0) // December 31, 2050
	}

	searchQuery := &entity.GlobalOperationSearchQuery{
		OriginalTextInput: searchReq.SearchString,
		ApiType:           searchReq.ApiType,
		Packages:          packages,
		Versions:          versions,
		Status:            searchReq.Status,
		StartDate:         startDate,
		EndDate:           endDate,
		Limit:             searchReq.Limit,
		Offset:            searchReq.Limit * searchReq.Page,
	}

	repoSearchStart := time.Now()
	operationEntities, err := o.operationRepository.GlobalSearchForOperations(ctx, searchQuery)
	repoSearchElapsed := time.Since(repoSearchStart)
	if err != nil {
		log.Debugf("GlobalSearchForOperations: repository search finished with error after %s: %v", repoSearchElapsed, err)
		return nil, err
	}
	log.Debugf("GlobalSearchForOperations: repository search finished in %s, resultCount=%d", repoSearchElapsed, len(operationEntities))
	operations := make([]interface{}, 0)
	for _, ent := range operationEntities {
		operations = append(operations, entity.MakeGlobalOperationSearchResultView(ent))
	}

	return &view.SearchResult{Operations: &operations}, nil
}

func (o operationServiceImpl) GetOperationModelUsages(ctx context.Context, packageId string, version string, apiType string, operationId string, modelName string) (*view.OperationModelUsages, error) {
	versionEnt, err := o.publishedRepo.GetVersion(ctx, packageId, version)
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
	operationEnt, err := o.operationRepository.GetOperationById(ctx, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, apiType, operationId, false)
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
	operationsWithModel, err := o.operationRepository.GetOperationsByModelHash(ctx, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision, apiType, modelHash)
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

func (o operationServiceImpl) GetOperationChangesSummary(ctx context.Context, packageId string, version string, operationId string, previousPackageId string, previousVersion string, refPackageId string) (*view.ChangeSummary, error) {
	versionEnt, err := o.publishedRepo.GetVersion(ctx, packageId, version)
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
	previousVersionEnt, err := o.publishedRepo.GetVersion(ctx, previousPackageId, previousVersion)
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

	changedOperationSummaryEnt, err := o.operationRepository.GetOperationChangesSummary(ctx, comparisonId, operationId, refPackageId)
	if err != nil {
		return nil, err
	}
	if changedOperationSummaryEnt == nil {
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

	return &changedOperationSummaryEnt.ChangesSummary, nil
}
