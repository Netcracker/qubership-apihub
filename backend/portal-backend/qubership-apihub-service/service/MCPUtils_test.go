package service

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/iancoleman/orderedmap"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/stretchr/testify/require"
)

func TestRequireMCPApiType(t *testing.T) {
	tests := []struct {
		name        string
		arguments   map[string]any
		allowed     []view.ApiType
		expected    string
		expectedErr string
	}{
		{
			name:      "accepts allowed api type",
			arguments: map[string]any{"apiType": "graphql"},
			allowed:   []view.ApiType{view.RestApiType, view.GraphqlApiType, view.AsyncapiApiType},
			expected:  "graphql",
		},
		{
			name:        "rejects missing api type",
			arguments:   map[string]any{},
			allowed:     []view.ApiType{view.RestApiType},
			expectedErr: "required argument \"apiType\" not found",
		},
		{
			name:        "rejects unsupported api type",
			arguments:   map[string]any{"apiType": "protobuf"},
			allowed:     []view.ApiType{view.RestApiType, view.AsyncapiApiType},
			expectedErr: "apiType must be one of: [rest asyncapi]",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := mcp.CallToolRequest{
				Params: mcp.CallToolParams{
					Arguments: tt.arguments,
				},
			}

			actual, err := requireMCPApiType(req, tt.allowed...)
			if tt.expectedErr != "" {
				require.EqualError(t, err, tt.expectedErr)
				return
			}

			require.NoError(t, err)
			require.Equal(t, tt.expected, actual)
		})
	}
}

func TestRequireMCPTypeParam(t *testing.T) {
	tests := []struct {
		name        string
		arguments   map[string]any
		allowed     []string
		expected    string
		expectedErr string
	}{
		{
			name:      "accepts ddl contract type",
			arguments: map[string]any{"apiType": "ddl"},
			allowed:   []string{string(view.RestApiType), view.ContractTypeDdl, view.ContractTypeMcp},
			expected:  "ddl",
		},
		{
			name:      "accepts mcp contract type",
			arguments: map[string]any{"apiType": "mcp"},
			allowed:   []string{string(view.RestApiType), view.ContractTypeDdl, view.ContractTypeMcp},
			expected:  "mcp",
		},
		{
			name:        "rejects unsupported type",
			arguments:   map[string]any{"apiType": "protobuf"},
			allowed:     []string{string(view.RestApiType), view.ContractTypeDdl, view.ContractTypeMcp},
			expectedErr: "apiType must be one of: [rest ddl mcp]",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := mcp.CallToolRequest{
				Params: mcp.CallToolParams{
					Arguments: tt.arguments,
				},
			}

			actual, err := requireMCPTypeParam(req, tt.allowed...)
			if tt.expectedErr != "" {
				require.EqualError(t, err, tt.expectedErr)
				return
			}

			require.NoError(t, err)
			require.Equal(t, tt.expected, actual)
		})
	}
}

