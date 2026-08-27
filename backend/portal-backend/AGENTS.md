# APIHub Backend — Agent Instructions

Instructions for AI assistants working on this repository (Cursor, Claude Code, and compatible tools).

## Traps worth knowing before you start

### Run Go commands from `qubership-apihub-service/`, after generating the lockfile

`go.mod` lives in `qubership-apihub-service/`, not at the repository root. A `go` command run from the root finds
nothing and says so in a way that reads like an empty result rather than a wrong directory.

`go.sum` is gitignored, so a fresh checkout fails every Go command with `missing go.sum entry` until you run
`go mod tidy` once. Do that first in any new checkout or worktree; it takes seconds warm and minutes cold.

Two consequences worth carrying: the regenerated `go.sum` is invisible to `git status`, and a dependency scan run on
two different days can resolve different patch versions — so date any claim that depends on it.

### Never take a build or test result from the end of a pipe

`go build ./... 2>&1 | tail` reports the exit status of `tail`. This exact shape once reported a green build over a
page of `missing go.sum entry` errors. Redirect to a file and check the status of the Go command itself.

### The tree is already red, and know what CI actually covers

`go test ./...` and `go vet ./...` both exit non-zero on the default branch. That is the baseline, not damage you
caused. Capture a baseline run before you change anything and compare against it, rather than attributing a failure
to your work.

What CI does and does not catch:

- **Compilation is covered.** The image build runs `go build`, so a broken build fails the pipeline.
- **Behaviour is covered end to end.** A pull request runs an API-level suite against a deployed stack of several
  services. Collections and charts live in other repositories.
- **The Go unit suite, `go vet`, and Go linting are not run anywhere.** Super-linter has Go validation switched off,
  and no workflow invokes them. So a stale unit test or a vet finding can sit on the branch indefinitely, and your own
  passing pipeline is not evidence that the unit tests pass.

Green CI is weaker than it looks in a second way: at least one job reports success while the tool inside it exits
non-zero, because the reusable workflow sets `continue-on-error`. When a check matters to your conclusion, read the
step log rather than the badge. Those reusable workflows come from another repository at a moving ref, so what gates
a pull request can change without a commit here.

### Registration is not implementation

This codebase has several places where a name promises behaviour that nothing performs: a Prometheus metric that is
registered and never incremented, a collector marked as unused, a configuration key read by a different subsystem
than its name suggests, a documented fallback whose probe tests a different address than the bind, a doc comment
describing a fail-closed path that returns the open value. Before you cite a metric, a config key, a helper name, or
a comment as evidence that something works, find the code that writes it or reads it.

The same caution applies in reverse: check `docs/api/` and the nearest correct sibling implementation before patching
something that looks wrong, because several plausible-looking defects here are deliberate and specified.

### Know which repository owns the answer

The OpenAPI documents under `docs/api/` are normative for the HTTP contract. Helm charts, deployment values, and the
end-to-end suite live in other repositories, so any conclusion about replica counts, resource limits, or E2E coverage
has to be checked there rather than inferred from this tree.

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
- **Fail fast** when state is invalid or required setup failed (`log.Fatalf` in `Service.go` wiring, panic only where the codebase already does for unrecoverable programmer errors).
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
- Avoid OS-specific path separators in instructions; use repo-relative paths like `qubership-apihub-service/...`.

## Related repositories (Helm, E2E tests)

Charts and Postman E2E collections live in **other repos** (not cloned in this workspace by default). When a feature needs them, **remind** the developer with links and concrete follow-ups — see [`docs/agent/related-repositories.md`](docs/agent/related-repositories.md).

Do not silently skip: after REST, config, or env changes, check that doc’s “remind when” lists and include a short **Related repositories** subsection in your completion summary.

## Repository layout (minimal orientation)

| Area | Location |
|------|----------|
| Main service entry / DI wiring | `qubership-apihub-service/Service.go` |
| HTTP controllers | `qubership-apihub-service/controller/` |
| Business logic | `qubership-apihub-service/service/` |
| Data access | `qubership-apihub-service/repository/` |
| DB entities + simple converters | `qubership-apihub-service/entity/` |
| API DTOs / views | `qubership-apihub-service/view/` |
| API error codes | `qubership-apihub-service/exception/ErrorCodes.go` |
| SQL migrations | `qubership-apihub-service/resources/migrations/` |
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
- **New repositories, services, controllers** — register at the **end** of the corresponding block in `Service.go`.
- **`Service.go` fail-fast** — use `log.Fatalf` for fatal wiring/startup errors where applicable.
- **Errors** — propagate and fix root cause; no swallowing, no silent defaults on failure (see **Error handling** above).
- **API errors** — error code and message returned to clients must be constants in `exception/ErrorCodes.go`. AI Chat uses `APIHUB-AI-*` code+Msg pairs; variant messages reuse a parent code (legacy pattern).

## REST API and OpenAPI

- Follow API-first: design/approve API before implementation (see `docs/development_guide.md`).
- Any REST API change **must** update the relevant OpenAPI files under `docs/api/`.
- Avoid breaking public API changes without versioning and deprecation policy.

## Database migrations

- Files live in `qubership-apihub-service/resources/migrations/`.
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

## Project skills (Cursor / Claude)

Project skills and rules are provisioned by APM
(`apm install --target cursor,claude --legacy-skill-paths`); the agent discovers them automatically from
`.cursor/skills/` and `.claude/skills/`. Generic packages come from the
[CI store](https://github.com/Netcracker/qubership-apihub-ci/tree/apm_migration/agent-packages);
backend-specific sources live in [`agent-packages/`](agent-packages/). See
[README — AI agent configuration (APM)](README.md#ai-agent-configuration-apm).
