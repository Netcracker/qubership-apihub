# APIHub Linter Service — Agent Instructions

Instructions for AI assistants working on **qubership-api-linter-service** (Cursor, Claude Code, and compatible tools).

This microservice lints API specifications (OpenAPI / AsyncAPI) for the APIHUB platform, stores results in PostgreSQL, exposes REST endpoints for validation summaries and scoring, and reacts to version-publication events from the main backend via Olric.

## Clarification before coding

- Do **not** generate or modify code until the task requirements are clear.
- Ask targeted questions when scope, behavior, acceptance criteria, or API contract is ambiguous.
- For GitHub ticket work, use the project skill `github-ticket-implementation-planner` before implementation.
- If you must assume something, state assumptions explicitly and keep changes minimal until confirmed.

## Error handling: fail fast, fix root cause (not symptoms)

Applies to **bug fixes and new features**.

### Bug fixes

- **Find and fix the root cause** — trace the failure (logs, stack, task pipeline, APIHUB client response, linter subprocess output). Do not mask symptoms.
- **Forbidden as a “fix”** unless the user explicitly requests a temporary workaround and documents it:
  - Swallowing errors (`_ = err`, ignored `err`, empty result after failed DB/API/subprocess calls).
  - Silent fallbacks when linting, scoring, or task processing failed (pretend success, skip persistence, return cached stale data without indication).
  - Broad `recover()` or generic handlers that hide the real failure.

### New code and refactors

- **Propagate errors** from repositories and services; map to HTTP at the controller boundary.
- Use **`exception.CustomError`** for client-facing API errors (see **API errors** below). Use plain `error` for internal layers when the controller already translates failures.
- **Fail fast** on fatal startup wiring (`log.Fatalf` / `panic` patterns already used in `service.go` for migration failure, missing Spectral binary, auth setup, etc.).
- **Log errors** at ERROR for unrecoverable failures; DEBUG for expected client errors passed through `RespondWithCustomError`.
- Background workers (`DocTaskProcessor`, `VersionTaskProcessor`) must mark tasks failed in DB and log the cause — do not leave tasks stuck in an ambiguous state without logging.

### Before submitting a bug-fix diff

Briefly state: **root cause**, **why the change fixes it**, and confirm you did **not** add swallow-and-continue logic.

## Libraries and dependencies

- Do **not** reimplement functionality available in established libraries already used here (gorilla/mux, go-pg, logrus, resty, OpenAI SDK, Spectral CLI integration patterns).
- Prefer existing executors (`SpectralExecutor`, `AiOasExecutor`) and repository patterns over ad-hoc DB or HTTP code.
- Justify any **new** Go module dependency briefly.

## GitHub CLI

- Use **`gh`** for issues, pull requests, checks, and releases.
- If `gh` is missing or not authenticated, tell the user — do not scrape GitHub HTML.

## Cross-platform development (Windows + Linux)

- Team uses **Linux** and **Windows (often with WSL)**.
- Go module and runnable binary live under `qubership-api-linter-service/`; run `go test` / `go build` from that directory unless the task says otherwise.
- Spectral/Vacuum bundled binaries exist under `resources/spectral/` and `resources/vacuum/` per OS — respect platform paths when touching executor code.
- Prefer repo-relative paths like `qubership-api-linter-service/controller/...`.

## Related repositories

| Repo | Relationship |
|------|----------------|
| **qubership-apihub-backend** | Runtime dependency — fetches packages, versions, documents, and auth via `client/apihub.go` using `technicalParameters.apihub.url` and `technicalParameters.apihub.accessToken` from `config.yaml`. REST contract changes there may require linter client or behaviour updates. |
| **qubership-apihub-ui** | Consumes linter REST endpoints for validation summaries and scoring in the portal. |
| **qubership-apihub-ci** | Shared super-linter workflows and generic agent packages (`agent-packages/`). |

When a change affects REST contracts or integration behaviour, **remind** the developer if follow-up is needed in backend or UI — this workspace may not contain those repos.

## Repository layout

| Area | Location |
|------|----------|
| Entry point / route registration | `qubership-api-linter-service/service.go` |
| HTTP controllers | `qubership-api-linter-service/controller/` |
| Business logic | `qubership-api-linter-service/service/` |
| Data access | `qubership-api-linter-service/repository/` |
| DB entities | `qubership-api-linter-service/entity/` |
| API DTOs / enums (`Linter`, `ApiType`, …) | `qubership-api-linter-service/view/` |
| API error codes | `qubership-api-linter-service/exception/errors.go` |
| APIHUB HTTP client | `qubership-api-linter-service/client/apihub.go` |
| Auth middleware | `qubership-api-linter-service/security/` |
| SQL migrations | `qubership-api-linter-service/resources/migrations/` |
| Default Spectral/Vacuum rules | `qubership-api-linter-service/resources/spectral/`, `.../vacuum/` |
| OpenAPI specs (this service) | `docs/api/linter_service_api.yaml`, `docs/api/admin_api.yaml` |
| Architecture notes | `docs/arch_proposal/`, `docs/validation_sequence/` |

## Domain model (read before changing lint flow)

### Validation pipeline

1. **Trigger** — POST validation, bulk validation, or Olric `"version-published"` event (`PublishEventListener`).
2. **Version task** — `VersionTaskProcessor` loads documents from APIHUB, creates per-document lint tasks per enabled linter/ruleset.
3. **Document task** — `DocTaskProcessor` worker pool downloads raw spec, runs Spectral and/or AI linter, caches by content hash + ruleset, persists results.
4. **Scoring** — after version lint completes, `ScoringService` may compute version-level quality score (see `service/scoring.go`).

