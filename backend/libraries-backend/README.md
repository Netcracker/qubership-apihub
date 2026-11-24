# Libraries backend

Go service that tracks external library registries (Artifactory, Nexus), serves Java build tasks to the
[Java worker](../java-task-consumer/README.md), and turns the worker's results into a browsable API inventory and
version comparison.

A **library** is an artifact this service tracks: a repository plus coordinates, mirroring `portal-backend`'s
`package_group`. Importing a **version** of a library queues a build; the worker resolves the artifact, runs
japicmp and jdeps, and posts back a `report.json`, which this service parses into classes, methods, and changes.

## HTTP surface

The full contract is [`docs/api/LIBRARIES_API.yaml`](docs/api/LIBRARIES_API.yaml). In outline:

| Area | Endpoints |
|------|-----------|
| Registries, repositories | `GET /api/v1/registries`, `GET /api/v1/repositories` — read-only, from the configuration |
| Libraries | `GET`/`POST /api/v1/libraries`, `GET`/`PATCH`/`DELETE /api/v1/libraries/{libraryId}` |
| Versions | `GET`/`POST /api/v1/libraries/{libraryId}/versions`, `GET`/`DELETE .../versions/{version}` |
| Content | `GET .../versions/{version}/classes`, `GET .../versions/{version}/classes/{classId}` |
| Changes | `GET .../versions/{version}/changes`, `.../changes/summary` |
| MCP | `/api/v1/mcp/` — Streamable HTTP MCP server for AI agents, see below |
| Build worker | `POST /api/v2/java-builders/{builderId}/tasks`, `POST /api/v3/libraries/{libraryId}/java-publish/{publishId}/status` |
| Favorites | `GET /api/v1/favorites/libraries`, `PUT`/`DELETE /api/v1/favorites/libraries/{libraryId}` |
| Members | `GET /api/v1/libraries/{libraryId}/members`, `PUT`/`DELETE .../members/{userId}` |
| Search | `GET /api/v1/search/libraries`, `GET /api/v1/search/classes` |

The worker endpoints are the contract in [backend-api.md](../java-task-consumer/docs/backend-api.md), verified by the
[Pact file](../java-task-consumer/pacts/java-task-consumer-libraries-backend.json).

## MCP server

`/api/v1/mcp/` serves the `apihub-libraries-mcp` server over Streamable HTTP. It authenticates with an API key
(`api-key` header) or a personal access token (`X-Personal-Access-Token` header), and every tool applies the same
permission checks as the matching REST endpoint. Tools are defined in `service/MCPService.go`:

| Tool | What it does |
|------|--------------|
| `list_libraries`, `get_library` | Find a library and read its coordinates |
| `create_library` | Start tracking a library from a configured repository |
| `list_library_versions`, `get_library_version` | Imported versions; the build status is in `metadata` |
| `list_available_versions` | Repository versions that are not imported yet |
| `import_library_version` | Import a version and queue its build |
| `list_library_classes`, `get_library_class` | Classes of a version, and one class with its methods |
| `search_classes` | Full-text search over classes and methods |
| `list_changes` | API changes of a version against a previous one |

## How a version gets its content

1. `POST /api/v1/libraries/{libraryId}/versions` answers `202` and queues a `java-api-report` build. The version is
   created in `draft` with the build id in its `metadata`.
2. `java-task-consumer` polls `POST /api/v2/java-builders/{builderId}/tasks` and receives a ZIP holding
   `config.json`.
3. The worker posts `running` heartbeats, then `complete` with a result ZIP (or `error` with a message) to
   `POST /api/v3/libraries/{libraryId}/java-publish/{publishId}/status`.
4. On `complete` the service parses `report.json` into `library_class` and `library_method`, rebuilds the search
   vectors, and moves the version to `release`.
5. If the version has a predecessor, a `java-api-diff` build is queued next. Its result becomes the comparison the
   `changes` endpoints serve. The predecessor is the `previousVersion` of the import request, which must be an
   imported version of the library, or, when the request names none, the latest release of the library. There is
   no endpoint that starts a comparison directly.

A build that goes silent longer than `build.keepaliveTimeoutSeconds` returns to the queue, up to
`build.restartLimit` times, then fails. Poll the version and read `metadata.buildStatus` and `metadata.buildError`
to see how an import ended.

## Identity and permissions

This service keeps no users and no roles. Callers are authenticated against `portal-backend` (JWT, API key, cookie,
or personal access token) and the role catalogue is read from there, so a role means the same thing in both systems.
A caller's permissions on a library are the union of the roles assigned on the library, its `defaultRole`, and
whatever the caller holds on the library's `parentPackageId` package group. A system administrator may do anything.

Creating a library is checked against `parentPackageId`; without one, only a system administrator may create it.

## Configuration

[`config.template.yaml`](config.template.yaml), mounted as `config.yaml` in a folder named by
**`LIBRARIES_CONFIG_FOLDER`**. Every key has a default the code applies when it is absent, except the mandatory
database and APIHUB settings. Registry credentials live here and never reach the database; a library can only be
created in a repository that `registries[]` lists. See
[`docs/configuration-reference.md`](../../docs/configuration-reference.md) for the Helm and Compose counterparts.

## Data model

[`docs/data-model.md`](docs/data-model.md) describes the PostgreSQL schema; the migrations are in
[`resources/migrations/`](resources/migrations/).

## Build and test

Nx project `libraries-backend` (inferred by `@nx-go/nx-go`, tag `lang:go`):

```bash
pnpm exec nx run libraries-backend:build
pnpm exec nx run libraries-backend:test
```

Without Nx, run `go build ./...` and `go test ./...` from this directory (the module is in `go.work`; the image
builds with `GOWORK=off`).

For where the service sits in the platform, see the [architecture overview](../../docs/architecture/overview.md). The
[backend README](../README.md) describes the Go workspace.
