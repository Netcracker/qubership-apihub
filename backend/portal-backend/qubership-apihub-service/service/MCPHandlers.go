package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/metrics"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/mark3labs/mcp-go/mcp"
	log "github.com/sirupsen/logrus"
)

func withInjectedMCPArg(req mcp.CallToolRequest, key string, value any) mcp.CallToolRequest {
	src, _ := req.Params.Arguments.(map[string]any)
	args := make(map[string]any, len(src)+1)
	for k, v := range src {
		args[k] = v
	}
	if _, exists := args[key]; !exists {
		args[key] = value
	}
	req.Params.Arguments = args
	return req
}

func mcpLegacyMetricKey(ctx context.Context, packageOrGroup string) string {
	return MCPClientLabelFromCtx(ctx) + "|" + packageOrGroup
}

func validateMCPGroup(group, workspace string) error {
	if workspace != "" && !strings.HasPrefix(group, workspace) {
		log.Errorf("Group parameter should start with %s. Given: %s", workspace, group)
		return fmt.Errorf("Requested package is not allowed for search, only packages from workspace %s are allowed", workspace)
	}
	return nil
}

func (m mcpService) ExecuteLegacyRestSearchTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	mcpWorkspace := m.systemInfoService.GetAiMCPConfig().Workspace
	group := req.GetString("group", mcpWorkspace)
	if err := validateMCPGroup(group, mcpWorkspace); err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	m.monitoringService.IncreaseBusinessMetricCounter(
		UserIDFromMCPCtx(ctx),
		metrics.MCPLegacySearchToolCalled,
		mcpLegacyMetricKey(ctx, group),
	)
	log.Infof("%s: delegating to %s with apiType=rest", LegacyToolNameSearchRestOperations, ToolNameSearchOperations)
	return m.ExecuteSearchTool(ctx, withInjectedMCPArg(req, "apiType", string(view.RestApiType)))
}

func (m mcpService) ExecuteLegacyRestGetSpecTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	if packageId, err := req.RequireString("packageId"); err == nil {
		m.monitoringService.IncreaseBusinessMetricCounter(
			UserIDFromMCPCtx(ctx),
			metrics.MCPLegacyGetSpecToolCalled,
			mcpLegacyMetricKey(ctx, packageId),
		)
	}
	log.Infof("%s: delegating to %s with apiType=rest", LegacyToolNameGetRestOperationSpec, ToolNameGetOperationSpec)
	return m.ExecuteGetSpecTool(ctx, withInjectedMCPArg(req, "apiType", string(view.RestApiType)))
}

func (m mcpService) ExecuteLegacyRestGetOperationDiffTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	if packageId, err := req.RequireString("packageId"); err == nil {
		m.monitoringService.IncreaseBusinessMetricCounter(
			UserIDFromMCPCtx(ctx),
			metrics.MCPLegacyGetDiffToolCalled,
			mcpLegacyMetricKey(ctx, packageId),
		)
	}
	log.Infof("%s: delegating to %s with apiType=rest", LegacyToolNameGetRestOperationDiff, ToolNameGetOperationDiff)
	return m.ExecuteGetOperationDiffTool(ctx, withInjectedMCPArg(req, "apiType", string(view.RestApiType)))
}

// ExecuteGetSpecTool executes the get_api_operation_specification tool
func (m mcpService) ExecuteGetSpecTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	apiType, err := requireMCPApiType(req, view.RestApiType, view.AsyncapiApiType)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	operationId, err := req.RequireString("operationId")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	packageId, err := req.RequireString("packageId")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	version, err := req.RequireString("version")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	m.monitoringService.IncreaseBusinessMetricCounter(UserIDFromMCPCtx(ctx), metrics.MCPGetSpecToolCalled, mcpMetricKey(ctx, apiType, packageId))

	log.Infof("get_api_operation_specification: apiType=%s, operationId=%s, packageId=%s, version=%s", apiType, operationId, packageId, version)

	searchReq := view.OperationBasicSearchReq{
		PackageId:   packageId,
		Version:     version,
		OperationId: operationId,
		ApiType:     apiType,
		IncludeData: true,
	}

	operationViewInterface, err := m.operationService.GetOperation(searchReq)
	if err != nil {
		return nil, err
	}

	operationData, err := extractOperationData(operationViewInterface)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	payload := map[string]any{"operationData": operationData}

	// Log MCP tool response at debug level
	payloadJSON, _ := json.Marshal(payload)
	log.Debugf("MCP tool get_api_operation_specification response: %s", string(payloadJSON))

	return mcp.NewToolResultStructuredOnly(payload), nil
}

