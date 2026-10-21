# APIHUB Feature List

## 1. API Specification Management

### 1.1 Multi-Format Support

- **OpenAPI 3.0 / 3.1** — Full support: parsing, operations extraction, diffing, linting, rendering, export
- **Swagger 2.0** — Full support via automatic conversion to OpenAPI 3.x
- **GraphQL** — Full support: schema parsing (SDL/introspection), GraphAPI intermediate format, diffing, rendering
- **AsyncAPI 3.x** — End-to-end support in the TS stack: normalization (`asyncapi-3` in api-unifier), diff/changelog
  (api-diff), build/export/changelog strategies (api-processor), Portal UI (operations/changes/shareability); Spectral
  validation and **version scoring** in the linter service; **K8s discovery** via the agent AsyncAPI runner
- **Protobuf / gRPC** — Type stub support: backend recognizes the type, build consumer handles it; no dedicated
  processing pipeline
- **Markdown** — Document-level support: parsing, rendering, versioning; no operations
- **DDLAPI** — Database-schema contracts with an end-to-end DDLAPI pipeline: normalization, diff/changelog, processor,
  document viewer, and Portal contract views.
- **MCP contracts** — MCP endpoint metadata and tools, prompts, and resources can be published and browsed in the Portal
  Contracts tab. They are catalog contracts, not an operation `ApiType`.
- **Unknown / Generic** — Fallback: any file can be stored and versioned as an unknown document

### 1.2 Package & Version Management

- **Hierarchical organization**: Workspaces → Groups → Packages → Versions
- **Version lifecycle**: Draft → Release versioning with status management
- **Revision management**: Multiple revisions per version with audit trail
- **Version copying**: Copy versions across packages
- **Package transitions**: Move/rename packages with dependency tracking
- **Favorites**: Users can favorite frequently used packages
- **Dashboards**: Aggregated views across multiple packages

### 1.3 Document Management

- **Multi-file upload**: Upload ZIP archives with multiple API spec files
- **$ref resolution**: Cross-file reference resolution during processing
- **Dependency tracking**: Track inter-document dependencies
- **Slug-based access**: Documents accessible by human-readable slugs
- **Raw file access**: Download original source files
- **Markdown rendering**: Full Markdown document rendering with GitHub Flavored Markdown support
- **Mermaid diagrams**: Mermaid code blocks are rendered as diagrams in Markdown document views, with a safe fallback
  for invalid diagrams.

## 2. API Analysis & Processing

### 2.1 Build Pipeline

- **Stateless workers**: Horizontally scalable build-task-consumer instances
- **Build types**:
  - Full build (parse + operations + changelog)
  - Changelog-only build
  - Document group build
  - Export builds (version, document, operations group)
  - Merged specification output
  - Reduced source specifications
- **Async processing**: Poll-based task distribution between backend and workers
- **Progress tracking**: Real-time build status updates

### 2.2 Operations Extraction

- **REST operations**: Per HTTP method + path extraction from OpenAPI specs
- **AsyncAPI operations**: Per-channel / message-oriented operations (AsyncAPI 3 pipeline)
- **GraphQL operations**: Per query/mutation/subscription extraction
- **Operation metadata**: Tags, deprecation status, API audience, search scopes
- **Operation IDs**: Normalized, deterministic operation ID generation
- **Operation hashing**: Structural hash computation for change detection

### 2.3 API Comparison / Changelog

- **Version-to-version diff**: Compare any two versions of an API spec
- **Classified changes**: Each change categorized as:
  - **Breaking** — backward-incompatible changes
  - **Non-breaking** — safe additions/extensions
  - **Risky** — potentially impactful changes
  - **Annotation** — documentation-only changes
  - **Deprecated** — deprecation markers
  - **Unclassified** — uncategorized changes
- **Merged document**: Produces annotated merged document with diff metadata
- **Operation-level diff**: Individual operation comparison with detailed change list
- **Cross-version comparison**: Compare operations between different package versions
- **Human-readable descriptions**: Auto-generated change descriptions for each diff
- **Backward compatibility checking**: BWC scope functions for compliance validation

### 2.4 Normalization Pipeline

