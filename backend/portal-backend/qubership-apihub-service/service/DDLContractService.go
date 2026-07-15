package service

import (
	"net/http"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type DDLContractService interface {
	ListDdlEntities(packageId, versionName, textFilter string, limit, offset int) (*view.DdlEntityListView, error)
	GetDdlEntity(packageId, versionName, ddlEntityId string, includeData bool) (*view.DdlEntityDetailView, error)
	GetDdlEntityChanges(packageId, versionName, ddlEntityId, previousVersion, previousVersionPackageId string, severities []string) (*view.DdlEntityChangesView, error)
	GetDdlEntityChangesSummary(packageId, versionName, ddlEntityId, previousVersion, previousVersionPackageId string) (*view.ChangeSummary, error)
	GetChangedDdlEntities(packageId, versionName string, req view.DdlChangesReq) (*view.DdlChangedEntitiesView, error)
	GetVersionSummary(packageId, versionName string) (*view.DdlVersionContractSummary, error)
	GetChangesSummary(comparisonId string) (*view.DDLContractsSummary, error)
	GlobalSearchForDDL(searchReq view.SearchQueryReq) (*view.SearchResult, error)
}

func NewDDLContractService(ddlRepo repository.DDLContractRepository, publishedRepo repository.PublishedRepository, packageVersionEnrichmentService PackageVersionEnrichmentService) DDLContractService {
	return &ddlContractServiceImpl{ddlRepo: ddlRepo, publishedRepo: publishedRepo, packageVersionEnrichmentService: packageVersionEnrichmentService}
}

type ddlContractServiceImpl struct {
	ddlRepo                         repository.DDLContractRepository
	publishedRepo                   repository.PublishedRepository
	packageVersionEnrichmentService PackageVersionEnrichmentService
}

func (s *ddlContractServiceImpl) resolveRevision(packageId, versionName string) (string, int, error) {
	version, err := s.publishedRepo.GetVersion(packageId, versionName)
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
func (s *ddlContractServiceImpl) resolveComparison(packageId, versionName, previousVersion, previousVersionPackageId string) (comparisonId, previousVersionRefKey, previousVersionPackageIdResolved string, err error) {
	versionEnt, err := s.publishedRepo.GetVersion(packageId, versionName)
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
	previousVersionEnt, err := s.publishedRepo.GetVersion(previousVersionPackageId, previousVersion)
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

func (s *ddlContractServiceImpl) ListDdlEntities(packageId, versionName, textFilter string, limit, offset int) (*view.DdlEntityListView, error) {
	version, revision, err := s.resolveRevision(packageId, versionName)
	if err != nil {
		return nil, err
	}
	entities, err := s.ddlRepo.ListDdlEntities(packageId, version, revision, textFilter, limit, offset)
	if err != nil {
		return nil, err
	}
	result := &view.DdlEntityListView{Entities: make([]interface{}, 0, len(entities))}
	packageVersions := make(map[string][]string)
	for _, ent := range entities {
		result.Entities = append(result.Entities, entity.MakeDdlContractEntityView(ent, nil))
		packageVersions[ent.PackageId] = append(packageVersions[ent.PackageId], view.MakeVersionRefKey(ent.Version, ent.Revision))
	}
	packagesRefs, err := s.packageVersionEnrichmentService.GetPackageVersionRefsMap(packageVersions)
	if err != nil {
		return nil, err
	}
	result.Packages = packagesRefs
	return result, nil
}

func (s *ddlContractServiceImpl) GetDdlEntity(packageId, versionName, ddlEntityId string, includeData bool) (*view.DdlEntityDetailView, error) {
	version, revision, err := s.resolveRevision(packageId, versionName)
	if err != nil {
		return nil, err
	}
	ent, data, err := s.ddlRepo.GetDdlEntity(packageId, version, revision, ddlEntityId, includeData)
	if err != nil {
		return nil, err
	}
	if ent == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PublishedVersionNotFound,
			Message: "DDL entity not found",
			Params:  map[string]interface{}{"ddlEntityId": ddlEntityId},
		}
	}
	packageVersions := map[string][]string{ent.PackageId: {view.MakeVersionRefKey(ent.Version, ent.Revision)}}
	packagesRefs, err := s.packageVersionEnrichmentService.GetPackageVersionRefsMap(packageVersions)
	if err != nil {
		return nil, err
	}
	return &view.DdlEntityDetailView{
		DdlContractEntityView: *entity.MakeDdlContractEntityView(ent, data),
		Packages:              packagesRefs,
	}, nil
}

func (s *ddlContractServiceImpl) GetDdlEntityChanges(packageId, versionName, ddlEntityId, previousVersion, previousVersionPackageId string, severities []string) (*view.DdlEntityChangesView, error) {
	comparisonId, _, _, err := s.resolveComparison(packageId, versionName, previousVersion, previousVersionPackageId)
	if err != nil {
		return nil, err
	}
	ent, err := s.ddlRepo.GetDdlEntityChanges(comparisonId, ddlEntityId, severities)
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

func (s *ddlContractServiceImpl) GetDdlEntityChangesSummary(packageId, versionName, ddlEntityId, previousVersion, previousVersionPackageId string) (*view.ChangeSummary, error) {
	comparisonId, _, _, err := s.resolveComparison(packageId, versionName, previousVersion, previousVersionPackageId)
	if err != nil {
		return nil, err
	}
	return s.ddlRepo.GetDdlEntityChangesSummary(comparisonId, ddlEntityId)
}

func (s *ddlContractServiceImpl) GetChangedDdlEntities(packageId, versionName string, req view.DdlChangesReq) (*view.DdlChangedEntitiesView, error) {
	comparisonId, previousVersionRefKey, previousVersionPackageId, err := s.resolveComparison(packageId, versionName, req.PreviousVersion, req.PreviousVersionPackageId)
	if err != nil {
		return nil, err
	}
	entities, err := s.ddlRepo.ListChangedDdlEntities(comparisonId, req.RefPackageId, req.Severities, req.TextFilter, req.Limit, req.Offset)
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
	packagesRefs, err := s.packageVersionEnrichmentService.GetPackageVersionRefsMap(packageVersions)
	if err != nil {
		return nil, err
	}
	result.Packages = packagesRefs
	return result, nil
}

func (s *ddlContractServiceImpl) GetVersionSummary(packageId, versionName string) (*view.DdlVersionContractSummary, error) {
	versionEnt, err := s.publishedRepo.GetVersion(packageId, versionName)
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
	counts, err := s.ddlRepo.GetEntitiesCount(versionEnt.PackageId, versionEnt.Version, versionEnt.Revision)
	if err != nil {
		return nil, err
	}

	var changesSummary, numberOfImpactedEntities *view.ChangeSummary
	if versionEnt.PreviousVersion != "" {
		previousPackageId := versionEnt.PreviousVersionPackageId
		if previousPackageId == "" {
			previousPackageId = packageId
		}
		previousVersionEnt, err := s.publishedRepo.GetVersion(previousPackageId, versionEnt.PreviousVersion)
		if err != nil {
			return nil, err
		}
		if previousVersionEnt != nil {
			comparisonId := view.MakeVersionComparisonId(
				versionEnt.PackageId, versionEnt.Version, versionEnt.Revision,
				previousVersionEnt.PackageId, previousVersionEnt.Version, previousVersionEnt.Revision,
			)
			changesSummary, numberOfImpactedEntities, err = s.ddlRepo.GetComparisonSummary(comparisonId)
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

func (s *ddlContractServiceImpl) GetChangesSummary(comparisonId string) (*view.DDLContractsSummary, error) {
	changesSummary, numberOfImpactedEntities, err := s.ddlRepo.GetComparisonSummary(comparisonId)
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

func (s *ddlContractServiceImpl) GlobalSearchForDDL(searchReq view.SearchQueryReq) (*view.SearchResult, error) {
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
		Packages:          searchReq.PackageIds,
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
	entities, err := s.ddlRepo.GlobalSearchForDDL(searchQuery)
	if err != nil {
		return nil, err
	}
	results := make([]interface{}, 0, len(entities))
	for _, ent := range entities {
		results = append(results, entity.MakeGlobalDDLSearchResultView(ent))
	}
	return &view.SearchResult{DdlContracts: &results}, nil
}
