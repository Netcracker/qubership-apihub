package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/metrics"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/secctx"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/mark3labs/mcp-go/mcp"
	log "github.com/sirupsen/logrus"
)

// mcpListDefaultLimit is the default page size for MCP navigation and contract-listing tools
// (list_workspace_packages, list_package_versions, list_ddl_entities, list_mcp_contract_entities).
const mcpListDefaultLimit = 100

// MCPToolCallTimeout bounds one tool execution, for both the AI chat tool loop and external MCP
// clients. It is roughly 2x the ~2-min non-selective global search, so a hung query cannot hold a
// DB pool connection indefinitely.
const MCPToolCallTimeout = 4 * time.Minute

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
	if group == "" {
		return nil
	}
	if workspace != "" && group != workspace && !strings.HasPrefix(group, workspace+".") {
		log.Errorf("Group parameter should start with %s. Given: %s", workspace, group)
		return fmt.Errorf("Requested package is not allowed for search, only packages from workspace %s are allowed", workspace)
	}
	return nil
}

// resolveMCPSearchPackageIds maps an optional MCP group filter to SearchQueryReq.PackageIds.
// When group is omitted, scope to the whole workspace (same as REST SearchController).
func resolveMCPSearchPackageIds(group, workspace string) []string {
	if group != "" {
		return []string{group}
	}
	return []string{workspace}
}

// resolveMCPSearchVersions maps an optional MCP release filter to SearchQueryReq.Versions.
// When release is omitted, return an empty slice so SQL does not filter by version.
func resolveMCPSearchVersions(release string) []string {
	if release == "" {
		return []string{}
	}
	return []string{release}
}

func (m mcpService) ExecuteLegacyRestSearchTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	mcpWorkspace := m.systemInfoService.GetAiMCPConfig().Workspace
	group := req.GetString("group", mcpWorkspace)
	if err := validateMCPGroup(group, mcpWorkspace); err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	userID := secctx.GetUserId(ctx)
	m.monitoringService.IncreaseBusinessMetricCounter(
		userID,
		metrics.MCPLegacySearchToolCalled,
		mcpLegacyMetricKey(ctx, group),
	)
	log.Debugf("%s: delegating to %s with apiType=rest", LegacyToolNameSearchRestOperations, ToolNameSearchOperations)
	return m.ExecuteSearchTool(ctx, withInjectedMCPArg(req, "apiType", string(view.RestApiType)))
}

func (m mcpService) ExecuteLegacyRestGetSpecTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	if packageId, err := req.RequireString("packageId"); err == nil {
		userID := secctx.GetUserId(ctx)
		m.monitoringService.IncreaseBusinessMetricCounter(
			userID,
			metrics.MCPLegacyGetSpecToolCalled,
			mcpLegacyMetricKey(ctx, packageId),
		)
	}
	log.Debugf("%s: delegating to %s with apiType=rest", LegacyToolNameGetRestOperationSpec, ToolNameGetOperationSpec)
	return m.ExecuteGetSpecTool(ctx, withInjectedMCPArg(req, "apiType", string(view.RestApiType)))
}

func (m mcpService) ExecuteLegacyRestGetOperationDiffTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	if packageId, err := req.RequireString("packageId"); err == nil {
		userID := secctx.GetUserId(ctx)
		m.monitoringService.IncreaseBusinessMetricCounter(
			userID,
			metrics.MCPLegacyGetDiffToolCalled,
			mcpLegacyMetricKey(ctx, packageId),
		)
	}
	log.Debugf("%s: delegating to %s with apiType=rest", LegacyToolNameGetRestOperationDiff, ToolNameGetOperationDiff)
	return m.ExecuteGetOperationDiffTool(ctx, withInjectedMCPArg(req, "apiType", string(view.RestApiType)))
}