- **$ref resolution**: Resolves JSON references including circular references (cycled JSO)
- **allOf merging**: Merges allOf combiners into unified schemas
- **Default inference**: Infers default values and types
- **Structural hashing**: Computes content hashes for deduplication
- **Origin tracking**: Traces diff results back to source file declarations
- **OAS extension removal**: Optionally strips vendor extensions

## 3. API Quality & Linting

### 3.1 Spectral Linting

- **OpenAPI 2.0/3.0/3.1 support**: Full linting with OAS-specific rules
- **AsyncAPI 3.0 support**: Spectral-based AsyncAPI validation
- **Custom rulesets**: Upload and manage custom Spectral rulesets via REST API
- **Default ruleset**: Includes description completeness, URL validation, server variable checks
- **Configurable workers**: Tunable number of Spectral worker goroutines

### 3.2 AI-Powered Linting

- **OpenAI integration**: LLM-based semantic API review per operation
- **Deduplication**: Second LLM pass to deduplicate findings
- **Rate limiting**: Configurable RPS and burst limits for OpenAI API
- **Package-level configuration**: Include/exclude packages from AI linting via wildcard patterns

### 3.3 Linting Infrastructure

- **Event-driven**: Automatic linting on version publish via Olric pub-sub
- **On-demand validation**: Trigger linting manually for specific versions
- **Bulk validation**: Validate all versions in a package hierarchy
- **Cached results**: Content-addressable caching (document hash + ruleset → result)
- **Ruleset activation**: Activate/deactivate rulesets per API type

### 3.4 Version quality scoring

- **Aggregated score**: After Spectral/AI lint completes, the service can compute a **version-level quality score**
  (validation + backward-compatibility signals) and persist it (`GET
  /api/v1/packages/{packageId}/versions/{version}/scoring`)
- **Database**: Scoring results stored via dedicated migration (`version_score` table)

## 4. Web User Interface

### 4.1 Portal Application

- **Package browser**: Navigate workspaces, groups, and packages
- **Version viewer**: Browse version content, operations, documents
- **Operation detail**: View individual operation documentation with schema viewer
- **API changes page**: Version-to-version changelog with classified diffs
- **Deprecated operations**: Track deprecated endpoints across versions
- **Global search**: Search across all operations, packages, and documents
- **API quality dashboard**: Linting results summary and per-document details
- **Document viewer**: Full API spec rendering with navigation sidebar
- **Document preview**: Markdown and raw document preview
- **Comparison page**: Side-by-side version comparison with diff highlighting
- **Settings management**: Roles, admins, API tokens, rulesets configuration
- **User profile**: Personal settings, PAT management
- **Activity tracking**: Audit trail of all user actions
- **Export**: Excel reports, document generation, async export with status tracking; **shareability** options (which
  documents to include / visibility) in export settings
- **Document shareability**: Per-document shareability controls on the version **Documents** tab (markers, bulk actions,
  export integration)

### 4.2 Agents Application

- **Agent management**: View registered agents, their status and health
- **Service discovery**: Browse discovered services per namespace
- **Snapshot management**: Create and manage API spec snapshots
- **Spec promotion**: Promote discovered specs to the Portal as published packages

### 4.3 Interactive Components

- **`<apispec-view>`**: Full API documentation viewer (OpenAPI 2/3, AsyncAPI) with sidebar navigation; AsyncAPI
  operation tables use dedicated cells where needed (e.g. `AsyncApiTableCell`)
- **`<operation-view>`**: Single operation detail viewer
- **`<diff-operation-view>`**: Side-by-side operation diff with change severity filtering
- **`<rest-playground>`**: Interactive REST API testing from OpenAPI specs (parameter auto-population, auth panel,
  response viewer)
- **`<rest-examples>`**: Request/response example display from API specs
- **`<class-view-component>`**: UML-style class diagram viewer for schemas (D3 + ELK layout)
- **`JsonSchemaViewer`**: JSON Schema interactive tree viewer with expand/collapse
- **`JsonSchemaDiffViewer`**: JSON Schema diff visualization (inline or side-by-side)
- **`GraphQLOperationViewer`**: GraphQL operation documentation renderer
- **`GraphQLOperationDiffViewer`**: GraphQL operation diff renderer
- **GraphiQL integration**: GraphQL query playground

