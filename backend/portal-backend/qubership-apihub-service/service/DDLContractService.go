package service

import (
	"context"
	"net/http"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type DDLContractService interface {
	ListDdlEntities(ctx context.Context, packageId, versionName, refPackageId, textFilter string, limit, offset int) (*view.DdlEntityListView, error)
	GetDdlEntity(ctx context.Context, packageId, versionName, ddlEntityId string) (*view.DdlEntityDetailView, error)
	GetDdlEntityChanges(ctx context.Context, packageId, versionName, ddlEntityId, previousVersionDdlEntityId, previousVersion, previousVersionPackageId, refPackageId string, severities []string) (*view.DdlEntityChangesView, error)
	GetDdlEntityChangesSummary(ctx context.Context, packageId, versionName, ddlEntityId, previousVersion, previousVersionPackageId, refPackageId string) (*view.ChangeSummary, error)
	GetChangedDdlEntities(ctx context.Context, packageId, versionName string, req view.DdlChangesReq) (*view.DdlChangedEntitiesView, error)
	GetVersionSummary(ctx context.Context, packageId, versionName string) (*view.DdlVersionContractSummary, error)
	GetChangesSummary(ctx context.Context, comparisonId string) (*view.DDLContractsSummary, error)
	GlobalSearchForDDL(ctx context.Context, searchReq view.SearchQueryReq) (*view.SearchResult, error)
}

func NewDDLContractService(ddlRepo repository.DDLContractRepository, publishedRepo repository.PublishedRepository, packageVersionEnrichmentService PackageVersionEnrichmentService) DDLContractService {
	return &ddlContractServiceImpl{ddlRepo: ddlRepo, publishedRepo: publishedRepo, packageVersionEnrichmentService: packageVersionEnrichmentService}
}

type ddlContractServiceImpl struct {
	ddlRepo                         repository.DDLContractRepository
	publishedRepo                   repository.PublishedRepository
	packageVersionEnrichmentService PackageVersionEnrichmentService
}

// checkRefPackageIdSupported rejects the refPackageId parameter for non-dashboard packages,
// matching the operations endpoints' behaviour. Shared by the DDL and MCP contract services.
func checkRefPackageIdSupported(ctx context.Context, publishedRepo repository.PublishedRepository, packageId string, refPackageId string) error {
	if refPackageId == "" {
		return nil
	}
	packageEnt, err := publishedRepo.GetPackage(ctx, packageId)
	if err != nil {
		return err
	}
	if packageEnt == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PackageNotFound,
			Message: exception.PackageNotFoundMsg,
			Params:  map[string]interface{}{"packageId": packageId},
		}
	}
	if packageEnt.Kind != entity.KIND_DASHBOARD {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.UnsupportedQueryParam,
			Message: exception.UnsupportedQueryParamMsg,
			Params:  map[string]interface{}{"param": "refPackageId"},
		}
	}
	return nil
}

func (s *ddlContractServiceImpl) resolveRevision(ctx context.Context, packageId, versionName string) (string, int, error) {
	version, err := s.publishedRepo.GetVersion(ctx, packageId, versionName)
	if err != nil {
		return "", 0, err
	}
	if version == nil {
		return "", 0, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedVersionNotFound,
			Message: exception.PublishedVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": versionName},
		}
	}
	return version.Version, version.Revision, nil
}

