---
name: apihub-agent-developer
description: "Implements and modifies the APIHub K8s discovery agent (qubership-apihub-agent): api_type discovery runners, K8s discovery services, service.go wiring, clients, config, and OpenAPI specs. Use when adding or changing agent features, discovery behaviour, API type support, REST endpoints, or Go code in qubership-apihub-agent."
---

# APIHub Agent Developer

**Follow `apihub-go-developer` first** — this skill adds agent-specific rules for `qubership-apihub-agent` only.

Follow `AGENTS.md` and project rules.

## Agent-specific workflow

1. **No database** — this service has no PostgreSQL, migrations, or repository layer. Do not add DB wiring or SQL.
2. **Config** — defaults in `service/system_info.go` (`setDefaults`); struct in `config/Config.go`; template in `qubership-apihub-agent/config.template.yaml`. Keep template comments in sync with new keys.
3. **Wiring** — extend `service.go` in existing order: `SystemInfoService` → PaaS client → `ApihubClient` / `AgentsBackendClient` → caches → discovery/registration services → controllers → routes.
4. **OpenAPI** — REST changes must update specs under `documentation/api/` (see deployed `agent-conventions` rules).
5. **Related repos** — if deploy config, env vars, or integration contracts change, remind the developer about **qubership-apihub-agents-backend**, **qubership-apihub** (Helm), and **qubership-apihub-backend** as applicable.

## K8s discovery sidecar

The agent runs in-cluster and discovers API specifications from Kubernetes services:

- **PaaS mediation** — `paas-mediation-client` lists namespaces/services; `STUB_PM` enables mock platform for local dev.
- **Caches** — `NamespaceListCache`, `ServiceListCache` with TTL from config.
- **Discovery** — `DiscoveryService` orchestrates per-namespace discovery; `DocumentsDiscoveryService` fetches specs via `api_type` runners.
- **Registration** — `RegistrationService` reports discovered documents to APIHUB via `ApihubClient` and agent metadata via `AgentsBackendClient`.
- **Labels** — `discovery.excludeLabels` skips services; `discovery.groupingLabels` groups discovered APIs.

## API type extension (`api_type/`)

New API types use the `generic.DiscoveryRunner` interface in `api_type/generic/discovery.go`:

| Runner | Package | `GetName()` |
|--------|---------|-------------|
| REST / OpenAPI | `api_type/rest` | rest |
| GraphQL | `api_type/graphql` | graphql |
| AsyncAPI | `api_type/asyncapi` | asyncapi |
| Markdown | `api_type/markdown` | markdown |
| JSON Schema | `api_type/json_schema` | json_schema |
| Unknown fallback | `api_type/unknown` | unknown |

**Register** new runners in `service/document_discovery.go` (`runners` slice). Order matters: specialized runners before `unknown`.

### Adding a new API type

1. Add `view.ApiType` constant in `view/api_type.go` if needed.
2. Create `api_type/<name>/discovery.go` implementing `DiscoveryRunner`.
3. Add default discovery URLs in `setDefaults()` and `config.template.yaml` under `discovery.urls`.
4. Register runner in `DocumentsDiscoveryService` constructor.
5. Update OpenAPI under `documentation/api/` if REST surface changes.

## Clients

| Client | File | Purpose |
|--------|------|---------|
| `ApihubClient` | `client/apihub.go` | Package/version/document operations on main APIHUB |
| `AgentsBackendClient` | `client/agents_backend.go` | Agent registration and agents-backend API |

Use existing client patterns; propagate errors to controllers; map to `exception.CustomError` at HTTP boundary.

## Completion checklist (agent additions)

In addition to the `apihub-go-developer` checklist:

- [ ] No DB/migration code introduced.
- [ ] Config defaults, template, and validation aligned.
- [ ] New discovery runner registered in `document_discovery.go`.
- [ ] REST changes reflected in `documentation/api/*.yaml`.
- [ ] **Related repositories** reminded when Helm, agents-backend, or backend contracts are affected.

Suggest invoking `apihub-go-self-review` in a **new chat** or with a **different model** for an independent pass over the diff.
