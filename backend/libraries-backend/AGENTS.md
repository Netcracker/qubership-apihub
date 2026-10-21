# libraries-backend — Agent Instructions

Placeholder for the Go service that will serve Java library builds to `java-task-consumer`. The directory holds
only `README.md` and `LICENSE`. There is no `go.mod`, no code, and it is not in `go.work`, in the Nx graph, or in
CI yet. Follow the root [`AGENTS.md`](../../AGENTS.md) and [`backend/AGENTS.md`](../AGENTS.md).

## Where the contract is

| Topic | Location |
|-------|----------|
| HTTP contract the worker expects | `../java-task-consumer/docs/backend-api.md` |
| Pact consumer contract | `../java-task-consumer/pacts/java-task-consumer-libraries-backend.json` |
| Provider handoff notes | `../java-task-consumer/docs/pact-libraries-backend.md` |

## Build and test

Nothing builds here yet. When the module is created, use the `apihub-add-go-service` skill. It lists every place
that names a service: `go.work`, `backend/.go-version`, the `Dockerfile`, `config.template.yaml`, the CI image
matrix, release registration, CODEOWNERS, Dependabot, Helm, Compose, and `docs/configuration-reference.md`.

## Traps

- Do not create a partial module. A `go.mod` without the wiring breaks the `GOWORK=off` image build and the release
  graph.
- The provider must satisfy the Pact file under `java-task-consumer/pacts/`.

## Agent packages

Local package: none. These packages reach this path:

- `apihub-add-go-service` (skill and rule, root package): use first, when creating the module.
- `apihub-go-developer` (skill and rule): use for Go code once the module exists.
- `apihub-go-self-review` (skill): independent review of a finished diff, in a new chat.
- `go-conventions` (rules for `*.go`): comments, constants and HTTP codes, error handling.
- `apihub-deployment-authoring` (skill, root package): use for the Helm and Compose wiring.
- `development-conventions`, `github-ticket-implementation-planner`, `english-developer-style`,
  `markdown-line-length-120`: always-on conventions and planning from a ticket.
