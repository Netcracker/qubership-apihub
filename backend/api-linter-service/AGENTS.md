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
- **Fail fast** on fatal startup wiring (`log.Fatalf` / `panic` patterns already used in `main.go` for migration failure, missing Spectral binary, auth setup, etc.).
- **Log errors** at ERROR for unrecoverable failures; DEBUG for expected client errors passed through `RespondWithCustomError`.
- Background workers (`DocTaskProcessor`, `VersionTaskProcessor`, `ScoringTaskProcessor`) must mark tasks failed in DB and log the cause — do not leave tasks stuck in an ambiguous state without logging.

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
- Go module and runnable binary live at the component root; run `go test` / `go build` from there unless the task says otherwise.
- Spectral/Vacuum bundled binaries exist under `resources/spectral/` and `resources/vacuum/` per OS — respect platform paths when touching executor code.
- Prefer repo-relative paths like `controller/...`.

## Related modules

This service is a module of the **qubership-apihub** monorepo. The neighbors are in the same tree:

| Module | Relationship |
|--------|----------------|
| `backend/portal-backend` | Runtime dependency — fetches packages, versions, documents, and auth via `client/apihub.go` using `technicalParameters.apihub.url` and `technicalParameters.apihub.accessToken` from `config.yaml`. REST contract changes there may require linter client or behaviour updates. The portal reaches this service through its `extensions` config. |
| `frontend/ui` | Consumes linter REST endpoints for validation summaries in the portal SPA. It does not call the scoring endpoints; their consumer is an external process. |
| `backend/commons-go` | Shared library (`api-spec-exposer`). Keep `go.mod` in step with the workspace (`go work sync`). |
| `deploy/helm-templates/`, `deploy/docker-compose/` | Deployment of this service; update them and `docs/configuration-reference.md` when config or ports change. |

When a change affects REST contracts or integration behaviour, update the neighbor in the same change.

## Repository layout

| Area | Location |
|------|----------|
| Entry point / route registration | `main.go` |
| HTTP controllers | `controller/` |
| Business logic | `service/` |
| Data access | `repository/` |
| DB entities | `entity/` |
| API DTOs / enums (`Linter`, `ApiType`, …) | `view/` |
| API error codes | `exception/errors.go` |
| APIHUB HTTP client | `client/apihub.go` |
| Auth middleware | `security/` |
| SQL migrations | `resources/migrations/` |
| Default Spectral/Vacuum rules | `resources/spectral/`, `.../vacuum/` |
| OpenAPI specs (this service) | `docs/api/linter_service_api.yaml`, `docs/api/admin_api.yaml` |
| Architecture notes | `docs/arch_proposal/` |

## Domain model (read before changing lint flow)

### Validation pipeline

1. **Trigger** — POST validation, bulk validation, or Olric `"version-published"` event (`PublishEventListener`).
   Each one calls `ValidationService.ValidateVersion`, which inserts a `version_validation_process` row in
   `not_started` with its version lint task and its scoring task in one transaction. It resets no result row.
2. **Validation process** — the worker in `service/validation_process_worker.go` runs on every pod, on a 5-second
   tick and on the signal of a trigger. A pass finishes the processes in `processing` whose two tasks are in
   `success` or `error`: the process gets `success` when both tasks are in `success`, otherwise `error`. The pass then
   starts the earliest `not_started` process of each revision that has none in `processing`;
   one transaction per revision sets the process to `processing` and resets the `version_score` and
   `linted_version` rows to it. A partial unique index allows one process in `processing` per revision. When a
   process starts, the worker signals the lint and scoring processors. The lint and scoring tasks are claimed only
   while their process is in `processing`, so the runs of a revision go one after another and both result rows
   always come from one run.
3. **Version task** — `VersionTaskProcessor` loads documents from APIHUB, creates per-document lint tasks per enabled linter/ruleset.
   The lint writes are fenced by the status of the lint task: an executor completes or fails the task only while it
   owns it in `processing`, `checkDocReady` only while it is in `waiting_for_docs` and none of its document tasks
   runs, and a document task writes its result only while its lint task is in `waiting_for_docs` (otherwise it is
   closed with `lint task is already finished`). A refused write does not count as a restart.
