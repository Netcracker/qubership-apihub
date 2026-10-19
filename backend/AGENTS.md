# backend — Agent Instructions

Group of the server-side modules: Go services, a shared Go library, and the Java build worker. Follow the root
[`AGENTS.md`](../AGENTS.md); the module files below add what is specific to each module.

| Module | What it is | Instructions |
|--------|------------|--------------|
| `portal-backend` | API Registry: the main Go service and its PostgreSQL schema | [AGENTS.md](portal-backend/AGENTS.md) |
| `api-linter-service` | Go service that lints API specifications (Spectral, optional AI) | [AGENTS.md](api-linter-service/AGENTS.md) |
| `agents-backend` | Go service that manages discovery agents | [AGENTS.md](agents-backend/AGENTS.md) |
| `agent` | Go Kubernetes discovery sidecar | [AGENTS.md](agent/AGENTS.md) |
| `test-service` | Mock service that exposes sample specifications | [AGENTS.md](test-service/AGENTS.md) |
| `commons-go` | Shared Go library (`api-spec-exposer`) | [AGENTS.md](commons-go/AGENTS.md) |
| `java-task-consumer` | Maven reactor: Java API build worker and `jdiff-engine` | [AGENTS.md](java-task-consumer/AGENTS.md) |
| `libraries-backend` | Placeholder for the Go service that feeds the Java worker | [AGENTS.md](libraries-backend/AGENTS.md) |

## Shared facts

- One `go.work` and one `backend/.go-version` for all Go modules. Images build each module with `GOWORK=off`, so
  keep every `go.mod` in step with the workspace (`go work sync`).
- Nx infers Go projects (`@nx-go/nx-go`) and tags them `lang:go`; project names are the directory names. Run
  `pnpm exec nx run <module>:build` and `pnpm exec nx run <module>:test` from the repository root.
- Runtime config comes from `config.template.yaml` mounted as `config.yaml` in `portal-backend`,
  `api-linter-service`, and `agents-backend`, and from `config.yaml` in `agent`. When you change a knob, update
  `deploy/` and `docs/configuration-reference.md` in the same change.
- Adding a Go service: use the `apihub-add-go-service` skill.

## Agent packages

Local packages live in `portal-backend/agent-packages/` and `agent/agent-packages/`; the module files list them.
Store packages reach every Go module through their `**/*.go` globs:

- `apihub-go-developer` (skill and rule): use for any Go change.
- `apihub-go-self-review` (skill): independent review of a finished diff, in a new chat.
- `go-conventions` (rules): comments, constants and HTTP codes, errors, migrations, SQL performance.
- `apihub-add-go-service` (skill, root): use to add or check a Go service.
- `apihub-deployment-authoring` and `apihub-deployment-followup` (skills, root): use when a change reaches Helm,
  Compose, or the configuration reference.
