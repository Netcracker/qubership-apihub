package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"slices"
	"strings"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/mark3labs/mcp-go/mcp"
)

// convertPackagesToMCP filters and converts Packages to PackagesMCP
// Removes packages with packageId containing ".RUNENV." and excludes defaultRole, permissions, releaseVersionPattern, createdAt, IsFavorite, ImageUrl, DeletedAt fields
func convertPackagesToMCP(packages *view.Packages) *view.PackagesMCP {
	if packages == nil {
		return &view.PackagesMCP{Packages: []view.PackagesInfoMCP{}}
	}

	// Filter out packages with packageId containing ".RUNENV."
	filtered := make([]view.PackagesInfo, 0, len(packages.Packages))
	for _, pkg := range packages.Packages {
		if !strings.Contains(pkg.Id, ".RUNENV.") {
			filtered = append(filtered, pkg)
		}
	}

	// Convert to PackagesInfoMCP (excluding defaultRole, permissions, releaseVersionPattern, createdAt, IsFavorite, ImageUrl, DeletedAt)
	converted := make([]view.PackagesInfoMCP, len(filtered))
	for i, pkg := range filtered {
		converted[i] = view.PackagesInfoMCP{
			Id:                        pkg.Id,
			Alias:                     pkg.Alias,
			ParentId:                  pkg.ParentId,
			Kind:                      pkg.Kind,
			Name:                      pkg.Name,
			Description:               pkg.Description,
			ServiceName:               pkg.ServiceName,
			Parents:                   pkg.Parents,
			LastReleaseVersionDetails: pkg.LastReleaseVersionDetails,
			RestGroupingPrefix:        pkg.RestGroupingPrefix,
		}
	}

	return &view.PackagesMCP{Packages: converted}
}

// convertPackagesToWorkspacesMCP converts Packages (kind=workspace) to WorkspacesListMCP
func convertPackagesToWorkspacesMCP(packages *view.Packages) *view.WorkspacesListMCP {
	if packages == nil {
		return &view.WorkspacesListMCP{Workspaces: []view.WorkspaceInfoMCP{}}
	}

	converted := make([]view.WorkspaceInfoMCP, len(packages.Packages))
	for i, pkg := range packages.Packages {
		converted[i] = view.WorkspaceInfoMCP{
			Id:          pkg.Id,
			Alias:       pkg.Alias,
			Kind:        pkg.Kind,
			Name:        pkg.Name,
			Description: pkg.Description,
		}
	}

	return &view.WorkspacesListMCP{Workspaces: converted}
}

func projectPublishedVersionsForMCP(versions []view.PublishedVersionListView) []view.PublishedVersionListMCPView {
	if len(versions) == 0 {
		return nil
	}

	projected := make([]view.PublishedVersionListMCPView, len(versions))
	for i, v := range versions {
		projected[i] = view.PublishedVersionListMCPView{
			Version:         v.Version,
			Status:          v.Status,
			PreviousVersion: v.PreviousVersion,
		}
	}
	return projected
}

// requireMCPTypeParam validates the "apiType" request parameter against a set of allowed string values.
// It underlies requireMCPApiType and is used directly by tools that also accept contract types (ddl, mcp),
// which are untyped string constants rather than view.ApiType values.
func requireMCPTypeParam(req mcp.CallToolRequest, allowed ...string) (string, error) {
	apiType, err := req.RequireString("apiType")
	if err != nil {
		return "", err
	}
	if !slices.Contains(allowed, apiType) {
		return "", fmt.Errorf("apiType must be one of: %v", allowed)
	}
	return apiType, nil
}

func requireMCPApiType(req mcp.CallToolRequest, allowed ...view.ApiType) (string, error) {
	allowedStrs := make([]string, len(allowed))
	for i, allowedApiType := range allowed {
		allowedStrs[i] = string(allowedApiType)
	}
	return requireMCPTypeParam(req, allowedStrs...)
}

// transformOperations projects generic operation search results to the compact MCP response shape.
func transformOperations(items []interface{}) []view.TransformedOperation {
	transformed := make([]view.TransformedOperation, 0, len(items))
	for _, item := range items {
		if op, ok := transformOperation(item); ok {
			transformed = append(transformed, op)
		}
	}
	return transformed
}

