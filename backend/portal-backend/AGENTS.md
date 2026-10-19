# APIHub Backend — Agent Instructions

Instructions for AI assistants working on this repository (Cursor, Claude Code, and compatible tools).

## Build and test

Nx project `portal-backend` (tag `lang:go`). From the repository root:

```bash
pnpm exec nx run portal-backend:build
pnpm exec nx run portal-backend:test
```

Or `go build ./...` and `go test ./...` from this directory: the module is in `go.work`, and `go.mod` is at this
directory, not at the repository root. The image builds with `GOWORK=off`, so keep `go.mod` and `go.sum` in step
with the workspace (`go work sync`).

## Traps worth knowing before you start

### Never take a build or test result from the end of a pipe

`go build ./... 2>&1 | tail` reports the exit status of `tail`. Redirect to a file and check the status of the Go
command itself.

### Know what is already red and what CI covers

Capture a baseline run before you change anything and compare against it, rather than attributing a failure to your
work. `service/cleanup/MaintenanceVacuum_test.go` is skipped (`t.Skip("G38 ...")`): it fails on the old default
branch too.

The root CI (`.github/workflows/ci.yml`) runs `nx run-many -t build test` for the affected modules, builds the
images, and runs the API-level Newman suite against a deployed stack (`tests/postman-collections`, workflows
`e2e-tests-*.yml`). Read the step log, not the badge, when a check matters to your conclusion. Do not assume `go vet`
or Go linting runs anywhere; check `.github/workflows/` before you cite it.

### Registration is not implementation

This codebase has several places where a name promises behaviour that nothing performs: a Prometheus metric that is
registered and never incremented, a collector marked as unused, a configuration key read by a different subsystem
than its name suggests, a documented fallback whose probe tests a different address than the bind, a doc comment
describing a fail-closed path that returns the open value. Before you cite a metric, a config key, a helper name, or
a comment as evidence that something works, find the code that writes it or reads it.

The same caution applies in reverse: check `docs/api/` and the nearest correct sibling implementation before patching
something that looks wrong, because several plausible-looking defects here are deliberate and specified.

### Know where the answer lives

The OpenAPI documents under `docs/api/` are normative for the HTTP contract. Helm chart and Compose stacks are in
`deploy/helm-templates/` and `deploy/docker-compose/`; the E2E collections are in `tests/postman-collections/`. Any
conclusion about replica counts, resource limits, or E2E coverage has to be checked there.

## Clarification before coding

- Do **not** generate or modify code until the task requirements are clear.
- Ask the user targeted questions when scope, behavior, acceptance criteria, or API contract is ambiguous.
- For GitHub ticket work, use the project skill `github-ticket-implementation-planner` before implementation.
- If you must assume something, state assumptions explicitly and keep changes minimal until confirmed.

## Error handling: fail fast, fix root cause (not symptoms)

Applies to **bug fixes and new features**.

### Bug fixes

- **Find and fix the root cause** — trace the failure (logs, stack, data flow, repro). Do not mask symptoms.
- **Forbidden as a “fix”** unless the user explicitly requests a temporary workaround and documents it:
  - Swallowing errors (`_ = err`, empty `catch`, `return nil` after failed I/O/DB/API calls).
  - Silent fallbacks to “default” behavior when an operation failed (empty result, zero value, skip step, pretend success).
  - Broad `recover()` or generic handlers that hide the real failure.
  - Replacing a returned error with a generic message without fixing why it failed.

### New code and refactors

- **Propagate errors** up the stack; return `error` from services/repositories; let controllers map to API error responses via `exception/ErrorCodes.go`.
- **Fail fast** when state is invalid or required setup failed (`log.Fatalf` in `main.go` wiring, panic only where the codebase already does for unrecoverable programmer errors).
- **Log errors** at the appropriate layer (see `docs/development_guide.md` — errors to ERROR log); do not log-and-ignore.
- A **deliberate** fallback or default is allowed only when product requirements define it; document why in code or the ticket, and still log at WARN/ERROR when the primary path failed.

### Before submitting a bug-fix diff

Briefly state: **root cause**, **why the change fixes it**, and confirm you did **not** add swallow-and-continue logic.

## Libraries and dependencies

- Do **not** reimplement functionality that exists in well-established, industry-standard libraries.
- Search for suitable libraries before writing custom utilities (HTTP clients, parsing, crypto, etc.).
- Prefer dependencies already used in this repo; justify any new dependency briefly.

## GitHub CLI

- Use the **`gh`** CLI for GitHub issues, pull requests, checks, and releases.
- If `gh` is not installed or not authenticated, tell the user to install and authenticate it; do not rely on fragile HTML scraping or undocumented APIs.

## Cross-platform development (Windows + Linux)

- Team members use **Linux** and **Windows (often with WSL)**.
- Prefer **portable** commands: `bash` scripts with forward slashes, run from the **repository root**.
- On **Windows without WSL** in the active shell: use **WSL** (`wsl bash .cursor/skills/.../script.sh`), **Git Bash**, or **PowerShell** (`powershell -File .cursor/skills/.../script.ps1`).
- Do not assume Unix-only tools beyond `git`, `go`, `gh`, and `bash` unless the user confirms they are available.
- Avoid OS-specific path separators in instructions; use repo-relative paths like `service/...`.

## Related modules (Helm, E2E tests)

Deployment and E2E assets are in the same monorepo: `deploy/helm-templates/qubership-apihub/` (chart),
`deploy/docker-compose/`, `docs/configuration-reference.md`, and `tests/postman-collections/`. After REST, config, or
env changes, update them in the same change; the checklists are in
[`docs/agent/related-repositories.md`](docs/agent/related-repositories.md) and the root skills
`apihub-deployment-followup` and `postman-e2e-followup`.

