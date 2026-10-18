# APIHub Agent — Agent Instructions

Instructions for AI assistants working on **qubership-apihub-agent** (Cursor, Claude Code, and compatible tools).

This service is a **Kubernetes discovery sidecar** for the APIHUB platform. It lists cluster namespaces and services, discovers API specifications (OpenAPI, GraphQL SDL, AsyncAPI, Markdown, JSON Schema) from running workloads, and registers results with the main APIHUB backend and agents-backend.

## Clarification before coding

- Do **not** generate or modify code until the task requirements are clear.
- Ask targeted questions when scope, discovery behaviour, acceptance criteria, or API contract is ambiguous.
- For GitHub ticket work, use the project skill `github-ticket-implementation-planner` before implementation.
- If you must assume something, state assumptions explicitly and keep changes minimal until confirmed.

## Error handling: fail fast, fix root cause (not symptoms)

Applies to **bug fixes and new features**.

### Bug fixes

- **Find and fix the root cause** — trace the failure (logs, K8s/paas client errors, discovery HTTP calls, APIHUB client responses). Do not mask symptoms.
- **Forbidden as a "fix"** unless the user explicitly requests a temporary workaround and documents it:
  - Swallowing errors (`_ = err`, ignored `err`, empty discovery result after failed calls without logging).
  - Silent fallbacks when discovery or registration failed (pretend success, skip reporting).
  - Broad `recover()` or generic handlers that hide the real failure.

### New code and refactors

- **Propagate errors** from services and clients; map to HTTP at the controller boundary.
- Use **`exception.CustomError`** for client-facing API errors. Use plain `error` for internal layers when the controller already translates failures.
- **Fail fast** on fatal startup wiring (`panic` / logged fatal patterns in `service.go` for config, PaaS client, etc.).
- **Log errors** at ERROR for unrecoverable failures; DEBUG for expected client errors.

### Before submitting a bug-fix diff

Briefly state: **root cause**, **why the change fixes it**, and confirm you did **not** add swallow-and-continue logic.

## Libraries and dependencies

- Do **not** reimplement functionality available in established libraries already used here (gorilla/mux, viper, logrus, paas-mediation-client, resty patterns in clients).
- Prefer existing discovery runners and service patterns over ad-hoc HTTP or K8s code.
- Justify any **new** Go module dependency briefly.

## GitHub CLI

- Use **`gh`** for issues, pull requests, checks, and releases.
- If `gh` is missing or not authenticated, tell the user — do not scrape GitHub HTML.

## Cross-platform development (Windows + Linux)

- Team uses **Linux** and **Windows (often with WSL)**.
- Go module and runnable binary live under `qubership-apihub-agent/`; run `go test` / `go build` from that directory unless the task says otherwise.
- Set `STUB_PM` for local runs without a real Kubernetes API.
- Prefer repo-relative paths like `qubership-apihub-agent/service/...`.

## Related repositories

| Repo | Relationship |
|------|----------------|
| **qubership-apihub-agents-backend** | Agent registry and management API — `AgentsBackendClient` in `client/agents_backend.go`. Contract changes may require client updates here and in agents-backend. |
| **qubership-apihub-backend** | Main APIHUB API — `ApihubClient` in `client/apihub.go` (`technicalParameters.apihub.url`, access token). Package/document operations depend on backend REST contracts. |
| **qubership-apihub** | Helm charts and docker-compose — agent deployment, ingress (`agentUrl`), config secrets, discovery env. |
| **qubership-apihub-ui** | Portal may surface agent/cloud discovery status; REST contract changes may need UI follow-up. |
| **qubership-apihub-ci** | Shared super-linter workflows and generic agent packages (`agent-packages/`). |

When a change affects REST contracts, Helm values, or integration behaviour, **remind** the developer if follow-up is needed in related repos — this workspace may not contain them.

## Repository layout

