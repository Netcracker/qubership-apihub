# APIHub Backend — Agent Instructions

Instructions for AI assistants working on this repository (Cursor, Claude Code, and compatible tools).

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
- **Markdown links:** repo-relative paths must match directory depth (see `.claude/skills/README.md` for nested-copy pitfalls).
- **OpenAPI YAML:** no trailing whitespace in changed lines; match existing indentation; valid `$ref` / `allOf` patterns.

Full checklist: `.cursor/rules/ci-linters.mdc` (and `.claude/rules/ci-linters.md`).

## SQL performance

- When adding or changing non-trivial SQL in repositories, analyze performance: indexes, joins, filters, expected row counts, N+1 risks.

## Completion

- After substantive changes, propose **one** concise commit message (conventional commits style; see `docs/development_guide.md`).
- For an independent review of your diff, invoke the `apihub-self-review` skill in a **new chat** or with a **different model**.

## Project skills (Cursor / Claude)

| Skill | When |
|-------|------|
| `github-ticket-implementation-planner` | Planning from a GitHub issue |
| `apihub-backend-developer` | Implementing backend features, migrations, API changes |
| `apihub-self-review` | Post-implementation review of a diff (explicit invocation) |

Skills live in `.cursor/skills/` (canonical). For Claude Code, see `.claude/skills/README.md`.
