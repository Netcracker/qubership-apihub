package service

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/mark3labs/mcp-go/mcp"
	log "github.com/sirupsen/logrus"
)

// ExecuteGetSpecTool executes the get_rest_api_operations_specification tool
func (m mcpService) ExecuteGetSpecTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
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

	log.Infof("get_rest_api_operations_specification: operationId=%s, packageId=%s, version=%s", operationId, packageId, version)

	searchReq := view.OperationBasicSearchReq{
		PackageId:   packageId,
		Version:     version,
		OperationId: operationId,
		ApiType:     string(view.RestApiType),
		IncludeData: true,
	}

	operationViewInterface, err := m.operationService.GetOperation(searchReq)
	if err != nil {
		return nil, err
	}

	operationView := (*operationViewInterface.(*interface{})).(view.RestOperationSingleView)

	payload := map[string]any{"operationData": operationView.Data}

	// Log MCP tool response at debug level
	payloadJSON, _ := json.Marshal(payload)
	log.Debugf("MCP tool get_rest_api_operations_specification response: %s", string(payloadJSON))

	return mcp.NewToolResultStructuredOnly(payload), nil
}

// ExecuteSearchTool executes the search_rest_api_operations tool
func (m mcpService) ExecuteSearchTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	q, err := req.RequireString("query")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	mcpWorkspace := os.Getenv("MCP_WORKSPACE")

	limit := req.GetInt("limit", 100)
	page := req.GetInt("page", 0)
	group := req.GetString("group", mcpWorkspace)
	releaseVersion := req.GetString("release", CalculateNearestCompletedReleaseVersion())

	log.Infof("search_rest_api_operations: query=%s, limit=%d, page=%d, group=%s, releaseVersion=%s", q, limit, page, group, releaseVersion)

	if !strings.HasPrefix(group, mcpWorkspace) {
		log.Errorf("Group parameter should start with %s. Given: %s", mcpWorkspace, group)
		return mcp.NewToolResultError(fmt.Sprintf("Requested package is not allowed for search, only packages from workspace %s are allowed", mcpWorkspace)), nil
	}

	var packageIds []string
	if group != "" {
		packageIds = []string{group}
	}

	searchReq := view.SearchQueryReq{
		SearchString: q,
		PackageIds:   packageIds,
		Versions:     []string{releaseVersion},
		Statuses:     []string{"release"},
		OperationSearchParams: &view.OperationSearchParams{
			ApiType: string(view.RestApiType),
		},
		Limit: limit,
		Page:  page,
	}

	searchResult, err := m.operationService.LiteSearchForOperations(searchReq)
	if err != nil {
		return nil, err
	}

	operations := make([]view.RestOperationSearchResult, len(*searchResult.Operations))
	for i, op := range *searchResult.Operations {
		operations[i] = op.(view.RestOperationSearchResult)
	}
	payload := map[string]any{"items": transformOperations(operations)}

	// Log MCP tool response at debug level
	payloadJSON, _ := json.Marshal(payload)
	log.Debugf("MCP tool search_rest_api_operations response: %s", string(payloadJSON))

	return mcp.NewToolResultStructuredOnly(payload), nil
}
