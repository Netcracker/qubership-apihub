# commons-go — Agent Instructions

Shared Go library for the APIHUB services. It currently holds one package, `api-spec-exposer` (discovery and
exposure of a service's own API specifications). The module path is
`github.com/Netcracker/qubership-apihub/backend/commons-go`.
Follow the root [`AGENTS.md`](../../AGENTS.md) and [`backend/AGENTS.md`](../AGENTS.md).

## Where the code is

| Area | Location |
|------|----------|
| API specification exposer | `api-spec-exposer/` (`exposer.go`, `exposer_test.go`, `README.md`) |
| Local build scripts | `build.sh`, `build.cmd` |

## Build and test

Nx project `commons-go` (library, tag `lang:go`):

```bash
pnpm exec nx run commons-go:test
```

Or `go test ./...` from this directory. `build.sh` and `build.cmd` are the old per-repository scripts; prefer Nx.

## Traps

- Consumers are `portal-backend`, `api-linter-service`, and `agents-backend`. `agent` and `test-service` do not use
  it. A change to a public function can break any of them: build the consumers too
  (`pnpm exec nx run-many -t build -p portal-backend,api-linter-service,agents-backend`).
- The module path changed in the monorepo. Old `go get` paths of the polyrepo do not resolve.
- Its `go.mod` must stay in sync with the workspace (`go work sync`).
- Tags `commons-go/X.Y.Z` are release tags of the component, not Go module versions.

## Agent packages

Local package: none. These store packages reach this path:

- `apihub-go-developer` (skill and rule): use for any Go change here.
- `apihub-go-self-review` (skill): independent review of a finished diff, in a new chat.
- `go-conventions` (rules for `*.go`): comments, constants and HTTP codes, error handling.
- `apihub-add-go-service` (skill, root package): use when a new service starts to depend on this library.
- `development-conventions`, `github-ticket-implementation-planner`, `english-developer-style`,
  `markdown-line-length-120`: always-on conventions and planning from a ticket.
