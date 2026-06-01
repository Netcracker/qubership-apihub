# qubership-apihub-backend

**qubership-apihub-backend** is the main backend microservice of the
[qubership-apihub](https://github.com/Netcracker/qubership-apihub) platform
(also known as API Registry / APIHub).
It implements all core business logic, exposes a REST API consumed by
`qubership-apihub-ui` and external integrations, and hosts the optional
AI assistant feature.

## Architecture overview

```mermaid
graph TB
    subgraph clients["Clients"]
        UI["🖥  qubership-apihub-ui"]
        MCP["🤖  MCP agents / AI IDEs"]
        CI["⚙  CI/CD / external integrations"]
    end

    subgraph svc["qubership-apihub-backend  · :8080"]
        direction TB
        RESTAPI["REST API  /api/v1 … /api/v4"]
        MCPAPI["MCP HTTP endpoint  /api/v1/mcp"]

        subgraph core["Core domain"]
            PUB["Publish & Build\nAPI catalogue management"]
            CMP["Compare & Diff\nchange detection"]
            SRCH["Search  v3 / v4"]
            PKG["Packages · Workspaces\nOperations · Dashboards"]
        end

        subgraph ai["AI assistant  (opt-in, ai.chat.enabled)"]
            CHAT["AI Chat\norchestration + streaming SSE"]
            MCPSVC["MCP Service\ntools · prompts · resources"]
            GENF["Generated Files\ntemp store with signed URLs"]
        end

        subgraph infra["Infrastructure"]
            AUTH["Auth\nJWT · SAML · OIDC · API tokens"]
            JOBS["Background jobs\ncleanup · retention · vacuum"]
            CACHE["Olric\ndistributed cache / pub-sub"]
            METRICS["Prometheus metrics"]
        end
    end

    subgraph storage["Persistent storage"]
        PG[("PostgreSQL\nprimary datastore")]
        S3[("S3 / MinIO\nbuild artefacts · temp files")]
    end

    subgraph ext["External services"]
        IDP["Identity Provider\nSAML / OIDC"]
        LDAP["LDAP\nuser search"]
        OPENAI["OpenAI API\nLLM provider"]
        EXTLINT["Extension services\nlinter · …"]
        PROM["Prometheus / Grafana"]
    end

    UI      -- "REST API"           --> RESTAPI
    MCP     -- "MCP over HTTP/SSE"  --> MCPAPI
    CI      -- "REST API"           --> RESTAPI

    RESTAPI --> core
    RESTAPI --> ai
    RESTAPI --> AUTH
    MCPAPI  --> MCPSVC

    core    --> PG
    core    --> S3
    core    --> CACHE
    core    --> EXTLINT

    CHAT    --> MCPSVC
    CHAT    --> GENF
    CHAT    --> OPENAI
    CHAT    --> PG
    GENF    --> S3

    AUTH    --> IDP
    AUTH    --> LDAP
    JOBS    --> PG
    JOBS    --> S3
    METRICS --> PROM
```

## Key capabilities

| Area | Description |
|---|---|
| **API catalogue** | Publish, version, and browse OpenAPI / AsyncAPI / GraphQL specifications |
| **Change detection** | Compare any two versions; generate detailed breaking-change reports |
| **Search** | Full-text and structured search across operations and schemas (v3 / v4 API) |
| **Access control** | Role-based permissions; local users + external IdP (SAML / OIDC) + API tokens |
| **AI assistant** | Streaming chat backed by OpenAI; IDS document generation via MCP tools |
| **MCP endpoint** | Model Context Protocol server exposing APIHub data to AI agents and IDEs |
| **Observability** | Prometheus metrics, structured logging, per-turn correlation IDs |

## Installation

This service is part of the larger **qubership-apihub** application and should be
deployed together with its dependencies (PostgreSQL, optionally S3/MinIO).

Full installation guides (docker-compose and Helm) are at:
[qubership-apihub](https://github.com/Netcracker/qubership-apihub).

For local development and debugging see the [Debug](#debug) section below.

## Build

Run the provided build script from the repository root:

```bash
# Linux / macOS
./build.sh

# Windows
build.cmd
```

## Configuration

Configuration is provided via `config.yaml` (loaded from `basePath` at startup).
For a full reference with descriptions and defaults see
[config.template.yaml](qubership-apihub-service/config.template.yaml).

Notable sections:

| Section | Purpose |
|---|---|
| `database` | PostgreSQL connection |
| `security` | JWT keys, external IdP (SAML / OIDC), LDAP, allowed origins |
| `s3Storage` | Optional S3 / MinIO for build artefacts |
| `olric` | Distributed in-process cache; `local` mode for single-node |
| `ai.chat` | AI assistant kill-switch, OpenAI key/model, retention settings |
| `monitoring` | Prometheus ServiceMonitor toggle |
| `cleanup` | Cron schedules for revision, comparison, and soft-deleted data GC |

## Debug

[Local development principles](./docs/local_development/local_development.md)

## Developer Tools

[Development tools setup](./docs/newcomer_env_setup.md)

## Documentation

Full developer and operator documentation lives in [docs/](./docs/README.md).