### 4.4 UI Architecture

- **Monorepo**: Portal + Agents + Shared library in npm workspaces with Lerna
- **Technology**: React 18, TypeScript 5, MUI 5, Vite, @tanstack/react-query
- **Web Components**: Shadow DOM isolation for reusable spec viewers
- **Monaco Editor**: Code editing for API specs and request bodies
- **Virtualized lists**: react-window for large operation lists
- **Storybook**: Component showcase for shared library development

## 5. Service Discovery (Agents)

### 5.1 Kubernetes Integration

- **Multi-cluster support**: Deploy agents in multiple K8s clusters
- **Namespace browsing**: List and filter K8s namespaces
- **Service enumeration**: List services in namespaces via K8s API
- **ClusterView permissions**: Minimal RBAC for read-only cluster access

### 5.2 API Spec Discovery

- **Pluggable runners**: DiscoveryRunner interface with per-API-type implementations
- **REST/OpenAPI discovery**: Probes Swagger config URLs and OpenAPI endpoints
- **GraphQL discovery**: GraphQL introspection queries
- **AsyncAPI discovery**: AsyncAPI document URL probing
- **Markdown discovery**: Markdown file URL probing
- **JSON Schema discovery**: JSON Schema URL probing
- **apihub-config**: Explicit spec declaration via service-level config (see
  [the APIHUB config format](../user-guide/agent-discovery.md#apihub-config-format))

### 5.3 Agent Management

- **Auto-registration**: Agents register on startup with periodic heartbeats (~30s)
- **Health monitoring**: Active/inactive status tracking
- **Service proxy**: Proxy requests to K8s services through the agent
- **Snapshot creation**: Package discovered specs into versioned snapshots
- **Snapshot cleanup**: Scheduled TTL-based snapshot expiration

### 5.4 Security

- **Namespace security checks**: Authentication/authorization validation against namespace services
- **Excel reports**: Security check result reporting
- **JWT validation**: Agents validate tokens against backend's public key

## 6. Authentication & Security

### 6.1 Identity Providers

- **Local authentication**: Username/password with JWT tokens (non-production)
- **SAML 2.0**: Enterprise SSO with multiple IdP support
- **OIDC (OpenID Connect)**: OAuth2-based SSO integration
- **LDAP**: User directory synchronization

### 6.2 API Authentication

- **API Keys**: System-level and per-package API key management
- **Personal Access Tokens (PATs)**: Developer tokens with configurable expiry
- **Cookie-based JWT**: Browser session management
- **System access tokens**: Service-to-service authentication

### 6.3 Authorization

- **RBAC**: Role-based access control with system and package-level roles
- **Hierarchical permissions**: Workspace → Group → Package inheritance
- **Custom roles**: Define custom roles with granular permissions
- **Sysadmin management**: Dedicated system administrator role

## 7. Integration & Extensibility

### 7.1 MCP Server (Model Context Protocol)

- **Built-in MCP server**: Backend exposes MCP SSE endpoint (`/api/v1/mcp/`)
- **MCP Tools**:
  - `search_rest_api_operations` — Search for API operations by text
  - `get_rest_api_operations_specification` — Get OpenAPI spec for an operation
  - `get_rest_api_operation_diff` — Get diff between operation versions
- **AI assistant**: Honey uses the backend MCP tools for catalog-assisted conversations.
- **Catalog contracts**: MCP endpoints, tools, prompts, and resources can also be published as MCP contracts and browsed
  in the Portal. These contracts are separate from the MCP server protocol endpoint.

### 7.2 AI Chat Integration

- **OpenAI-powered chat**: Conversational AI interface with MCP tool integration
- **Streaming responses**: Server-sent events for real-time AI responses
- **Configurable model**: Temperature, reasoning effort, verbosity settings

### 7.3 Extension Services

- **Plugin architecture**: Register external services via `extensions` config
- **URL-prefix routing**: nginx routes requests to extension backends
- **Current extensions**: API Linter Service, Agents Backend

### 7.4 Export Capabilities

- **Excel reports**: API changes export to Excel (via excelize)
- **Async export**: Large export jobs with progress tracking
- **Multiple formats**: Version export, document export, operations group export
- **Custom templates**: Template-based export with group-specific templates

## 8. Operations & Monitoring

### 8.1 Monitoring

- **Prometheus metrics**: All services expose `/metrics` endpoint
- **Grafana dashboards**: Pre-built dashboards included in Helm chart
- **ServiceMonitor**: Kubernetes ServiceMonitor for Prometheus Operator

### 8.2 Scheduled Jobs

- **Revision cleanup**: Expire old version revisions
- **Comparison cleanup**: Remove stale comparison caches
- **Soft-delete cleanup**: Purge soft-deleted entities
- **Unreferenced data cleanup**: Remove orphaned data
- **Build cleanup**: Remove old/failed build artifacts
- **Snapshot cleanup**: TTL-based snapshot expiration

### 8.3 Health Checks

- **Liveness probes**: `/live` endpoints on all services
- **Readiness probes**: `/ready` endpoints (waits for DB migration)
- **Startup probes**: `/startup` on agent service

### 8.4 Observability

- **Runtime log level control**: Change log levels without restart
- **Activity tracking**: Audit trail for user actions
- **Business metrics**: Usage and adoption metrics collection

## 9. Deployment & Operations

### 9.1 Kubernetes Deployment

- **Helm chart**: Production-ready Helm chart with comprehensive `values.yaml`
- **Resource management**: Configurable CPU/memory limits per service
- **TLS support**: Ingress TLS and custom TLS certificates
- **CORS configuration**: Configurable allowed origins

### 9.2 Docker Compose

- **Development deployment**: Full stack in docker-compose
- **Keycloak variant**: Pre-configured SSO testing environment
- **Auto-initialization**: Database init scripts included

### 9.3 Storage

- **PostgreSQL 14+**: Primary data store (required)
- **S3 / MinIO**: Optional cold storage for large files and build results
- **Olric**: Built-in distributed cache with LAN discovery

## 10. Testing Infrastructure

### 10.1 Backend E2E Tests

- **Newman/Postman**: 7 test collections covering smoke, negative, RBAC, linting, regression
- **Test data management**: Automated setup and teardown via API

### 10.2 Frontend E2E Tests

- **Playwright**: 62+ spec files with Page Object Model architecture
- **Custom fixtures**: Pre-authenticated sessions, REST-based test data managers
- **Coverage**: Authentication, CRUD, comparison, operations, grouping, API quality, search
- **Custom reporter**: APIHUB-styled HTML test reports

### 10.3 Visual Regression

- **Screenshot tests**: Puppeteer + jest-image-snapshot for component libraries
- **Storybook showcase**: Visual component catalog with auto-generated stories
- **Compatibility suites**: Auto-generated test cases from API compatibility definitions

## 11. Current Limitations & Known Gaps

| Area | Gap | Impact |
|------|-----|--------|
| **AsyncAPI** | Richer than REST for some analytics (e.g. data model depth) | Treat AsyncAPI 3 as the normalized spec; legacy AsyncAPI 2-only edge cases may need migration |
| **Protobuf/gRPC** | Type stubs only, no processing pipeline | Cannot diff, lint, or render Protobuf specs |
| **UI API Types** | First-class operation UX for REST, GraphQL, AsyncAPI | Protobuf/Markdown-as-doc and other types are limited or document-only |
| **Agent Discovery** | No DDLAPI or MCP contract discovery runners | Database schemas and MCP contracts must be published without agent discovery |
| **AI Linting** | OpenAPI only | No AI review for GraphQL, AsyncAPI, etc. |
| **DDL API Changes** | Partial UI coverage | DDL contracts are processed and diffed, but the API Changes experience is not yet equivalent to REST/GraphQL |

> **Future work**: Protobuf remains a stub path, and agent discovery does not yet cover DDLAPI or MCP contracts. See
> architecture document Section 9 for the distinction between adding a `SpecType` and adding a contract type.