### Linter engines

| Engine | Code | API types | Notes |
|--------|------|-----------|-------|
| Spectral | `view.SpectralLinter` | OpenAPI 2.0/3.0/3.1, AsyncAPI 3.0 | Subprocess via `linters.spectral.binPath`; concurrency via `linters.spectral.workers` |
| AI linter | `view.AiLinter` | OpenAPI 2.0/3.0/3.1 only | Opt-in via `linters.ai.enabled`; OpenAI settings live under `linters.ai.openAI` |

Registration lives in `service/linter_config.go`; selection in `service/linter_selector.go`; execution branch in `service/doc_task_processor.go`.

### Adding a new linter engine

1. Add `Linter` constant in `view/linter.go`.
2. Register in `linter_config.go` `loadInternalConfigs()` (API types, workers, enable flag).
3. Implement executor (mirror `spectral_executor.go` or `ai_oas_executor.go`).
4. Wire into `doc_task_processor.go` `processDocTask()`.
5. Extend validation summary/detail mapping in `service/validation.go` if output shape differs.
6. Update OpenAPI under `docs/api/` if new REST surface is exposed.

### Adding a new API type

1. Add `ApiType` in `view/document.go`.
2. Attach to relevant linter configs in `linter_config.go`.
3. Add or extend Spectral rules under `resources/spectral/rules/` when applicable.

## Go coding conventions (summary)

Detailed rules apply via deployed `.cursor/rules/` and `.claude/rules/` (from APM). Key points for **this** repo:

- **No magic numbers** — named constants; brief comment if a literal is unavoidable.
- **HTTP status codes** — use `net/http` constants, not raw integers.
- **Repeated strings** — extract to constants (especially error codes/messages).
- **Comments** — only for non-obvious logic; do not map types to HTTP routes in comments.
- **Entity → view converters** without dependencies: `Make{Name}View` in `entity/` next to the struct.
- **Wiring in `service.go`** — follow existing order: repositories → services → background processors → controllers → routes. Use `log.Fatalf` for fatal init errors consistent with surrounding code.
- **API errors** — client-facing codes and messages as constants in `exception/errors.go`, returned via `exception.CustomError` with `Status`, `Code`, `Message`, optional `Params` (placeholders like `$id`, `$param`), and `Debug` for internal detail. Reuse existing codes (`EntityNotFound`, `LintNotSupported`, `InvalidParameterValue`, …) before inventing new ones.

## REST API and OpenAPI

- Follow **API-first**: update `docs/api/linter_service_api.yaml` (and `admin_api.yaml` if admin endpoints change) when REST contract changes.
- Prefer **v2** endpoints for new summary/detail behaviour; v1 paths marked deprecated in code — do not extend deprecated handlers unless fixing a bug.
- Service exposes its own specs via api-spec-exposer from `technicalParameters.apiSpecDirectory`; if it is empty, the service uses `<technicalParameters.basePath>/api` (see `service.go` discovery block).
- Avoid breaking public API changes without explicit product approval.

## Database migrations

- Files: `qubership-api-linter-service/resources/migrations/`.
- Use the next unused numeric prefix; **no duplicate numbers**.
- Provide paired `.up.sql` and `.down.sql` when rollback is required.
- Migrations run at startup via `DBMigrationService` before the main server accepts traffic.

## Rulesets and bundled linter config

- Custom rulesets: uploaded via REST (`POST /api/v1/rulesets`), stored in DB, activated per API type.
- Default Spectral rules: `resources/spectral/rules/rules.yaml` (extends `spectral:oas` recommended).
- Changing default rules affects all deployments — treat as product-visible behaviour.

## CI linters (super-linter / link checker)

PRs run **super-linter** (see `.github/workflows/super-linter.yaml`) and **lychee** on Markdown. While writing:

- **Go:** tabs in `*.go`; tabs inside raw string literals for nested indentation.
- **Markdown:** prose lines ≤ **400** characters; one H1 per file.
- **OpenAPI YAML:** no trailing whitespace on changed lines; match existing indentation.
- **Links:** repo-relative paths must resolve from the editing file.

Full checklist: `.cursor/rules/ci-super-linter.mdc` after `apm install`.

## SQL performance

- For non-trivial repository SQL: consider indexes, join cardinality, N+1 patterns, and unbounded result sets (task queues, result aggregation).

## Testing and verification

- Run targeted tests: `go test ./...` from `qubership-api-linter-service/`.
- For lint executor changes, consider unit tests with fixture specs; integration tests may require Spectral binary and DB.
- After REST changes, sanity-check OpenAPI parity with registered routes in `service.go`.

## Completion

- After substantive changes, propose **one** concise conventional-commit message.
- For an independent review, invoke `apihub-go-self-review` in a **new chat** or with a **different model**.

## Project skills (Cursor / Claude)

Generic skills and rules are provisioned by APM from the
[CI store](https://github.com/Netcracker/qubership-apihub-ci/tree/main/agent-packages):

```bash
apm install --target cursor,claude --legacy-skill-paths
```

Skills auto-discover from `.cursor/skills/` and `.claude/skills/` (`apihub-go-developer`, `apihub-go-self-review`, `github-ticket-implementation-planner`). See [README — AI agent configuration (APM)](README.md#ai-agent-configuration-apm).

Repo-specific agent packages are **not** used here — only generic CI packages apply.
