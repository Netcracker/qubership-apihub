package service

import (
	"encoding/json"
	"testing"

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
		ToolNameGetOperationSpec,
		ToolNameGetOperationDiff,
		ToolNameGetDocument,
	}, names)
}