// resolveComparison resolves the comparison id between the requested version and a previous version,
// mirroring OperationService.GetVersionChanges. previousVersion/previousVersionPackageId default to
// the version's own recorded previous version when omitted.
func (s *ddlContractServiceImpl) resolveComparison(ctx context.Context, packageId, versionName, previousVersion, previousVersionPackageId string) (comparisonId, previousVersionRefKey, previousVersionPackageIdResolved string, err error) {
	versionEnt, err := s.publishedRepo.GetVersion(ctx, packageId, versionName)
	if err != nil {
		return "", "", "", err
	}
	if versionEnt == nil {
		return "", "", "", &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedVersionNotFound,
			Message: exception.PublishedVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": versionName},
		}
	}
	if previousVersion == "" || previousVersionPackageId == "" {
		if versionEnt.PreviousVersion == "" {
			return "", "", "", &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.NoPreviousVersion,
				Message: exception.NoPreviousVersionMsg,
				Params:  map[string]interface{}{"version": versionName},
			}
		}
		previousVersion = versionEnt.PreviousVersion
		if versionEnt.PreviousVersionPackageId != "" {
			previousVersionPackageId = versionEnt.PreviousVersionPackageId
		} else {
			previousVersionPackageId = packageId
		}
	}
	previousVersionEnt, err := s.publishedRepo.GetVersion(ctx, previousVersionPackageId, previousVersion)
	if err != nil {
		return "", "", "", err
	}
	if previousVersionEnt == nil {
		return "", "", "", &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedVersionNotFound,
			Message: exception.PublishedVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": previousVersion, "packageId": previousVersionPackageId},
		}
	}
	comparisonId = view.MakeVersionComparisonId(
		versionEnt.PackageId, versionEnt.Version, versionEnt.Revision,
		previousVersionEnt.PackageId, previousVersionEnt.Version, previousVersionEnt.Revision,
	)
	return comparisonId, view.MakeVersionRefKey(previousVersionEnt.Version, previousVersionEnt.Revision), previousVersionEnt.PackageId, nil
}

func (s *ddlContractServiceImpl) ListDdlEntities(ctx context.Context, packageId, versionName, refPackageId, textFilter string, limit, offset int) (*view.DdlEntityListView, error) {
	if err := checkRefPackageIdSupported(ctx, s.publishedRepo, packageId, refPackageId); err != nil {
		return nil, err
	}
	version, revision, err := s.resolveRevision(ctx, packageId, versionName)
	if err != nil {
		return nil, err
	}
	entities, err := s.ddlRepo.ListDdlEntities(ctx, packageId, version, revision, refPackageId, textFilter, limit, offset)
	if err != nil {
		return nil, err
	}
	result := &view.DdlEntityListView{Entities: make([]interface{}, 0, len(entities))}
	packageVersions := make(map[string][]string)
	for _, ent := range entities {
		result.Entities = append(result.Entities, entity.MakeDdlContractEntityView(ent, nil))
		packageVersions[ent.PackageId] = append(packageVersions[ent.PackageId], view.MakeVersionRefKey(ent.Version, ent.Revision))
	}
	packagesRefs, err := s.packageVersionEnrichmentService.GetPackageVersionRefsMap(ctx, packageVersions)
	if err != nil {
		return nil, err
	}
	result.Packages = packagesRefs
	return result, nil
}

func (s *ddlContractServiceImpl) GetDdlEntity(ctx context.Context, packageId, versionName, ddlEntityId string) (*view.DdlEntityDetailView, error) {
	version, revision, err := s.resolveRevision(ctx, packageId, versionName)
	if err != nil {
		return nil, err
	}
	ent, data, err := s.ddlRepo.GetDdlEntity(ctx, packageId, version, revision, ddlEntityId)
	if err != nil {
		return nil, err
	}
	if ent == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.DdlEntityNotFound,
			Message: exception.DdlEntityNotFoundMsg,
			Params:  map[string]interface{}{"ddlEntityId": ddlEntityId},
		}
	}
	return &view.DdlEntityDetailView{
		DdlContractEntityView: *entity.MakeDdlContractEntityView(ent, data),
	}, nil
}

func (s *ddlContractServiceImpl) GetDdlEntityChanges(ctx context.Context, packageId, versionName, ddlEntityId, previousVersionDdlEntityId, previousVersion, previousVersionPackageId, refPackageId string, severities []string) (*view.DdlEntityChangesView, error) {
	if err := checkRefPackageIdSupported(ctx, s.publishedRepo, packageId, refPackageId); err != nil {
		return nil, err
	}
	comparisonId, _, _, err := s.resolveComparison(ctx, packageId, versionName, previousVersion, previousVersionPackageId)
	if err != nil {
		return nil, err
	}
	ent, err := s.ddlRepo.GetDdlEntityChanges(ctx, comparisonId, ddlEntityId, previousVersionDdlEntityId, refPackageId, severities)
	if err != nil {
		return nil, err
	}
	if ent == nil {
		return &view.DdlEntityChangesView{Changes: []interface{}{}}, nil
	}
	var changes []interface{}
	if ent.Changes != nil {
		if list, ok := ent.Changes.([]interface{}); ok {
			changes = list
		}
	}
	if changes == nil {
		changes = []interface{}{}
	}
	return &view.DdlEntityChangesView{Changes: changes}, nil
}

