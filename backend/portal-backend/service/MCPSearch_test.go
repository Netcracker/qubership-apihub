package service

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/Netcracker/qubership-apihub/backend/portal-backend/client"
	"github.com/Netcracker/qubership-apihub/backend/portal-backend/config"
	"github.com/Netcracker/qubership-apihub/backend/portal-backend/metrics"
	"github.com/Netcracker/qubership-apihub/backend/portal-backend/view"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/stretchr/testify/require"
)

type mcpSearchOperationStub struct {
	OperationService
	requests []view.SearchQueryReq
}

func (s *mcpSearchOperationStub) GlobalSearchForOperations(_ context.Context, req view.SearchQueryReq) (*view.SearchResult, error) {
	s.requests = append(s.requests, req)
	return &view.SearchResult{}, nil
}

type mcpSearchRoleStub struct {
	RoleService
}

func (mcpSearchRoleStub) GetWorkspacePackageVisibilityRoots(_ context.Context, _ string) ([]string, error) {
	return []string{"WS.a"}, nil
}

type mcpSearchSystemInfoStub struct {
	SystemInfoService
}

func (mcpSearchSystemInfoStub) GetAiMCPConfig() config.MCPConfig {
	return config.MCPConfig{Workspace: "WS"}
}

type mcpSearchMonitoringStub struct {
	MonitoringService
	metric string
	key    string
}

func (s *mcpSearchMonitoringStub) IncreaseBusinessMetricCounter(_ string, metric, key string) {
	s.metric, s.key = metric, key
}

func TestSearchToolVersionsPreserveScope(t *testing.T) {
	for _, tt := range []struct {
		name       string
		tool       string
		filter     string
		packageIds []string
		metric     string
	}{
		{"v1 group", ToolNameSearchOperations, `,"group":"WS.a"`, []string{"WS.a"}, metrics.MCPSearchToolCalled},
		{"v1 workspace", ToolNameSearchOperations, "", []string{"WS"}, metrics.MCPSearchToolCalled},
		{"v2 group", ToolNameSearchOperationsV2, `,"group":"WS.a"`, []string{"WS.a"}, metrics.MCPSearchV2ToolCalled},
		{"v2 workspace", ToolNameSearchOperationsV2, "", []string{"WS"}, metrics.MCPSearchV2ToolCalled},
		{"v3 groups", ToolNameSearchOperationsV3, `,"groups":["WS.b","WS.a","WS.b"]`, []string{"WS.b", "WS.a"}, metrics.MCPSearchV3ToolCalled},
		{"v3 workspace", ToolNameSearchOperationsV3, "", []string{"WS"}, metrics.MCPSearchV3ToolCalled},
	} {
		t.Run(tt.name, func(t *testing.T) {
			operations := &mcpSearchOperationStub{}
			monitoring := &mcpSearchMonitoringStub{}
			m := mcpService{
				operationService:  operations,
				monitoringService: monitoring,
				roleService:       mcpSearchRoleStub{},
				systemInfoService: mcpSearchSystemInfoStub{},
			}
			chat := aiChatTurnServiceImpl{mcpService: m}
			workspace := `,"workspace":"WS"`
			if tt.tool == ToolNameSearchOperations {
				workspace = ""
			}
			_, invocations, _, err := chat.executeToolCalls(context.Background(), []client.LLMToolCall{{
				ID:        "search",
				Name:      tt.tool,
				Arguments: `{"apiType":"rest","query":"customer","release":"1.0","page":2,"limit":10` + workspace + tt.filter + `}`,
			}})
			require.NoError(t, err)
			require.Len(t, invocations, 1)
			require.Equal(t, AiChatToolStatusOK, invocations[0].Status)
			require.Len(t, operations.requests, 1)
			require.Equal(t, view.SearchQueryReq{
				SearchString:        "customer",
				ApiType:             "rest",
				Workspace:           "WS",
				PackageIds:          tt.packageIds,
				VisiblePackageRoots: []string{"WS.a"},
				Versions:            []string{"1.0"},
				Status:              view.Release.String(),
				Page:                2,
				Limit:               10,
			}, operations.requests[0])
			require.Equal(t, tt.metric, monitoring.metric)
			require.Equal(t, mcpMetricKey(context.Background(), "rest", strings.Join(tt.packageIds, ",")), monitoring.key)
		})
	}
}

