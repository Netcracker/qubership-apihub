# test-service — Agent Instructions

Mock Go microservice for tests. It has no business logic. It exposes REST, GraphQL, and AsyncAPI specifications on
endpoints that follow the APIHUB agent discovery contract, so the agent and the E2E suites have something to
discover. Follow the root [`AGENTS.md`](../../AGENTS.md) and [`backend/AGENTS.md`](../AGENTS.md).

## Where the code is

| Area | Location |
|------|----------|
| Entry point and endpoints | `main.go` |
| Image | `Dockerfile` (`GOWORK=off`) |
| Old Windows build script | `build.cmd` |

## Build and test

Nx project `test-service` (tag `lang:go`):

```bash
pnpm exec nx run test-service:build
pnpm exec nx run test-service:test
```

Or `go build ./...` and `go test ./...` from this directory.

## Traps

- It does not use `commons-go` and builds from its own directory.
- The served specifications are fixtures for `backend/agent` discovery and the Postman E2E collections. Changing a
  path or a document can break `tests/postman-collections` and the agent runners; check both.
- It is a test fixture, not a product service. Do not add production features.
- It has no local APM package; only the store Go rules apply.

## Agent packages

Local package: none. These store packages reach this path:

- `apihub-go-developer` (skill and rule): use for any Go change here.
- `apihub-go-self-review` (skill): independent review of a finished diff, in a new chat.
- `go-conventions` (rules for `*.go`): comments, constants and HTTP codes, error handling.
- `apihub-add-go-service` (skill, root package): use to check how the service is wired into CI and Helm.
- `development-conventions`, `github-ticket-implementation-planner`, `english-developer-style`,
  `markdown-line-length-120`: always-on conventions and planning from a ticket.