// ExecuteGetSpecTool executes the get_api_operation_specification tool
func (m mcpService) ExecuteGetSpecTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	ctx, cancel := context.WithTimeout(ctx, MCPToolCallTimeout)
	defer cancel()
	packageId, err := req.RequireString("packageId")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	sufficientPrivileges, err := m.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to check user privileges: %s", err.Error())), nil
	}
	if !sufficientPrivileges {
		return mcp.NewToolResultError(exception.InsufficientPrivilegesMsg), nil
	}
	apiType, err := requireMCPApiType(req, view.RestApiType, view.AsyncapiApiType)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	operationId, err := req.RequireString("operationId")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	version, err := req.RequireString("version")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	userID := secctx.GetUserId(ctx)
	m.monitoringService.IncreaseBusinessMetricCounter(userID, metrics.MCPGetSpecToolCalled, mcpMetricKey(ctx, apiType, packageId))

	log.Debugf("get_api_operation_specification: apiType=%s, operationId=%s, packageId=%s, version=%s", apiType, operationId, packageId, version)

	searchReq := view.OperationBasicSearchReq{
		PackageId:   packageId,
		Version:     version,
		OperationId: operationId,
		ApiType:     apiType,
		IncludeData: true,
	}

	operationViewInterface, err := m.operationService.GetOperation(ctx, searchReq)
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

// ExecuteSearchTool executes the search_api_operations tool (deprecated: uses the configured AI MCP workspace)
func (m mcpService) ExecuteSearchTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	return m.executeSearchCore(ctx, req, m.systemInfoService.GetAiMCPConfig().Workspace, metrics.MCPSearchToolCalled)
}

// ExecuteSearchToolV2 executes the search_api_operations_v2 tool with a caller-supplied workspace
func (m mcpService) ExecuteSearchToolV2(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	workspace, err := req.RequireString("workspace")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	return m.executeSearchCore(ctx, req, workspace, metrics.MCPSearchV2ToolCalled)
}

func (m mcpService) executeSearchCore(ctx context.Context, req mcp.CallToolRequest, workspace string, metric string) (*mcp.CallToolResult, error) {
	ctx, cancel := context.WithTimeout(ctx, MCPToolCallTimeout)
	defer cancel()
	apiType, err := requireMCPTypeParam(req, string(view.RestApiType), string(view.GraphqlApiType), string(view.AsyncapiApiType), view.ContractTypeDdl, view.ContractTypeMcp)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	q, err := req.RequireString("query")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	limit := req.GetInt("limit", 100)
	page := req.GetInt("page", 0)
	group := req.GetString("group", "")
	releaseVersion := req.GetString("release", "")
	if err := validateMCPGroup(group, workspace); err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	packageIds := resolveMCPSearchPackageIds(group, workspace)
	versions := resolveMCPSearchVersions(releaseVersion)

	log.Debugf("search_api_operations: apiType=%s, query=%s, limit=%d, page=%d, group=%s, releaseVersion=%s, workspace=%s", apiType, q, limit, page, group, releaseVersion, workspace)

	metricPackage := group
	if metricPackage == "" {
		metricPackage = workspace
	}
	m.monitoringService.IncreaseBusinessMetricCounter(secctx.GetUserId(ctx), metric, mcpMetricKey(ctx, apiType, metricPackage))

	searchReq := view.SearchQueryReq{
		SearchString: q,
		ApiType:      apiType,
		PackageIds:   packageIds,
		Workspace:    workspace,
		Versions:     versions,
		Status:       view.Release.String(),
		Limit:        limit,
		Page:         page,
	}
	visibleRoots, err := m.roleService.GetWorkspacePackageVisibilityRoots(ctx, workspace)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to resolve package visibility: %s", err.Error())), nil
	}
	searchReq.VisiblePackageRoots = visibleRoots

	var payload map[string]any
	switch apiType {
	case view.ContractTypeDdl:
		searchResult, err := m.ddlContractService.GlobalSearchForDDL(ctx, searchReq)
		if err != nil {
			return nil, err
		}
		items := []interface{}{}
		if searchResult != nil && searchResult.DdlContracts != nil {
			for _, item := range *searchResult.DdlContracts {
				items = append(items, item)
			}
		}
		payload = map[string]any{"items": transformContractSearchResults(items)}
	case view.ContractTypeMcp:
		searchResult, err := m.mcpContractService.GlobalSearchForMCP(ctx, searchReq)
		if err != nil {
			return nil, err
		}
		items := []interface{}{}
		if searchResult != nil && searchResult.McpContracts != nil {
			for _, item := range *searchResult.McpContracts {
				items = append(items, item)
			}
		}
		payload = map[string]any{"items": transformContractSearchResults(items)}
	default:
		searchResult, err := m.operationService.GlobalSearchForOperations(ctx, searchReq)
		if err != nil {
			return nil, err
		}
		operations := []interface{}{}
		if searchResult != nil && searchResult.Operations != nil {
			operations = *searchResult.Operations
		}
		payload = map[string]any{"items": transformOperations(operations)}
	}

	// Log MCP tool response at debug level
	payloadJSON, _ := json.Marshal(payload)
	log.Debugf("MCP tool search_api_operations response: %s", string(payloadJSON))

	return mcp.NewToolResultStructuredOnly(payload), nil
}