func TestTransformOperations(t *testing.T) {
	operations := []interface{}{
		view.RestOperationSearchResult{
			RestOperationView: view.RestOperationView{
				OperationListView: view.OperationListView{
					CommonOperationView: view.CommonOperationView{
						OperationId: "rest-op",
						ApiKind:     "bwc",
						ApiType:     string(view.RestApiType),
						ApiAudience: "public",
						DocumentId:  "rest-doc",
					},
				},
				RestOperationMetadata: view.RestOperationMetadata{
					Path:   "/pets",
					Method: "GET",
				},
			},
			CommonOperationSearchResult: view.CommonOperationSearchResult{
				PackageId:   "pkg",
				PackageName: "Package",
				Version:     "2026.1",
				Title:       "List pets",
			},
		},
		view.GraphQLOperationSearchResult{
			GraphQLOperationView: view.GraphQLOperationView{
				OperationListView: view.OperationListView{
					CommonOperationView: view.CommonOperationView{
						OperationId: "graphql-op",
						ApiKind:     "bwc",
						ApiType:     string(view.GraphqlApiType),
						ApiAudience: "public",
						DocumentId:  "graphql-doc",
					},
				},
				GraphQLOperationMetadata: view.GraphQLOperationMetadata{
					Type:   view.QueryType,
					Method: "pets",
				},
			},
			CommonOperationSearchResult: view.CommonOperationSearchResult{
				PackageId:   "pkg",
				PackageName: "Package",
				Version:     "2026.1",
				Title:       "Pets query",
			},
		},
		view.AsyncAPIOperationSearchResult{
			AsyncAPIOperationView: view.AsyncAPIOperationView{
				OperationListView: view.OperationListView{
					CommonOperationView: view.CommonOperationView{
						OperationId: "async-op",
						ApiKind:     "bwc",
						ApiType:     string(view.AsyncapiApiType),
						ApiAudience: "public",
						DocumentId:  "async-doc",
					},
				},
				AsyncAPIOperationMetadata: view.AsyncAPIOperationMetadata{
					Action:           view.SendAction,
					Channel:          "pet.created",
					Protocol:         "kafka",
					AsyncOperationId: "sendPetCreated",
					MessageId:        "PetCreated",
				},
			},
			CommonOperationSearchResult: view.CommonOperationSearchResult{
				PackageId:   "pkg",
				PackageName: "Package",
				Version:     "2026.1@1",
				Title:       "Pet created event",
			},
		},
	}

	actual := transformOperations(operations)

	require.Len(t, actual, 3)
	require.Equal(t, "rest-doc", actual[0].DocumentId)
	require.Equal(t, "/pets", actual[0].Path)
	require.Equal(t, "GET", actual[0].Method)
	require.Equal(t, "graphql-doc", actual[1].DocumentId)
	require.Equal(t, view.QueryType, actual[1].GraphQLOperationType)
	require.Equal(t, "async-doc", actual[2].DocumentId)
	require.Equal(t, "pet.created", actual[2].Channel)
	require.Equal(t, "sendPetCreated", actual[2].AsyncOperationId)
}

func TestExtractOperationData(t *testing.T) {
	data := orderedmap.New()
	data.Set("summary", "List pets")
	operationView := interface{}(view.RestOperationSingleView{
		SingleOperationView: view.SingleOperationView{
			Data: data,
		},
	})

	actual, err := extractOperationData(&operationView)

	require.NoError(t, err)
	require.Same(t, data, actual)
}

func TestIsDocumentTypeAllowedForAPIType(t *testing.T) {
	require.True(t, isDocumentTypeAllowedForAPIType(view.OpenAPI31Type, string(view.RestApiType)))
	require.True(t, isDocumentTypeAllowedForAPIType(view.GraphQLSchemaType, string(view.GraphqlApiType)))
	require.True(t, isDocumentTypeAllowedForAPIType(view.Asyncapi30Type, string(view.AsyncapiApiType)))
	require.False(t, isDocumentTypeAllowedForAPIType(view.GraphQLSchemaType, string(view.RestApiType)))
	require.False(t, isDocumentTypeAllowedForAPIType(view.Protobuf3Type, string(view.AsyncapiApiType)))
	require.True(t, isDocumentTypeAllowedForAPIType(view.DDLType, view.ContractTypeDdl))
	require.True(t, isDocumentTypeAllowedForAPIType(view.MCPToolsType, view.ContractTypeMcp))
	require.False(t, isDocumentTypeAllowedForAPIType(view.DDLType, string(view.RestApiType)))
}

func TestTransformContractSearchResults(t *testing.T) {
	items := []interface{}{
		view.DdlContractSearchResult{
			PackageId:   "pkg.ddl",
			PackageName: "DDL Package",
			Version:     "2026.1",
			EntityId:    "ddl-entity",
			Kind:        view.DdlKindTable,
			SchemaName:  "public",
			EntityName:  "customers",
		},
		view.McpEntitySearchResult{
			PackageId:   "pkg.mcp",
			PackageName: "MCP Package",
			Version:     "2026.1",
			EntityId:    "mcp-entity",
			Kind:        view.McpKindTool,
			Name:        "create_customer",
			McpEndpoint: "/mcp",
		},
		view.CommonOperationSearchResult{PackageId: "pkg.unrelated"},
	}

	actual := transformContractSearchResults(items)

	require.Len(t, actual, 2)
	require.Equal(t, view.TransformedContractEntity{
		EntityId:     "ddl-entity",
		ContractType: view.ContractTypeDdl,
		Kind:         view.DdlKindTable,
		PackageId:    "pkg.ddl",
		PackageName:  "DDL Package",
		Version:      "2026.1",
		SchemaName:   "public",
		TableName:    "customers",
	}, actual[0])
	require.Equal(t, view.TransformedContractEntity{
		EntityId:     "mcp-entity",
		ContractType: view.ContractTypeMcp,
		Kind:         view.McpKindTool,
		PackageId:    "pkg.mcp",
		PackageName:  "MCP Package",
		Version:      "2026.1",
		EntityName:   "create_customer",
		McpEndpoint:  "/mcp",
	}, actual[1])
}

