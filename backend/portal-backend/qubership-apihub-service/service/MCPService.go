package service

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/client"
	secctx "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/metrics"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/mark3labs/mcp-go/mcp"
	mcpserver "github.com/mark3labs/mcp-go/server"
	log "github.com/sirupsen/logrus"
)

type MCPService interface {
	MakeMCPServer() *mcpserver.MCPServer
	MakeLLMTools() []client.LLMTool
	ExecuteGetSpecTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error)
	ExecuteSearchTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error)
	ExecuteGetOperationDiffTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error)
	ExecuteGetDocumentTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error)
	GetPackagesList(ctx context.Context, workspaceId string) ([]mcp.ResourceContents, error)
	IDSAssetsAvailable() bool
	IDSAuthoringKit(userInput string) (string, error)
}

func NewMCPService(systemInfoService SystemInfoService, operationService OperationService, packageService PackageService, versionService VersionService, monitoringService MonitoringService) MCPService {
	return &mcpService{
		systemInfoService: systemInfoService,
		operationService:  operationService,
		packageService:    packageService,
		versionService:    versionService,
		monitoringService: monitoringService,
		assets:            loadMCPAssets(mcpAssetsRootDir),
	}
}

type mcpService struct {
	systemInfoService SystemInfoService
	operationService  OperationService
	packageService    PackageService
	versionService    VersionService
	monitoringService MonitoringService

	assets *mcpAssets
}

func (m mcpService) IDSAssetsAvailable() bool {
	if m.assets == nil {
		return false
	}
	return m.assets.IDSAssetsAvailable()
}

func (m mcpService) IDSAuthoringKit(userInput string) (string, error) {
	if m.assets == nil {
		return "", fmt.Errorf("MCP assets not loaded")
	}
	return m.assets.IDSAuthoringKit(userInput)
}