// ExecuteListWorkspacesTool executes the list_workspaces tool
func (m mcpService) ExecuteListWorkspacesTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	log.Debugf("list_workspaces: listing accessible workspaces")

	m.monitoringService.IncreaseBusinessMetricCounter(secctx.GetUserId(ctx), metrics.MCPListWorkspacesToolCalled, mcpListWorkspacesMetricKey)

	workspaceListReq := view.PackageListReq{
		Kind:  []string{entity.KIND_WORKSPACE},
		Limit: mcpWorkspacesListLimit,
	}

	workspaces, err := m.packageService.GetPackagesList(ctx, workspaceListReq)
	if err != nil {
		log.Errorf("Failed to get workspaces list: %v", err)
		return nil, fmt.Errorf("failed to get workspaces list: %w", err)
	}

	payload := convertPackagesToWorkspacesMCP(workspaces)

	payloadJSON, _ := json.Marshal(payload)
	log.Debugf("MCP tool list_workspaces response: %s", string(payloadJSON))

	return mcp.NewToolResultStructuredOnly(payload), nil
}

// ExecuteListWorkspacePackagesTool executes the list_workspace_packages tool
func (m mcpService) ExecuteListWorkspacePackagesTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	ctx, cancel := context.WithTimeout(ctx, MCPToolCallTimeout)
	defer cancel()
	workspace, err := req.RequireString("workspace")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	page := req.GetInt("page", 0)
	limit := req.GetInt("limit", mcpListDefaultLimit)
	textFilter := req.GetString("textFilter", "")

	log.Debugf("list_workspace_packages: workspace=%s, page=%d, limit=%d, textFilter=%s", workspace, page, limit, textFilter)

	m.monitoringService.IncreaseBusinessMetricCounter(secctx.GetUserId(ctx), metrics.MCPListWorkspacePackagesToolCalled, workspace)

	packageListReq := view.PackageListReq{
		Kind:               []string{entity.KIND_PACKAGE},
		ShowAllDescendants: true,
		ParentId:           workspace,
		TextFilter:         textFilter,
		Limit:              limit,
		Offset:             page * limit,
	}

	packages, err := m.packageService.GetPackagesList(ctx, packageListReq)
	if err != nil {
		return nil, err
	}

	payload := map[string]any{"packages": convertPackagesToMCP(packages).Packages}

	payloadJSON, _ := json.Marshal(payload)
	log.Debugf("MCP tool list_workspace_packages response: %s", string(payloadJSON))

	return mcp.NewToolResultStructuredOnly(payload), nil
}

// ExecuteListPackageVersionsTool executes the list_package_versions tool
func (m mcpService) ExecuteListPackageVersionsTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	ctx, cancel := context.WithTimeout(ctx, MCPToolCallTimeout)
	defer cancel()
	packageId, err := req.RequireString("packageId")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	sufficientPrivileges, err := m.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to check user privileges: %s", err.Error())), nil
	}
	if !sufficientPrivileges {
		return mcp.NewToolResultError(exception.InsufficientPrivilegesMsg), nil
	}

	status := req.GetString("status", view.Release.String())
	page := req.GetInt("page", 0)
	limit := req.GetInt("limit", mcpListDefaultLimit)

	log.Debugf("list_package_versions: packageId=%s, status=%s, page=%d, limit=%d", packageId, status, page, limit)

	m.monitoringService.IncreaseBusinessMetricCounter(secctx.GetUserId(ctx), metrics.MCPListPackageVersionsToolCalled, packageId)

	versionsReq := view.VersionListReq{
		PackageId: packageId,
		Statuses:  []string{status},
		Limit:     limit,
		Page:      page,
		SortBy:    view.VersionSortByVersion,
		SortOrder: view.VersionSortOrderDesc,
	}
	versionsView, err := m.versionService.GetPackageVersionsView(ctx, versionsReq, false)
	if err != nil {
		return nil, err
	}

	var versions []view.PublishedVersionListView
	if versionsView != nil {
		versions = versionsView.Versions
	}
	payload := map[string]any{"versions": versions}

	payloadJSON, _ := json.Marshal(payload)
	log.Debugf("MCP tool list_package_versions response: %s", string(payloadJSON))

	return mcp.NewToolResultStructuredOnly(payload), nil
}