func TestMakeMCPDocumentPayloadReturnsDocumentData(t *testing.T) {
	document := &view.PublishedContent{
		ContentId: "openapi.yaml",
		Type:      view.OpenAPI31,
		Format:    view.JsonFormat,
		Slug:      "openapi",
		Title:     "Pets API",
	}
	documentData := &view.ContentData{
		Data:     []byte(`{"openapi":"3.1.0","info":{"title":"Pets API"}}`),
		DataType: "application/json",
	}

	payload, err := makeMCPDocumentPayload(
		string(view.RestApiType),
		document,
		documentData,
	)

	require.NoError(t, err)
	require.Equal(t, view.OpenAPI31.String(), payload["documentType"])
	require.Equal(t, view.JsonFormat, payload["format"])
	require.NotContains(t, payload, "dataType")

	payloadJSON, err := json.Marshal(payload)
	require.NoError(t, err)
	require.JSONEq(t, `{
		"documentType": "openapi-3-1",
		"format": "json",
		"documentData": {
			"openapi": "3.1.0",
			"info": {
				"title": "Pets API"
			}
		}
	}`, string(payloadJSON))
}

func TestMakeMCPDocumentDataReturnsTextForNonJSON(t *testing.T) {
	actual := makeMCPDocumentData([]byte("type Query {\n  pets: [Pet]\n}"))

	require.Equal(t, "type Query {\n  pets: [Pet]\n}", actual)
}

func TestMakeMCPDocumentPayloadRejectsWrongAPIType(t *testing.T) {
	document := &view.PublishedContent{Type: view.GraphQLSchema}
	documentData := &view.ContentData{Data: []byte("type Query { pets: [Pet] }")}

	_, err := makeMCPDocumentPayload(
		string(view.RestApiType),
		document,
		documentData,
	)

	require.EqualError(t, err, "document type graphql-schema is not supported for apiType rest")
}

func TestGetToolMetadataUsesGenericToolNames(t *testing.T) {
	metadata := getToolMetadata()
	names := make([]string, 0, len(metadata))
	for _, item := range metadata {
		names = append(names, item.Name)
	}

	require.ElementsMatch(t, []string{
		ToolNameSearchOperations,
		ToolNameSearchOperationsV2,
		ToolNameGetOperationSpec,
		ToolNameGetOperationDiff,
		ToolNameGetDocument,
		ToolNameListWorkspaces,
		ToolNameListWorkspacePackages,
		ToolNameListPackageVersions,
		ToolNameListApiOperations,
		ToolNameListDdlEntities,
		ToolNameGetDdlEntity,
		ToolNameGetDdlEntityDiff,
		ToolNameListMcpContractEntities,
		ToolNameGetMcpContractEntity,
	}, names)
}

func TestGetMCPServerToolMetadataIncludesV2AndNavigationTools(t *testing.T) {
	metadata := getMCPServerToolMetadata()
	names := make([]string, 0, len(metadata))
	for _, item := range metadata {
		names = append(names, item.Name)
	}

	require.Contains(t, names, ToolNameListWorkspaces)
	require.Contains(t, names, ToolNameSearchOperationsV2)
	require.Contains(t, names, ToolNameListWorkspacePackages)
	require.Contains(t, names, ToolNameListPackageVersions)
	// Workspace-aware search and navigation tools are now shared with AI Chat, not MCP-server-only.
	require.Contains(t, getToolMetadataNames(t), ToolNameListWorkspaces)
	require.Contains(t, getToolMetadataNames(t), ToolNameSearchOperationsV2)
	require.Contains(t, getToolMetadataNames(t), ToolNameListWorkspacePackages)
	require.Contains(t, getToolMetadataNames(t), ToolNameListPackageVersions)
}

