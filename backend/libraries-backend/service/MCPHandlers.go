package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/view"
	"github.com/mark3labs/mcp-go/mcp"
	log "github.com/sirupsen/logrus"
)

// The MCP list tools page the same way as the REST list endpoints.
const (
	mcpDefaultLimit = 100
	mcpMaxLimit     = 100
)

const mcpInsufficientPrivilegesMsg = "insufficient privileges for library %s"

func (m *mcpService) executeListLibraries(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	limit, page, errResult := mcpPaging(req)
	if errResult != nil {
		return errResult, nil
	}
	result, err := m.libraryService.List(ctx, view.LibraryListReq{
		Repository:      req.GetString("repository", ""),
		Language:        view.Language(req.GetString("language", "")),
		ParentPackageId: req.GetString("parentPackageId", ""),
		TextFilter:      req.GetString("textFilter", ""),
		OnlyFavorite:    req.GetBool("onlyFavorite", false),
		Limit:           limit,
		Page:            page,
	})
	return mcpResult(ToolNameListLibraries, result, err)
}

func (m *mcpService) executeGetLibrary(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	libraryId, err := req.RequireString("libraryId")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	if _, errResult := m.authorizeLibrary(ctx, libraryId, view.ReadPermission); errResult != nil {
		return errResult, nil
	}
	result, err := m.libraryService.Get(ctx, libraryId)
	return mcpResult(ToolNameGetLibrary, result, err)
}

func (m *mcpService) executeCreateLibrary(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	var createReq view.LibraryCreateReq
	if err := req.BindArguments(&createReq); err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("invalid arguments: %v", err)), nil
	}
	allowed, err := m.authorizationService.CanCreateLibrary(ctx, createReq.ParentPackageId)
	if err != nil {
		return mcpResult(ToolNameCreateLibrary, nil, err)
	}
	if !allowed {
		return mcp.NewToolResultError("insufficient privileges to create a library in this parent package"), nil
	}
	result, err := m.libraryService.Create(ctx, createReq)
	return mcpResult(ToolNameCreateLibrary, result, err)
}

func (m *mcpService) executeListLibraryVersions(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	libraryId, err := req.RequireString("libraryId")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	limit, page, errResult := mcpPaging(req)
	if errResult != nil {
		return errResult, nil
	}
	if _, errResult := m.authorizeLibrary(ctx, libraryId, view.ReadPermission); errResult != nil {
		return errResult, nil
	}
	statuses := make([]view.VersionStatus, 0)
	for _, status := range req.GetStringSlice("status", nil) {
		statuses = append(statuses, view.VersionStatus(status))
	}
	result, err := m.libraryVersionService.List(ctx, libraryId, view.LibraryVersionListReq{
		Status:     statuses,
		TextFilter: req.GetString("textFilter", ""),
		Limit:      limit,
		Page:       page,
	})
	return mcpResult(ToolNameListLibraryVersions, result, err)
}

func (m *mcpService) executeGetLibraryVersion(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	libraryId, version, errResult := requireLibraryVersion(req)
	if errResult != nil {
		return errResult, nil
	}
	if _, errResult := m.authorizeLibrary(ctx, libraryId, view.ReadPermission); errResult != nil {
		return errResult, nil
	}
	result, err := m.libraryVersionService.Get(ctx, libraryId, version)
	return mcpResult(ToolNameGetLibraryVersion, result, err)
}

// executeListAvailableVersions requires the import permission, like the REST endpoint: the list exists to
// pick a version to import, and it reads the registry with the credentials from the configuration.
func (m *mcpService) executeListAvailableVersions(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	libraryId, err := req.RequireString("libraryId")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	limit, page, errResult := mcpPaging(req)
	if errResult != nil {
		return errResult, nil
	}
	library, errResult := m.authorizeLibrary(ctx, libraryId, view.ManageDraftVersionPermission)
	if errResult != nil {
		return errResult, nil
	}
	result, err := m.libraryVersionService.ListAvailable(ctx, *library, view.AvailableVersionListReq{
		TextFilter: req.GetString("textFilter", ""),
		Limit:      limit,
		Page:       page,
	})
	return mcpResult(ToolNameListAvailableVersions, result, err)
}

func (m *mcpService) executeImportLibraryVersion(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	libraryId, version, errResult := requireLibraryVersion(req)
	if errResult != nil {
		return errResult, nil
	}
	library, errResult := m.authorizeLibrary(ctx, libraryId, view.ManageDraftVersionPermission)
	if errResult != nil {
		return errResult, nil
	}
	result, err := m.libraryVersionService.Import(ctx, *library, view.LibraryVersionImportReq{
		Version:         version,
		Labels:          req.GetStringSlice("labels", nil),
		PreviousVersion: req.GetString("previousVersion", ""),
	})
	return mcpResult(ToolNameImportLibraryVersion, result, err)
}

func (m *mcpService) executeListLibraryClasses(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	libraryId, version, errResult := requireLibraryVersion(req)
	if errResult != nil {
		return errResult, nil
	}
	limit, page, errResult := mcpPaging(req)
	if errResult != nil {
		return errResult, nil
	}
	if _, errResult := m.authorizeLibrary(ctx, libraryId, view.ReadPermission); errResult != nil {
		return errResult, nil
	}
	result, err := m.contentService.ListClasses(ctx, libraryId, version, view.LibraryClassListReq{
		TextFilter: req.GetString("textFilter", ""),
		Kind:       classKinds(req),
		Limit:      limit,
		Page:       page,
	})
	return mcpResult(ToolNameListLibraryClasses, result, err)
}