func (m mcpService) MakeMCPServer() *mcpserver.MCPServer {
	hooks := &mcpserver.Hooks{}
	hooks.AddAfterInitialize(func(ctx context.Context, _ any, req *mcp.InitializeRequest, _ *mcp.InitializeResult) {
		m.monitoringService.IncreaseBusinessMetricCounter(UserIDFromMCPCtx(ctx), metrics.MCPSessionInitialized, createMCPClientLabel(req.Params.ClientInfo))
	})

	s := mcpserver.NewMCPServer(
		"apihub-mcp",
		"0.1.0",
		mcpserver.WithToolCapabilities(false),
		mcpserver.WithInstructions(mcpInstructions),
		mcpserver.WithHooks(hooks),
	)

	toolHandlers := map[string]func(context.Context, mcp.CallToolRequest) (*mcp.CallToolResult, error){
		ToolNameSearchOperations: m.ExecuteSearchTool,
		ToolNameGetOperationSpec: m.ExecuteGetSpecTool,
		ToolNameGetOperationDiff: m.ExecuteGetOperationDiffTool,
		ToolNameGetDocument:      m.ExecuteGetDocumentTool,
		LegacyToolNameSearchRestOperations:        m.ExecuteLegacyRestSearchTool,
		LegacyToolNameGetRestOperationSpec:        m.ExecuteLegacyRestGetSpecTool,
		LegacyToolNameGetRestOperationDiff:        m.ExecuteLegacyRestGetOperationDiffTool,
	}
	for _, meta := range getMCPServerToolMetadata() {
		handler, ok := toolHandlers[meta.Name]
		if !ok {
			log.Warnf("MCP tool %s has metadata but no handler", meta.Name)
			continue
		}
		s.AddTool(mcp.Tool{
			Name:           meta.Name,
			Description:    meta.DescriptionMCP,
			RawInputSchema: meta.Schema,
		}, handler)
	}

	mcpWorkspace := m.systemInfoService.GetAiMCPConfig().Workspace
	if mcpWorkspace != "" {
		// Register API packages resource
		s.AddResource(mcp.Resource{
			URI:         "api-packages-list",
			Name:        "API Packages List",
			Description: "List of all API packages in the system. The resource returns a JSON object with a 'packages' array. Each item includes package metadata (name, packageId, kind, parents, etc.) and a 'versions' list containing up to 100 release versions sorted by version desc (status=release, sortBy=version, sortOrder=desc). Package ID can serve as a hint to which domain the API belongs. Use this resource to: get a list of all available packages, find package ID by package name, and review available release versions. Package IDs from this resource should be used in the 'group' parameter of the search_api_operations tool.",
			MIMEType:    "application/json",
		}, func(ctx context.Context, request mcp.ReadResourceRequest) ([]mcp.ResourceContents, error) {
			return m.GetPackagesList(ctx, mcpWorkspace)
		})
	} else {
		log.Warn("AI MCP workspace is not set, skipping API packages resource registration")
	}

	// Auto-register every file under resources/mcp/resources/ as a static MCP resource.
	// URI scheme: apihub://mcp/resources/<filename> -- stable so external clients can
	// reference resources directly when an embeddable URI is needed.
	if m.assets != nil {
		for _, asset := range m.assets.ListResources() {
			a := asset // capture
			uri := mcpResourceURI(a.Filename)
			s.AddResource(mcp.Resource{
				URI:         uri,
				Name:        a.Name,
				Description: fmt.Sprintf("Bundled MCP resource loaded from resources/mcp/resources/%s.", a.Filename),
				MIMEType:    a.MIMEType,
			}, func(ctx context.Context, request mcp.ReadResourceRequest) ([]mcp.ResourceContents, error) {
				return []mcp.ResourceContents{
					&mcp.TextResourceContents{
						URI:      uri,
						MIMEType: a.MIMEType,
						Text:     a.Content,
					},
				}, nil
			})
		}
	}

	// IDS-specific prompt: it's the only one (so far) that takes a templated argument
	// and embeds another bundled asset (the ids_template resource). Other prompts can
	// be added the same way as more authoring kits land.
	if m.IDSAssetsAvailable() {
		s.AddPrompt(mcp.Prompt{
			Name:        idsPromptName,
			Description: "Generate an Integration Design Specification (IDS) document from a free-text user request. The prompt returns the canonical IDS markdown template together with the step-by-step authoring rules; the LLM is expected to walk the apihub MCP tools to fill in real API specs and produce the final document.",
			Arguments: []mcp.PromptArgument{
				{
					Name:        idsPromptArgUserInput,
					Description: "The user's natural-language request describing the integration scenario and APIs to integrate.",
					Required:    true,
				},
			},
		}, func(ctx context.Context, request mcp.GetPromptRequest) (*mcp.GetPromptResult, error) {
			userInput := request.Params.Arguments[idsPromptArgUserInput]
			kit, err := m.IDSAuthoringKit(userInput)
			if err != nil {
				return nil, err
			}
			return mcp.NewGetPromptResult(
				"IDS authoring kit (template + rules + user request)",
				[]mcp.PromptMessage{
					mcp.NewPromptMessage(mcp.RoleUser, mcp.NewTextContent(kit)),
				},
			), nil
		})
	}

	return s
}

// mcpResourceURI builds the canonical URI for a bundled MCP resource asset.
func mcpResourceURI(filename string) string {
	return "apihub://mcp/resources/" + filename
}

const (
	// idsPromptName is the public MCP-side prompt name used by external clients (Claude Desktop etc.).
	idsPromptName         = "generate_ids_document"
	idsPromptArgUserInput = "user_input"
)

