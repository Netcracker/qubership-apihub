package service

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/repository"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/view"
	"github.com/mark3labs/mcp-go/mcp"
)

func TestMCPToolSchemas(t *testing.T) {
	seen := map[string]bool{}
	for _, def := range mcpToolDefinitions() {
		if seen[def.Name] {
			t.Errorf("tool %s is defined twice", def.Name)
		}
		seen[def.Name] = true

		var schema struct {
			Type       string                     `json:"type"`
			Properties map[string]json.RawMessage `json:"properties"`
			Required   []string                   `json:"required"`
		}
		if err := json.Unmarshal(def.Schema, &schema); err != nil {
			t.Errorf("tool %s: schema is not valid JSON: %v", def.Name, err)
			continue
		}
		if schema.Type != "object" {
			t.Errorf("tool %s: schema type is %q, want object", def.Name, schema.Type)
		}
		for _, name := range schema.Required {
			if _, ok := schema.Properties[name]; !ok {
				t.Errorf("tool %s: required property %s is not declared", def.Name, name)
			}
		}
	}
}

func toolRequest(args map[string]any) mcp.CallToolRequest {
	return mcp.CallToolRequest{Params: mcp.CallToolParams{Arguments: args}}
}

func TestMCPPaging(t *testing.T) {
	tests := []struct {
		name      string
		args      map[string]any
		wantLimit int
		wantPage  int
		wantError bool
	}{
		{name: "defaults", args: map[string]any{}, wantLimit: mcpDefaultLimit, wantPage: 0},
		{name: "explicit", args: map[string]any{"limit": 10, "page": 2}, wantLimit: 10, wantPage: 2},
		{name: "limit too large", args: map[string]any{"limit": mcpMaxLimit + 1}, wantError: true},
		{name: "limit zero", args: map[string]any{"limit": 0}, wantError: true},
		{name: "negative page", args: map[string]any{"page": -1}, wantError: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			limit, page, errResult := mcpPaging(toolRequest(tt.args))
			if tt.wantError {
				if errResult == nil || !errResult.IsError {
					t.Fatalf("want an error result, got limit %d page %d", limit, page)
				}
				return
			}
			if errResult != nil {
				t.Fatalf("unexpected error result: %+v", errResult)
			}
			if limit != tt.wantLimit || page != tt.wantPage {
				t.Errorf("got limit %d page %d, want %d %d", limit, page, tt.wantLimit, tt.wantPage)
			}
		})
	}
}

// entityOnlyLibraryService answers GetEntity and fails every other call, so a test notices when a handler
// reaches the service past a denied permission check.
type entityOnlyLibraryService struct {
	LibraryService
}

func (entityOnlyLibraryService) GetEntity(_ context.Context, libraryId string) (*entity.LibraryEntity, error) {
	return &entity.LibraryEntity{Id: libraryId}, nil
}

type fixedAuthorizationService struct {
	AuthorizationService
	allowed bool
}

func (a fixedAuthorizationService) HasLibraryPermission(context.Context, entity.LibraryEntity, view.RolePermission) (bool, error) {
	return a.allowed, nil
}

func TestMCPDeniedLibraryAccess(t *testing.T) {
	m := &mcpService{
		libraryService:       entityOnlyLibraryService{},
		authorizationService: fixedAuthorizationService{allowed: false},
	}
	for _, def := range mcpToolDefinitions() {
		if def.Name == ToolNameListLibraries || def.Name == ToolNameCreateLibrary || def.Name == ToolNameSearchClasses {
			continue
		}
		t.Run(def.Name, func(t *testing.T) {
			result, err := def.Handler(m, context.Background(), toolRequest(map[string]any{
				"libraryId": "lib-1",
				"version":   "1.0.0",
				"classId":   "cls-1",
			}))
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if result == nil || !result.IsError {
				t.Fatalf("want an error result, got %+v", result)
			}
		})
	}
}

func TestMCPResult(t *testing.T) {
	result, err := mcpResult("test", nil, &exception.CustomError{
		Message: "Version $version is not found",
		Params:  map[string]interface{}{"version": "1.0.0"},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !result.IsError {
		t.Fatalf("want an error result")
	}
	text, ok := result.Content[0].(mcp.TextContent)
	if !ok || text.Text != "Version 1.0.0 is not found" {
		t.Errorf("got %+v, want the formatted message", result.Content)
	}

	result, _ = mcpResult("test", nil, errors.New("connection refused"))
	if !result.IsError {
		t.Errorf("an unexpected error must be reported as an error result")
	}
}

// singleClassRepository holds one class with one method and fails every other call.
type singleClassRepository struct {
	repository.LibraryContentRepository
}

func (singleClassRepository) GetClass(_ context.Context, libraryId, version, classId string) (*entity.LibraryClassEntity, error) {
	if classId != "cls-1" {
		return nil, nil
	}
	return &entity.LibraryClassEntity{LibraryId: libraryId, Version: version, ClassId: classId, Kind: "class", QualifiedName: "a.B"}, nil
}

func (singleClassRepository) ListMethods(_ context.Context, _, _, classId string) ([]entity.LibraryMethodEntity, error) {
	return []entity.LibraryMethodEntity{{ClassId: classId, MethodId: "m-1", Name: "run", Signature: "void run()"}}, nil
}

func TestContentServiceGetClass(t *testing.T) {
	service := contentServiceImpl{
		contentRepository: singleClassRepository{},
		libraryVersionRepository: previousVersionRepository{
			versions: map[string]entity.LibraryVersionEntity{"1.0.0": {Version: "1.0.0"}},
		},
	}

	class, err := service.GetClass(context.Background(), "lib-1", "1.0.0", "cls-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if class.QualifiedName != "a.B" || len(class.Methods) != 1 || class.Methods[0].Signature != "void run()" {
		t.Errorf("got %+v", class)
	}

	tests := []struct {
		name     string
		version  string
		classId  string
		wantCode string
	}{
		{name: "missing version", version: "9.9.9", classId: "cls-1", wantCode: exception.LibraryVersionNotFound},
		{name: "missing class", version: "1.0.0", classId: "cls-2", wantCode: exception.LibraryClassNotFound},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := service.GetClass(context.Background(), "lib-1", tt.version, tt.classId)
			var customError *exception.CustomError
			if !errors.As(err, &customError) || customError.Code != tt.wantCode {
				t.Errorf("got %v, want code %s", err, tt.wantCode)
			}
		})
	}
}

func TestContentServiceListClassesRejectsUnknownKind(t *testing.T) {
	service := contentServiceImpl{}
	_, err := service.ListClasses(context.Background(), "lib-1", "1.0.0", view.LibraryClassListReq{
		Kind: []view.ClassKind{"struct"},
	})
	var customError *exception.CustomError
	if !errors.As(err, &customError) || customError.Code != exception.InvalidParameterValue {
		t.Errorf("got %v, want code %s", err, exception.InvalidParameterValue)
	}
}
