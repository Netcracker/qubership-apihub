package service

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/client"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/metrics"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/secctx"
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
	ExecuteSearchToolV2(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error)
	ExecuteGetOperationDiffTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error)
	ExecuteGetDocumentTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error)
	ExecuteListWorkspacesTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error)
	ExecuteListWorkspacePackagesTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error)
	ExecuteListPackageVersionsTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error)
	ExecuteListDdlEntitiesTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error)
	ExecuteGetDdlEntityTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error)
	ExecuteGetDdlEntityDiffTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error)
	ExecuteListMcpContractEntitiesTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error)
	ExecuteGetMcpContractEntityTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error)
	ExecuteListApiOperationsTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error)
	GetPackagesList(ctx context.Context, workspaceId string) ([]mcp.ResourceContents, error)
	IDSAssetsAvailable() bool
	IDSAuthoringKit(userInput string) (string, error)
}

func NewMCPService(systemInfoService SystemInfoService, operationService OperationService, packageService PackageService, versionService VersionService, monitoringService MonitoringService, roleService RoleService, ddlContractService DDLContractService, mcpContractService MCPContractService) MCPService {
	return &mcpService{
		systemInfoService:  systemInfoService,
		operationService:   operationService,
		packageService:     packageService,
		versionService:     versionService,
		monitoringService:  monitoringService,
		roleService:        roleService,
		ddlContractService: ddlContractService,
		mcpContractService: mcpContractService,
		assets:             loadMCPAssets(mcpAssetsRootDir),
	}
}

type mcpService struct {
	systemInfoService  SystemInfoService
	operationService   OperationService
	packageService     PackageService
	versionService     VersionService
	monitoringService  MonitoringService
	roleService        RoleService
	ddlContractService DDLContractService
	mcpContractService MCPContractService

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
		userID := secctx.GetUserId(ctx)
		m.monitoringService.IncreaseBusinessMetricCounter(userID, metrics.MCPSessionInitialized, createMCPClientLabel(req.Params.ClientInfo))
	})

	s := mcpserver.NewMCPServer(
		"apihub-mcp",
		"0.1.0",
		mcpserver.WithToolCapabilities(false),
		mcpserver.WithInstructions(mcpInstructions),
		mcpserver.WithHooks(hooks),
	)

	toolHandlers := map[string]func(context.Context, mcp.CallToolRequest) (*mcp.CallToolResult, error){
		ToolNameSearchOperations:           m.ExecuteSearchTool,
		ToolNameSearchOperationsV2:         m.ExecuteSearchToolV2,
		ToolNameGetOperationSpec:           m.ExecuteGetSpecTool,
		ToolNameGetOperationDiff:           m.ExecuteGetOperationDiffTool,
		ToolNameGetDocument:                m.ExecuteGetDocumentTool,
		ToolNameListWorkspaces:             m.ExecuteListWorkspacesTool,
		ToolNameListWorkspacePackages:      m.ExecuteListWorkspacePackagesTool,
		ToolNameListPackageVersions:        m.ExecuteListPackageVersionsTool,
		ToolNameListDdlEntities:            m.ExecuteListDdlEntitiesTool,
		ToolNameGetDdlEntity:               m.ExecuteGetDdlEntityTool,
		ToolNameGetDdlEntityDiff:           m.ExecuteGetDdlEntityDiffTool,
		ToolNameListMcpContractEntities:    m.ExecuteListMcpContractEntitiesTool,
		ToolNameGetMcpContractEntity:       m.ExecuteGetMcpContractEntityTool,
		ToolNameListApiOperations:          m.ExecuteListApiOperationsTool,
		LegacyToolNameSearchRestOperations: m.ExecuteLegacyRestSearchTool,
		LegacyToolNameGetRestOperationSpec: m.ExecuteLegacyRestGetSpecTool,
		LegacyToolNameGetRestOperationDiff: m.ExecuteLegacyRestGetOperationDiffTool,
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
		// Register deprecated API packages resource, scoped to the preconfigured legacy workspace.
		s.AddResource(mcp.Resource{
			URI:         ResourceURIApiPackagesList,
			Name:        "API Packages List",
			Description: "Deprecated: use list_workspaces, list_workspace_packages, and list_package_versions instead. List of all API packages in the preconfigured legacy workspace. The resource returns a JSON object with a 'packages' array. Each item includes package metadata (name, packageId, kind, parents, etc.) and a 'versions' list containing up to 100 release versions sorted by version desc (status=release, sortBy=version, sortOrder=desc). Version strings are package-specific (YYYY.Q, semver such as 0.1.0, v1, etc.). Use this resource to: get a list of all available packages, find package ID by package name, and review available release versions. Pass a package ID as the 'group' parameter of search_api_operations only when the user asked to search that specific package. Use a version from the package's 'versions' list when the user names a version or you need an explicit 'release'. Read this resource with URI mcp://api-packages-list (bare names fail).",
			MIMEType:    "application/json",
		}, func(ctx context.Context, request mcp.ReadResourceRequest) ([]mcp.ResourceContents, error) {
			return m.GetPackagesList(ctx, mcpWorkspace)
		})
	} else {
		log.Warn("AI MCP workspace is not set, skipping deprecated API packages resource registration")
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

// GetPackagesList retrieves the list of packages from the workspace, scoped to the caller's read access
func (m mcpService) GetPackagesList(ctx context.Context, workspaceId string) ([]mcp.ResourceContents, error) {
	// Resource reads do not go through the tool handlers, so they need the same per-operation bound
	ctx, cancel := context.WithTimeout(ctx, MCPToolCallTimeout)
	defer cancel()
	log.Debugf("Getting packages list for workspace: %s", workspaceId)

	if secctx.GetUserId(ctx) == "" {
		return nil, fmt.Errorf("missing security context for api-packages-list request")
	}

	packageListReq := view.PackageListReq{
		Kind:               []string{entity.KIND_PACKAGE}, // As specified: kind=package
		ShowAllDescendants: true,
		ParentId:           workspaceId,
		Limit:              10000, // Large limit to get all packages
		Offset:             0,
	}

	// Get all packages from workspace
	packages, err := m.packageService.GetPackagesList(ctx, packageListReq)
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
			Statuses:  []string{string(view.Release)},
			Limit:     100,
			Page:      0,
			SortBy:    view.VersionSortByVersion,
			SortOrder: view.VersionSortOrderDesc,
		}
		versionsView, err := m.versionService.GetPackageVersionsView(ctx, versionsReq, false)
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
			URI:      ResourceURIApiPackagesList,
			MIMEType: "application/json",
			Text:     string(jsonData),
		},
	}, nil
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