func (m mcpService) MakeLLMTools() []client.LLMTool {
	openAIToolsRaw := GetToolsForOpenAI()
	toolsList := make([]client.LLMTool, len(openAIToolsRaw))
	for i, toolRaw := range openAIToolsRaw {
		functionRaw := toolRaw["function"].(map[string]interface{})
		toolsList[i] = client.LLMTool{
			Name:        functionRaw["name"].(string),
			Description: functionRaw["description"].(string),
			Parameters:  functionRaw["parameters"].(map[string]interface{}),
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
	for i := range packagesMCP.Packages {
		packageInfo := &packagesMCP.Packages[i]
		versionsReq := view.VersionListReq{
			PackageId: packageInfo.Id,
			Status:    "release",
			Limit:     100,
			Page:      0,
			SortBy:    view.VersionSortByVersion,
			SortOrder: view.VersionSortOrderDesc,
		}
		versionsView, err := m.versionService.GetPackageVersionsView(versionsReq, false)
		if err != nil {
			log.Errorf("Failed to get versions list for package %s: %v", packageInfo.Id, err)
			return nil, fmt.Errorf("failed to get versions list for package %s: %w", packageInfo.Id, err)
		}
		if versionsView != nil {
			packageInfo.Versions = projectPublishedVersionsForMCP(versionsView.Versions)
		}
	}

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

func SetUserIDOnMCPCtx(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, "apihubUserID", userID)
}

func UserIDFromMCPCtx(ctx context.Context) string {
	if v, ok := ctx.Value("apihubUserID").(string); ok {
		return v
	}
	return ""
}

const MCPClientLabelInternalAIChat = "apihub-chat/internal"

func SetMCPClientLabel(ctx context.Context, label string) context.Context {
	return context.WithValue(ctx, "apihubMCPClient", label)
}

func MCPClientLabelFromCtx(ctx context.Context) string {
	if sess := mcpserver.ClientSessionFromContext(ctx); sess != nil {
		if sci, ok := sess.(mcpserver.SessionWithClientInfo); ok {
			return createMCPClientLabel(sci.GetClientInfo())
		}
	}
	if v, ok := ctx.Value("apihubMCPClient").(string); ok && v != "" {
		return v
	}
	return "unknown"
}

func createMCPClientLabel(impl mcp.Implementation) string {
	if impl.Name == "" {
		return "unknown"
	}
	if impl.Version != "" {
		return impl.Name + "/" + impl.Version
	}
	return impl.Name
}

const mcpInstructions = `The apihub-mcp MCP server provides information about REST, GraphQL, and AsyncAPI specifications.

DATA STRUCTURE:
- API specifications are organized into packages
- Package ID can serve as a hint to which domain the API belongs
- Each package contains versioned API specifications and API operations extracted from those specifications
- Each package can have multiple versions in YYYY.Q format (e.g., 2024.3, 2024.4)
- api-packages-list resource includes release versions per package (up to 100, sorted by version desc)

WHEN TO USE THIS SERVER:
Use apihub-mcp when the user asks about:
- REST, GraphQL, or AsyncAPI operations
- Available API specifications
- How APIs expose behavior, including REST resource operations, GraphQL queries/mutations/subscriptions, and AsyncAPI message publishing, sending, receiving, or consuming
- Detailed information about specific API operations

AVAILABLE TOOLS:
1. search_api_operations - search for REST, GraphQL, or AsyncAPI operations (see tool description for details)
2. get_api_operation_specification - get operation-level specification data extracted from an OpenAPI or AsyncAPI specification (use only when user explicitly requests details)
3. get_api_operation_diff - get list of changes of the specific operation from OpenAPI or AsyncAPI specification from the specific package and version to the previous version (use then user asks for changes of the specific operation)
4. get_document - get a source API specification by slug for REST, GraphQL, or AsyncAPI (use this tool when the user needs the source API specification or a document-level diff built by comparing two fetched versions)

AVAILABLE RESOURCES:
- api-packages-list - list of all packages in the system. Use this resource when:
	* User asks "what packages are available", "show all APIs", "list packages"
	* You need to find package ID by package name for use in tool calls
	* The resource returns a JSON object with 'packages' array. Each package contains metadata and 'versions' list (release versions sorted by version desc)
	* Use package ID from this resource in the 'group' parameter of search_api_operations tool

RESPONSES:
- Provide concise and structured answers
- Return all metadata that MCP returns in responses, including documentId from search results
- When using get_document, use documentData as the source specification content; documentType identifies the specification type and format describes its syntax
- First show a list of operations to choose from, even if only one operation is found
- Use get_api_operation_specification only when user explicitly requests details about a REST or AsyncAPI operation
- Do not ask the user for a specification slug after search; use the selected result's documentId as get_document.slug`

// Tool names constants
const (
	ToolNameSearchOperations = "search_api_operations"
	ToolNameGetOperationSpec = "get_api_operation_specification"
	ToolNameGetOperationDiff = "get_api_operation_diff"
	ToolNameGetDocument      = "get_document"

	LegacyToolNameSearchRestOperations = "search_rest_api_operations"
	LegacyToolNameGetRestOperationSpec = "get_rest_api_operations_specification"
	LegacyToolNameGetRestOperationDiff = "get_rest_api_operation_diff"
)

// Tool descriptions for MCP server
const (
	ToolDescriptionSearchOperationsMCP = `Search for API operations by text query.

Supported apiType values: rest, graphql, asyncapi.

IMPORTANT: Search is lexical full-text search, not semantic, fuzzy, or substring search. Plain words are treated as required terms, so try shorter and longer query variations.
IMPORTANT: Search matches only terms included in the operation search index. If a query returns too few or irrelevant results, retry with alternative terms such as operation names, titles, REST path segments, AsyncAPI channel/message names, GraphQL input/output type names, or domain keywords.

LLM INSTRUCTIONS:
- Always pass apiType
- For the first call, use a large limit (100) to find as many options as possible. Paging starts from 0
- Consider simplifying the query to a single keyword (e.g., if query is "create customer", also try "customer")
- For REST, search by HTTP method, operation path, distinctive path segment, title, summary/description terms, and domain nouns. If a full path or server-base-prefixed path fails, retry with the operation path only or shorter path segments
- For AsyncAPI, search by operation id, action (send/receive), channel address, message name/title, payload/schema name, and important payload field names. If the first query fails, retry with shorter terms from the user request
- For GraphQL, search by operation name, operation type (query/mutation/subscription), description terms, input/output type names, and domain nouns. If the first query fails, retry with shorter terms from the user request
- Query string has special features: -word to force exclude a word from the search - it can help if search results are flooded with irrelevant results; "something certain" - double quotes to strict search of a phrase/word
- Group results by packageId when displaying
- Return all metadata that MCP returns (operationId, packageId, packageName, version, title, apiKind, apiType, apiAudience, documentId, and API-specific fields)
- documentId is the specification slug to pass as get_document.slug
- Return the most recent versions of operations (by default, search is performed in the latest completed version)
- If the first call returned few unique operations - make repeated calls:
	* Increase page number for pagination
	* Simplify or generalize the search query
	* Search in other packages (use 'group' parameter for a specific package)
	* Search in older versions only if user explicitly requested it
- If user asks for more results - increment page, simplify query, or search in other packages/versions
- DO NOT use get_api_operation_specification in advance - first show a list of operations to choose from, even if only one is found
- Use get_api_operation_specification only when user explicitly requests details about a REST or AsyncAPI operation
- VERSION — IMPORTANT: the default "latest completed version" is computed from the current calendar date (e.g., current quarter 2026.2), NOT from the latest version actually published in the system. If the user mentions any version number (e.g., "2025.4"), ALWAYS pass it explicitly as the 'release' parameter. Never assume the default will match what the user expects. Check api-packages-list for available versions when uncertain
- If user requests results from a specific package - use 'group' parameter with packageId (not packageName)`

	ToolDescriptionGetOperationSpecMCP = `Get operation-level specification data extracted from an OpenAPI or AsyncAPI specification.

Supported apiType values: rest, asyncapi.

Use this tool ONLY when the user explicitly requests details about a specific REST or AsyncAPI operation.

LLM INSTRUCTIONS:
- Always pass apiType from the selected search_api_operations result
- The response contains JSON with REST or Async API specification - in your user-facing reply put the full JSON inside a fenced markdown code block with the json language tag (not inline prose)
- After the code block, add a human-readable description:
	* Purpose and meaning of the operation
	* Description of request, response, message, or channel structure
	* Specify the package (packageId), version, and apiType in which this operation is located
- Generate examples based on the operation data when possible
- Provide the user with complete information about the operation`

	ToolDescriptionGetOperationDiffMCP = `Get list of changes of the specific operation from OpenAPI or AsyncAPI specification from the specific package and version to the previous version.

Supported apiType values: rest, asyncapi.

Use this tool ONLY when the user explicitly requests changes of a specific REST or AsyncAPI operation.

LLM INSTRUCTIONS:
- Always pass apiType from the selected search_api_operations result
- The response contains JSON with list of changes of the specific operation from OpenAPI or AsyncAPI specification from the specific package and version to the previous version
- If users ask for changes for many operations - call this tool for each operation`

	ToolDescriptionGetDocumentMCP = `Get a source API specification by slug.

Supported apiType values: rest, graphql, asyncapi.

Use this tool when the user needs the source API specification or a document-level diff built by comparing two fetched versions.
The response contains documentType, format, and documentData with the full source specification. JSON specifications are returned as structured JSON; non-JSON specifications are returned as text.

LLM INSTRUCTIONS:
- Always pass apiType
- Do not invent slug values
- Use documentId from a selected search_api_operations result as this tool's slug parameter
- Return the full documentData from the response; use documentType to interpret specification semantics and format to render text payloads
- Put large JSON or YAML documentData in fenced markdown code blocks, not as inline plain text`

	LegacyToolDescriptionSearchOperationsMCP = `Deprecated compatibility alias for search_api_operations.

This tool preserves the old REST-only contract for legacy clients.
It behaves like search_api_operations with apiType=rest and should not be used by new clients.`

	LegacyToolDescriptionGetOperationSpecMCP = `Deprecated compatibility alias for get_api_operation_specification.

This tool preserves the old REST-only contract for legacy clients.
It behaves like get_api_operation_specification with apiType=rest and should not be used by new clients.`

	LegacyToolDescriptionGetOperationDiffMCP = `Deprecated compatibility alias for get_api_operation_diff.

This tool preserves the old REST-only contract for legacy clients.
It behaves like get_api_operation_diff with apiType=rest and should not be used by new clients.`
)

// Tool descriptions for OpenAI
const (
	ToolDescriptionSearchOperationsOpenAI = `Search for API operations by text query.

Supported apiType values: rest, graphql, asyncapi.

IMPORTANT: Search is lexical full-text search, not semantic, fuzzy, or substring search. Plain words are treated as required terms, so try shorter and longer query variations.
IMPORTANT: Search matches only terms included in the operation search index. If a query returns too few or irrelevant results, retry with alternative terms such as operation names, titles, REST path segments, AsyncAPI channel/message names, GraphQL input/output type names, or domain keywords.

LLM INSTRUCTIONS:
- Always pass apiType
- For the first call, use a large limit (100) to find as many options as possible. Paging starts from 0
- Consider simplifying the query to a single keyword (e.g., if query is "create customer", also try "customer")
- For REST, search by HTTP method, operation path, distinctive path segment, title, summary/description terms, and domain nouns. If a full path or server-base-prefixed path fails, retry with the operation path only or shorter path segments
- For AsyncAPI, search by operation id, action (send/receive), channel address, message name/title, payload/schema name, and important payload field names. If the first query fails, retry with shorter terms from the user request
- For GraphQL, search by operation name, operation type (query/mutation/subscription), description terms, input/output type names, and domain nouns. If the first query fails, retry with shorter terms from the user request
- Query string has special features: -word to force exclude a word from the search - it can help if search results are flooded with irrelevant results; "something certain" - double quotes to strict search of a phrase/word
- Group results by packageId when displaying in markdown format
- Return all metadata that MCP returns (operationId, packageId, packageName, version, title, apiKind, apiType, apiAudience, documentId, and API-specific fields)
- documentId is the specification slug to pass as get_document.slug
- Return the most recent versions of operations (by default, search is performed in the latest completed version)
- If the first call returned few unique operations - make repeated calls:
	* Increase page number for pagination
	* Simplify or generalize the search query
	* Search in other packages (use 'group' parameter for a specific package)
	* Search in older versions only if user explicitly requested it
- If user asks for more results - increment page, simplify query, or search in other packages/versions
- DO NOT use get_api_operation_specification in advance - first show a list of operations to choose from in markdown format, even if only one is found
- Use get_api_operation_specification only when user explicitly requests details about a REST or AsyncAPI operation
- VERSION — IMPORTANT: the default "latest completed version" is computed from the current calendar date (e.g., current quarter 2026.2), NOT from the latest version actually published in the system. If the user mentions any version number (e.g., "2025.4"), ALWAYS pass it explicitly as the 'release' parameter. Never assume the default will match what the user expects. Check api-packages-list for available versions when uncertain
- If user requests results from a specific package - use 'group' parameter with packageId (not packageName)
- REQUIRED: Convert metadata to markdown links (relative, without baseUrl):
	* packageId -> [packageId](/portal/packages/<packageId>)
	* operationId -> [operationId](/portal/packages/<packageId>/<version>/operations/<apiType>/<operationId>)
- Format responses in markdown with well-readable markup (headings, lists, tables)`

	ToolDescriptionGetOperationSpecOpenAI = `Get operation-level specification data extracted from an OpenAPI or AsyncAPI specification.

Supported apiType values: rest, asyncapi.

Use this tool ONLY when the user explicitly requests details about a specific REST or AsyncAPI operation.

LLM INSTRUCTIONS:
- Always pass apiType from the selected search_api_operations result
- The response contains JSON with REST or Async API specification - in your user-facing reply put the full JSON inside a fenced markdown code block with the json language tag (not inline prose)
- After the code block, add a human-readable description in markdown format:
	* Purpose and meaning of the operation
	* Description of request, response, message, or channel structure
	* Specify the package (packageId), version, and apiType in which this operation is located
- Generate examples based on the operation data when possible in markdown code blocks
- Provide the user with complete information about the operation in structured markdown format
- Use markdown links for packageId and operationId:
	* packageId -> [packageId](/portal/packages/<packageId>)
	* operationId -> [operationId](/portal/packages/<packageId>/<version>/operations/<apiType>/<operationId>)`

	ToolDescriptionGetOperationDiffOpenAI = `Get list of changes of the specific operation from OpenAPI or AsyncAPI specification from the specific package and version to the previous version in markdown format.

Supported apiType values: rest, asyncapi.

Use this tool ONLY when the user explicitly requests changes of a specific REST or AsyncAPI operation.

LLM INSTRUCTIONS:
- Always pass apiType from the selected search_api_operations result
- The response contains JSON with list of changes of the specific operation from OpenAPI or AsyncAPI specification from the specific package and version to the previous version
- If users ask for changes for many operations - call this tool for each operation
- Format responses in markdown with well-readable markup (headings, lists, tables)`

	ToolDescriptionGetDocumentOpenAI = `Get a source API specification by slug.

Supported apiType values: rest, graphql, asyncapi.

Use this tool when the user needs the source API specification, and especially for GraphQL details where operation-level specification and diff tools are not supported.
The response contains documentType, format, and documentData with the full source specification. JSON specifications are returned as structured JSON; non-JSON specifications are returned as text.

LLM INSTRUCTIONS:
- Always pass apiType
- Do not invent slug values
- Use documentId from a selected search_api_operations result as this tool's slug parameter
- Return the full documentData from the response; use documentType to interpret specification semantics and format to render text payloads
- Put large JSON or YAML documentData in fenced markdown code blocks with the appropriate language tag, not as inline plain text
- Format responses in markdown with well-readable markup (headings, lists, tables, code blocks)`
)

// Tool input schemas (shared between MCP and OpenAI)
var (
	searchOperationsSchema = json.RawMessage(`{
		"type": "object",
		"properties": {
			"apiType": {
				"type": "string",
				"enum": ["rest", "graphql", "asyncapi"]
			},
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
		"required": ["apiType","query"]
	}`)

	getOperationSpecSchema = json.RawMessage(`{
		"type": "object",
		"properties": {
			"apiType": {
				"type": "string",
				"enum": ["rest", "asyncapi"]
			},
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
		"required": ["apiType","operationId","packageId","version"]
	}`)

	getOperationDiffSchema = json.RawMessage(`{
		"type": "object",
		"properties": {
			"apiType": {
				"type": "string",
				"enum": ["rest", "asyncapi"]
			},
			"operationId": {
				"type": "string"
			},
			"packageId": {
				"type": "string"
			},
			"version": {
				"type": "string"
			},
			"previousVersion": {
				"type": "string"
			}
		},
		"required": ["apiType","operationId","packageId","version","previousVersion"]
	}`)

	getDocumentSchema = json.RawMessage(`{
		"type": "object",
		"properties": {
			"apiType": {
				"type": "string",
				"enum": ["rest", "graphql", "asyncapi"]
			},
			"packageId": {
				"type": "string"
			},
			"version": {
				"type": "string"
			},
			"slug": {
				"type": "string"
			}
		},
		"required": ["apiType","packageId","version","slug"]
	}`)

	legacySearchOperationsSchema = json.RawMessage(`{
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

	legacyGetOperationSpecSchema = json.RawMessage(`{
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

	legacyGetOperationDiffSchema = json.RawMessage(`{
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
			},
			"previousVersion": {
				"type": "string"
			}
		},
		"required": ["operationId","packageId","version","previousVersion"]
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
		{
			Name:              ToolNameGetOperationDiff,
			Schema:            getOperationDiffSchema,
			DescriptionMCP:    ToolDescriptionGetOperationDiffMCP,
			DescriptionOpenAI: ToolDescriptionGetOperationDiffOpenAI,
		},
		{
			Name:              ToolNameGetDocument,
			Schema:            getDocumentSchema,
			DescriptionMCP:    ToolDescriptionGetDocumentMCP,
			DescriptionOpenAI: ToolDescriptionGetDocumentOpenAI,
		},
	}
}

func getMCPServerToolMetadata() []view.ToolMetadata {
	metadata := append([]view.ToolMetadata{}, getToolMetadata()...)
	metadata = append(metadata,
		view.ToolMetadata{
			Name:           LegacyToolNameSearchRestOperations,
			Schema:         legacySearchOperationsSchema,
			DescriptionMCP: LegacyToolDescriptionSearchOperationsMCP,
		},
		view.ToolMetadata{
			Name:           LegacyToolNameGetRestOperationSpec,
			Schema:         legacyGetOperationSpecSchema,
			DescriptionMCP: LegacyToolDescriptionGetOperationSpecMCP,
		},
		view.ToolMetadata{
			Name:           LegacyToolNameGetRestOperationDiff,
			Schema:         legacyGetOperationDiffSchema,
			DescriptionMCP: LegacyToolDescriptionGetOperationDiffMCP,
		},
	)
	return metadata
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
			"apiType": "API type to search. Allowed values: rest, graphql, asyncapi",
			"query":   "Text search query for finding API operations. Important: search is lexical and index-bound, so try different query variations (simplified, with keywords)",
			"limit":   "Maximum number of results to return (10-100). For the first search, it's recommended to use 100",
			"page":    "Page number for pagination (starts from 0). Use to get additional results",
			"release": "Release version in YYYY.Q format (e.g., 2024.3). WARNING: the default 'latest completed version' is computed from the current calendar date, not from the latest version actually published in the system. If the user mentions any version number, always pass it here explicitly. Omit only when the user has not mentioned any specific version.",
			"group":   "Package ID (packageId) to filter search by a specific package. Use packageId from api-packages-list resource, not packageName",
		},
		ToolNameGetOperationSpec: {
			"apiType":     "API type for operation-level specification data. Allowed values: rest, asyncapi. GraphQL is unsupported",
			"operationId": "Unique operation identifier (operationId) from search results",
			"packageId":   "Package ID (packageId) where the operation is located. Use packageId from search results or api-packages-list resource",
			"version":     "Package version in YYYY.Q format (e.g., 2024.3) where the operation is located",
		},
		ToolNameGetOperationDiff: {
			"apiType":         "API type for operation diff. Allowed values: rest, asyncapi. GraphQL is unsupported",
			"operationId":     "Unique operation identifier (operationId) from search results",
			"packageId":       "Package ID (packageId) where the operation is located. Use packageId from search results or api-packages-list resource",
			"version":         "Package version in YYYY.Q format (e.g., 2024.3) where the operation is located",
			"previousVersion": "Package version in YYYY.Q format (e.g., 2024.2) where the operation was located",
		},
		ToolNameGetDocument: {
			"apiType":   "API type for the specification. Allowed values: rest, graphql, asyncapi",
			"packageId": "Package ID (packageId) where the specification is located. Use packageId from search results or api-packages-list resource",
			"version":   "Package version in YYYY.Q format (e.g., 2024.3) where the specification is located",
			"slug":      "Specification slug. Use documentId returned by search_api_operations; do not invent this value",
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
