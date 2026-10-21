# agents-backend — Agent Instructions

Go service that registers and manages APIHUB discovery agents (`backend/agent`): agent registration, service
discovery results, snapshots, and security checks. It is an optional extension of the portal backend.
Follow the root [`AGENTS.md`](../../AGENTS.md) and the group file [`backend/AGENTS.md`](../AGENTS.md).

## Where the code is

| Area | Location |
|------|----------|
| Entry point and DI wiring | `main.go` |
| Config template (mounted as `config.yaml`) | `config.template.yaml` |
| OpenAPI | `docs/api/Agents-Backend-API.yaml` |
| Image | `Dockerfile`, built with `GOWORK=off` |

## Build and test

Nx project `agents-backend` (inferred by `@nx-go/nx-go`, tag `lang:go`):

```bash
pnpm exec nx run agents-backend:build
pnpm exec nx run agents-backend:test
```

Without Nx, run `go build ./...` and `go test ./...` from this directory (the module is in `go.work`).

## Traps

- It depends on `backend/commons-go`. Keep `go.mod` in sync with the workspace (`go work sync`), because the image
  builds with `GOWORK=off`.
- Tokens and URLs in `config.template.yaml` must match the portal backend `extensions` section, the agent, and the
  Helm and Compose files (`docs/configuration-reference.md`, section 4).
- It has no local APM package. Only the store Go rules apply, so check the Go conventions yourself.
- Contract changes with `backend/agent` (`client/agents_backend.go` there) need both sides updated.

## Agent packages

Local package: none. These store packages reach this path:

- `apihub-go-developer` (skill and rule): use for any Go change here.
- `apihub-go-self-review` (skill): independent review of a finished diff, in a new chat.
- `go-conventions` (rules for `*.go`): comments, constants and HTTP codes, error handling.
- `apihub-deployment-authoring` (skill, root package): use when a change touches Helm, Compose, or the
  configuration reference.
- `apihub-add-go-service` (skill, root package): use to check that the service is wired everywhere.
- `development-conventions`, `github-ticket-implementation-planner`, `english-developer-style`,
  `markdown-line-length-120`: always-on conventions and planning from a ticket.