// ExecuteGetOperationDiffTool executes the get_api_operation_diff tool
func (m mcpService) ExecuteGetOperationDiffTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	ctx, cancel := context.WithTimeout(ctx, MCPToolCallTimeout)
	defer cancel()
	packageId, err := req.RequireString("packageId")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	sufficientPrivileges, err := m.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to check user privileges: %s", err.Error())), nil
	}
	if !sufficientPrivileges {
		return mcp.NewToolResultError(exception.InsufficientPrivilegesMsg), nil
	}
	apiType, err := requireMCPApiType(req, view.RestApiType, view.AsyncapiApiType)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	operationId, err := req.RequireString("operationId")
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

	userID := secctx.GetUserId(ctx)
	m.monitoringService.IncreaseBusinessMetricCounter(userID, metrics.MCPGetDiffToolCalled, mcpMetricKey(ctx, apiType, packageId))

	log.Debugf("get_api_operation_diff: apiType=%s, operationId=%s, packageId=%s, version=%s, previousVersion=%s", apiType, operationId, packageId, version, previousVersion)

	operationChangesView, err := m.operationService.GetOperationChanges(ctx, packageId, version, operationId, packageId, previousVersion, []string{})
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
	ctx, cancel := context.WithTimeout(ctx, MCPToolCallTimeout)
	defer cancel()
	packageId, err := req.RequireString("packageId")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	sufficientPrivileges, err := m.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to check user privileges: %s", err.Error())), nil
	}
	if !sufficientPrivileges {
		return mcp.NewToolResultError(exception.InsufficientPrivilegesMsg), nil
	}
	apiType, err := requireMCPTypeParam(req, string(view.RestApiType), string(view.GraphqlApiType), string(view.AsyncapiApiType), view.ContractTypeDdl, view.ContractTypeMcp)
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

	userID := secctx.GetUserId(ctx)
	m.monitoringService.IncreaseBusinessMetricCounter(userID, metrics.MCPGetDocumentToolCalled, mcpMetricKey(ctx, apiType, packageId))

	log.Debugf("get_document: apiType=%s, packageId=%s, version=%s, slug=%s", apiType, packageId, version, slug)

	document, documentData, err := m.versionService.GetLatestContentDataBySlug(ctx, packageId, version, slug)
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

// ExecuteListApiOperationsTool executes the list_api_operations tool
func (m mcpService) ExecuteListApiOperationsTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	ctx, cancel := context.WithTimeout(ctx, MCPToolCallTimeout)
	defer cancel()
	packageId, err := req.RequireString("packageId")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	sufficientPrivileges, err := m.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to check user privileges: %s", err.Error())), nil
	}
	if !sufficientPrivileges {
		return mcp.NewToolResultError(exception.InsufficientPrivilegesMsg), nil
	}
	version, err := req.RequireString("version")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	apiType, err := requireMCPApiType(req, view.RestApiType, view.GraphqlApiType, view.AsyncapiApiType)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	textFilter := req.GetString("textFilter", "")
	limit := req.GetInt("limit", mcpListDefaultLimit)
	page := req.GetInt("page", 0)

	m.monitoringService.IncreaseBusinessMetricCounter(secctx.GetUserId(ctx), metrics.MCPListApiOperationsToolCalled, mcpMetricKey(ctx, apiType, packageId))

	log.Debugf("list_api_operations: packageId=%s, version=%s, apiType=%s, textFilter=%s, limit=%d, page=%d", packageId, version, apiType, textFilter, limit, page)

	result, err := m.operationService.GetOperations(ctx, packageId, version, false, view.OperationListReq{
		ApiType:    apiType,
		TextFilter: textFilter,
		Limit:      limit,
		Page:       page,
	})
	if err != nil {
		return nil, err
	}

	payload := map[string]any{"operations": result.Operations, "packages": result.Packages}

	payloadJSON, _ := json.Marshal(payload)
	log.Debugf("MCP tool list_api_operations response: %s", string(payloadJSON))

	return mcp.NewToolResultStructuredOnly(payload), nil
}

