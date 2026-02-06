package service

import (
	"context"
	"encoding/json"
	"fmt"

	secctx "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/mark3labs/mcp-go/mcp"
	mcpserver "github.com/mark3labs/mcp-go/server"
	log "github.com/sirupsen/logrus"
)

type MCPService interface {
	MakeMCPServer() *mcpserver.MCPServer
	MakeOpenAiMCPTools() []openAITool
	ExecuteGetSpecTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error)
	ExecuteSearchTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error)
	GetPackagesList(ctx context.Context, workspaceId string) ([]mcp.ResourceContents, error)
}

func NewMCPService(systemInfoService SystemInfoService, operationService OperationService, packageService PackageService) MCPService {
	return &mcpService{systemInfoService: systemInfoService, operationService: operationService, packageService: packageService}
}

type mcpService struct {
	systemInfoService SystemInfoService
	operationService  OperationService
	packageService    PackageService
}

func (m mcpService) MakeMCPServer() *mcpserver.MCPServer {
	s := mcpserver.NewMCPServer(
		"apihub-mcp",
		"0.0.1",
		mcpserver.WithToolCapabilities(false),
		mcpserver.WithInstructions(mcpInstructions),
	)

	toolsMetadata := getToolMetadata()

	// Add search_rest_api_operations tool
	searchMeta := toolsMetadata[0]
	s.AddTool(mcp.Tool{
		Name:           searchMeta.Name,
		Description:    searchMeta.DescriptionMCP,
		RawInputSchema: searchMeta.Schema,
	}, func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		return m.ExecuteSearchTool(ctx, req)
	})

	// Add get_rest_api_operations_specification tool
	specMeta := toolsMetadata[1]
	s.AddTool(mcp.Tool{
		Name:           specMeta.Name,
		Description:    specMeta.DescriptionMCP,
		RawInputSchema: specMeta.Schema,
	}, func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		return m.ExecuteGetSpecTool(ctx, req)
	})

	mcpWorkspace := m.systemInfoService.GetAiMCPConfig().Workspace
	if mcpWorkspace != "" {
		// Register API packages resource
		s.AddResource(mcp.Resource{
			URI:         "api-packages-list",
			Name:        "API Packages List",
			Description: "List of all API packages in the system. The resource returns a JSON array with elements containing: name (package/group name), id (package ID for use in tool calls), type (type: 'package' or 'group'). Package ID can serve as a hint to which domain the API belongs. Use this resource to: get a list of all available packages, find package ID by package name. Package IDs from this resource should be used in the 'group' parameter of the search_rest_api_operations tool.",
			MIMEType:    "application/json",
		}, func(ctx context.Context, request mcp.ReadResourceRequest) ([]mcp.ResourceContents, error) {
			return m.GetPackagesList(ctx, mcpWorkspace)
		})
	} else {
		log.Warn("MCP_WORKSPACE environment variable is not set, skipping API packages resource registration")
	}

	return s
}

func (m mcpService) MakeOpenAiMCPTools() []openAITool {
	openAIToolsRaw := GetToolsForOpenAI()
	toolsList := make([]openAITool, len(openAIToolsRaw))
	for i, toolRaw := range openAIToolsRaw {
		functionRaw := toolRaw["function"].(map[string]interface{})
		toolsList[i] = openAITool{
			Type: toolRaw["type"].(string),
			Function: openAIFunction{
				Name:        functionRaw["name"].(string),
				Description: functionRaw["description"].(string),
				Parameters:  functionRaw["parameters"].(map[string]interface{}),
			},
		}
	}
	return toolsList
}

