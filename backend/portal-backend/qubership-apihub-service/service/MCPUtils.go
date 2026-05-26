package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"slices"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/mark3labs/mcp-go/mcp"
)

// CalculateNearestCompletedReleaseVersion calculates the nearest completed release version
func CalculateNearestCompletedReleaseVersion() string {
	t := time.Now()
	year := t.Year()
	month := int(t.Month())

	// Calculate current quarter (1..4)
	currentQuarter := (month-1)/3 + 1

	// Move to previous quarter
	prevQuarter := currentQuarter - 1
	if prevQuarter == 0 {
		prevQuarter = 4
		year -= 1
	}

	return fmt.Sprintf("%d.%d", year, prevQuarter)
}

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

func requireMCPApiType(req mcp.CallToolRequest, allowed ...view.ApiType) (string, error) {
	apiType, err := req.RequireString("apiType")
	if err != nil {
		return "", err
	}
	if !isMCPApiTypeAllowed(apiType, allowed...) {
		return "", fmt.Errorf("apiType must be one of: %v", allowed)
	}
	return apiType, nil
}

func isMCPApiTypeAllowed(apiType string, allowed ...view.ApiType) bool {
	for _, allowedApiType := range allowed {
		if apiType == string(allowedApiType) {
			return true
		}
	}
	return false
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
	return slices.Contains(view.GetDocumentTypesForApiType(apiType), documentType)
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