// ExecuteListDdlEntitiesTool executes the list_ddl_entities tool
func (m mcpService) ExecuteListDdlEntitiesTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	packageId, err := req.RequireString("packageId")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	sufficientPrivileges, err := m.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to check user privileges: %s", err.Error())), nil
	}
	if !sufficientPrivileges {
		return mcp.NewToolResultError(exception.InsufficientPrivilegesMsg), nil
	}
	version, err := req.RequireString("version")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	textFilter := req.GetString("textFilter", "")
	limit := req.GetInt("limit", mcpListDefaultLimit)
	page := req.GetInt("page", 0)

	m.monitoringService.IncreaseBusinessMetricCounter(secctx.GetUserId(ctx), metrics.MCPListDdlEntitiesToolCalled, mcpMetricKey(ctx, view.ContractTypeDdl, packageId))

	log.Debugf("list_ddl_entities: packageId=%s, version=%s, textFilter=%s, limit=%d, page=%d", packageId, version, textFilter, limit, page)

	result, err := m.ddlContractService.ListDdlEntities(ctx, packageId, version, "", textFilter, limit, page*limit)
	if err != nil {
		return nil, err
	}

	payload := map[string]any{"entities": result.Entities, "packages": result.Packages}

	payloadJSON, _ := json.Marshal(payload)
	log.Debugf("MCP tool list_ddl_entities response: %s", string(payloadJSON))

	return mcp.NewToolResultStructuredOnly(payload), nil
}

// ExecuteGetDdlEntityTool executes the get_ddl_entity tool
func (m mcpService) ExecuteGetDdlEntityTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	packageId, err := req.RequireString("packageId")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	sufficientPrivileges, err := m.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to check user privileges: %s", err.Error())), nil
	}
	if !sufficientPrivileges {
		return mcp.NewToolResultError(exception.InsufficientPrivilegesMsg), nil
	}
	version, err := req.RequireString("version")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	ddlEntityId, err := req.RequireString("ddlEntityId")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	includeData := req.GetBool("includeData", true)

	m.monitoringService.IncreaseBusinessMetricCounter(secctx.GetUserId(ctx), metrics.MCPGetDdlEntityToolCalled, mcpMetricKey(ctx, view.ContractTypeDdl, packageId))

	log.Debugf("get_ddl_entity: packageId=%s, version=%s, ddlEntityId=%s, includeData=%t", packageId, version, ddlEntityId, includeData)

	result, err := m.ddlContractService.GetDdlEntity(ctx, packageId, version, ddlEntityId, includeData)
	if err != nil {
		return nil, err
	}

	payload := map[string]any{"entity": result}

	payloadJSON, _ := json.Marshal(payload)
	log.Debugf("MCP tool get_ddl_entity response: %s", string(payloadJSON))

	return mcp.NewToolResultStructuredOnly(payload), nil
}

// ExecuteGetDdlEntityDiffTool executes the get_ddl_entity_diff tool
func (m mcpService) ExecuteGetDdlEntityDiffTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	packageId, err := req.RequireString("packageId")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	sufficientPrivileges, err := m.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to check user privileges: %s", err.Error())), nil
	}
	if !sufficientPrivileges {
		return mcp.NewToolResultError(exception.InsufficientPrivilegesMsg), nil
	}
	version, err := req.RequireString("version")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	ddlEntityId, err := req.RequireString("ddlEntityId")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	previousVersion := req.GetString("previousVersion", "")
	previousVersionPackageId := req.GetString("previousVersionPackageId", "")
	severities := req.GetStringSlice("severity", nil)
	validSeverities := []string{string(view.Annotation), string(view.Breaking), string(view.SemiBreaking), string(view.Deprecated), string(view.NonBreaking), string(view.Unclassified)}
	for _, severity := range severities {
		if !view.ValidSeverity(severity) {
			return mcp.NewToolResultError(fmt.Sprintf("severity must be one of: %v", validSeverities)), nil
		}
	}

	m.monitoringService.IncreaseBusinessMetricCounter(secctx.GetUserId(ctx), metrics.MCPGetDdlEntityDiffToolCalled, mcpMetricKey(ctx, view.ContractTypeDdl, packageId))

	log.Debugf("get_ddl_entity_diff: packageId=%s, version=%s, ddlEntityId=%s, previousVersion=%s, previousVersionPackageId=%s", packageId, version, ddlEntityId, previousVersion, previousVersionPackageId)

	result, err := m.ddlContractService.GetDdlEntityChanges(ctx, packageId, version, ddlEntityId, "", previousVersion, previousVersionPackageId, "", severities)
	if err != nil {
		return nil, err
	}

	payload := map[string]any{"changes": result.Changes}

	payloadJSON, _ := json.Marshal(payload)
	log.Debugf("MCP tool get_ddl_entity_diff response: %s", string(payloadJSON))

	return mcp.NewToolResultStructuredOnly(payload), nil
}