// ExecuteSearchTool executes the search_api_operations tool
func (m mcpService) ExecuteSearchTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	apiType, err := requireMCPApiType(req, view.RestApiType, view.GraphqlApiType, view.AsyncapiApiType)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	q, err := req.RequireString("query")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	mcpWorkspace := m.systemInfoService.GetAiMCPConfig().Workspace

	limit := req.GetInt("limit", 100)
	page := req.GetInt("page", 0)
	group := req.GetString("group", mcpWorkspace)
	releaseVersion := req.GetString("release", CalculateNearestCompletedReleaseVersion())
	if err := validateMCPGroup(group, mcpWorkspace); err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	log.Infof("search_api_operations: apiType=%s, query=%s, limit=%d, page=%d, group=%s, releaseVersion=%s", apiType, q, limit, page, group, releaseVersion)

	m.monitoringService.IncreaseBusinessMetricCounter(UserIDFromMCPCtx(ctx), metrics.MCPSearchToolCalled, mcpMetricKey(ctx, apiType, group))

	var packageIds []string
	if group != "" {
		packageIds = []string{group}
	}

	searchReq := view.SearchQueryReq{
		SearchString: q,
		ApiType:      apiType,
		PackageIds:   packageIds,
		Workspace:    mcpWorkspace,
		Versions:     []string{releaseVersion},
		Status:       "release",
		Limit:        limit,
		Page:         page,
	}

	searchResult, err := m.operationService.GlobalSearchForOperations(ctx, searchReq)
	if err != nil {
		return nil, err
	}

	operations := []interface{}{}
	if searchResult != nil && searchResult.Operations != nil {
		operations = *searchResult.Operations
	}
	payload := map[string]any{"items": transformOperations(operations)}

	// Log MCP tool response at debug level
	payloadJSON, _ := json.Marshal(payload)
	log.Debugf("MCP tool search_api_operations response: %s", string(payloadJSON))

	return mcp.NewToolResultStructuredOnly(payload), nil
}

// ExecuteGetOperationDiffTool executes the get_api_operation_diff tool
func (m mcpService) ExecuteGetOperationDiffTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	apiType, err := requireMCPApiType(req, view.RestApiType, view.AsyncapiApiType)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	operationId, err := req.RequireString("operationId")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	packageId, err := req.RequireString("packageId")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	previousVersion, err := req.RequireString("previousVersion")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	version, err := req.RequireString("version")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	m.monitoringService.IncreaseBusinessMetricCounter(UserIDFromMCPCtx(ctx), metrics.MCPGetDiffToolCalled, mcpMetricKey(ctx, apiType, packageId))

	log.Infof("get_api_operation_diff: apiType=%s, operationId=%s, packageId=%s, version=%s, previousVersion=%s", apiType, operationId, packageId, version, previousVersion)

	operationChangesView, err := m.operationService.GetOperationChanges(packageId, version, operationId, packageId, previousVersion, []string{})
	if err != nil {
		return nil, err
	}

	payload := map[string]any{"operationChangesList": operationChangesView.Changes}

	// Log MCP tool response at debug level
	payloadJSON, _ := json.Marshal(payload)
	log.Debugf("MCP tool get_api_operation_diff response: %s", string(payloadJSON))

	return mcp.NewToolResultStructuredOnly(payload), nil
}

// ExecuteGetDocumentTool executes the get_document tool
func (m mcpService) ExecuteGetDocumentTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	apiType, err := requireMCPApiType(req, view.RestApiType, view.GraphqlApiType, view.AsyncapiApiType)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	packageId, err := req.RequireString("packageId")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	version, err := req.RequireString("version")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	slug, err := req.RequireString("slug")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	m.monitoringService.IncreaseBusinessMetricCounter(UserIDFromMCPCtx(ctx), metrics.MCPGetDocumentToolCalled, mcpMetricKey(ctx, apiType, packageId))

	log.Infof("get_document: apiType=%s, packageId=%s, version=%s, slug=%s", apiType, packageId, version, slug)

	document, documentData, err := m.versionService.GetLatestContentDataBySlug(packageId, version, slug)
	if err != nil {
		return nil, err
	}
	payload, err := makeMCPDocumentPayload(apiType, document, documentData)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	log.Debugf("MCP tool get_document response: packageId=%s, version=%s, slug=%s, dataBytes=%d", packageId, version, slug, len(documentData.Data))

	return mcp.NewToolResultStructuredOnly(payload), nil
}

func mcpMetricKey(ctx context.Context, apiType string, packageId string) string {
	return apiType + "|" + MCPClientLabelFromCtx(ctx) + "|" + packageId
}