// GetPackagesList retrieves the list of packages from the workspace
func (m mcpService) GetPackagesList(ctx context.Context, workspaceId string) ([]mcp.ResourceContents, error) {
	log.Infof("Getting packages list for workspace: %s", workspaceId)

	// TODO: should be retrieved from the request
	// Create system context for service calls
	secCtx := secctx.CreateSystemContext()

	packageListReq := view.PackageListReq{
		Kind:               []string{entity.KIND_PACKAGE}, // As specified: kind=package
		ShowAllDescendants: true,
		ParentId:           workspaceId,
		Limit:              10000, // Large limit to get all packages
		Offset:             0,
	}

	// Get all packages from workspace
	packages, err := m.packageService.GetPackagesList(secCtx, packageListReq, false)
	if err != nil {
		log.Errorf("Failed to get packages list: %v", err)
		return nil, fmt.Errorf("failed to get packages list: %w", err)
	}

	// Post-processing: filter and convert packages
	packagesMCP := convertPackagesToMCP(packages)

	jsonData, err := json.Marshal(packagesMCP)
	if err != nil {
		log.Errorf("Failed to marshal packages list: %v", err)
		return nil, fmt.Errorf("failed to marshal packages list: %w", err)
	}

	log.Debugf("Packages list retrieved: %s", jsonData)

	return []mcp.ResourceContents{
		&mcp.TextResourceContents{
			URI:      "api-packages-list",
			MIMEType: "application/json",
			Text:     string(jsonData),
		},
	}, nil
}

const mcpInstructions = `The apihub-mcp MCP server provides information about REST API specifications.

DATA STRUCTURE:
- REST API specifications are organized into packages
- Package ID can serve as a hint to which domain the API belongs
- Each package contains API operations
- Each package can have multiple versions in YYYY.Q format (e.g., 2024.3, 2024.4)

WHEN TO USE THIS SERVER:
Use apihub-mcp when the user asks about:
- REST API operations and endpoints
- Available API specifications
- How to create or get resources via API
- Detailed information about specific API operations

AVAILABLE TOOLS:
1. search_rest_api_operations - search for API operations (see tool description for details)
2. get_rest_api_operations_specification - get OpenAPI specification for a specific operation (use only when user explicitly requests details)

AVAILABLE RESOURCES:
- api-packages-list - list of all packages in the system. Use this resource when:
  * User asks "what packages are available", "show all APIs", "list packages"
  * You need to find package ID by package name for use in tool calls
  * The resource returns a JSON array with fields: name, id, type (package/group)
  * Use package ID from this resource in the 'group' parameter of search_rest_api_operations tool

RESPONSES:
- Provide concise and structured answers
- Return all metadata that MCP returns in responses
- First show a list of operations to choose from, even if only one operation is found
- Use get_rest_api_operations_specification only when user explicitly requests details about a specific operation`

// Tool names constants
const (
	ToolNameSearchOperations = "search_rest_api_operations"
	ToolNameGetOperationSpec = "get_rest_api_operations_specification"
)

// Tool descriptions for MCP server
const (
	ToolDescriptionSearchOperationsMCP = `Search for REST API operations by text query.

IMPORTANT: The search is not full-text. For example, a query "create customer" may not find an operation "create new customer". Therefore, it is important to try different search query variations.

LLM INSTRUCTIONS:
- For the first call, use a large limit (100) to find as many options as possible. Paging starts from 0
- Consider simplifying the query to a single keyword (e.g., if query is "create customer", also try "customer")
- Query string has special features: -word to force exclude a word from the search - it can help if search results are flooded with irrelevant results; "something certain"  - double quotes to strict search of a phrase/word
- Group results by packageId when displaying
- Return all metadata that MCP returns (operationId, packageId, packageName, version, path, method, title, apiKind, apiType, apiAudience)
- Return the most recent versions of operations (by default, search is performed in the latest completed version)
- If the first call returned few unique operations - make repeated calls:
  * Increase page number for pagination
  * Simplify or generalize the search query
  * Search in other packages (use 'group' parameter for a specific package)
  * Search in older versions only if user explicitly requested it
- If user asks for more results - increment page, simplify query, or search in other packages/versions
- DO NOT use get_rest_api_operations_specification in advance - first show a list of operations to choose from, even if only one is found
- Use get_rest_api_operations_specification only when user explicitly requests details about a specific operation
- If user explicitly requests a specific version - use 'release' parameter in YYYY.Q format
- If user requests results from a specific package - use 'group' parameter with packageId (not packageName)`

	ToolDescriptionGetOperationSpecMCP = `Get OpenAPI specification for a specific REST API operation.

Use this tool ONLY when the user explicitly requests details about a specific operation.

LLM INSTRUCTIONS:
- The response contains JSON with REST API specification - provide the full specification json in the response, display it as a code block
- After the code block, add a human-readable description:
  * Purpose and meaning of the operation
  * Description of request parameters
  * Description of response structure
  * Specify the package (packageId) and version in which this operation is located
- Generate RequestBody and ResponseBody examples based on the specification
- Provide the user with complete information about the operation
- Include the full OpenAPI specification json in the response`
)