func transformOperation(item interface{}) (view.TransformedOperation, bool) {
	switch op := item.(type) {
	case view.RestOperationSearchResult:
		result := transformCommonOperation(op.CommonOperationSearchResult, op.CommonOperationView)
		result.Path = op.Path
		result.Method = op.Method
		return result, true
	case view.GraphQLOperationSearchResult:
		result := transformCommonOperation(op.CommonOperationSearchResult, op.CommonOperationView)
		result.GraphQLOperationType = op.Type
		result.Method = op.Method
		return result, true
	case view.AsyncAPIOperationSearchResult:
		result := transformCommonOperation(op.CommonOperationSearchResult, op.CommonOperationView)
		result.Action = op.Action
		result.Channel = op.Channel
		result.Protocol = op.Protocol
		result.AsyncOperationId = op.AsyncOperationId
		result.MessageId = op.MessageId
		return result, true
	case view.CommonOperationSearchResult:
		return view.TransformedOperation{
			PackageId:   op.PackageId,
			PackageName: op.PackageName,
			Version:     op.Version,
			Title:       op.Title,
		}, true
	default:
		return view.TransformedOperation{}, false
	}
}

func transformCommonOperation(search view.CommonOperationSearchResult, operation view.CommonOperationView) view.TransformedOperation {
	return view.TransformedOperation{
		OperationId: operation.OperationId,
		ApiKind:     operation.ApiKind,
		ApiType:     operation.ApiType,
		ApiAudience: operation.ApiAudience,
		DocumentId:  operation.DocumentId,
		PackageId:   search.PackageId,
		PackageName: search.PackageName,
		Version:     search.Version,
		Title:       search.Title,
	}
}

// transformContractSearchResults projects generic DDL/MCP contract search results to the compact MCP response shape.
func transformContractSearchResults(items []interface{}) []view.TransformedContractEntity {
	transformed := make([]view.TransformedContractEntity, 0, len(items))
	for _, item := range items {
		if e, ok := transformContractEntity(item); ok {
			transformed = append(transformed, e)
		}
	}
	return transformed
}

func transformContractEntity(item interface{}) (view.TransformedContractEntity, bool) {
	switch e := item.(type) {
	case view.DdlContractSearchResult:
		return view.TransformedContractEntity{
			EntityId:     e.EntityId,
			ContractType: view.ContractTypeDdl,
			Kind:         e.Kind,
			PackageId:    e.PackageId,
			PackageName:  e.PackageName,
			Version:      e.Version,
			SchemaName:   e.SchemaName,
			TableName:    e.EntityName,
		}, true
	case view.McpEntitySearchResult:
		return view.TransformedContractEntity{
			EntityId:     e.EntityId,
			ContractType: view.ContractTypeMcp,
			Kind:         e.Kind,
			PackageId:    e.PackageId,
			PackageName:  e.PackageName,
			Version:      e.Version,
			EntityName:   e.Name,
			McpEndpoint:  e.McpEndpoint,
		}, true
	default:
		return view.TransformedContractEntity{}, false
	}
}

func extractOperationData(operationViewInterface interface{}) (interface{}, error) {
	ptr, ok := operationViewInterface.(*interface{})
	if !ok || ptr == nil {
		return nil, fmt.Errorf("operation view is empty")
	}
	switch op := (*ptr).(type) {
	case view.RestOperationSingleView:
		return op.Data, nil
	case view.AsyncAPIOperationSingleView:
		return op.Data, nil
	default:
		return nil, fmt.Errorf("operation specification is not supported for returned operation type %T", op)
	}
}

func makeMCPDocumentPayload(apiType string, document *view.PublishedContent, documentData *view.ContentData) (map[string]any, error) {
	if document == nil || documentData == nil {
		return nil, fmt.Errorf("document was not found")
	}
	if !isDocumentTypeAllowedForAPIType(document.Type.String(), apiType) {
		return nil, fmt.Errorf("document type %s is not supported for apiType %s", document.Type, apiType)
	}

	return map[string]any{
		"documentType": document.Type.String(),
		"format":       document.Format,
		"documentData": makeMCPDocumentData(documentData.Data),
	}, nil
}

func isDocumentTypeAllowedForAPIType(documentType string, apiType string) bool {
	if slices.Contains(view.GetDocumentTypesForApiType(apiType), documentType) {
		return true
	}
	return slices.Contains(view.GetDocumentTypesForContractType(apiType), documentType)
}

func makeMCPDocumentData(data []byte) any {
	trimmed := bytes.TrimSpace(data)
	if len(trimmed) == 0 {
		return ""
	}
	if json.Valid(trimmed) {
		return json.RawMessage(trimmed)
	}
	return string(data)
}