func (s *ddlContractServiceImpl) GetDdlEntityChangesSummary(ctx context.Context, packageId, versionName, ddlEntityId, previousVersion, previousVersionPackageId, refPackageId string) (*view.ChangeSummary, error) {
	if err := checkRefPackageIdSupported(ctx, s.publishedRepo, packageId, refPackageId); err != nil {
		return nil, err
	}
	comparisonId, _, _, err := s.resolveComparison(ctx, packageId, versionName, previousVersion, previousVersionPackageId)
	if err != nil {
		return nil, err
	}
	return s.ddlRepo.GetDdlEntityChangesSummary(ctx, comparisonId, ddlEntityId, refPackageId)
}

func (s *ddlContractServiceImpl) GetChangedDdlEntities(ctx context.Context, packageId, versionName string, req view.DdlChangesReq) (*view.DdlChangedEntitiesView, error) {
	if err := checkRefPackageIdSupported(ctx, s.publishedRepo, packageId, req.RefPackageId); err != nil {
		return nil, err
	}
	comparisonId, previousVersionRefKey, previousVersionPackageId, err := s.resolveComparison(ctx, packageId, versionName, req.PreviousVersion, req.PreviousVersionPackageId)
	if err != nil {
		return nil, err
	}
	entities, err := s.ddlRepo.ListChangedDdlEntities(ctx, comparisonId, req.RefPackageId, req.Severities, req.TextFilter, req.Limit, req.Offset)
	if err != nil {
		return nil, err
	}
	result := &view.DdlChangedEntitiesView{
		PreviousVersion:          previousVersionRefKey,
		PreviousVersionPackageId: previousVersionPackageId,
		Entities:                 make([]interface{}, 0, len(entities)),
	}
	packageVersions := make(map[string][]string)
	for _, ent := range entities {
		result.Entities = append(result.Entities, entity.MakeDdlChangedEntityView(ent))
		if ent.DdlEntityId != "" {
			packageVersions[ent.PackageId] = append(packageVersions[ent.PackageId], view.MakeVersionRefKey(ent.Version, ent.Revision))
		}
		if ent.PreviousDdlEntityId != "" {
			packageVersions[ent.PreviousPackageId] = append(packageVersions[ent.PreviousPackageId], view.MakeVersionRefKey(ent.PreviousVersion, ent.PreviousRevision))
		}
	}
	packagesRefs, err := s.packageVersionEnrichmentService.GetPackageVersionRefsMap(ctx, packageVersions)
	if err != nil {
		return nil, err
	}
	result.Packages = packagesRefs
	return result, nil
}

func (s *ddlContractServiceImpl) GetVersionSummary(ctx context.Context, packageId, versionName string) (*view.DdlVersionContractSummary, error) {
	versionEnt, err := s.publishedRepo.GetVersion(ctx, packageId, versionName)
	if err != nil {
		return nil, err
	}
	if versionEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedVersionNotFound,
			Message: exception.PublishedVersionNotFoundMsg,
			Params:  map[string]interface{}{"version": versionName},
		}
	}
	counts, err := s.ddlRepo.GetEntitiesCount(ctx, versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)
	if err != nil {
		return nil, err
	}

	var changesSummary, numberOfImpactedEntities *view.ChangeSummary
	if versionEnt.PreviousVersion != "" {
		previousPackageId := versionEnt.PreviousVersionPackageId
		if previousPackageId == "" {
			previousPackageId = packageId
		}
		previousVersionEnt, err := s.publishedRepo.GetVersion(ctx, previousPackageId, versionEnt.PreviousVersion)
		if err != nil {
			return nil, err
		}
		if previousVersionEnt != nil {
			comparisonId := view.MakeVersionComparisonId(
				versionEnt.PackageId, versionEnt.Version, versionEnt.Revision,
				previousVersionEnt.PackageId, previousVersionEnt.Version, previousVersionEnt.Revision,
			)
			changesSummary, numberOfImpactedEntities, err = s.getComparisonSummaryWithRefs(ctx, comparisonId)
			if err != nil {
				return nil, err
			}
		}
	}

	if len(counts) == 0 && changesSummary == nil && numberOfImpactedEntities == nil {
		return nil, nil
	}

	summary := &view.DdlVersionContractSummary{
		ChangesSummary:           changesSummary,
		NumberOfImpactedEntities: numberOfImpactedEntities,
	}
	for _, c := range counts {
		if c.Kind == view.DdlKindTable {
			summary.TablesCount = c.Count
		}
	}
	return summary, nil
}

