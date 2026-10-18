# APIHUB Agents Backend — Agent Instructions

Instructions for AI assistants working on **qubership-apihub-agents-backend** (Cursor, Claude Code, and compatible tools).

This microservice manages and orchestrates [APIHUB agent](https://github.com/Netcracker/qubership-apihub-agent) instances: agent registration, discovery orchestration, snapshot management, namespace security checks, and proxying requests to agents. It stores agent state in PostgreSQL and integrates with the main APIHUB backend for permissions, publishing, and authentication.

## Clarification before coding

- Do **not** generate or modify code until the task requirements are clear.
- Ask targeted questions when scope, behavior, acceptance criteria, or API contract is ambiguous.
- For GitHub ticket work, use the project skill `github-ticket-implementation-planner` before implementation.
- If you must assume something, state assumptions explicitly and keep changes minimal until confirmed.

## Error handling: fail fast, fix root cause (not symptoms)

Applies to **bug fixes and new features**.

### Bug fixes

- **Find and fix the root cause** — trace the failure (logs, stack, agent/APIHUB client response, DB state). Do not mask symptoms.
- **Forbidden as a “fix”** unless the user explicitly requests a temporary workaround and documents it:
  - Swallowing errors (`_ = err`, ignored `err`, empty result after failed DB/API/agent calls).
  - Silent fallbacks when discovery, snapshot, or security-check operations failed.
  - Broad `recover()` or generic handlers that hide the real failure.

### New code and refactors

- **Propagate errors** from repositories and services; map to HTTP at the controller boundary.
- Use **`exception.CustomError`** for client-facing API errors (see **API errors** below).
- **Fail fast** on fatal startup wiring (`log.Fatalf` / `panic` patterns in `service.go` for migration failure, auth setup, API spec discovery, etc.).
- **Log errors** at ERROR for unrecoverable failures; DEBUG for expected client errors passed through `RespondWithCustomError`.
- Background jobs (`CleanupService` cron) must log failures — do not leave scheduled work failing silently.

### Before submitting a bug-fix diff

Briefly state: **root cause**, **why the change fixes it**, and confirm you did **not** add swallow-and-continue logic.

## Libraries and dependencies

- Do **not** reimplement functionality available in established libraries already used here (gorilla/mux, go-pg, logrus, resty, go-guardian, cron, excelize).
- Prefer existing clients (`client/agent.go`, `client/apihub.go`) and repository patterns over ad-hoc DB or HTTP code.
- Justify any **new** Go module dependency briefly.

## GitHub CLI

- Use **`gh`** for issues, pull requests, checks, and releases.
- If `gh` is missing or not authenticated, tell the user — do not scrape GitHub HTML.

## Cross-platform development (Windows + Linux)

- Team uses **Linux** and **Windows (often with WSL)**.
- Go module and runnable binary live under `qubership-apihub-agents-backend/`; run `go test` / `go build` from that directory unless the task says otherwise.
- Prefer repo-relative paths like `qubership-apihub-agents-backend/controller/...`.

## Related repositories

| Repo | Relationship |
|------|----------------|
| **qubership-apihub-backend** | Runtime dependency — permissions, package/version publishing, auth validation via `client/apihub.go` (`APIHUB_URL`, `APIHUB_ACCESS_TOKEN`). REST contract changes there may require agents-backend client or behaviour updates. |
| **qubership-apihub-agent** | Downstream agent instances — discovery, snapshot collection, proxy targets. Agent API changes may require updates to `client/agent.go` and controllers. |
| **qubership-apihub-ui** | Consumes agents-backend REST endpoints for the Agents tab in the portal. |
| **qubership-apihub** | Helm charts — env vars for PostgreSQL, APIHUB URL, probes (`values.yaml` → `qubershipApihubAgentsBackend`). |
| **qubership-apihub-ci** | Shared super-linter workflows and generic agent packages (`agent-packages/`). |

When a change affects REST contracts, env vars, or integration behaviour, **remind** the developer if follow-up is needed in backend, agent, UI, or Helm — this workspace may not contain those repos.

## Repository layout

| Area | Location |
|------|----------|
| Entry point / route registration | `qubership-apihub-agents-backend/service.go` |
| HTTP controllers | `qubership-apihub-agents-backend/controller/` |
| Business logic | `qubership-apihub-agents-backend/service/` |
| Data access | `qubership-apihub-agents-backend/repository/` |
| DB entities | `qubership-apihub-agents-backend/entity/` |
| API DTOs | `qubership-apihub-agents-backend/view/` |
| API error codes | `qubership-apihub-agents-backend/exception/errors.go` |
| Agent / APIHUB HTTP clients | `qubership-apihub-agents-backend/client/` |
| Auth middleware | `qubership-apihub-agents-backend/security/` |
| SQL migrations | `qubership-apihub-agents-backend/resources/migrations/` |
| OpenAPI specs (this service) | `docs/api/Agents-Backend-API.yaml`, `docs/api/Admin-API.yaml`, `docs/api/Agents-Backend-API_internal.yaml` |
| Architecture diagram | `docs/recources/arch_diagram.png` |

## Domain model (read before changing agent flow)

### Agent lifecycle

1. **Registration** — agents POST heartbeat to `/api/v2/agents`; `AgentService` upserts agent records in PostgreSQL.
2. **Inactive detection** — agents without recent heartbeats are marked inactive.
3. **Namespaces** — list namespaces and service names via agent client calls.

### Discovery orchestration

1. **Trigger** — POST discover endpoint; `DiscoveryService` calls the agent discovery API after permission checks.
2. **Results** — list discovered services via v3 endpoint (v2 deprecated).

### Snapshots

1. **Create** — collect specs from agent, package as ZIP, publish to APIHUB as package version.
2. **Cleanup** — cron job removes old snapshots based on `SNAPSHOTS_TTL_DAYS`.

### Proxy

- Routes under `/api/v2/agents/{agentId}/namespaces/{namespace}/services/{serviceId}/proxy/` forward to agent instances.
- Deprecated path `/agents/{agentId}/.../proxy/` controlled by `INSECURE_PROXY`.

## Startup and migration pattern

`service.go` uses a two-phase startup:

1. **Init server** — temporary HTTP server starts immediately (health endpoints available).
2. **Migration goroutine** — `DBMigrationService.Migrate()` runs against PostgreSQL; on success, init server shuts down.
3. **Full wiring** — repositories, services, controllers, routes, and api-spec-exposer registration.

Do not reorder this sequence without understanding `/live` and `/ready` behaviour and migration failure handling (failed migration stops the process after a delay).

## Configuration (env-only)

All settings via environment variables in `service/system_info.go` — no YAML config files.

| Variable group | Key env vars |
|----------------|--------------|
| PostgreSQL | `AGENTS_BACKEND_POSTGRESQL_HOST`, `AGENTS_BACKEND_POSTGRESQL_PORT`, `AGENTS_BACKEND_POSTGRESQL_DB_NAME`, `AGENTS_BACKEND_POSTGRESQL_USERNAME`, `AGENTS_BACKEND_POSTGRESQL_PASSWORD` |
| APIHUB | `APIHUB_URL`, `APIHUB_ACCESS_TOKEN` |
| Paths / server | `BASE_PATH`, `API_SPEC_DIR`, `LISTEN_ADDRESS`, `ORIGIN_ALLOWED`, `LOG_LEVEL` |
| Snapshots | `SNAPSHOTS_CLEANUP_SCHEDULE`, `SNAPSHOTS_TTL_DAYS` |

## Go coding conventions (summary)

Detailed rules apply via deployed `.cursor/rules/` and `.claude/rules/` (from APM). Key points for **this** repo:

- **No magic numbers** — named constants; brief comment if a literal is unavoidable.
- **HTTP status codes** — use `net/http` constants, not raw integers.
- **Repeated strings** — extract to constants (especially error codes/messages).
- **Comments** — only for non-obvious logic; do not map types to HTTP routes in comments.
- **Entity → view converters** without dependencies: `Make{Name}View` in `entity/` next to the struct.
- **Wiring in `service.go`** — follow existing order: migration → clients → repositories → services → controllers → routes → api-spec-exposer. Use `log.Fatalf` / `panic` for fatal init errors consistent with surrounding code.
- **API errors** — client-facing codes and messages as constants in `exception/errors.go`, returned via `exception.CustomError` with `Status`, `Code`, `Message`, optional `Params` (placeholders like `$agentId`, `$param`), and `Debug` for internal detail.

## REST API and OpenAPI

- Follow **API-first**: update `docs/api/Agents-Backend-API.yaml` (and admin/internal specs when applicable) when REST contract changes.
- Service exposes its own specs via api-spec-exposer from `API_SPEC_DIR` (see `service.go` discovery block).
- Avoid breaking public API changes without explicit product approval.

## Database migrations

- Files: `qubership-apihub-agents-backend/resources/migrations/`.
- Use the next unused numeric prefix; **no duplicate numbers**.
- Provide paired `.up.sql` and `.down.sql` when rollback is required.
- Migrations run at startup via `DBMigrationService` before the main server accepts traffic.

## CI linters (super-linter / link checker)

PRs run **super-linter** (see `.github/workflows/super-linter.yaml`) and **lychee** on Markdown. While writing:

- **Go:** tabs in `*.go`; tabs inside raw string literals for nested indentation.
- **Markdown:** prose lines ≤ **400** characters; one H1 per file.
- **OpenAPI YAML:** no trailing whitespace on changed lines; match existing indentation.
- **Links:** repo-relative paths must resolve from the editing file.

Full checklist: `.cursor/rules/ci-super-linter.mdc` after `apm install`.

## SQL performance

- For non-trivial repository SQL: consider indexes, join cardinality, N+1 patterns, and unbounded result sets.

## Testing and verification

- Run targeted tests: `go test ./...` from `qubership-apihub-agents-backend/`.
- After REST changes, sanity-check OpenAPI parity with registered routes in `service.go`.

## Completion

- After substantive changes, propose **one** concise conventional-commit message.
- For an independent review, invoke `apihub-go-self-review` in a **new chat** or with a **different model**.

## Project skills (Cursor / Claude)

Generic skills and rules are provisioned by APM from the
[CI store](https://github.com/Netcracker/qubership-apihub-ci/tree/main/agent-packages).
Repo-specific packages live in [`agent-packages/`](agent-packages/).

```bash
apm install --target cursor,claude --legacy-skill-paths
```

Skills auto-discover from `.cursor/skills/` and `.claude/skills/` (`apihub-go-developer`, `apihub-go-self-review`, `github-ticket-implementation-planner`, `apihub-agents-backend-developer`). See [README — AI agent configuration (APM)](README.md#ai-agent-configuration-apm).
