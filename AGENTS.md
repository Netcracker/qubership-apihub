# Qubership APIHUB (monorepo) — Agent Instructions

Instructions for AI assistants working on **qubership-apihub** (Cursor, Claude Code, and compatible tools).

## Repository role

This repository holds the **source code** of the product, its **deployment assets**, and its **documentation**.
The former component repositories (backend, linter, agents, builder, UI, libraries, E2E collections) are modules
of this repository now.

| Area | Path | Notes |
|------|------|-------|
| Go services | `backend/` | `portal-backend` (API Registry), `api-linter-service`, `agents-backend`, `agent`, `test-service`, shared `commons-go`; one `go.work` and one `backend/.go-version` |
| Java | `backend/java-task-consumer`, `backend/libraries-backend` | Maven build under Nx |
| TypeScript | `frontend/` | `ui` (Portal and Agents SPAs), `build-task-consumer` (NestJS builder), and the libraries `api-processor`, `api-diff`, `api-unifier`, `api-doc-viewer`, `ddlapi`, `json-crawl`, and others; one pnpm workspace |
| Tests | `tests/` | `postman-collections` (Newman E2E), `ui-tests` (Playwright) |
| Deployment | `deploy/helm-templates/`, `deploy/docker-compose/` | Helm chart, local Kubernetes quickstart, Compose stacks |
| Documentation | `docs/` | Installation, admin, configuration map, release process |
| Tooling | `tools/` | Release scripts, CI helpers, Nx plugins |
| CI | `.github/` | Workflows, CODEOWNERS, Dependabot |

Work in the module that owns the behaviour. When you change install shape, environment variables, ports, or
mounted files, update the deployment assets and `docs/configuration-reference.md` in the same change.

## Build and test

- **One Nx graph** covers Go, Maven, and TypeScript projects: `pnpm exec nx run <project>:build`,
  `pnpm exec nx run <project>:test`, `pnpm exec nx run-many -t build,test -p <a>,<b>`.
- Go modules are tagged `lang:go` by `tools/nx/go-lang-tag.js`. Images build each module with `GOWORK=off`, so
  keep every `go.mod` in sync with the workspace (`go work sync`; `tools/ci/go-work-sync-check.sh`).
- Release and image logic lives in `tools/release/`; see `docs/development/release-process.md`.
- Use **`gh`** for issues, pull requests, checks, and releases.

## Configuration discipline

- **Helm `values.yaml` and templates** are the canonical Kubernetes contract.
- **`docs/configuration-reference.md`** must stay in sync when knobs, env names, or mount paths change.
- **Compose** reproduces the same logical split; keep tokens and URLs aligned across the backend, linter, and
  agents-backend `config.yaml` files and the builder env (configuration reference, section 4).
- **Extensions**: linter and agents-backend URLs in the backend `extensions` must match how each stack reaches
  those services (cluster DNS or `host.docker.internal`).
- Runtime config authority: `config.template.yaml` mounted as `config.yaml` for the backend, linter, and
  agents-backend; `config.yaml` for the agent; environment only for the builder and the UI.

## Clarification before coding

- Do not change code or deployment files until the requirements are clear. Ask specific questions when scope,
  behavior, or acceptance criteria are ambiguous.
- For bug reports, find the root cause first; do not swallow errors or add silent fallbacks.
- State assumptions explicitly when greenfield and upgrade paths differ.

## Cross-platform development

- Scripts and docs are used on Linux and Windows (WSL, Git Bash, or PowerShell). Provide both `.sh` and `.ps1`
  variants for scripts that developers run by hand.
- Prefer repo-relative paths.

## Documentation

- Write and update technical docs in **English**.
- Markdown prose: **at most 120 characters** per line where the deployed linter applies.
- Update the `docs/README.md` index when you add a significant guide.
- Keep links repo-relative and resolvable from the editing file; avoid trailing whitespace on changed YAML lines.

## Agent packages (APM)

One root `apm.yml` and one `apm.lock.yaml` cover the whole repository. There are no module-level manifests,
lock files, or compiled harness trees. Store packages come from
[`qubership-apihub-ci`](https://github.com/Netcracker/qubership-apihub-ci/tree/main/agent-packages) and
[`qubership-ai-packages`](https://github.com/Netcracker/qubership-ai-packages/tree/main/agent-packages); local
packages live next to the code they describe:

| Location | Packages |
|----------|----------|
| `agent-packages/` | `apihub-deployment-authoring`, `apihub-deployment-followup`, `apihub-add-go-service` |
| `backend/portal-backend/agent-packages/` | `apihub-backend-developer`, `apihub-backend-self-review`, `backend-conventions`, `advanced-verification` |
| `backend/agent/agent-packages/` | `apihub-agent-developer`, `agent-conventions` |
| `frontend/<library>/agent-packages/` | `api-diff-*`, `api-doc-viewer-*`, `next-data-model-*`, `api-processor-*`, `api-unifier-*`, `ddlapi-*`, `json-crawl-*` |
| `frontend/ui/agent-packages/` | `apihub-ui-authoring` |
| `tests/postman-collections/agent-packages/` | `postman-e2e-authoring`, `postman-e2e-followup` |

Every module instruction has an `applyTo` glob that starts with its module path, so it does not apply to another
module. The `*-using` packages are the exception by design: they name the consumer modules too.

After you edit a package, run from the repository root:

```bash
apm install --target cursor,claude --legacy-skill-paths
apm compile --target cursor,claude --legacy-skill-paths
```

Commit the package sources and the deployed `.cursor/` and `.claude/` trees together. Never edit the
deployed trees by hand. The `AGENTS.md` and `CLAUDE.md` files inside modules are hand-written; keep them.

Always-on conventions: `development-conventions`, `english-developer-style`, `markdown-line-length-120`. Adding a
Go service: use the `apihub-add-go-service` skill. See [`agent-packages/README.md`](agent-packages/README.md).