const mcpInstructions = `The apihub-mcp MCP server provides information about REST, GraphQL, and AsyncAPI specifications, as well as DDL database contracts and MCP server contracts.

DATA STRUCTURE:
- An instance holds multiple workspaces; the caller's credentials determine which workspaces and packages are readable
- API specifications are organized into packages within a workspace
- Package ID can serve as a hint to which domain the API belongs
- Each package contains versioned API specifications and API operations extracted from those specifications
- A package version can also carry a DDL database contract (tables/views) and/or an MCP server contract (init handshake, tools, prompts, resources) describing a system that is not itself an API operation set
- Each package can have multiple release versions (often YYYY.Q such as 2024.3, but also semver or other schemes)

WORKSPACE SELECTION (mandatory before search and workspace-scoped tools):
- Never invent or silently pick a workspaceId
- If the user already named a workspace (workspaceId, alias, or name), use that value as workspace
- Otherwise: call list_workspaces, show the accessible workspaces, and ask which one to use
- Call search_api_operations_v2 or list_workspace_packages only after the user has confirmed a workspace

WORKSPACE-FIRST FLOW (use this for new integrations):
1. Resolve the workspace with the user (see WORKSPACE SELECTION above)
2. Use list_workspace_packages with the confirmed workspaceId to browse its packages (metadata only; no versions)
3. Use list_package_versions with a packageId to see that package's available release versions
4. Use search_api_operations_v2 with the confirmed workspace to search for operations, or list_api_operations/list_ddl_entities/list_mcp_contract_entities to browse a version's operations, DDL, or MCP contract entities directly

WHEN TO USE THIS SERVER:
Use apihub-mcp when the user asks about:
- REST, GraphQL, or AsyncAPI operations
- Available API specifications, packages, or workspaces
- How APIs expose behavior, including REST resource operations, GraphQL queries/mutations/subscriptions, and AsyncAPI message publishing, sending, receiving, or consuming
- Detailed information about specific API operations
- DDL database contracts (tables/views) or MCP server contracts (tools/prompts/resources) published in a package version

AVAILABLE TOOLS:
1. list_workspaces - list workspaces the caller can access (call this before workspace-scoped tools when the user has not named a workspace)
2. search_api_operations_v2 - search for REST, GraphQL, or AsyncAPI operations, or DDL/MCP contract entities, within a given workspace (see tool description for details)
3. list_workspace_packages - list packages within a workspace (metadata only; use list_package_versions for versions)
4. list_package_versions - list release versions available for a specific package
5. get_api_operation_specification - get operation-level specification data extracted from an OpenAPI or AsyncAPI specification (use only when user explicitly requests details)
6. get_api_operation_diff - get list of changes of the specific operation from OpenAPI or AsyncAPI specification from the specific package and version to the previous version (use then user asks for changes of the specific operation)
7. get_document - get a source API specification or contract document by slug for REST, GraphQL, AsyncAPI, DDL, or MCP (use this tool when the user needs the source document or a document-level diff built by comparing two fetched versions)
8. list_api_operations - list REST, GraphQL, or AsyncAPI operations in a specific package version, without a search query
9. list_ddl_entities - list DDL database contract entities (tables/views) in a specific package version
10. get_ddl_entity - get full details, including the DDL SQL definition, of a single DDL database contract entity
11. get_ddl_entity_diff - get list of changes for a single DDL database contract entity between two versions
12. list_mcp_contract_entities - list entities (init/tools/prompts/resources) of a published MCP server contract in a specific package version
13. get_mcp_contract_entity - get full details of a single entity from a published MCP server contract

DEPRECATED (kept for backward compatibility; do not use in new integrations):
- search_api_operations - predecessor of search_api_operations_v2, scoped to a single preconfigured workspace instead of a caller-supplied one
- mcp://api-packages-list resource - predecessor of the workspace-first flow above, scoped to the same preconfigured workspace

AVAILABLE RESOURCES:
- Always read resources with the full URI (mcp://…); bare names such as api-packages-list fail
- mcp://api-packages-list - deprecated: list of all packages in the preconfigured legacy workspace. Use this resource when:
	* User asks "what packages are available", "show all APIs", "list packages"
	* You need to find package ID by package name for use in tool calls
	* The resource returns a JSON object with 'packages' array. Each package contains metadata and 'versions' list (release versions sorted by version desc; strings may be YYYY.Q, semver, etc.)
	* Use package ID from this resource in the 'group' parameter of search_api_operations only when the user asked to search that specific package
	* Use the package's 'versions' list when the user names a version or you need an explicit 'release'

RESPONSES:
- Provide concise and structured answers
- Return all metadata that MCP returns in responses, including documentId from search results
- When using get_document, use documentData as the source specification content; documentType identifies the specification type and format describes its syntax
- First show a list of operations to choose from, even if only one operation is found
- Use get_api_operation_specification only when user explicitly requests details about a REST or AsyncAPI operation
- Do not ask the user for a specification slug after search; use the selected result's documentId as get_document.slug
- For DDL/MCP contract search results, use the result's entityId with get_ddl_entity/get_ddl_entity_diff or get_mcp_contract_entity for details, and its documentId with get_document to fetch the full source document

ACCESS CONTROL AND AUTHORIZATION ERRORS:
- Access to workspaces, packages, and operations depends on the credentials used for this connection; some may be restricted for the current user
- A tool result is an authorization error when it starts with "Failed to check user privileges" or states the user does not have enough "privileges" or access to the package
- On such an error, STOP working on that package or operation. Do NOT retry the same tool, call other tools for the same package/operation, or search other packages or versions to work around the restriction
- Inform the user clearly that they do not have access to the requested package or operation with their current credentials and that they may need to request access
- This is different from an empty search result: empty results may justify query, term, or version retries (see search guidance above), but an authorization error must not
- If the request also covers packages the user can access, continue with those and report the restricted package or operation separately`

// Tool names constants
const (
	ToolNameSearchOperations      = "search_api_operations"
	ToolNameSearchOperationsV2    = "search_api_operations_v2"
	ToolNameGetOperationSpec      = "get_api_operation_specification"
	ToolNameGetOperationDiff      = "get_api_operation_diff"
	ToolNameGetDocument           = "get_document"
	ToolNameListWorkspaces        = "list_workspaces"
	ToolNameListWorkspacePackages = "list_workspace_packages"
	ToolNameListPackageVersions   = "list_package_versions"

	ToolNameListDdlEntities         = "list_ddl_entities"
	ToolNameGetDdlEntity            = "get_ddl_entity"
	ToolNameGetDdlEntityDiff        = "get_ddl_entity_diff"
	ToolNameListMcpContractEntities = "list_mcp_contract_entities"
	ToolNameGetMcpContractEntity    = "get_mcp_contract_entity"
	ToolNameListApiOperations       = "list_api_operations"

	LegacyToolNameSearchRestOperations = "search_rest_api_operations"
	LegacyToolNameGetRestOperationSpec = "get_rest_api_operations_specification"
	LegacyToolNameGetRestOperationDiff = "get_rest_api_operation_diff"
)

// Resource URIs
const (
	ResourceURIApiPackagesList = "mcp://api-packages-list"
)

// mcpWorkspacesListLimit bounds the number of workspaces returned by the list_workspaces tool.
const mcpWorkspacesListLimit = 10000

// mcpListWorkspacesMetricKey is the fixed business-metric key for list_workspaces (no workspace input).
const mcpListWorkspacesMetricKey = "workspaces"