func TestSearchToolV3RejectsInvalidScope(t *testing.T) {
	for _, tt := range []struct {
		name      string
		arguments string
		message   string
	}{
		{"missing workspace", `{"groups":["WS.a"]}`, "workspace"},
		{"empty groups", `{"workspace":"WS","groups":[]}`, "at least one"},
		{"empty item", `{"workspace":"WS","groups":["WS.a",""]}`, "item 1"},
		{"string instead of array", `{"workspace":"WS","groups":"WS.a"}`, "groups"},
		{"non-string item", `{"workspace":"WS","groups":["WS.a",1]}`, "groups"},
		{"another workspace", `{"workspace":"WS","groups":["WS.a","OTHER.a"]}`, "not allowed"},
		{"sibling workspace prefix", `{"workspace":"WS","groups":["WS2.a"]}`, "not allowed"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			var arguments map[string]any
			require.NoError(t, json.Unmarshal([]byte(tt.arguments), &arguments))
			m := mcpService{}
			result, err := m.ExecuteSearchToolV3(context.Background(), mcp.CallToolRequest{
				Params: mcp.CallToolParams{Arguments: arguments},
			})
			require.NoError(t, err)
			require.True(t, result.IsError)
			require.Contains(t, result.Content[0].(mcp.TextContent).Text, tt.message)
		})
	}
}

func TestSearchToolSchemasMatchVersions(t *testing.T) {
	m := mcpService{systemInfoService: mcpSearchSystemInfoStub{}}
	server := m.MakeMCPServer()
	for _, source := range []struct {
		name  string
		tools []client.LLMTool
	}{
		{"OpenAI", m.MakeLLMTools()},
		{"MCP", func() []client.LLMTool {
			var tools []client.LLMTool
			for _, meta := range getMCPServerToolMetadata() {
				var parameters map[string]any
				require.NoError(t, json.Unmarshal(meta.Schema, &parameters))
				tools = append(tools, client.LLMTool{Name: meta.Name, Description: meta.DescriptionMCP, Parameters: parameters})
			}
			return tools
		}()},
	} {
		t.Run(source.name, func(t *testing.T) {
			byName := make(map[string]client.LLMTool)
			for _, tool := range source.tools {
				byName[tool.Name] = tool
			}
			for _, name := range []string{ToolNameSearchOperations, ToolNameSearchOperationsV2, ToolNameSearchOperationsV3} {
				require.NotNil(t, server.GetTool(name))
				require.Contains(t, byName, name)
				tool := byName[name]
				properties := tool.Parameters["properties"].(map[string]any)
				if name == ToolNameSearchOperationsV3 {
					require.NotContains(t, properties, "group")
					groups := properties["groups"].(map[string]any)
					require.Equal(t, "array", groups["type"])
					require.Equal(t, float64(1), groups["minItems"])
					require.Equal(t, map[string]any{"type": "string", "minLength": float64(1)}, groups["items"])
					require.Contains(t, tool.Description, "'groups'")
					require.NotContains(t, tool.Description, "Deprecated:")
				} else {
					require.NotContains(t, properties, "groups")
					require.Equal(t, "string", properties["group"].(map[string]any)["type"])
					require.Contains(t, tool.Description, "Deprecated: use search_api_operations_v3")
					require.Contains(t, tool.Description, "'group'")
					require.NotContains(t, tool.Description, "'groups'")
				}
				if name == ToolNameSearchOperations {
					require.NotContains(t, properties, "workspace")
				} else {
					require.Contains(t, tool.Parameters["required"], "workspace")
				}
			}
		})
	}
}