Include a short **Related modules** subsection in your completion summary.
## Repository layout (minimal orientation)

| Area | Location |
|------|----------|
| Main service entry / DI wiring | `main.go` |
| HTTP controllers | `controller/` |
| Business logic | `service/` |
| Data access | `repository/` |
| DB entities + simple converters | `entity/` |
| API DTOs / views | `view/` |
| API error codes | `exception/ErrorCodes.go` |
| SQL migrations | `resources/migrations/` |
| OpenAPI specs | `docs/api/` (e.g. `APIHUB_API.yaml`, `Admin API.yaml`, `APIHUB_API_internal.yaml`) |
| Human docs index | `docs/README.md` |
| Development guide (logging, API-first, deprecation) | `docs/development_guide.md` |

## Go coding conventions (summary)

Detailed rules apply via `.cursor/rules/` and `.claude/rules/` when matching files are in context. Key points:

- **No magic numbers** — use named constants; if a literal is unavoidable, add a short comment explaining why.
- **Config defaults** — define once in `SystemInfoService.setDefaults()`; validate ranges in `config/Config.go` with `validate` tags; do not duplicate viper defaults as service-layer fallback constants.
- **HTTP status codes** — use `net/http` constants (e.g. `http.StatusOK`, `http.StatusBadRequest`, `http.StatusNotFound`), not numeric literals like `200` or `404`.
- **Repeated strings** — extract to constants.
- **Comments** — only when needed for non-obvious logic; do not comment obvious code.
- **Do not** add comments that map types/functions to HTTP routes (e.g. `// FooResponse is GET /chats`).
- **Entity → view converters** without dependencies: place in `entity/` next to the struct, named `Make{Name}View`.
- **New repositories, services, controllers** — register at the **end** of the corresponding block in `main.go`.
- **`main.go` fail-fast** — use `log.Fatalf` for fatal wiring/startup errors where applicable.
- **Errors** — propagate and fix root cause; no swallowing, no silent defaults on failure (see **Error handling** above).
- **API errors** — error code and message returned to clients must be constants in `exception/ErrorCodes.go`. AI Chat uses `APIHUB-AI-*` code+Msg pairs; variant messages reuse a parent code (legacy pattern).

## REST API and OpenAPI

- Follow API-first: design/approve API before implementation (see `docs/development_guide.md`).
- Any REST API change **must** update the relevant OpenAPI files under `docs/api/`.
- Avoid breaking public API changes without versioning and deprecation policy.

## Database migrations

- Files live in `resources/migrations/`.
- Use the next unused numeric prefix; **no duplicate migration numbers**.
- Provide paired `.up.sql` and `.down.sql` when applicable.
- After adding migrations, run the migration check script (see `apihub-backend-developer` skill; bash on Linux/WSL/Git Bash, or PowerShell on native Windows).

## Documentation

- When adding a feature, update the appropriate **existing** doc — use `docs/README.md` to choose the right file.
- Do **not** add minor feature notes to the repository root `README.md`.
- Feature design docs belong under `docs/feature_design/` when warranted.

## CI linters (super-linter / link checker)

Pull requests run **super-linter** on changed files and **lychee** on Markdown links. Apply these **while writing** code and docs so CI passes on the first push:

- **Go (EditorConfig):** tabs in `*.go`; in raw string literals (prompts), nested indented lines use tabs, not spaces.
- **Markdown:** prose lines ≤ **400** characters (MD013); one H1 per file (MD025).
- **Terminology (textlint):** follow `.github/linters/.textlintrc`; do not add conflicting custom terms.
- **Markdown links:** repo-relative paths must resolve from the editing file's directory.
- **OpenAPI YAML:** no trailing whitespace in changed lines; match existing indentation; valid `$ref` / `allOf` patterns.

Full checklist: deployed CI linter rules (`.cursor/rules/ci-super-linter.mdc` after `apm install`).

## SQL performance

- When adding or changing non-trivial SQL in repositories, analyze performance: indexes, joins, filters, expected row counts, N+1 risks.

## Completion

- After substantive changes, propose **one** concise commit message (conventional commits style; see `docs/development_guide.md`).
- For an independent review of your diff, invoke the `apihub-backend-self-review` skill in a **new chat** or with a **different model**.

## Agent packages

One root `apm.yml` covers the repository; deploy with `apm install --target cursor,claude --legacy-skill-paths`
from the root (never `apm compile`). Sources of the local packages are in [`agent-packages/`](agent-packages/).

- `apihub-backend-developer` (skill and rule, local): use for any change to controllers, services, repositories,
  migrations, `main.go` wiring, error codes, or OpenAPI of this service.
- `apihub-backend-self-review` (skill, local): independent review of a finished diff, in a new chat.
- `backend-conventions` (rules, local): config defaults, DB migrations, error codes, OpenAPI files, service wiring;
  they apply when you edit matching files.
- `advanced-verification` (skill, local): after a non-trivial change, run the backend locally and check it with a
  Newman collection.
- `apihub-go-developer` (skill and rule, store): read first for any Go change.
- `apihub-go-self-review` (skill, store): the generic review checklist the backend review builds on.
- `go-conventions` (rules, store): comments, constants and HTTP codes, errors, API-first OpenAPI, migrations, SQL
  performance.
- `apihub-deployment-followup` (skill and rule, root): use after a change to config, env, or the REST contract.
- `postman-e2e-followup` (skill and rule, `tests/`): use after a change to the REST contract.
- `github-ticket-implementation-planner`, `development-conventions`: planning from a ticket; always-on rules.
