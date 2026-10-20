# APIHUB System Architecture

## 1. System Overview

APIHUB is an **API Management and Registry platform** — a centralized system for storing, analyzing, comparing, and documenting API specifications and contracts. It supports OpenAPI/Swagger, GraphQL, AsyncAPI, **DDLAPI** database-schema contracts, Markdown, Protobuf/gRPC stubs, and **MCP catalog contracts**. The backend also exposes a separate MCP server for API-catalog tools and AI integrations.

The system is deployed on Kubernetes and consists of core services, 12 TypeScript libraries, CI/CD infrastructure, E2E test suites, and auxiliary repositories — **27+ repositories** in the current workspace.

## 2. High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              APIHUB CLUSTER                                 │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     qubership-apihub-ui (nginx)                     │    │
│  │  ┌──────────┐  ┌──────────┐   Reverse Proxy:                      │    │
│  │  │ Portal   │  │ Agents   │   /api/* → backend                    │    │
│  │  │  SPA     │  │  SPA     │   /api-linter/* → linter-service      │    │
│  │  │ (React)  │  │ (React)  │   /agents-backend/* → agents-backend  │    │
│  │  └──────────┘  └──────────┘                                        │    │
│  └────────────────────────────────┬───────────────────────────────────┘    │
│                                   │                                         │
│  ┌────────────────────────────────▼───────────────────────────────────┐    │
│  │                  qubership-apihub-backend (Go)                      │    │
│  │  REST API · Auth (SAML/OIDC/LDAP) · RBAC · MCP Server · AI Chat  │    │
│  │  Build Orchestration · Cleanup Jobs · Package/Version Management   │    │
│  └──────┬────────────────────────────────────────────┬────────────────┘    │
│         │ Build tasks (poll)                          │ Extensions          │
│  ┌──────▼──────────────────────┐    ┌────────────────▼──────────────┐     │
│  │ qubership-apihub-build-     │    │  qubership-api-linter-service │     │
│  │ task-consumer (NestJS)      │    │  (Go)                         │     │
│  │                             │    │  Spectral + AI/OpenAI linting │     │
│  │  Uses: api-processor,       │    │  Olric pub-sub for events     │     │
│  │  api-diff, api-unifier      │    └───────────────────────────────┘     │
│  └─────────────────────────────┘                                          │
│                                     ┌───────────────────────────────┐     │
│                                     │ qubership-apihub-agents-      │     │
│                                     │ backend (Go)                  │     │
│                                     │ Agent management, snapshots,  │     │
│                                     │ namespace security            │     │
│                                     └──────────────┬────────────────┘     │
│                                                    │                       │
│  ┌─────────────────┐                               │                       │
│  │  PostgreSQL 14+  │  Shared (separate DBs per    │                       │
│  │                  │  service)                     │                       │
│  └─────────────────┘                               │                       │
│  ┌─────────────────┐                               │                       │
│  │  S3 / MinIO     │  Optional cold storage        │                       │
│  └─────────────────┘                               │                       │
│  ┌─────────────────┐                               │                       │
│  │  Olric          │  Distributed cache + pub/sub  │                       │
│  └─────────────────┘                               │                       │
└─────────────────────────────────────────────────────┼───────────────────────┘
                                                      │
                    ┌─────────────────────────────────▼───────────────────┐
                    │          REMOTE KUBERNETES CLUSTERS                  │
                    │                                                      │
                    │  ┌───────────────────────────────────┐              │
                    │  │  qubership-apihub-agent (Go)       │              │
                    │  │  K8s service discovery             │              │
                    │  │  Pluggable runners per API type    │              │
                    │  │  REST/GraphQL/AsyncAPI/Markdown/JSON │              │
                    │  └───────────────────────────────────┘              │
                    └─────────────────────────────────────────────────────┘
```

## 3. Microservice Architecture

### 3.1 Core Services

| Service | Language | Repository | Port | Purpose |
|---------|----------|-----------|------|---------|
| **Backend** | Go 1.26 | `qubership-apihub-backend` | 8080 | Central micro-monolith: REST API, auth, RBAC, build orchestration, MCP server, AI chat, cleanup jobs |
| **UI** | TypeScript/React + nginx | `qubership-apihub-ui` | 8080 | Two SPAs (Portal + Agents) served via nginx reverse proxy |
| **Build Task Consumer** | TypeScript/NestJS | `qubership-apihub-build-task-consumer` | 3000 | Stateless worker that processes API specs (parse, diff, changelog) |

### 3.2 Extension Services

| Service | Language | Repository | Port | Purpose |
|---------|----------|-----------|------|---------|
| **API Linter Service** | Go 1.26 | `qubership-api-linter-service` | 8080 | Lints API specs via Spectral and AI/OpenAI engines; optional **version quality scoring** after lint completion |
| **Agents Backend** | Go 1.26 | `qubership-apihub-agents-backend` | 8080 | Manages agent instances, snapshots, namespace security |

### 3.3 Separately Deployed

| Service | Language | Repository | Port | Purpose |
|---------|----------|-----------|------|---------|
| **Agent** | Go 1.26 | `qubership-apihub-agent` | 8080 | Discovers API specs in K8s clusters via pluggable runners |

## 4. Data Flow

### 4.1 Publish Flow (User uploads API spec)

```
User → UI → Backend (POST /api/v2/packages/{id}/publish)
                ↓
        Backend creates build task in DB
                ↓
        Build-Task-Consumer polls (POST /api/v2/builders/{builderId}/tasks)
                ↓
        Consumer receives ZIP (config + source files)
                ↓
        PackageVersionBuilder.run() via api-processor:
          1. Parse files → detect API or contract type (REST/GraphQL/AsyncAPI/DDL/MCP/Markdown/Unknown)
          2. Build documents (VersionDocument objects)
          3. Extract operations (per HTTP method / per GraphQL query)
          4. Normalize via api-unifier
          5. Compare with previous version via api-diff
          6. Generate changelog (classified diffs: breaking/non-breaking/risky)
          7. Package results as ZIP
                ↓
        Consumer sends results back (POST /api/v3/packages/{id}/publish/{publishId}/status)
                ↓
        Backend stores results in PostgreSQL
                ↓
        Backend publishes "version-published" event via Olric DTopic
                ↓
        Linter Service receives event → fetches docs → runs Spectral/AI lint → stores results
```

### 4.2 Agent Discovery Flow

```
Agent (in remote K8s cluster):
  1. Registers with Agents Backend on startup (heartbeat every ~30s)
  2. User triggers discovery via Agents UI
  3. Agent lists K8s namespaces/services
  4. For each service, runs all DiscoveryRunners in parallel:
     - REST runner: probes Swagger/OpenAPI endpoints
     - GraphQL runner: GraphQL introspection
     - AsyncAPI runner: AsyncAPI document endpoints
     - Markdown runner: Markdown document URLs
     - JSON Schema runner: JSON Schema URLs
  5. Returns discovered documents to Agents Backend
  6. User can create "snapshot" → Agents Backend packages specs → publishes to Backend
```

### 4.3 View/Compare Flow (User views API in UI)

```
User → UI → Backend (GET /api/v2/packages/{id}/versions/{v}/{apiType}/operations)
                ↓
        Backend returns operations/documents from PostgreSQL
                ↓
        UI renders via web components:
          - <apispec-view> for full API documentation (OpenAPI/AsyncAPI)
          - <operation-view> for single operation detail
          - <diff-operation-view> for version comparison
          - <rest-playground> for interactive API testing
          - <class-view-component> for UML-style schema diagrams
          - JsonSchemaViewer / GraphQLOperationViewer for schema rendering
```

## 5. TypeScript Library Stack (API Processing Pipeline)

The processing pipeline is a layered stack of TypeScript libraries:

```
Layer 0 (Foundation):
  json-crawl ─── Zero-dependency JSON tree traversal engine
                 Provides: crawl, syncCrawl, clone, transform, equal
                 Used by: ALL other TS libraries

Layer 1 (Format Conversion):
  graphapi ────── GraphQL ↔ GraphAPI JSON format bidirectional conversion
  http-spec ───── OpenAPI/Postman/AsyncAPI → Stoplight IHttpService AST

Layer 2 (Normalization):
  api-unifier ─── Normalizes API specs (resolve $ref, merge allOf, unify defaults, hash)
                  Defines the CRITICAL SpecType union:
                    'openapi-3.0' | 'openapi-3.1' | 'json-schema-04/06/07' |
                    'asyncapi-3' | 'graphapi' | 'ddlapi-1.0'
                  Contains resolveSpec() for auto-detection (AsyncAPI 2.x inputs are handled on the path to AsyncAPI 3 rules where applicable)

Layer 3 (Analysis):
  api-diff ────── Structural diff between two API specs
                  Produces classified changes: breaking | non-breaking | risky | annotation | deprecated
                  Contains COMPARE_ENGINES_MAP: SpecType → CompareEngine (AsyncAPI 3 compare rules under `src/asyncapi/`)
  api-visitor ─── Visitor pattern for structured OpenAPI traversal

Layer 4 (UI Data Model):
  api-data-model ── Converts normalized specs → IModelTree for UI rendering
                    Supports JSON Schema trees + GraphApi trees + diff trees

Layer 5 (Orchestration):
  api-processor ── Main orchestrator (PackageVersionBuilder)
                   Registers ApiBuilder instances per API type:
                     restApiBuilder, graphqlApiBuilder, asyncApiBuilder, ddlBuilder, mcpBuilder, textApiBuilder, unknownApiBuilder
                   Implements build strategies: build, changelog, export, document-group (including shareability-aware export)

Layer 6 (UI Rendering):
  api-doc-viewer ── React components: JsonSchemaViewer, GraphQLOperationViewer + diff variants
  apispec-view ──── Web Components: <apispec-view>, <operation-view>, <diff-operation-view>
  rest-playground ─ Web Components: <rest-playground>, <rest-examples>
  class-view ────── Web Component: <class-view-component> (UML diagrams via D3/ELK)
```

### Library Dependency Graph

```
json-crawl (zero deps)
  ├── api-unifier (+ object-hash, fast-equals, flatted)
  │     ├── api-diff (+ fast-equals)
  │     │     ├── api-data-model (+ graphapi)
  │     │     └── api-processor (+ graphapi, swagger2openapi, ajv, jszip)
  │     └── api-visitor
  └── (used by all above)

graphapi (zero APIHUB deps; peer: graphql)
  └── used by api-data-model, api-diff, api-processor

http-spec (zero APIHUB deps; uses @stoplight/*)
  └── used by apispec-view, rest-playground

class-view (zero APIHUB deps; uses D3, ELK)
```

## 6. Supported API Types Matrix

| API Type | Backend | Build Consumer | Agent Discovery | UI | Unifier | Diff | Data Model | Doc Viewer | Linter |
|----------|:-------:|:--------------:|:---------------:|:--:|:-------:|:----:|:----------:|:----------:|:------:|
| OpenAPI 3.0/3.1 | ✅ `rest` | ✅ `Rest` | ✅ REST runner | ✅ | ✅ | ✅ | ✅ (JSON Schema) | ✅ | ✅ Spectral+AI |
| Swagger 2.0 | ✅ (via conversion) | ✅ (→ OAS3) | ✅ | ✅ | (→ OAS3) | (→ OAS3) | ✅ | ✅ | ✅ Spectral+AI |
| GraphQL | ✅ `graphql` | ✅ `GraphQL` | ✅ GraphQL runner | ✅ | ✅ (graphapi) | ✅ | ✅ (GraphApi) | ✅ | ❌ |
| AsyncAPI | ✅ `asyncapi` | ✅ `Kafka` *(enum label; AsyncAPI build)* | ✅ AsyncAPI runner | ✅ | ✅ `asyncapi-3` | ✅ | ⚠️ partial vs REST | ✅ (apispec-view) | ✅ Spectral (+ scoring) |
| Protobuf/gRPC | ✅ `protobuf` | ✅ `gRPC` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Markdown | — | ✅ `MD` | ✅ MD runner | ✅ viewer | — | — | — | — | — |
| **DDLAPI** | ✅ contracts | ✅ `ddlBuilder` | ❌ | ⚠️ contracts | ✅ `ddlapi-1.0` | ✅ | — | ✅ | ❌ |
| **MCP contracts** | ✅ contracts | ✅ `mcpBuilder` | ❌ | ✅ Contracts tab | ❌ (not a SpecType) | ❌ (not a SpecType) | — | raw/contract views | ❌ |

> MCP catalog contracts are distinct from the backend's MCP server. The server exposes APIHUB catalog tools to MCP clients; it is not a catalog document type.

## 7. Authentication & Authorization

### Authentication Methods
- **Local Auth** (non-production): username/password → JWT
- **SAML 2.0**: Enterprise SSO via SAML identity providers
- **OIDC (OpenID Connect)**: OAuth2-based SSO
- **LDAP**: User directory sync
- **API Keys**: Service-to-service authentication
- **Personal Access Tokens (PATs)**: Developer automation
- **Cookie-based JWT**: Browser session management

### Authorization Model (RBAC)
- **System Admins**: Full system access
- **Package-level roles**: Viewer, Editor, Owner (per workspace/group/package)
- **Custom roles**: Configurable role definitions with granular permissions
- **API Key scopes**: Per-key permission grants

## 8. Deployment Architecture

### Kubernetes (Production)
- Helm chart in `qubership-apihub` repository
- All services deployed as Kubernetes Deployments with Services
- nginx-based UI serves as the single ingress point
- Health checks: `/ready`, `/live` endpoints on each service
- Resource requirements: 2-11 CPU, 3-9 Gi RAM (production)
- Prometheus + Grafana dashboards included

### Docker Compose (Development)
- `docker-compose.yml` in `qubership-apihub/docker-compose/apihub-generic/`
- Includes all services + PostgreSQL
- Keycloak variant available for SSO testing

### Local Kubernetes quickstart (optional analytics)
- `qubership-apihub/helm-templates/local-k8s-quickstart/` may include an **Apache Superset** subchart for BI/analytics alongside the stack (see chart `README` in that folder)

### Infrastructure Dependencies
| Component | Required | Purpose |
|-----------|----------|---------|
| PostgreSQL 14+ | **Yes** | Primary data store (separate DBs per service) |
| S3 / MinIO | Optional | Cold storage for build results |
| Olric | Built-in | Distributed cache + pub/sub (LAN discovery in K8s) |
| OpenAI API | Optional | AI-powered linting and chat |

## 9. Extension Points for API and Contract Types

An API type represented by `SpecType` is normalized and usually diffed as a specification. **DDLAPI is such a type**: its canonical value is `ddlapi-1.0`. MCP catalog data is deliberately different: it is a processor **contract type** handled by `mcpBuilder`, not a classic `ApiType` or `SpecType`. The backend MCP server is a separate integration endpoint.

### Contract types: MCP and DDL

`mcpBuilder` and `ddlBuilder` are registered through processor contract constants (`MCP_CONTRACT_TYPE` and `DDL_CONTRACT_TYPE`). Their document types are persisted by backend document/contract models and rendered in the Portal Contracts tab via `contract-types.ts`. DDL additionally has a DDLAPI processing and comparison pipeline; MCP catalog contracts organize endpoint initialization, tools, resources, and prompts without becoming operation APIs.

### Adding another `SpecType`

The following roadmap describes adding another first-class specification type (for example, the earlier AsyncAPI integration), rather than adding MCP as a `SpecType`.

### Layer 1: Format Definition
- Define the canonical source or intermediate format when required (for example, `graphapi` for GraphQL).

### Layer 2: Normalization (`api-unifier`)
1. Add the new value to `SpecType` in `src/spec-type.ts`
2. Add detection in `resolveSpec()` function
3. Create a dedicated normalization-rules module
4. Register in `RULES` map

### Layer 3: Diffing (`api-diff`)
1. Create a comparison module with rules, classification, and descriptions
2. Implement `CompareEngine` function
3. Register in `COMPARE_ENGINES_MAP`

### Layer 3b: Visitor (`api-visitor`)
1. Create an API-type walker and visitor
2. Define CrawlRules for MCP structure

### Layer 4: Data Model (`api-data-model` / `api-doc-viewer`)
1. Create a type-specific module with node kinds, types, and tree builders
2. Add normal and diff tree builders
3. Create React viewer components

### Layer 5: Processing (`api-processor`)
1. Create `src/apitypes/<type>/` with an `ApiBuilder`
2. Implement parser, document builder, operations builder, dumper
3. Register in `PackageVersionBuilder` constructor
4. Update `BuilderType` and `OperationsApiType` unions

### Layer 6: Backend (`apihub-backend`)
1. Add the operation API type constant in `view/CommonOperation.go`
2. Update switch statements in `entity/OperationEntity.go`
3. Update search entity mappings
4. Update build result processing

### Layer 7: UI (`apihub-ui`)
1. Add the UI API-type constant in `shared/src/entities/api-types.ts`
2. Create MCP operation viewer component
3. Update `DocSpecView.tsx` for MCP rendering

### Layer 8: Agent Discovery (`apihub-agent`)
1. Create `api_type/<type>/discovery.go` implementing `DiscoveryRunner`
2. Register runner in `document_discovery.go`

### Layer 9: Linting (`api-linter-service`)
1. Add the document/API type to the linter enum and configuration
2. Create/configure linter rules for MCP

### Layer 10: Build Consumer (`build-task-consumer`)
1. Add the operation API type to the build-consumer schema where applicable