4. **Document task** — `DocTaskProcessor` worker pool downloads raw spec, runs Spectral and/or AI linter, caches by content hash + ruleset, persists results.
5. **Scoring** — `ScoringTaskProcessor` (`service/scoring_task_processor.go`) runs the `version_scoring_task` rows
   next to the lint, with a lease and a heartbeat, and gives a task up after two failed attempts, as for the lint
   tasks; a claim of a task whose lease expired counts as a failed attempt. It writes three parts of the `version_score` row: publication integrity
   and backwards compatibility as soon as APIHUB returns the version, and quality from the finished document tasks of
   the lint task of the same validation process (final when the lint task is). Each finished document task is scored
   once: the task row keeps the ids of the document tasks whose entries are committed, and an attempt writes the
   quality part only when it scores new document tasks or the status of the part changes.

   A task runs one attempt at a time on an executor (`runAttempt`). The attempt re-reads the task and the score, runs
   integrity and BWC in a child goroutine and quality in its own, joins them, and increments the restart count once
   when either failed. Quality is sampled once per attempt, so a document that finishes during a slow BWC call is
   scored by the next attempt. The slot of the task stays taken until the restart count is updated or the update is
   refused.

   An executor runs at most `maxConcurrentScoringAttempts` (5) attempts at once, one per attempt slot: an attempt checks
   out up to two connections from the connection pool of the pod and calls APIHUB, and the same pool serves the lease
   refreshes of all task types. The work loop lists the owned tasks in `processing` on a 5-second ticker, skips a task
   whose attempt still runs, and takes the others in `created_at` order: it takes an attempt slot before it starts an
   attempt and waits while all are taken. A pass can take longer than 5 seconds; the ticker then drops the ticks it
   misses. The heartbeat and the claim loop do not wait for a slot. An attempt runs under a deadline of
   `scoringAttemptTimeout` (10 minutes), and a timeout that `runAttempt` returns is a failed attempt. The deadline
   covers the statements and the APIHUB requests of an attempt, but not the `COMMIT` or `ROLLBACK` of a transaction,
   because go-pg drops the context there: a database that stops answering at that moment holds the slot and its
   connection until the connection ends. While the restart count cannot be written, the attempt retries the write every
   5 seconds and keeps its slot, until the write succeeds or the repository refuses it. The write fails while the
   database fails, or when PostgreSQL rejects the update for one task; the scoring of the pod pauses while all five
   slots are held this way.

   The `version_score` row stores `status` (the verdict: `passed`, `passed_with_defects`, `not_passed`), `reasons`,
   `debug`, and one `process_details` jsonb column of type `view.ScoringProcessDetails`, the same type as
   `processDetails` of the v2 body. `processStatus` always names the state of the work (`not_started`, `processing`,
   `success`, `error`): at the top of `process_details` and in each of the three checks `publicationIntegrity`,
   `backwardsCompatibility`, and `qualityCheck`, each `{processStatus, details}`. A check without `details` has no
   committed result: it has not started, it ended in `error` before a result was committed, or it is a check in
   `success` of a score calculated before the upgrade that stored none. Empty `details` (`{}`) are a committed
   result with nothing to report. The start of a validation process resets the row: `processing` with three checks
   in `not_started`, empty `status`, `reasons`, and `debug`.

   The checks start in `not_started`, quality is in `processing` while the lint runs, and each check ends in
   `success` or `error`. The overall `processStatus` is `processing` until the scoring task ends, even after a check
   has failed. It is set once, in the transaction that ends the scoring task: `error` when a check is in `error` or
   the scoring task failed, `success` otherwise. The scoring task ends with the same status as the score of its
   validation process; a task whose score row was replaced or deleted closes on its own. The statuses report
   whether the work ran; the verdict reports what the checks found, so a score with breaking changes in external
   operations ends in `success` with `not_passed`.

   Quality ends in `error` when the lint task is in `error` or is missing, and also when the lint task is final and
   the merged quality details hold an unavailable required result: a required entry in `not_passed` with no errors,
   written when a required linter failed internally on a document (a failed document task or a failed linted
   document). The lint task keeps its own outcome. The quality entry of a failed linter stays `not_passed` (required)
   or `passed` (optional) with zero counts and the diagnostic in `internalErrors`; that text is not copied to
   `debug`. A new entry takes its `fileId` from its document task; entries of scores calculated before the upgrade
   have none, and an empty value is omitted.

   `debug` holds the internal failures in commit order; the transaction that moves a check or the task to `error`
   appends its line, and `recomputeOverallStatus` never rebuilds it. A line whose cause belongs to one check starts
   with the check name: `qualityCheck: lint task not found`, `qualityCheck: lint task failed: <details>`,
   `qualityCheck: <N> required lint result(s) unavailable` (after the lint line when both apply; N counts the
   unavailable required results, so two required linters that fail on one document give two). `failScoringTask`
   appends `scoring task failed: <details>` once per give-up. A task that ends through `CompleteScoring` writes the
   joined `debug` lines (`; `) to its `details`: empty on `success`. A task given up after the restart limit keeps
   the restart diagnostic (`restart count exceeded limit, last error: ...`) in its `details`, and its error log adds
   the `debug` lines of the row. A give-up ends the score in `error` even when the three checks are in `success`,
   with the verdict computed from the checks.

   `recomputeOverallStatus` (`service/scoring_task_processor.go`) recomputes `status` and `reasons` from the row on
   every write; the row keeps an empty `status` until the overall status is `success` or `error`, and the v2 body
   omits the field until then. A check in `error` sets `not_passed` and adds a fixed sentence in the order BWC,
   quality, integrity, before the reasons of the details. The quality sentence is left out when the details hold an
   unavailable required result, whose entry reason already says what failed. Integrity in `error` has no details in
   the row or in v2.

   `GET /api/v2/.../scoring` returns the row once it exists, during processing too; before the first queued run of
   the revision starts, it returns 404. The deprecated `GET /api/v1/.../scoring` returns 404 until the overall status
   is `success` or `error`, and `MakeVersionScoreView_deprecated` projects the released v1 shape from the row:
   `status`, `reason`, and `debug` as stored, the details of the three checks, no `fileId`, and the legacy integrity
   section (`not_passed`, `Internal error: failed to get version content.`, both flags `false`) for integrity in
   `error` without details. Rows written before the upgrade keep their verdict, `reasons`, and `debug`; migration 5
   classifies their checks by the legacy markers.

   Part updates and the completion or failure of the score go through `withOwnedScoreTx` (`repository/scoring_task.go`):
   it updates the task only while `executor_id` is this executor and the status is `processing`, then locks the score
   row and checks that its `validation_process_id` is the one of the task. A refused write returns no score and does
   not count as a failed attempt; a later attempt closes a task whose score row was replaced or deleted. The claim,
   the lease refresh, the retry increment, and `CloseLostTask` are separate statements, each fenced by its own
   condition on the task row. The score row is reset by the start of the validation process.

   The deprecated v1 and v2 validation summaries show `inProgress` with empty details while the validation process
   named by the `linted_version` row is in `processing`, so a final lint status means that the score of the same run
   is ready. The v3 summary and the MCP tool report the lint status as stored, without waiting for the scoring.

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
- **Wiring in `main.go`** — follow existing order: repositories → services → background processors → controllers → routes. Use `log.Fatalf` for fatal init errors consistent with surrounding code.
- **API errors** — client-facing codes and messages as constants in `exception/errors.go`, returned via `exception.CustomError` with `Status`, `Code`, `Message`, optional `Params` (placeholders like `$id`, `$param`), and `Debug` for internal detail. Reuse existing codes (`EntityNotFound`, `LintNotSupported`, `InvalidParameterValue`, …) before inventing new ones.