// Tool descriptions for OpenAI
const (
	ToolDescriptionSearchOperationsOpenAI = `Search for REST API operations by text query.

IMPORTANT: The search is not full-text. For example, a query "create customer" may not find an operation "create new customer". Therefore, it is important to try different search query variations.

LLM INSTRUCTIONS:
- For the first call, use a large limit (100) to find as many options as possible. Paging starts from 0
- Consider simplifying the query to a single keyword (e.g., if query is "create customer", also try "customer")
- Query string has special features: -word to force exclude a word from the search - it can help if search results are flooded with irrelevant results; "something certain"  - double quotes to strict search of a phrase/word
- Group results by packageId when displaying in markdown format
- Return all metadata that MCP returns (operationId, packageId, packageName, version, path, method, title, apiKind, apiType, apiAudience)
- Return the most recent versions of operations (by default, search is performed in the latest completed version)
- If the first call returned few unique operations - make repeated calls:
  * Increase page number for pagination
  * Simplify or generalize the search query
  * Search in other packages (use 'group' parameter for a specific package)
  * Search in older versions only if user explicitly requested it
- If user asks for more results - increment page, simplify query, or search in other packages/versions
- DO NOT use get_rest_api_operations_specification in advance - first show a list of operations to choose from in markdown format, even if only one is found
- Use get_rest_api_operations_specification only when user explicitly requests details about a specific operation
- If user explicitly requests a specific version - use 'release' parameter in YYYY.Q format
- If user requests results from a specific package - use 'group' parameter with packageId (not packageName)
- REQUIRED: Convert metadata to markdown links (relative, without baseUrl):
  * packageId -> [packageId](/portal/packages/<packageId>)
  * operationId -> [operationId](/portal/packages/<packageId>/<version>/operations/rest/<operationId>)
- Format responses in markdown with well-readable markup (headings, lists, tables)`

	ToolDescriptionGetOperationSpecOpenAI = `Get OpenAPI specification for a specific REST API operation.

Use this tool ONLY when the user explicitly requests details about a specific operation.

LLM INSTRUCTIONS:
- The response contains JSON with REST API specification - provide the full specification json in the response, display it as a code block
- After the code block, add a human-readable description in markdown format:
  * Purpose and meaning of the operation
  * Description of request parameters
  * Description of response structure
  * Specify the package (packageId) and version in which this operation is located
- Generate RequestBody and ResponseBody examples based on the specification in markdown code blocks
- Provide the user with complete information about the operation in structured markdown format
- Use markdown links for packageId and operationId:
  * packageId -> [packageId](/portal/packages/<packageId>)
  * operationId -> [operationId](/portal/packages/<packageId>/<version>/operations/rest/<operationId>)`
)

// Tool input schemas (shared between MCP and OpenAI)
var (
	searchOperationsSchema = json.RawMessage(`{
		"type": "object",
		"properties": {
			"query": {
				"type": "string"
			},
			"limit": {
				"type": "integer",
				"minimum": 10,
				"maximum": 100
			},
			"page": {
			    "type": "integer",
				"minimum": 0
			},
			"release": {
				"type": "string"
			},
			"group": {
				"type": "string"
			}
		},
		"required": ["query"]
	}`)

	getOperationSpecSchema = json.RawMessage(`{
		"type": "object",
		"properties": {
			"operationId": {
				"type": "string"
			},
			"packageId": {
				"type": "string"
			},
			"version": {
				"type": "string"
			}
		},
		"required": ["operationId","packageId","version"]
	}`)
)

