# Backend

The server-side modules of APIHUB: five Go services, a shared Go library, a Java build worker, and a placeholder for
the Go service that will feed the worker. Each module has its own README and `AGENTS.md`. For the architecture, see
the [overview](../docs/architecture/overview.md).

## Modules

| Module | Ships | Old repository |
|--------|-------|----------------|
| [`portal-backend`](portal-backend/README.md) | Image `qubership-apihub-backend`: the API Registry, the REST API, and the PostgreSQL schema | `qubership-apihub-backend` |
| [`api-linter-service`](api-linter-service/README.md) | Image: lints API specifications with Spectral, optionally with AI | `qubership-api-linter-service` |
| [`agents-backend`](agents-backend/README.md) | Image: manages the discovery agents | `qubership-apihub-agents-backend` |
| [`agent`](agent/README.md) | Image and the `qubership-apihub-agent` Helm chart: the Kubernetes discovery sidecar | `qubership-apihub-agent` |
| [`test-service`](test-service/README.md) | Image: a mock service that exposes sample specifications | `qubership-apihub-test-service` |
| [`commons-go`](commons-go/README.md) | Go library `api-spec-exposer`; no image or package; releases are tags only | `qubership-apihub-commons-go` |
| [`java-task-consumer`](java-task-consumer/README.md) | Image: the Maven reactor with the Java API build worker and `jdiff-engine` | `qubership-apihub-java-task-consumer` |
| [`libraries-backend`](libraries-backend/README.md) | Nothing yet: a placeholder for the Go service that serves Java library builds to the worker | `qubership-apihub-libraries-backend` |

Tags and release rules are in the [release process](../docs/development/release-process.md).

## Go workspace

All Go modules share one workspace.

- `go.work` at the repository root lists `agent`, `agents-backend`, `api-linter-service`, `commons-go`,
  `portal-backend`, and `test-service`.
- `backend/.go-version` holds the Go version of every module. The `go` line of `go.work` and CI use the same value.
- `portal-backend`, `api-linter-service`, and `agents-backend` import `commons-go` through
  `replace github.com/Netcracker/qubership-apihub/backend/commons-go => ../commons-go` in their `go.mod`.
- Image builds run one module at a time with `GOWORK=off`, because a builder stage copies one module and no
  `go.work`. Keep every `go.mod` and `go.sum` at the versions the workspace resolves: run `go work sync` after you
  change a dependency.
- Check it with `bash tools/ci/go-work-sync-check.sh`. CI runs the same check; see [tools](../tools/README.md).
- Nx infers a project for each Go module (`@nx-go/nx-go`), names it after the directory, and tags it `lang:go`.

To add a Go service, use the `apihub-add-go-service` skill. It lists every place that names a service.

## Java and Maven

`java-task-consumer` is a Maven reactor with two modules, `java-task-consumer` and `jdiff-engine`. It needs Java 21 and
Maven 3.9 or newer. Nx infers its targets with `@nx/maven`, so `pnpm exec nx run java-task-consumer:build` runs
`mvn --batch-mode verify`. On Windows, set `MAVEN_HOME` to the Maven folder, or the inferred targets fail. The
repository patches `@nx/maven` for backslash paths. The reactor is one release group with tag-only versions.

## Shared Go conventions

These rules apply to every Go module. The rest is in the guide of the module, such as the
[`portal-backend` development guide](portal-backend/docs/development_guide.md).

- Pass required parameters as separate arguments. Pass optional ones in a struct, as in
  `getOperation(packageId, version, operationId, searchReq)`.
- Log the major operations and events at INFO, not every read request. Log every write request.
- Log every error at ERROR.
- Log the start of an asynchronous operation at INFO with the request data and the generated ID. Prefix every log line
  of that operation with the ID, and log its end at INFO.
- Keep runtime configuration in `config.template.yaml`, mounted as `config.yaml`, in `portal-backend`,
  `api-linter-service`, and `agents-backend`. The `agent` reads `config.yaml`. When you change a knob, update
  `deploy/` and the [configuration reference](../docs/configuration-reference.md) in the same change.
- Name commits with Conventional Commits and squash on merge; see the [workflow](../docs/development/workflow.md).

## Follow-up in other modules

A backend change often needs a matching change elsewhere. Make it in the same pull request.

| The change adds or alters | Update |
|---------------------------|--------|
| Environment variables, secrets, config keys, ports, probes, resource limits, background jobs, mounts, optional components | [`deploy/helm-templates/`](../deploy/helm-templates/), [`deploy/docker-compose/`](../deploy/docker-compose/), and the [configuration reference](../docs/configuration-reference.md) |
| REST endpoints, request or response shapes, status codes, auth rules, error codes | the Newman collections in [`tests/postman-collections/`](../tests/postman-collections/), and the OpenAPI specification of the module |
| Visible behavior of the REST API that the SPAs call | [`frontend/ui/`](../frontend/ui/) and [`tests/ui-tests/`](../tests/ui-tests/) |
| Build tasks that the builder reads | [`frontend/build-task-consumer/`](../frontend/build-task-consumer/) |
| The `extensions` that call the linter or agents-backend | `api-linter-service`, `agents-backend`, and the URLs in every stack |

## Build, test, and debug

- [Build and test](../docs/development/build-and-test.md): the Nx targets of every module.
- [Run APIHUB locally](../docs/development/local-run.md): the Compose and Kubernetes stacks.
- [Debugging](../docs/development/debugging.md): breakpoints in the Go services and the Java worker.
