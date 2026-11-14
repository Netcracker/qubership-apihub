# libraries-backend — Agent Instructions

Go service that tracks external library registries, feeds Java build tasks to `java-task-consumer`, and indexes the
results as an API inventory and version comparisons. Follow the root [`AGENTS.md`](../../AGENTS.md) and
[`backend/AGENTS.md`](../AGENTS.md).

## Where the code is

| Area | Location |
|------|----------|
| Entry point and DI wiring | `main.go` |
| HTTP controllers | `controller/` |
| Business logic | `service/` |
| Data access | `repository/` |
| DB entities and `Make{Name}View` converters | `entity/` |
| API DTOs and enums | `view/` |
| API error codes | `exception/errors.go` |
| `portal-backend` HTTP client | `client/apihub.go` |
| Auth strategies and middleware | `security/`, `secctx/` |
| SQL migrations | `resources/migrations/` |
| Config template (mounted as `config.yaml`) | `config.template.yaml`, parsed into `config/config.go` |
| OpenAPI | `docs/api/LIBRARIES_API.yaml` |
| Schema notes | `docs/data-model.md` |
| Image | `Dockerfile`, built from `backend/` with `GOWORK=off` |

## Where the contract is

| Topic | Location |
|-------|----------|
| HTTP contract the worker expects | `../java-task-consumer/docs/backend-api.md` |
| Pact consumer contract | `../java-task-consumer/pacts/java-task-consumer-libraries-backend.json` |
| Provider handoff notes | `../java-task-consumer/docs/pact-libraries-backend.md` |
| Report shape this service parses | `../java-task-consumer/jdiff-engine/.../model/DiffReport.java`, mirrored in `view/jdiff_report.go` |

## Build and test

Nx project `libraries-backend` (tag `lang:go`):

```bash
pnpm exec nx run libraries-backend:build
pnpm exec nx run libraries-backend:test
```

Or `go build ./...` and `go test ./...` from this directory.

## Traps

- It depends on `backend/commons-go`. Keep `go.mod` in sync with the workspace (`go work sync`), because the image
  builds with `GOWORK=off`. Run `bash tools/ci/go-work-sync-check.sh` from the root after touching dependencies.
- **`view/jdiff_report.go` mirrors a Java record.** When `jdiff-engine`'s `DiffReport`, `ArtifactReport`, or
  `ApiChange` changes, update it in the same change, or ingestion silently drops the new fields.
- **The worker status path is `/api/v3/libraries/{libraryId}/...`**, renamed from `/api/v3/packages/{packageId}/...`.
  Both sides of that rename, including the Pact file and `config.json`'s `libraryId` field, must move together.
- **A comparison has no endpoint.** It is a side effect of a `java-api-diff` build, which `BuildService` queues
  after a successful `java-api-report` when the version has a predecessor. The `changes` endpoints answer `404`
  until then.
- **Only Java has a worker.** `library.language` allows `go` and `js`, but importing a version of one is rejected
  with `LANGUAGE_NOT_SUPPORTED` rather than queueing a task nothing can run.
- Registries are configuration, not data. `RegistryService.SyncFromConfig` runs before the server serves traffic;
  a library's `repository` foreign key only resolves for a configured repository.
- Tokens and URLs in `config.template.yaml` must match the portal backend `extensions` section and the Helm and
  Compose files (`docs/configuration-reference.md`, section 4).
- Search normalisation lives in `repository/common.go`. Indexed text and query text must pass through the same
  expression, or a dotted or hyphenated term never matches.

## Agent packages

Local package: none. These store packages reach this path:

- `apihub-go-developer` (skill and rule): use for any Go change here.
- `apihub-go-self-review` (skill): independent review of a finished diff, in a new chat.
- `go-conventions` (rules for `*.go`): comments, constants and HTTP codes, error handling, API-first OpenAPI,
  migrations, SQL performance.
- `apihub-add-go-service` (skill, root package): use to check that the service is wired everywhere.
- `apihub-deployment-authoring` (skill, root package): use for the Helm and Compose wiring.
- `development-conventions`, `github-ticket-implementation-planner`, `english-developer-style`,
  `markdown-line-length-120`: always-on conventions and planning from a ticket.