func (m *mcpService) executeGetLibraryClass(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	libraryId, version, errResult := requireLibraryVersion(req)
	if errResult != nil {
		return errResult, nil
	}
	classId, err := req.RequireString("classId")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	if _, errResult := m.authorizeLibrary(ctx, libraryId, view.ReadPermission); errResult != nil {
		return errResult, nil
	}
	result, err := m.contentService.GetClass(ctx, libraryId, version, classId)
	return mcpResult(ToolNameGetLibraryClass, result, err)
}

// executeSearchClasses checks access only when the search is narrowed to one library, matching the REST
// search endpoint, which searches every tracked library for any authenticated caller.
func (m *mcpService) executeSearchClasses(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	textFilter, err := req.RequireString("textFilter")
	if err != nil || textFilter == "" {
		return mcp.NewToolResultError("textFilter is required"), nil
	}
	libraryId := req.GetString("libraryId", "")
	version := req.GetString("version", "")
	if version != "" && libraryId == "" {
		return mcp.NewToolResultError("version requires libraryId"), nil
	}
	limit, page, errResult := mcpPaging(req)
	if errResult != nil {
		return errResult, nil
	}
	if libraryId != "" {
		if _, errResult := m.authorizeLibrary(ctx, libraryId, view.ReadPermission); errResult != nil {
			return errResult, nil
		}
	}
	result, err := m.searchService.SearchClasses(ctx, view.SearchClassesReq{
		TextFilter: textFilter,
		LibraryId:  libraryId,
		Version:    version,
		Kind:       classKinds(req),
		Limit:      limit,
		Page:       page,
	})
	return mcpResult(ToolNameSearchClasses, result, err)
}

func (m *mcpService) executeListChanges(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	libraryId, version, errResult := requireLibraryVersion(req)
	if errResult != nil {
		return errResult, nil
	}
	limit, page, errResult := mcpPaging(req)
	if errResult != nil {
		return errResult, nil
	}
	if _, errResult := m.authorizeLibrary(ctx, libraryId, view.ReadPermission); errResult != nil {
		return errResult, nil
	}
	// A comparison may cross libraries; reading it needs read access on the compared library as well.
	previousLibraryId := req.GetString("previousLibraryId", "")
	if previousLibraryId != "" && previousLibraryId != libraryId {
		if _, errResult := m.authorizeLibrary(ctx, previousLibraryId, view.ReadPermission); errResult != nil {
			return errResult, nil
		}
	}

	severities := make([]view.ChangeSeverity, 0)
	for _, severity := range req.GetStringSlice("severity", nil) {
		severities = append(severities, view.ChangeSeverity(severity))
	}
	changeTypes := make([]view.ChangeType, 0)
	for _, changeType := range req.GetStringSlice("changeType", nil) {
		changeTypes = append(changeTypes, view.ChangeType(changeType))
	}
	result, err := m.changesService.GetChanges(ctx, libraryId, version, previousLibraryId,
		req.GetString("previousVersion", ""), view.ChangeListReq{
			Severity:   severities,
			ChangeType: changeTypes,
			ClassId:    req.GetString("classId", ""),
			Limit:      limit,
			Page:       page,
		})
	return mcpResult(ToolNameListChanges, result, err)
}

// authorizeLibrary loads the library and checks one permission on it. A nil library comes back with the
// tool result to return instead.
func (m *mcpService) authorizeLibrary(ctx context.Context, libraryId string, permission view.RolePermission) (*entity.LibraryEntity, *mcp.CallToolResult) {
	library, err := m.libraryService.GetEntity(ctx, libraryId)
	if err != nil {
		result, _ := mcpResult("authorize", nil, err)
		return nil, result
	}
	allowed, err := m.authorizationService.HasLibraryPermission(ctx, *library, permission)
	if err != nil {
		result, _ := mcpResult("authorize", nil, err)
		return nil, result
	}
	if !allowed {
		return nil, mcp.NewToolResultError(fmt.Sprintf(mcpInsufficientPrivilegesMsg, libraryId))
	}
	return library, nil
}

// mcpResult turns a service result into a tool result. A client-facing CustomError is reported as is; any
// other error is unexpected, so it is logged before it is reported.
func mcpResult(toolName string, result interface{}, err error) (*mcp.CallToolResult, error) {
	if err != nil {
		var customError *exception.CustomError
		if !errors.As(err, &customError) {
			log.Errorf("MCP tool %s failed: %v", toolName, err)
		}
		return mcp.NewToolResultError(err.Error()), nil
	}
	return mcp.NewToolResultStructuredOnly(result), nil
}

func requireLibraryVersion(req mcp.CallToolRequest) (string, string, *mcp.CallToolResult) {
	libraryId, err := req.RequireString("libraryId")
	if err != nil {
		return "", "", mcp.NewToolResultError(err.Error())
	}
	version, err := req.RequireString("version")
	if err != nil {
		return "", "", mcp.NewToolResultError(err.Error())
	}
	return libraryId, version, nil
}

func mcpPaging(req mcp.CallToolRequest) (int, int, *mcp.CallToolResult) {
	limit := req.GetInt("limit", mcpDefaultLimit)
	if limit < 1 || limit > mcpMaxLimit {
		return 0, 0, mcp.NewToolResultError(fmt.Sprintf("limit must be between 1 and %d", mcpMaxLimit))
	}
	page := req.GetInt("page", 0)
	if page < 0 {
		return 0, 0, mcp.NewToolResultError("page must not be negative")
	}
	return limit, page, nil
}

func classKinds(req mcp.CallToolRequest) []view.ClassKind {
	kinds := make([]view.ClassKind, 0)
	for _, kind := range req.GetStringSlice("kind", nil) {
		kinds = append(kinds, view.ClassKind(kind))
	}
	return kinds
}