## REST API and OpenAPI

- Follow **API-first**: update `docs/api/linter_service_api.yaml` (and `admin_api.yaml` if admin endpoints change) when REST contract changes.
- Add new behaviour to the current versions: **v3** for the validation summary, **v2** for the document details.
  Do not extend deprecated handlers unless fixing a bug.
- Service exposes its own specs via api-spec-exposer from `technicalParameters.apiSpecDirectory`; if it is empty, the service uses `<technicalParameters.basePath>/api` (see `main.go` discovery block).
- Avoid breaking public API changes without explicit product approval.

## Database migrations

- Files: `resources/migrations/`.
- Use the next unused numeric prefix; **no duplicate numbers**.
- Provide paired `.up.sql` and `.down.sql` when rollback is required.
- Migrations run at startup via `DBMigrationService` before the main server accepts traffic.

## Rulesets and bundled linter config

- Custom rulesets: uploaded via REST (`POST /api/v1/rulesets`), stored in DB, activated per API type.
- Default Spectral rules: `resources/spectral/rules/rules.yaml` (extends `spectral:oas` recommended).
- Changing default rules affects all deployments — treat as product-visible behaviour.

## CI linters (super-linter / link checker)

PRs run **super-linter** (see the root `.github/workflows/super-linter.yaml`) and **lychee** on Markdown. While writing:

- **Go:** tabs in `*.go`; tabs inside raw string literals for nested indentation.
- **Markdown:** prose lines ≤ **400** characters; one H1 per file.
- **OpenAPI YAML:** no trailing whitespace on changed lines; match existing indentation.
- **Links:** repo-relative paths must resolve from the editing file.

Full checklist: `.cursor/rules/ci-super-linter.mdc` after `apm install`.

## SQL performance

- For non-trivial repository SQL: consider indexes, join cardinality, N+1 patterns, and unbounded result sets (task queues, result aggregation).

## Testing and verification

- Nx project `api-linter-service` (tag `lang:go`): `pnpm exec nx run api-linter-service:build` and
  `pnpm exec nx run api-linter-service:test` from the repository root. Or `go build ./...` and `go test ./...` from
  this directory (the module is in `go.work`; the image builds with `GOWORK=off`).
- For lint executor changes, consider unit tests with fixture specs; integration tests may require Spectral binary and DB.
- After REST changes, sanity-check OpenAPI parity with registered routes in `main.go`.

## Completion

- After substantive changes, propose **one** concise conventional-commit message.
- For an independent review, invoke `apihub-go-self-review` in a **new chat** or with a **different model**.

## Agent packages

One root `apm.yml` covers the repository; deploy with `apm install --target cursor,claude`
from the root (never `apm compile`). This module has no local package; only store packages apply:

- `apihub-go-developer` (skill and rule): use for any Go change here.
- `apihub-go-self-review` (skill): independent review of a finished diff, in a new chat.
- `go-conventions` (rules): comments, constants and HTTP codes, error handling, API-first OpenAPI (`docs/api/`,
  `controller/`), migrations (`resources/migrations/`), SQL performance (`repository/`).
- `apihub-deployment-authoring` (skill, root): use when a change needs Helm, Compose, or config reference updates.
- `github-ticket-implementation-planner`, `development-conventions`: planning from a ticket; always-on rules.

The store globs (`**/*.go`) also match the other Go modules; the portal-backend rules do not apply here.