| Area | Location |
|------|----------|
| Entry point / route registration | `qubership-apihub-agent/service.go` |
| HTTP controllers | `qubership-apihub-agent/controller/` |
| Business logic | `qubership-apihub-agent/service/` |
| API type discovery | `qubership-apihub-agent/api_type/` (`rest`, `graphql`, `asyncapi`, `markdown`, `json_schema`, `unknown`, `generic`) |
| DTOs / enums | `qubership-apihub-agent/view/` |
| API errors | `qubership-apihub-agent/exception/` |
| APIHUB HTTP client | `qubership-apihub-agent/client/apihub.go` |
| Agents-backend client | `qubership-apihub-agent/client/agents_backend.go` |
| Config struct | `qubership-apihub-agent/config/` |
| Config template | `qubership-apihub-agent/config.template.yaml` |
| Auth middleware | `qubership-apihub-agent/security/` |
| OpenAPI specs (this service) | `documentation/api/` |
| Helm templates | `helm-templates/qubership-apihub-agent/` |

## Domain model (read before changing discovery)

### Discovery pipeline

1. **Trigger** — POST discovery (cloud/workspace) or scheduled/background flows via `DiscoveryService`.
2. **Namespace/service scan** — PaaS client lists services; caches reduce API load.
3. **Document discovery** — `DocumentsDiscoveryService` runs `DiscoveryRunner` implementations per API type against configured URLs (`discovery.urls` in config).
4. **Registration** — `RegistrationService` sends discovered documents and metadata to APIHUB and agents-backend.

### Adding a new API type

1. Implement `generic.DiscoveryRunner` in `api_type/<name>/discovery.go`.
2. Register in `service/document_discovery.go` `runners` slice (before `unknown` fallback).
3. Add `view.ApiType` if needed; extend `discovery.urls` defaults in `system_info.go` and `config.template.yaml`.
4. Update OpenAPI under `documentation/api/` if REST behaviour changes.

## Go coding conventions (summary)

Detailed rules apply via deployed `.cursor/rules/` and `.claude/rules/` (from APM). Key points for **this** repo:

- **No magic numbers** — named constants; brief comment if a literal is unavoidable.
- **HTTP status codes** — use `net/http` constants, not raw integers.
- **Repeated strings** — extract to constants (especially error codes/messages).
- **Comments** — only for non-obvious logic; do not map types to HTTP routes in comments.
- **No database** — no migrations, repositories, or SQL (see `agent-conventions`).
- **Wiring in `service.go`** — follow existing order; fatal init on misconfiguration consistent with surrounding code.

## REST API and OpenAPI

- Follow **API-first**: update `documentation/api/*.yaml` when REST contract changes.
- Avoid breaking public API changes without explicit product approval.

## CI linters (super-linter / link checker)

PRs run **super-linter** and **lychee** on Markdown. While writing:

- **Go:** tabs in `*.go`; tabs inside raw string literals for nested indentation.
- **Markdown:** prose lines ≤ **400** characters; one H1 per file.
- **OpenAPI YAML:** no trailing whitespace on changed lines; match existing indentation.
- **Links:** repo-relative paths must resolve from the editing file.

Full checklist: `.cursor/rules/ci-super-linter.mdc` after `apm install`.

## Testing and verification

- Run targeted tests: `go test ./...` from `qubership-apihub-agent/`.
- For discovery changes, consider unit tests with mocked HTTP; full integration requires K8s or `STUB_PM`.
- After REST changes, sanity-check OpenAPI parity with registered routes in `service.go`.

## Completion

- After substantive changes, propose **one** concise conventional-commit message.
- For an independent review, invoke `apihub-go-self-review` in a **new chat** or with a **different model**.

## Project skills (Cursor / Claude)

Generic and repo-specific skills are provisioned by APM from the
[CI store](https://github.com/Netcracker/qubership-apihub-ci/tree/apm_migration/agent-packages) and local `agent-packages/`:

```bash
apm install --target cursor,claude --legacy-skill-paths
```

Skills auto-discover from `.cursor/skills/` and `.claude/skills/` (`apihub-go-developer`, `apihub-go-self-review`, `apihub-agent-developer`, `github-ticket-implementation-planner`). See repository `apm.yml` and `agent-packages/README.md`.
