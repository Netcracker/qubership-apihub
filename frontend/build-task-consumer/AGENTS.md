# build-task-consumer — Agent Instructions

NestJS microservice that builds API Registry package versions. It is a REST and task management wrapper around
`api-processor`, delivered as a Docker image and mandatory in the product. The portal backend hands it build
tasks; the worker reaches the backend through `APIHUB_BACKEND_ADDRESS` and `APIHUB_API_KEY`. Follow the root [`AGENTS.md`](../../AGENTS.md) and
[`frontend/AGENTS.md`](../AGENTS.md).

## Where the code is

| Area | Location |
|------|----------|
| Source | `src/` |
| Tests | `test/` |
| REST samples | `rest-collections/` |
| Docs | `docs/` |
| Images | `Dockerfile` (CI), `Dockerfile.local` (local, from a prebuilt tree) |

## Build and test

Nx project `build-task-consumer`, from the repository root:

```bash
pnpm exec nx run build-task-consumer:build
pnpm --filter @netcracker/qubership-apihub-build-task-consumer run start:dev
```

Production image, as CI builds it, from the repository root: `pnpm deploy --filter=./frontend/build-task-consumer
--prod .deploy/build-task-consumer`, then `podman build -f frontend/build-task-consumer/Dockerfile .`. For a
shorter local build use `Dockerfile.local` from this directory; the README describes both. The Jest script is named
`test:fixme` and there is no Nx `test` target.

## Traps

- It is a pnpm workspace member. Never run `npm install` here: it writes a second lock file and resolves the
  `workspace:` ranges from the registry.
- `forceLegacyDeploy` in `pnpm-workspace.yaml` is what makes `pnpm deploy --prod` work; do not remove it.
- Depends on `api-processor` and `api-unifier`; `nx` builds them first.
- Environment only (no config file). Variable changes go to `docs/configuration-reference.md` and the Helm and
  Compose files in the same change.
- It is not a Go service; the Go rules and `apihub-add-go-service` do not apply.

## Agent packages

Local packages: none. These packages reach this path:

- `apihub-deployment-authoring` (skill, root package): use when a change touches environment variables, Helm, or
  Compose for this service.
- `api-processor-using` (skill, `frontend/api-processor`): read by hand when you change how the service calls the
  library; its `applyTo` does not reach this path.
- `development-conventions`, `github-ticket-implementation-planner`, `english-developer-style`,
  `markdown-line-length-120` (always-on conventions and planning from a ticket).
