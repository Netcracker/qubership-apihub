package service

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type MCPContractService interface {
	ListMcpEntities(ctx context.Context, packageId, versionName, kind, mcpEndpoint, refPackageId, textFilter string, limit, offset int) (*view.McpEntityListView, error)
	GetMcpEntity(ctx context.Context, packageId, versionName, mcpEntityId string) (interface{}, error)
	GetVersionSummary(ctx context.Context, packageId, versionName string) (map[string]view.McpEndpointSummary, error)
	GlobalSearchForMCP(ctx context.Context, searchReq view.SearchQueryReq) (*view.SearchResult, error)
}

func NewMCPContractService(mcpRepo repository.MCPContractRepository, publishedRepo repository.PublishedRepository, packageVersionEnrichmentService PackageVersionEnrichmentService) MCPContractService {
	return &mcpContractServiceImpl{mcpRepo: mcpRepo, publishedRepo: publishedRepo, packageVersionEnrichmentService: packageVersionEnrichmentService}
}

type mcpContractServiceImpl struct {
	mcpRepo                         repository.MCPContractRepository
	publishedRepo                   repository.PublishedRepository
	packageVersionEnrichmentService PackageVersionEnrichmentService
}

func (s *mcpContractServiceImpl) resolveRevision(ctx context.Context, packageId, versionName string) (string, int, error) {
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

func (s *mcpContractServiceImpl) ListMcpEntities(ctx context.Context, packageId, versionName, kind, mcpEndpoint, refPackageId, textFilter string, limit, offset int) (*view.McpEntityListView, error) {
	if err := checkRefPackageIdSupported(ctx, s.publishedRepo, packageId, refPackageId); err != nil {
		return nil, err
	}
	version, revision, err := s.resolveRevision(ctx, packageId, versionName)
	if err != nil {
		return nil, err
	}
	entities, err := s.mcpRepo.ListMcpEntities(ctx, packageId, version, revision, kind, mcpEndpoint, refPackageId, textFilter, limit, offset)
	if err != nil {
		return nil, err
	}
	result := &view.McpEntityListView{Entities: make([]interface{}, 0, len(entities))}
	packageVersions := make(map[string][]string)
	for _, ent := range entities {
		result.Entities = append(result.Entities, entity.MakeMcpEntityView(ent))
		packageVersions[ent.PackageId] = append(packageVersions[ent.PackageId], view.MakeVersionRefKey(ent.Version, ent.Revision))
	}
	packagesRefs, err := s.packageVersionEnrichmentService.GetPackageVersionRefsMap(ctx, packageVersions)
	if err != nil {
		return nil, err
	}
	result.Packages = packagesRefs
	return result, nil
}

func (s *mcpContractServiceImpl) GetMcpEntity(ctx context.Context, packageId, versionName, mcpEntityId string) (interface{}, error) {
	version, revision, err := s.resolveRevision(ctx, packageId, versionName)
	if err != nil {
		return nil, err
	}
	ent, data, err := s.mcpRepo.GetMcpEntity(ctx, packageId, version, revision, mcpEntityId)
	if err != nil {
		return nil, err
	}
	if ent == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.McpEntityNotFound,
			Message: exception.McpEntityNotFoundMsg,
			Params:  map[string]interface{}{"mcpEntityId": mcpEntityId},
		}
	}
	detail := view.McpEntityDetailView{McpEntityView: *entity.MakeMcpEntityView(ent)}
	if len(data) > 0 {
		var parsed interface{}
		if err := json.Unmarshal(data, &parsed); err == nil {
			detail.Data = parsed
		}
	}
	return detail, nil
}

func (s *mcpContractServiceImpl) GetVersionSummary(ctx context.Context, packageId, versionName string) (map[string]view.McpEndpointSummary, error) {
	version, revision, err := s.resolveRevision(ctx, packageId, versionName)
	if err != nil {
		return nil, err
	}
	counts, err := s.mcpRepo.GetEntitiesCountByEndpoint(ctx, packageId, version, revision)
	if err != nil {
		return nil, err
	}
	if len(counts) == 0 {
		return nil, nil
	}
	summary := make(map[string]view.McpEndpointSummary)
	for _, c := range counts {
		endpointSummary := summary[c.McpEndpoint]
		switch c.Kind {
		case view.McpKindTool:
			endpointSummary.ToolsCount = c.Count
		case view.McpKindPrompt:
			endpointSummary.PromptsCount = c.Count
		case view.McpKindResource:
			endpointSummary.ResourcesCount = c.Count
		}
		summary[c.McpEndpoint] = endpointSummary
	}
	if len(summary) == 0 {
		return nil, nil
	}
	return summary, nil
}

func (s *mcpContractServiceImpl) GlobalSearchForMCP(ctx context.Context, searchReq view.SearchQueryReq) (*view.SearchResult, error) {
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
	entities, err := s.mcpRepo.GlobalSearchForMCP(ctx, searchQuery)
	if err != nil {
		return nil, err
	}
	results := make([]view.McpEntitySearchResult, 0, len(entities))
	for _, ent := range entities {
		results = append(results, entity.MakeGlobalMCPSearchResultView(ent))
	}
	return &view.SearchResult{McpContracts: &results}, nil
}