// getToolMetadata returns metadata for all tools
func getToolMetadata() []view.ToolMetadata {
	return []view.ToolMetadata{
		{
			Name:              ToolNameSearchOperations,
			Schema:            searchOperationsSchema,
			DescriptionMCP:    ToolDescriptionSearchOperationsMCP,
			DescriptionOpenAI: ToolDescriptionSearchOperationsOpenAI,
		},
		{
			Name:              ToolNameGetOperationSpec,
			Schema:            getOperationSpecSchema,
			DescriptionMCP:    ToolDescriptionGetOperationSpecMCP,
			DescriptionOpenAI: ToolDescriptionGetOperationSpecOpenAI,
		},
	}
}

// GetToolsForOpenAI returns MCP tools in OpenAI format
// This function extracts tool definitions from the MCP server and converts them to OpenAI format
func GetToolsForOpenAI() []map[string]interface{} {
	toolsMetadata := getToolMetadata()
	result := make([]map[string]interface{}, len(toolsMetadata))

	for i, meta := range toolsMetadata {
		// Parse schema from JSON to map for OpenAI format
		var schemaMap map[string]interface{}
		if err := json.Unmarshal(meta.Schema, &schemaMap); err != nil {
			log.Errorf("Failed to unmarshal schema for tool %s: %v", meta.Name, err)
			continue
		}

		// Add descriptions to parameters for OpenAI format
		enhancedSchema := enhanceSchemaWithDescriptions(schemaMap, meta.Name)

		result[i] = map[string]interface{}{
			"type": "function",
			"function": map[string]interface{}{
				"name":        meta.Name,
				"description": meta.DescriptionOpenAI,
				"parameters":  enhancedSchema,
			},
		}
	}

	return result
}

// getParameterDescription returns description for a parameter
func getParameterDescription(toolName, paramName string) string {
	descriptions := map[string]map[string]string{
		ToolNameSearchOperations: {
			"query":   "Text search query for finding API operations. Important: search is not full-text, so it's worth trying different query variations (simplified, with keywords)",
			"limit":   "Maximum number of results to return (10-100). For the first search, it's recommended to use 100",
			"page":    "Page number for pagination (starts from 0). Use to get additional results",
			"release": "Release version in YYYY.Q format (e.g., 2024.3). By default, the latest completed version is used. Specify only if user explicitly requests a specific version",
			"group":   "Package ID (packageId) to filter search by a specific package. Use packageId from api-packages-list resource, not packageName",
		},
		ToolNameGetOperationSpec: {
			"operationId": "Unique operation identifier (operationId) from search results",
			"packageId":   "Package ID (packageId) where the operation is located. Use packageId from search results or api-packages-list resource",
			"version":     "Package version in YYYY.Q format (e.g., 2024.3) where the operation is located",
		},
	}

	if toolDescs, ok := descriptions[toolName]; ok {
		if desc, ok := toolDescs[paramName]; ok {
			return desc
		}
	}
	return ""
}

// enhanceSchemaWithDescriptions adds descriptions to schema properties for OpenAI format
func enhanceSchemaWithDescriptions(schema map[string]interface{}, toolName string) map[string]interface{} {
	// Create a copy to avoid modifying original
	enhanced := make(map[string]interface{})
	for k, v := range schema {
		enhanced[k] = v
	}

	// Add descriptions to properties
	if properties, ok := enhanced["properties"].(map[string]interface{}); ok {
		enhancedProperties := make(map[string]interface{})
		for propName, propValue := range properties {
			propMap, ok := propValue.(map[string]interface{})
			if !ok {
				enhancedProperties[propName] = propValue
				continue
			}

			// Add description if not present
			if _, hasDesc := propMap["description"]; !hasDesc {
				propMapCopy := make(map[string]interface{})
				for k, v := range propMap {
					propMapCopy[k] = v
				}
				propMapCopy["description"] = getParameterDescription(toolName, propName)
				enhancedProperties[propName] = propMapCopy
			} else {
				enhancedProperties[propName] = propValue
			}
		}
		enhanced["properties"] = enhancedProperties
	}

	return enhanced
}