// ExecuteListMcpContractEntitiesTool executes the list_mcp_contract_entities tool
func (m mcpService) ExecuteListMcpContractEntitiesTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	packageId, err := req.RequireString("packageId")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	sufficientPrivileges, err := m.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to check user privileges: %s", err.Error())), nil
	}
	if !sufficientPrivileges {
		return mcp.NewToolResultError(exception.InsufficientPrivilegesMsg), nil
	}
	version, err := req.RequireString("version")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	kind := req.GetString("kind", "")
	mcpEndpoint := req.GetString("mcpEndpoint", "")
	textFilter := req.GetString("textFilter", "")
	limit := req.GetInt("limit", mcpListDefaultLimit)
	page := req.GetInt("page", 0)

	m.monitoringService.IncreaseBusinessMetricCounter(secctx.GetUserId(ctx), metrics.MCPListMcpContractEntitiesToolCalled, mcpMetricKey(ctx, view.ContractTypeMcp, packageId))

	log.Debugf("list_mcp_contract_entities: packageId=%s, version=%s, kind=%s, mcpEndpoint=%s, textFilter=%s, limit=%d, page=%d", packageId, version, kind, mcpEndpoint, textFilter, limit, page)

	result, err := m.mcpContractService.ListMcpEntities(ctx, packageId, version, kind, mcpEndpoint, "", textFilter, limit, page*limit)
	if err != nil {
		return nil, err
	}

	payload := map[string]any{"entities": result.Entities, "packages": result.Packages}

	payloadJSON, _ := json.Marshal(payload)
	log.Debugf("MCP tool list_mcp_contract_entities response: %s", string(payloadJSON))

	return mcp.NewToolResultStructuredOnly(payload), nil
}

// ExecuteGetMcpContractEntityTool executes the get_mcp_contract_entity tool
func (m mcpService) ExecuteGetMcpContractEntityTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	packageId, err := req.RequireString("packageId")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	sufficientPrivileges, err := m.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to check user privileges: %s", err.Error())), nil
	}
	if !sufficientPrivileges {
		return mcp.NewToolResultError(exception.InsufficientPrivilegesMsg), nil
	}
	version, err := req.RequireString("version")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	mcpEntityId, err := req.RequireString("mcpEntityId")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	includeData := req.GetBool("includeData", true)

	m.monitoringService.IncreaseBusinessMetricCounter(secctx.GetUserId(ctx), metrics.MCPGetMcpContractEntityToolCalled, mcpMetricKey(ctx, view.ContractTypeMcp, packageId))

	log.Debugf("get_mcp_contract_entity: packageId=%s, version=%s, mcpEntityId=%s, includeData=%t", packageId, version, mcpEntityId, includeData)

	result, err := m.mcpContractService.GetMcpEntity(ctx, packageId, version, mcpEntityId, includeData)
	if err != nil {
		return nil, err
	}

	payload := map[string]any{"entity": result}

	payloadJSON, _ := json.Marshal(payload)
	log.Debugf("MCP tool get_mcp_contract_entity response: %s", string(payloadJSON))

	return mcp.NewToolResultStructuredOnly(payload), nil
}

func mcpMetricKey(ctx context.Context, apiType string, packageId string) string {
	return apiType + "|" + MCPClientLabelFromCtx(ctx) + "|" + packageId
}