// getComparisonSummaryWithRefs folds the DDL contract summaries of the comparison and of its refs
// (a dashboard's per-reference comparisons), mirroring how getVersionOperationTypes sums the
// per-ref operation types for dashboard version content.
func (s *ddlContractServiceImpl) getComparisonSummaryWithRefs(ctx context.Context, comparisonId string) (*view.ChangeSummary, *view.ChangeSummary, error) {
	comparison, err := s.publishedRepo.GetVersionComparison(ctx, comparisonId)
	if err != nil {
		return nil, nil, err
	}
	if comparison == nil {
		return nil, nil, nil
	}
	var changesSummary, numberOfImpactedEntities *view.ChangeSummary
	fold := func(contractTypes []view.ContractType) {
		for _, contractType := range contractTypes {
			if contractType.ContractType != view.ContractTypeDdl {
				continue
			}
			if changesSummary == nil {
				changesSummary = &view.ChangeSummary{}
				numberOfImpactedEntities = &view.ChangeSummary{}
			}
			changesSummary.Add(contractType.ChangesSummary)
			numberOfImpactedEntities.Add(contractType.NumberOfImpactedEntities)
		}
	}
	fold(comparison.ContractTypes)
	if len(comparison.Refs) > 0 {
		refsComparisons, err := s.publishedRepo.GetVersionRefsComparisons(ctx, comparisonId)
		if err != nil {
			return nil, nil, err
		}
		for _, refComparison := range refsComparisons {
			fold(refComparison.ContractTypes)
		}
	}
	return changesSummary, numberOfImpactedEntities, nil
}

func (s *ddlContractServiceImpl) GetChangesSummary(ctx context.Context, comparisonId string) (*view.DDLContractsSummary, error) {
	changesSummary, numberOfImpactedEntities, err := s.ddlRepo.GetComparisonSummary(ctx, comparisonId)
	if err != nil {
		return nil, err
	}
	if changesSummary == nil && numberOfImpactedEntities == nil {
		return nil, nil
	}
	result := &view.DDLContractsSummary{}
	if changesSummary != nil {
		result.ChangesSummary = *changesSummary
	}
	if numberOfImpactedEntities != nil {
		result.NumberOfImpactedEntities = *numberOfImpactedEntities
	}
	return result, nil
}

func (s *ddlContractServiceImpl) GlobalSearchForDDL(ctx context.Context, searchReq view.SearchQueryReq) (*view.SearchResult, error) {
	versions := searchReq.Versions
	if versions == nil {
		versions = make([]string, 0)
	}
	startDate := searchReq.PublicationDateInterval.StartDate
	endDate := searchReq.PublicationDateInterval.EndDate
	if startDate.IsZero() {
		startDate = time.Unix(0, 0)
	}
	if endDate.IsZero() {
		endDate = time.Unix(2556057600, 0)
	}
	searchQuery := &entity.GlobalContractSearchQuery{
		OriginalTextInput: searchReq.SearchString,
		Kinds:             make([]string, 0),
		WorkspaceId:       searchReq.Workspace,
		Packages:          searchReq.PackageIds,
		VisibleRoots:      searchReq.VisiblePackageRoots,
		Versions:          versions,
		Status:            searchReq.Status,
		StartDate:         startDate,
		EndDate:           endDate,
		Limit:             searchReq.Limit,
		Offset:            searchReq.Limit * searchReq.Page,
	}
	if searchQuery.Packages == nil {
		searchQuery.Packages = make([]string, 0)
	}
	if searchQuery.VisibleRoots == nil {
		searchQuery.VisibleRoots = make([]string, 0)
	}
	entities, err := s.ddlRepo.GlobalSearchForDDL(ctx, searchQuery)
	if err != nil {
		return nil, err
	}
	results := make([]view.DdlContractSearchResult, 0, len(entities))
	for _, ent := range entities {
		results = append(results, entity.MakeGlobalDDLSearchResultView(ent))
	}
	return &view.SearchResult{DdlContracts: &results}, nil
}