// Tool descriptions for MCP server
const (
	ToolDescriptionSearchOperationsMCP = `Deprecated: use search_api_operations_v2 instead. This tool searches only the preconfigured legacy workspace and does not accept a workspace parameter.

Search for API operations, or DDL/MCP contract entities, by text query.

Supported apiType values: rest, graphql, asyncapi, ddl, mcp.

IMPORTANT: Search is lexical full-text search, not semantic, fuzzy, or substring search. Plain words are treated as required terms, so try shorter and longer query variations.
IMPORTANT: Search matches only terms included in the operation search index. If a query returns too few or irrelevant results, retry with alternative terms such as operation names, titles, REST path segments, AsyncAPI channel/message names, GraphQL input/output type names, or domain keywords.
IMPORTANT: apiType=ddl searches DDL database contract entities (tables/views) and apiType=mcp searches MCP server contract entities (tools/prompts/resources) instead of API operations; results carry entityId/kind/schemaName/tableName or entityName/mcpEndpoint instead of operation-specific fields. Use entityId with get_ddl_entity/get_ddl_entity_diff or get_mcp_contract_entity for details.

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
- Return the most recent versions of operations from the ranked results; pass 'release' only to narrow to one published version
- If the first call returned few or no unique operations - make repeated calls:
	* Increase page number for pagination
	* Simplify or generalize the search query, or try alternative/synonym terms
	* Search in a specific package only when the user asked for that package (use 'group' with packageId from mcp://api-packages-list)
	* If results are too broad, pass 'release' from mcp://api-packages-list for the target package (prefer the newest unless the user named one). Packages may use YYYY.Q (e.g., 2024.3), semver (0.0.1, 0.1.0), or other schemes
- If user asks for more results - increment page, simplify query, or search in other packages/versions
- DO NOT use get_api_operation_specification in advance - first show a list of operations to choose from, even if only one is found
- Use get_api_operation_specification only when user explicitly requests details about a REST or AsyncAPI operation
- VERSION: when 'release' is omitted, search is not filtered by version (all release-status versions in scope are considered; ranking prefers higher versions). Pass 'release' only when the user names a version or you need to narrow to one published version
- GROUP: pass 'group' only when the user explicitly asks to search within a specific package. Use that package's packageId; never pass the workspaceId as 'group'`

	ToolDescriptionSearchOperationsV2MCP = `Search for API operations, or DDL/MCP contract entities, by text query within a given workspace.

Supported apiType values: rest, graphql, asyncapi, ddl, mcp.

IMPORTANT: Search is lexical full-text search, not semantic, fuzzy, or substring search. Plain words are treated as required terms, so try shorter and longer query variations.
IMPORTANT: Search matches only terms included in the operation search index. If a query returns too few or irrelevant results, retry with alternative terms such as operation names, titles, REST path segments, AsyncAPI channel/message names, GraphQL input/output type names, or domain keywords.
IMPORTANT: apiType=ddl searches DDL database contract entities (tables/views) and apiType=mcp searches MCP server contract entities (tools/prompts/resources) instead of API operations; results carry entityId/kind/schemaName/tableName or entityName/mcpEndpoint instead of operation-specific fields. Use entityId with get_ddl_entity/get_ddl_entity_diff or get_mcp_contract_entity for details.

LLM INSTRUCTIONS:
- Always pass apiType and workspace
- WORKSPACE IS MANDATORY FROM THE USER: if the user has not named a workspace, call list_workspaces, show the accessible workspaces, and ask which one to use before calling this tool. Never invent or silently pick a workspaceId
- If the user already named a workspace (workspaceId, alias, or name), pass that value as workspace
- For the first call, use a large limit (100) to find as many options as possible. Paging starts from 0
- Consider simplifying the query to a single keyword (e.g., if query is "create customer", also try "customer")
- For REST, search by HTTP method, operation path, distinctive path segment, title, summary/description terms, and domain nouns. If a full path or server-base-prefixed path fails, retry with the operation path only or shorter path segments
- For AsyncAPI, search by operation id, action (send/receive), channel address, message name/title, payload/schema name, and important payload field names. If the first query fails, retry with shorter terms from the user request
- For GraphQL, search by operation name, operation type (query/mutation/subscription), description terms, input/output type names, and domain nouns. If the first query fails, retry with shorter terms from the user request
- Query string has special features: -word to force exclude a word from the search - it can help if search results are flooded with irrelevant results; "something certain" - double quotes to strict search of a phrase/word
- Group results by packageId when displaying
- Return all metadata that MCP returns (operationId, packageId, packageName, version, title, apiKind, apiType, apiAudience, documentId, and API-specific fields)
- documentId is the specification slug to pass as get_document.slug
- Return the most recent versions of operations from the ranked results; pass 'release' only to narrow to one published version
- If the first call returned few or no unique operations - make repeated calls:
	* Increase page number for pagination
	* Simplify or generalize the search query, or try alternative/synonym terms
	* Search in a specific package only when the user asked for that package (use 'group' with packageId from list_workspace_packages)
	* If results are too broad, pass 'release' from list_package_versions for the target package (prefer the newest unless the user named one). Packages may use YYYY.Q (e.g., 2024.3), semver (0.0.1, 0.1.0), or other schemes
- If user asks for more results - increment page, simplify query, or search in other packages/versions
- DO NOT use get_api_operation_specification in advance - first show a list of operations to choose from, even if only one is found
- Use get_api_operation_specification only when user explicitly requests details about a REST or AsyncAPI operation
- VERSION: when 'release' is omitted, search is not filtered by version (all release-status versions in scope are considered; ranking prefers higher versions). Pass 'release' only when the user names a version or you need to narrow to one published version
- GROUP: pass 'group' only when the user explicitly asks to search within a specific package. Use that package's packageId; never pass the workspaceId as 'group'`

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
- Provide the user with complete information about the operation
- If the result reports an authorization problem (a message starting with "Failed to check user privileges" or stating you lack "privileges"/access), STOP. Do not retry, call other tools, or search other packages or versions to work around it. Tell the user they do not have access to this package and may need to request it`

	ToolDescriptionGetOperationDiffMCP = `Get list of changes of the specific operation from OpenAPI or AsyncAPI specification from the specific package and version to the previous version.

Supported apiType values: rest, asyncapi.

Use this tool ONLY when the user explicitly requests changes of a specific REST or AsyncAPI operation.

LLM INSTRUCTIONS:
- Always pass apiType from the selected search_api_operations result
- The response contains JSON with list of changes of the specific operation from OpenAPI or AsyncAPI specification from the specific package and version to the previous version
- If users ask for changes for many operations - call this tool for each operation
- If the result reports an authorization problem (a message starting with "Failed to check user privileges" or stating you lack "privileges"/access), STOP. Do not retry, call other tools, or search other packages or versions to work around it. Tell the user they do not have access to this package and may need to request it`

	ToolDescriptionGetDocumentMCP = `Get a source API specification or contract document by slug.

Supported apiType values: rest, graphql, asyncapi, ddl, mcp.

Use this tool when the user needs the source API specification, the source DDL or MCP contract document, or a document-level diff built by comparing two fetched versions.
The response contains documentType, format, and documentData with the full source specification. JSON specifications are returned as structured JSON; non-JSON specifications are returned as text.

LLM INSTRUCTIONS:
- Always pass apiType
- Do not invent slug values
- Use documentId from a selected search_api_operations, list_ddl_entities, get_ddl_entity, list_mcp_contract_entities, or get_mcp_contract_entity result as this tool's slug parameter
- Return the full documentData from the response; use documentType to interpret specification semantics and format to render text payloads
- Put large JSON or YAML documentData in fenced markdown code blocks, not as inline plain text
- If the result reports an authorization problem (a message starting with "Failed to check user privileges" or stating you lack "privileges"/access), STOP. Do not retry, call other tools, or search other packages or versions to work around it. Tell the user they do not have access to this package and may need to request it`

	ToolDescriptionListWorkspacesMCP = `List workspaces the caller can access.

Returns a JSON object with a 'workspaces' array; each item includes workspace metadata (workspaceId, alias, kind, name, description).

LLM INSTRUCTIONS:
- Call this tool when the user has not named a workspace and you need a workspaceId for search_api_operations_v2 or list_workspace_packages
- Present the returned workspaces and ask which one to use; never invent or silently pick a workspaceId
- If the user already named a workspace (workspaceId, alias, or name), pass that value directly to workspace-scoped tools without calling this tool first
- Workspaces the caller cannot read are not returned`

	ToolDescriptionListWorkspacePackagesMCP = `List packages within a workspace (metadata only, no versions).

LLM INSTRUCTIONS:
- Always pass workspace
- WORKSPACE IS MANDATORY FROM THE USER: if the user has not named a workspace, call list_workspaces, show the accessible workspaces, and ask which one to use before calling this tool. Never invent or silently pick a workspaceId
- If the user already named a workspace (workspaceId, alias, or name), pass that value as workspace
- Use textFilter to narrow results by package name or ID substring
- Use page/limit for pagination when a workspace has many packages
- Use a package's packageId with list_package_versions to see its release versions, and with search_api_operations_v2's 'group' parameter only when the user asked to search that specific package
- Packages the caller cannot read are not returned; an empty result does not necessarily mean the workspace has no packages`

	ToolDescriptionListPackageVersionsMCP = `List release versions available for a specific package.

LLM INSTRUCTIONS:
- Always pass packageId. Use packageId from list_workspace_packages, search results, or the deprecated mcp://api-packages-list resource
- status defaults to release; pass a different status only if the user explicitly asks for draft or archived versions
- Use page/limit for pagination when a package has many versions
- Version strings are package-specific (YYYY.Q such as 2024.3, semver such as 0.1.0, v1, etc.) — do not assume a calendar default exists for every package
- If the result reports an authorization problem (a message starting with "Failed to check user privileges" or stating you lack "privileges"/access), STOP. Do not retry, call other tools, or search other packages or versions to work around it. Tell the user they do not have access to this package and may need to request it`

	ToolDescriptionListApiOperationsMCP = `List REST, GraphQL, or AsyncAPI operations published in a specific package version.

Use this tool to browse a version's operations without a search query, e.g. before fetching an operation's specification or diff. For keyword-based lookup across packages, use search_api_operations_v2 instead.

LLM INSTRUCTIONS:
- Always pass packageId, version, and apiType
- Use textFilter to narrow results by operation title, path, or method
- Use page/limit for pagination when a version has many operations
- Each operation's operationId can be used with get_api_operation_specification and get_api_operation_diff; its documentId can be used with get_document
- If the result reports an authorization problem (a message starting with "Failed to check user privileges" or stating you lack "privileges"/access), STOP. Do not retry, call other tools, or search other packages or versions to work around it. Tell the user they do not have access to this package and may need to request it`

	ToolDescriptionListDdlEntitiesMCP = `List DDL database contract entities (tables and views) published in a specific package version.

Use this tool to browse the tables/views defined by a package's DDL contract before fetching entity details or diffs.

LLM INSTRUCTIONS:
- Always pass packageId and version
- Use textFilter to narrow results by schema, table, or view name
- Use page/limit for pagination when a version has many entities
- Each entity's entityId can be used with get_ddl_entity and get_ddl_entity_diff; its documentId can be used with get_document (apiType=ddl)
- If the result reports an authorization problem (a message starting with "Failed to check user privileges" or stating you lack "privileges"/access), STOP. Do not retry, call other tools, or search other packages or versions to work around it. Tell the user they do not have access to this package and may need to request it`

	ToolDescriptionGetDdlEntityMCP = `Get full details of a single DDL database contract entity (table or view), including its DDL SQL definition.

Use this tool when the user needs the schema/table/view structure or its SQL definition.

LLM INSTRUCTIONS:
- Always pass packageId, version, and ddlEntityId from a list_ddl_entities or search result
- includeData defaults to true and returns the full DDL SQL in the "data" field; pass includeData=false to fetch only metadata when the SQL body is not needed, since DDL payloads can be large
- The response's documentId can be used with get_document (apiType=ddl) to fetch the full source document instead of a single entity
- If the result reports an authorization problem (a message starting with "Failed to check user privileges" or stating you lack "privileges"/access), STOP. Do not retry, call other tools, or search other packages or versions to work around it. Tell the user they do not have access to this package and may need to request it`

	ToolDescriptionGetDdlEntityDiffMCP = `Get the list of changes for a single DDL database contract entity (table or view) between the specified version and a previous version.

Use this tool ONLY when the user explicitly requests changes to a specific DDL entity.

LLM INSTRUCTIONS:
- Always pass packageId, version, and ddlEntityId from a list_ddl_entities or search result
- previousVersion and previousVersionPackageId are optional; when omitted, the tool compares against the version's own recorded previous version. If the version has no recorded previous version, the tool returns a not-found error -- pass previousVersion explicitly in that case
- Use severity to filter changes to specific severities (breaking, semi-breaking, deprecated, non-breaking, annotation, unclassified); omit to return all
- If users ask for changes for many entities, call this tool once per entity
- If the result reports an authorization problem (a message starting with "Failed to check user privileges" or stating you lack "privileges"/access), STOP. Do not retry, call other tools, or search other packages or versions to work around it. Tell the user they do not have access to this package and may need to request it`

	ToolDescriptionListMcpContractEntitiesMCP = `List entities of a published MCP server contract (init handshake, tools, prompts, resources) recorded in a specific package version.

This tool describes MCP server contracts stored in APIHub packages -- servers that other systems expose and that APIHub documents -- NOT this apihub-mcp server's own tools.

LLM INSTRUCTIONS:
- Always pass packageId and version
- Use kind to filter to a single entity kind (init, tool, prompt, resource); omit to return all kinds
- Use mcpEndpoint to filter to a single MCP endpoint when a package documents more than one
- Use textFilter to narrow results by entity name
- Use page/limit for pagination when a version has many entities
- Each entity's mcpEntityId can be used with get_mcp_contract_entity; its documentId can be used with get_document (apiType=mcp)
- If the result reports an authorization problem (a message starting with "Failed to check user privileges" or stating you lack "privileges"/access), STOP. Do not retry, call other tools, or search other packages or versions to work around it. Tell the user they do not have access to this package and may need to request it`

	ToolDescriptionGetMcpContractEntityMCP = `Get full details of a single entity (tool, prompt, resource, or init handshake) from a published MCP server contract.

This tool describes a published MCP server contract entity stored in an APIHub package -- NOT one of this apihub-mcp server's own tools.

LLM INSTRUCTIONS:
- Always pass packageId, version, and mcpEntityId from a list_mcp_contract_entities or search result
- includeData defaults to true and returns the entity's full input/output schema or payload in the "data" field; pass includeData=false when only metadata is needed
- The response's documentId can be used with get_document (apiType=mcp) to fetch the full source document instead of a single entity
- If the result reports an authorization problem (a message starting with "Failed to check user privileges" or stating you lack "privileges"/access), STOP. Do not retry, call other tools, or search other packages or versions to work around it. Tell the user they do not have access to this package and may need to request it`

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
	ToolDescriptionSearchOperationsOpenAI = `Deprecated: use search_api_operations_v2 instead. This tool searches only the preconfigured legacy workspace and does not accept a workspace parameter.

Search for API operations, or DDL/MCP contract entities, by text query.

Supported apiType values: rest, graphql, asyncapi, ddl, mcp.

IMPORTANT: Search is lexical full-text search, not semantic, fuzzy, or substring search. Plain words are treated as required terms, so try shorter and longer query variations.
IMPORTANT: Search matches only terms included in the operation search index. If a query returns too few or irrelevant results, retry with alternative terms such as operation names, titles, REST path segments, AsyncAPI channel/message names, GraphQL input/output type names, or domain keywords.
IMPORTANT: apiType=ddl searches DDL database contract entities (tables/views) and apiType=mcp searches MCP server contract entities (tools/prompts/resources) instead of API operations; results carry entityId/kind/schemaName/tableName or entityName/mcpEndpoint instead of operation-specific fields. Use entityId with get_ddl_entity/get_ddl_entity_diff or get_mcp_contract_entity for details.

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
- Return the most recent versions of operations from the ranked results; pass 'release' only to narrow to one published version
- If the first call returned few or no unique operations - make repeated calls:
	* Increase page number for pagination
	* Simplify or generalize the search query, or try alternative/synonym terms
	* Search in a specific package only when the user asked for that package (use 'group' with packageId from mcp://api-packages-list)
	* If results are too broad, pass 'release' from mcp://api-packages-list for the target package (prefer the newest unless the user named one). Packages may use YYYY.Q (e.g., 2024.3), semver (0.0.1, 0.1.0), or other schemes
- If user asks for more results - increment page, simplify query, or search in other packages/versions
- DO NOT use get_api_operation_specification in advance - first show a list of operations to choose from in markdown format, even if only one is found
- Use get_api_operation_specification only when user explicitly requests details about a REST or AsyncAPI operation
- VERSION: when 'release' is omitted, search is not filtered by version (all release-status versions in scope are considered; ranking prefers higher versions). Pass 'release' only when the user names a version or you need to narrow to one published version
- GROUP: pass 'group' only when the user explicitly asks to search within a specific package. Use that package's packageId; never pass the workspaceId as 'group'
- REQUIRED: Convert metadata to markdown links (relative, without baseUrl):
	* packageId -> [packageId](/portal/packages/<packageId>)
	* operationId -> [operationId](/portal/packages/<packageId>/<version>/operations/<apiType>/<operationId>)
- Format responses in markdown with well-readable markup (headings, lists, tables)`

	ToolDescriptionSearchOperationsV2OpenAI = `Search for API operations, or DDL/MCP contract entities, by text query within a given workspace.

Supported apiType values: rest, graphql, asyncapi, ddl, mcp.

IMPORTANT: Search is lexical full-text search, not semantic, fuzzy, or substring search. Plain words are treated as required terms, so try shorter and longer query variations.
IMPORTANT: Search matches only terms included in the operation search index. If a query returns too few or irrelevant results, retry with alternative terms such as operation names, titles, REST path segments, AsyncAPI channel/message names, GraphQL input/output type names, or domain keywords.
IMPORTANT: apiType=ddl searches DDL database contract entities (tables/views) and apiType=mcp searches MCP server contract entities (tools/prompts/resources) instead of API operations; results carry entityId/kind/schemaName/tableName or entityName/mcpEndpoint instead of operation-specific fields. Use entityId with get_ddl_entity/get_ddl_entity_diff or get_mcp_contract_entity for details.

LLM INSTRUCTIONS:
- Always pass apiType and workspace
- WORKSPACE IS MANDATORY FROM THE USER: if the user has not named a workspace, call list_workspaces, present the accessible workspaces, and ask which one to use before calling this tool. Never invent or silently pick a workspaceId
- If the user already named a workspace (workspaceId, alias, or name), pass that value as workspace
- For the first call, use a large limit (100) to find as many options as possible. Paging starts from 0
- Consider simplifying the query to a single keyword (e.g., if query is "create customer", also try "customer")
- For REST, search by HTTP method, operation path, distinctive path segment, title, summary/description terms, and domain nouns. If a full path or server-base-prefixed path fails, retry with the operation path only or shorter path segments
- For AsyncAPI, search by operation id, action (send/receive), channel address, message name/title, payload/schema name, and important payload field names. If the first query fails, retry with shorter terms from the user request
- For GraphQL, search by operation name, operation type (query/mutation/subscription), description terms, input/output type names, and domain nouns. If the first query fails, retry with shorter terms from the user request
- Query string has special features: -word to force exclude a word from the search - it can help if search results are flooded with irrelevant results; "something certain" - double quotes to strict search of a phrase/word
- Group results by packageId when displaying in markdown format
- Return all metadata that MCP returns (operationId, packageId, packageName, version, title, apiKind, apiType, apiAudience, documentId, and API-specific fields)
- documentId is the specification slug to pass as get_document.slug
- Return the most recent versions of operations from the ranked results; pass 'release' only to narrow to one published version
- If the first call returned few or no unique operations - make repeated calls:
	* Increase page number for pagination
	* Simplify or generalize the search query, or try alternative/synonym terms
	* Search in a specific package only when the user asked for that package (use 'group' with packageId from list_workspace_packages)
	* If results are too broad, pass 'release' from list_package_versions for the target package (prefer the newest unless the user named one). Packages may use YYYY.Q (e.g., 2024.3), semver (0.0.1, 0.1.0), or other schemes
- If user asks for more results - increment page, simplify query, or search in other packages/versions
- DO NOT use get_api_operation_specification in advance - first show a list of operations to choose from in markdown format, even if only one is found
- Use get_api_operation_specification only when user explicitly requests details about a REST or AsyncAPI operation
- VERSION: when 'release' is omitted, search is not filtered by version (all release-status versions in scope are considered; ranking prefers higher versions). Pass 'release' only when the user names a version or you need to narrow to one published version
- GROUP: pass 'group' only when the user explicitly asks to search within a specific package. Use that package's packageId; never pass the workspaceId as 'group'
- REQUIRED: Convert metadata to markdown links (relative, without baseUrl):
	* packageId -> [packageId](/portal/packages/<packageId>)
	* operationId -> [operationId](/portal/packages/<packageId>/<version>/operations/<apiType>/<operationId>)
- Format responses in markdown with well-readable markup (headings, lists, tables)`

	ToolDescriptionListWorkspacesOpenAI = `List workspaces the caller can access.

Returns a JSON object with a 'workspaces' array; each item includes workspace metadata (workspaceId, alias, kind, name, description).

LLM INSTRUCTIONS:
- Call this tool when the user asks which workspaces are available, or when they have not named a workspace and you need a workspaceId for search_api_operations_v2 or list_workspace_packages
- Present the returned workspaces as a markdown list (workspaceId, name, description when present)
- If the user already named a workspace (workspaceId, alias, or name), you may use that value directly without calling this tool first
- Workspaces the caller cannot read are not returned`

	ToolDescriptionListWorkspacePackagesOpenAI = `List packages within a workspace (metadata only, no versions).

LLM INSTRUCTIONS:
- Always pass workspace
- WORKSPACE IS MANDATORY FROM THE USER: if the user has not named a workspace, call list_workspaces, present the accessible workspaces, and ask which one to use before calling this tool. Never invent or silently pick a workspaceId
- If the user already named a workspace (workspaceId, alias, or name), pass that value as workspace
- Use textFilter to narrow results by package name or ID substring
- Use page/limit for pagination when a workspace has many packages
- Use a package's packageId with list_package_versions to see its release versions, and with search_api_operations_v2's 'group' parameter only when the user asked to search that specific package
- Packages the caller cannot read are not returned; an empty result does not necessarily mean the workspace has no packages
- Format the package list as a markdown table (name, packageId, kind)
- Convert packageId to a markdown link: [packageId](/portal/packages/<packageId>)`

	ToolDescriptionListPackageVersionsOpenAI = `List release versions available for a specific package.

LLM INSTRUCTIONS:
- Always pass packageId. Use packageId from list_workspace_packages or search results
- status defaults to release; pass a different status only if the user explicitly asks for draft or archived versions
- Use page/limit for pagination when a package has many versions
- Version strings are package-specific (YYYY.Q such as 2024.3, semver such as 0.1.0, v1, etc.) — do not assume a calendar default exists for every package
- Format the version list as a markdown list or table, newest first
- If the result reports an authorization problem (a message starting with "Failed to check user privileges" or stating you lack "privileges"/access), STOP. Do not retry, call other tools, or search other packages or versions to work around it. Tell the user they do not have access to this package and may need to request it`

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

	ToolDescriptionGetDocumentOpenAI = `Get a source API specification or contract document by slug.

Supported apiType values: rest, graphql, asyncapi, ddl, mcp.

Use this tool when the user needs the source API specification, the source DDL or MCP contract document, and especially for GraphQL details where operation-level specification and diff tools are not supported.
The response contains documentType, format, and documentData with the full source specification. JSON specifications are returned as structured JSON; non-JSON specifications are returned as text.

LLM INSTRUCTIONS:
- Always pass apiType
- Do not invent slug values
- Use documentId from a selected search_api_operations, list_ddl_entities, get_ddl_entity, list_mcp_contract_entities, or get_mcp_contract_entity result as this tool's slug parameter
- Return the full documentData from the response; use documentType to interpret specification semantics and format to render text payloads
- Put large JSON or YAML documentData in fenced markdown code blocks with the appropriate language tag, not as inline plain text
- Format responses in markdown with well-readable markup (headings, lists, tables, code blocks)`

	ToolDescriptionListApiOperationsOpenAI = `List REST, GraphQL, or AsyncAPI operations published in a specific package version.

Use this tool to browse a version's operations without a search query, e.g. before fetching an operation's specification or diff. For keyword-based lookup across packages, use search_api_operations_v2 instead.

LLM INSTRUCTIONS:
- Always pass packageId, version, and apiType
- Use textFilter to narrow results by operation title, path, or method
- Use page/limit for pagination when a version has many operations
- Each operation's operationId can be used with get_api_operation_specification and get_api_operation_diff; its documentId can be used with get_document
- Format the operation list as a markdown table (title, method/path or type-specific fields, apiKind)
- REQUIRED: Convert metadata to markdown links (relative, without baseUrl):
	* packageId -> [packageId](/portal/packages/<packageId>)
	* operationId -> [operationId](/portal/packages/<packageId>/<version>/operations/<apiType>/<operationId>)`

	ToolDescriptionListDdlEntitiesOpenAI = `List DDL database contract entities (tables and views) published in a specific package version.

Use this tool to browse the tables/views defined by a package's DDL contract before fetching entity details or diffs.

LLM INSTRUCTIONS:
- Always pass packageId and version
- Use textFilter to narrow results by schema, table, or view name
- Use page/limit for pagination when a version has many entities
- Each entity's entityId can be used with get_ddl_entity and get_ddl_entity_diff; its documentId can be used with get_document (apiType=ddl)
- Format the entity list as a markdown table (schema, name, kind)
- Convert packageId to a markdown link: [packageId](/portal/packages/<packageId>)`

	ToolDescriptionGetDdlEntityOpenAI = `Get full details of a single DDL database contract entity (table or view), including its DDL SQL definition.

Use this tool when the user needs the schema/table/view structure or its SQL definition.

LLM INSTRUCTIONS:
- Always pass packageId, version, and ddlEntityId from a list_ddl_entities or search result
- includeData defaults to true and returns the full DDL SQL in the "data" field; pass includeData=false to fetch only metadata when the SQL body is not needed, since DDL payloads can be large
- Put the DDL SQL inside a fenced markdown code block with the sql language tag, not inline prose
- Convert packageId to a markdown link: [packageId](/portal/packages/<packageId>)`

	ToolDescriptionGetDdlEntityDiffOpenAI = `Get the list of changes for a single DDL database contract entity (table or view) between the specified version and a previous version.

Use this tool ONLY when the user explicitly requests changes to a specific DDL entity.

LLM INSTRUCTIONS:
- Always pass packageId, version, and ddlEntityId from a list_ddl_entities or search result
- previousVersion and previousVersionPackageId are optional; when omitted, the tool compares against the version's own recorded previous version. If the version has no recorded previous version, the tool returns a not-found error -- pass previousVersion explicitly in that case
- Use severity to filter changes to specific severities (breaking, semi-breaking, deprecated, non-breaking, annotation, unclassified); omit to return all
- If users ask for changes for many entities, call this tool once per entity
- Format responses in markdown with well-readable markup (headings, lists, tables)`

	ToolDescriptionListMcpContractEntitiesOpenAI = `List entities of a published MCP server contract (init handshake, tools, prompts, resources) recorded in a specific package version.

This tool describes MCP server contracts stored in APIHub packages -- servers that other systems expose and that APIHub documents -- NOT this assistant's own tools.

LLM INSTRUCTIONS:
- Always pass packageId and version
- Use kind to filter to a single entity kind (init, tool, prompt, resource); omit to return all kinds
- Use mcpEndpoint to filter to a single MCP endpoint when a package documents more than one
- Use textFilter to narrow results by entity name
- Use page/limit for pagination when a version has many entities
- Each entity's mcpEntityId can be used with get_mcp_contract_entity; its documentId can be used with get_document (apiType=mcp)
- Format the entity list as a markdown table (kind, name, endpoint)
- Convert packageId to a markdown link: [packageId](/portal/packages/<packageId>)`

	ToolDescriptionGetMcpContractEntityOpenAI = `Get full details of a single entity (tool, prompt, resource, or init handshake) from a published MCP server contract.

This tool describes a published MCP server contract entity stored in an APIHub package -- NOT one of this assistant's own tools.

LLM INSTRUCTIONS:
- Always pass packageId, version, and mcpEntityId from a list_mcp_contract_entities or search result
- includeData defaults to true and returns the entity's full input/output schema or payload in the "data" field; pass includeData=false when only metadata is needed
- Put large JSON data in a fenced markdown code block with the json language tag, not as inline plain text
- Convert packageId to a markdown link: [packageId](/portal/packages/<packageId>)`
)

// Tool input schemas (shared between MCP and OpenAI)
var (
	searchOperationsSchema = json.RawMessage(`{
		"type": "object",
		"properties": {
			"apiType": {
				"type": "string",
				"enum": ["rest", "graphql", "asyncapi", "ddl", "mcp"]
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
				"enum": ["rest", "graphql", "asyncapi", "ddl", "mcp"]
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

	listApiOperationsSchema = json.RawMessage(`{
		"type": "object",
		"properties": {
			"packageId": {
				"type": "string"
			},
			"version": {
				"type": "string"
			},
			"apiType": {
				"type": "string",
				"enum": ["rest", "graphql", "asyncapi"]
			},
			"textFilter": {
				"type": "string"
			},
			"limit": {
				"type": "integer",
				"minimum": 1,
				"maximum": 100
			},
			"page": {
				"type": "integer",
				"minimum": 0
			}
		},
		"required": ["packageId","version","apiType"]
	}`)

	listDdlEntitiesSchema = json.RawMessage(`{
		"type": "object",
		"properties": {
			"packageId": {
				"type": "string"
			},
			"version": {
				"type": "string"
			},
			"textFilter": {
				"type": "string"
			},
			"limit": {
				"type": "integer",
				"minimum": 1,
				"maximum": 100
			},
			"page": {
				"type": "integer",
				"minimum": 0
			}
		},
		"required": ["packageId","version"]
	}`)

	getDdlEntitySchema = json.RawMessage(`{
		"type": "object",
		"properties": {
			"packageId": {
				"type": "string"
			},
			"version": {
				"type": "string"
			},
			"ddlEntityId": {
				"type": "string"
			},
			"includeData": {
				"type": "boolean"
			}
		},
		"required": ["packageId","version","ddlEntityId"]
	}`)

	getDdlEntityDiffSchema = json.RawMessage(`{
		"type": "object",
		"properties": {
			"packageId": {
				"type": "string"
			},
			"version": {
				"type": "string"
			},
			"ddlEntityId": {
				"type": "string"
			},
			"previousVersion": {
				"type": "string"
			},
			"previousVersionPackageId": {
				"type": "string"
			},
			"severity": {
				"type": "array",
				"items": {
					"type": "string",
					"enum": ["breaking", "semi-breaking", "deprecated", "non-breaking", "annotation", "unclassified"]
				}
			}
		},
		"required": ["packageId","version","ddlEntityId"]
	}`)

	listMcpContractEntitiesSchema = json.RawMessage(`{
		"type": "object",
		"properties": {
			"packageId": {
				"type": "string"
			},
			"version": {
				"type": "string"
			},
			"kind": {
				"type": "string",
				"enum": ["init", "tool", "prompt", "resource"]
			},
			"mcpEndpoint": {
				"type": "string"
			},
			"textFilter": {
				"type": "string"
			},
			"limit": {
				"type": "integer",
				"minimum": 1,
				"maximum": 100
			},
			"page": {
				"type": "integer",
				"minimum": 0
			}
		},
		"required": ["packageId","version"]
	}`)

	getMcpContractEntitySchema = json.RawMessage(`{
		"type": "object",
		"properties": {
			"packageId": {
				"type": "string"
			},
			"version": {
				"type": "string"
			},
			"mcpEntityId": {
				"type": "string"
			},
			"includeData": {
				"type": "boolean"
			}
		},
		"required": ["packageId","version","mcpEntityId"]
	}`)

	searchOperationsV2Schema = json.RawMessage(`{
		"type": "object",
		"properties": {
			"apiType": {
				"type": "string",
				"enum": ["rest", "graphql", "asyncapi", "ddl", "mcp"]
			},
			"query": {
				"type": "string"
			},
			"workspace": {
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
		"required": ["apiType","query","workspace"]
	}`)

	listWorkspacesSchema = json.RawMessage(`{
		"type": "object",
		"properties": {},
		"additionalProperties": false
	}`)

	listWorkspacePackagesSchema = json.RawMessage(`{
		"type": "object",
		"properties": {
			"workspace": {
				"type": "string"
			},
			"textFilter": {
				"type": "string"
			},
			"limit": {
				"type": "integer",
				"minimum": 1,
				"maximum": 100
			},
			"page": {
				"type": "integer",
				"minimum": 0
			}
		},
		"required": ["workspace"]
	}`)

	listPackageVersionsSchema = json.RawMessage(`{
		"type": "object",
		"properties": {
			"packageId": {
				"type": "string"
			},
			"status": {
				"type": "string",
				"enum": ["release", "draft", "archived"]
			},
			"limit": {
				"type": "integer",
				"minimum": 1,
				"maximum": 100
			},
			"page": {
				"type": "integer",
				"minimum": 0
			}
		},
		"required": ["packageId"]
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
		{
			Name:              ToolNameListWorkspaces,
			Schema:            listWorkspacesSchema,
			DescriptionMCP:    ToolDescriptionListWorkspacesMCP,
			DescriptionOpenAI: ToolDescriptionListWorkspacesOpenAI,
		},
		{
			Name:              ToolNameSearchOperationsV2,
			Schema:            searchOperationsV2Schema,
			DescriptionMCP:    ToolDescriptionSearchOperationsV2MCP,
			DescriptionOpenAI: ToolDescriptionSearchOperationsV2OpenAI,
		},
		{
			Name:              ToolNameListWorkspacePackages,
			Schema:            listWorkspacePackagesSchema,
			DescriptionMCP:    ToolDescriptionListWorkspacePackagesMCP,
			DescriptionOpenAI: ToolDescriptionListWorkspacePackagesOpenAI,
		},
		{
			Name:              ToolNameListPackageVersions,
			Schema:            listPackageVersionsSchema,
			DescriptionMCP:    ToolDescriptionListPackageVersionsMCP,
			DescriptionOpenAI: ToolDescriptionListPackageVersionsOpenAI,
		},
		{
			Name:              ToolNameListApiOperations,
			Schema:            listApiOperationsSchema,
			DescriptionMCP:    ToolDescriptionListApiOperationsMCP,
			DescriptionOpenAI: ToolDescriptionListApiOperationsOpenAI,
		},
		{
			Name:              ToolNameListDdlEntities,
			Schema:            listDdlEntitiesSchema,
			DescriptionMCP:    ToolDescriptionListDdlEntitiesMCP,
			DescriptionOpenAI: ToolDescriptionListDdlEntitiesOpenAI,
		},
		{
			Name:              ToolNameGetDdlEntity,
			Schema:            getDdlEntitySchema,
			DescriptionMCP:    ToolDescriptionGetDdlEntityMCP,
			DescriptionOpenAI: ToolDescriptionGetDdlEntityOpenAI,
		},
		{
			Name:              ToolNameGetDdlEntityDiff,
			Schema:            getDdlEntityDiffSchema,
			DescriptionMCP:    ToolDescriptionGetDdlEntityDiffMCP,
			DescriptionOpenAI: ToolDescriptionGetDdlEntityDiffOpenAI,
		},
		{
			Name:              ToolNameListMcpContractEntities,
			Schema:            listMcpContractEntitiesSchema,
			DescriptionMCP:    ToolDescriptionListMcpContractEntitiesMCP,
			DescriptionOpenAI: ToolDescriptionListMcpContractEntitiesOpenAI,
		},
		{
			Name:              ToolNameGetMcpContractEntity,
			Schema:            getMcpContractEntitySchema,
			DescriptionMCP:    ToolDescriptionGetMcpContractEntityMCP,
			DescriptionOpenAI: ToolDescriptionGetMcpContractEntityOpenAI,
		},
	}
}

func getMCPServerToolMetadata() []view.ToolMetadata {
	// search_api_operations_v2, list_workspace_packages, and list_package_versions are already
	// part of getToolMetadata() (shared with AI Chat); only the REST-only legacy aliases are added here.
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
			"apiType": "API type to search. Allowed values: rest, graphql, asyncapi, ddl, mcp. ddl and mcp search DDL database contract and MCP server contract entities instead of API operations",
			"query":   "Text search query for finding API operations. Important: search is lexical and index-bound, so try different query variations (simplified, with keywords)",
			"limit":   "Maximum number of results to return (10-100). For the first search, it's recommended to use 100",
			"page":    "Page number for pagination (starts from 0). Use to get additional results",
			"release": "Optional package release version to search in (exact string from mcp://api-packages-list, e.g. 2024.3, 0.1.0, v1). When omitted, search is not filtered by version. Pass only when the user names a version or you need to narrow results.",
			"group":   "Optional package ID (packageId) to filter search to one package. Pass only when the user explicitly asks to search that package. Use packageId from mcp://api-packages-list, not packageName, and never pass the workspace ID.",
		},
		ToolNameSearchOperationsV2: {
			"apiType":   "API type to search. Allowed values: rest, graphql, asyncapi, ddl, mcp. ddl and mcp search DDL database contract and MCP server contract entities instead of API operations",
			"query":     "Text search query for finding API operations. Important: search is lexical and index-bound, so try different query variations (simplified, with keywords)",
			"workspace": "WorkspaceId to search in. Mandatory. If the user has not named a workspace, call list_workspaces first, present the accessible workspaces, and ask which one to use; never invent or silently pick one",
			"limit":     "Maximum number of results to return (10-100). For the first search, it's recommended to use 100",
			"page":      "Page number for pagination (starts from 0). Use to get additional results",
			"release":   "Optional package release version to search in (exact string from list_package_versions, e.g. 2024.3, 0.1.0, v1). When omitted, search is not filtered by version. Pass only when the user names a version or you need to narrow results.",
			"group":     "Optional package ID (packageId) to filter search to one package. Pass only when the user explicitly asks to search that package. Use packageId from list_workspace_packages, not packageName, and never pass the workspace ID.",
		},
		ToolNameListWorkspacePackages: {
			"workspace":  "WorkspaceId to list packages from. Mandatory. If the user has not named a workspace, call list_workspaces first, present the accessible workspaces, and ask which one to use; never invent or silently pick one",
			"textFilter": "Optional text filter matching package name or ID",
			"limit":      "Maximum number of results to return (1-100)",
			"page":       "Page number for pagination (starts from 0)",
		},
		ToolNameListPackageVersions: {
			"packageId": "Package ID (packageId) whose release versions to list. Use packageId from list_workspace_packages or search results",
			"status":    "Optional version status filter. Allowed values: release, draft, archived. Defaults to release; pass a different value only if the user explicitly asks for draft or archived versions",
			"limit":     "Maximum number of results to return (1-100)",
			"page":      "Page number for pagination (starts from 0)",
		},
		ToolNameGetOperationSpec: {
			"apiType":     "API type for operation-level specification data. Allowed values: rest, asyncapi. GraphQL is unsupported",
			"operationId": "Unique operation identifier (operationId) from search results",
			"packageId":   "Package ID (packageId) where the operation is located. Use packageId from search results or mcp://api-packages-list resource",
			"version":     "Package version in YYYY.Q format (e.g., 2024.3) where the operation is located",
		},
		ToolNameGetOperationDiff: {
			"apiType":         "API type for operation diff. Allowed values: rest, asyncapi. GraphQL is unsupported",
			"operationId":     "Unique operation identifier (operationId) from search results",
			"packageId":       "Package ID (packageId) where the operation is located. Use packageId from search results or mcp://api-packages-list resource",
			"version":         "Package version in YYYY.Q format (e.g., 2024.3) where the operation is located",
			"previousVersion": "Package version in YYYY.Q format (e.g., 2024.2) where the operation was located",
		},
		ToolNameGetDocument: {
			"apiType":   "API type for the specification. Allowed values: rest, graphql, asyncapi, ddl, mcp",
			"packageId": "Package ID (packageId) where the specification is located. Use packageId from search results or mcp://api-packages-list resource",
			"version":   "Package version in YYYY.Q format (e.g., 2024.3) where the specification is located",
			"slug":      "Specification slug. Use documentId returned by search_api_operations; do not invent this value",
		},
		ToolNameListApiOperations: {
			"packageId":  "Package ID (packageId) whose operations to list",
			"version":    "Package version in which to list operations",
			"apiType":    "API type to list. Allowed values: rest, graphql, asyncapi",
			"textFilter": "Optional text filter matching operation title, path, or method",
			"limit":      "Maximum number of results to return (1-100)",
			"page":       "Page number for pagination (starts from 0)",
		},
		ToolNameListDdlEntities: {
			"packageId":  "Package ID (packageId) whose DDL contract entities to list",
			"version":    "Package version in which to list DDL contract entities",
			"textFilter": "Optional text filter matching schema, table, or view name",
			"limit":      "Maximum number of results to return (1-100)",
			"page":       "Page number for pagination (starts from 0)",
		},
		ToolNameGetDdlEntity: {
			"packageId":   "Package ID (packageId) where the DDL entity is located",
			"version":     "Package version where the DDL entity is located",
			"ddlEntityId": "Unique DDL entity identifier (entityId/ddlEntityId) from list_ddl_entities or search results",
			"includeData": "Whether to include the full DDL SQL definition in the response. Defaults to true; pass false to fetch only metadata since DDL payloads can be large",
		},
		ToolNameGetDdlEntityDiff: {
			"packageId":                "Package ID (packageId) where the DDL entity is located",
			"version":                  "Package version where the DDL entity is located",
			"ddlEntityId":              "Unique DDL entity identifier (entityId/ddlEntityId) from list_ddl_entities or search results",
			"previousVersion":          "Package version to compare against. Defaults to the version's own recorded previous version when omitted",
			"previousVersionPackageId": "Package ID of the previous version, when it differs from packageId. Defaults to packageId when omitted",
			"severity":                 "Optional list of change severities to include (breaking, semi-breaking, deprecated, non-breaking, annotation, unclassified). Omit to return all",
		},
		ToolNameListMcpContractEntities: {
			"packageId":   "Package ID (packageId) whose MCP server contract entities to list",
			"version":     "Package version in which to list MCP server contract entities",
			"kind":        "Optional entity kind filter. Allowed values: init, tool, prompt, resource. Omit to return all kinds",
			"mcpEndpoint": "Optional MCP endpoint filter, when a package documents more than one MCP endpoint",
			"textFilter":  "Optional text filter matching entity name",
			"limit":       "Maximum number of results to return (1-100)",
			"page":        "Page number for pagination (starts from 0)",
		},
		ToolNameGetMcpContractEntity: {
			"packageId":   "Package ID (packageId) where the MCP entity is located",
			"version":     "Package version where the MCP entity is located",
			"mcpEntityId": "Unique MCP entity identifier (entityId/mcpEntityId) from list_mcp_contract_entities or search results",
			"includeData": "Whether to include the entity's full input/output schema or payload in the response. Defaults to true; pass false when only metadata is needed",
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