func getToolMetadataNames(t *testing.T) []string {
	t.Helper()
	metadata := getToolMetadata()
	names := make([]string, 0, len(metadata))
	for _, item := range metadata {
		names = append(names, item.Name)
	}
	return names
}

func TestExecuteSearchToolV2RequiresWorkspace(t *testing.T) {
	m := mcpService{}
	req := mcp.CallToolRequest{
		Params: mcp.CallToolParams{
			Arguments: map[string]any{"apiType": "rest", "query": "pets"},
		},
	}

	result, err := m.ExecuteSearchToolV2(context.Background(), req)

	require.NoError(t, err)
	require.True(t, result.IsError)
	text, ok := result.Content[0].(mcp.TextContent)
	require.True(t, ok)
	require.Contains(t, text.Text, "workspace")
}

// fakeRoleServiceForVersionsTest embeds the (nil) RoleService interface and overrides only
// HasRequiredPermissions, since ExecuteListPackageVersionsTool checks permissions before
// touching any other dependency.
type fakeRoleServiceForVersionsTest struct {
	RoleService
	hasPermission bool
}

func (f fakeRoleServiceForVersionsTest) HasRequiredPermissions(ctx context.Context, packageId string, requiredPermissions ...view.RolePermission) (bool, error) {
	return f.hasPermission, nil
}

func TestExecuteListPackageVersionsToolDeniesWithoutReadPermission(t *testing.T) {
	m := mcpService{roleService: fakeRoleServiceForVersionsTest{hasPermission: false}}
	req := mcp.CallToolRequest{
		Params: mcp.CallToolParams{
			Arguments: map[string]any{"packageId": "PKG.private"},
		},
	}

	result, err := m.ExecuteListPackageVersionsTool(context.Background(), req)

	require.NoError(t, err)
	require.True(t, result.IsError)
	text, ok := result.Content[0].(mcp.TextContent)
	require.True(t, ok)
	require.Contains(t, text.Text, "privileges")
}

func TestConvertPackagesToWorkspacesMCP(t *testing.T) {
	packages := &view.Packages{
		Packages: []view.PackagesInfo{
			{
				Id:          "ws1",
				Alias:       "ws1-alias",
				Kind:        entity.KIND_WORKSPACE,
				Name:        "Workspace One",
				Description: "First workspace",
			},
		},
	}

	result := convertPackagesToWorkspacesMCP(packages)

	require.Equal(t, []view.WorkspaceInfoMCP{
		{
			Id:          "ws1",
			Alias:       "ws1-alias",
			Kind:        entity.KIND_WORKSPACE,
			Name:        "Workspace One",
			Description: "First workspace",
		},
	}, result.Workspaces)
}

func TestValidateMCPGroup(t *testing.T) {
	require.NoError(t, validateMCPGroup("", "SECRET"))
	require.NoError(t, validateMCPGroup("SECRET", "SECRET"))
	require.NoError(t, validateMCPGroup("SECRET.pkg2", "SECRET"))
	require.Error(t, validateMCPGroup("OTHER.pkg", "SECRET"))
	require.Error(t, validateMCPGroup("SECRETARY", "SECRET"))
}

func TestResolveMCPSearchPackageIds(t *testing.T) {
	require.Equal(t, []string{"SECRET"}, resolveMCPSearchPackageIds("", "SECRET"))
	require.Equal(t, []string{"SECRET.pkg2"}, resolveMCPSearchPackageIds("SECRET.pkg2", "SECRET"))
}

func TestResolveMCPSearchVersions(t *testing.T) {
	require.Empty(t, resolveMCPSearchVersions(""))
	require.Equal(t, []string{"linter@2"}, resolveMCPSearchVersions("linter@2"))
}

func TestGetPackagesListFailsClosedWithoutSecurityContext(t *testing.T) {
	m := mcpService{}

	_, err := m.GetPackagesList(context.Background(), "WORKSPACE")

	require.Error(t, err)
}
