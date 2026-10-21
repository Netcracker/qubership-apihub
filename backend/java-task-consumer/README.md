# APIHUB Java task consumer

The Java task consumer is a stateless worker for **Java API specification builds**: API inventory, jar-to-jar API diff,
and dependency-upgrade impact analysis. It uses the vendored `jdiff-engine` (from the `qubership-java-diff-service`
proof of concept), plain Java with no application framework, **japicmp**, and **jdeps**. The module is a Maven reactor
and ships the image `qubership-apihub-java-task-consumer`.

The worker polls the libraries backend for tasks and reports their status; it takes no inbound calls. See the
[architecture overview](../../docs/architecture/overview.md) for the whole product and the
[`libraries-backend` placeholder](../libraries-backend/README.md) for the service it talks to.

```text
libraries-backend  <-- HTTP poll + status -->  java-task-consumer
                                                      └── jdiff-engine
```

| Build type | Engine pipeline | Tools |
|------------|-----------------|-------|
| `java-api-report` | `ApiReportPipeline` | japicmp (same jar as old and new) |
| `java-api-diff` | `ApiDiffPipeline` | japicmp |
| `java-upgrade-impact` | `UpgradeImpactPipeline` | japicmp + jdeps |

| Maven module | Role |
|--------------|------|
| `jdiff-engine` | Analysis engine (code from the proof of concept, copied incrementally) |
| `java-task-consumer` | Poll loop, backend HTTP client, `/live`, build dispatch |

## Build, test, and lint

The Nx project `java-task-consumer` runs the whole reactor (`mvn --batch-mode verify`, with all tests). Java 21 and
Maven 3.9 or newer are required. Run from the repository root:

```bash
pnpm exec nx run java-task-consumer:build
```

The shaded jar is `java-task-consumer/target/java-task-consumer-*.jar`. The inferred Maven targets, such as
`pnpm exec nx run com.netcracker.qubership.apihub:jdiff-engine:test`, need `MAVEN_HOME` on Windows. Plain
`mvn -q verify` in this folder works too. The Pact test rewrites `pacts/java-task-consumer-libraries-backend.json`
with new timestamps on every run: restore it with `git checkout -- pacts` unless the contract changed. More:
[Build and test: Java](../../docs/development/build-and-test.md#java).

## Run and debug locally

Run the jar against a libraries backend:

```bash
export APIHUB_BACKEND_ADDRESS=localhost:8080
export APIHUB_API_KEY=<access-token>
java -jar java-task-consumer/target/java-task-consumer-*.jar
```

The health endpoint is `GET http://localhost:3000/live`.

To debug without a backend, run the **Debug JTC scenarios** launch (VS Code, with this folder as the workspace) or
`DebugHarnessMain` (IntelliJ IDEA). It starts the real poll loop with an in-process queue and feeds it the build types
in sequence; details are in [`docs/local-debug.md`](docs/local-debug.md) and
[Debugging: Java worker](../../docs/development/debugging.md#java-worker). The image and Compose file start
`WorkerMain` only, with no harness. For the whole local setup, see
[Run APIHUB locally](../../docs/development/local-run.md#builder-and-java-worker).

### Image and Compose

```bash
mvn -q package -DskipTests
podman build -t ghcr.io/netcracker/qubership-apihub-java-task-consumer:dev .
podman compose up --build
```

`docker` takes the same arguments. Compose maps host port `3001` to the container port `3000`, so the health check
is `curl http://localhost:3001/live`. The runtime base image is `ghcr.io/netcracker/qubership-java-base`
([package page](https://github.com/Netcracker/qubership-core-base-images/pkgs/container/qubership-java-base),
`21-alpine-*`, Amazon Corretto JDK 21, UID 10001), with japicmp at `/opt/jdiff/japicmp.jar`. Override the base tag
with `podman build --build-arg JAVA_BASE_TAG=21-alpine-latest .`.

### Helm

The chart in `helm/java-task-consumer` is not part of the product chart yet.

```bash
helm upgrade --install jtc ./helm/java-task-consumer \
  --set apihub.backendAddress=qubership-apihub-backend:8080 \
  --set apihub.accessToken=<token>
```

For `java-upgrade-impact` with `subject.type = docker`, the worker needs registry credentials to pull subject images
from private registries. Mount a Docker `config.json`; the chart sets `DOCKER_CONFIG=/etc/secrets/docker` and mounts
the secret read-only.

**Option A, an existing Secret (recommended):**

```bash
kubectl create secret generic jtc-registry-auth \
  --from-file=config.json=$HOME/.docker/config.json

helm upgrade --install jtc ./helm/java-task-consumer \
  --set apihub.backendAddress=qubership-apihub-backend:8080 \
  --set apihub.accessToken=<token> \
  --set registryAuth.existingSecret=jtc-registry-auth
```

**Option B, inline config (development and CI only):**

```bash
helm upgrade --install jtc ./helm/java-task-consumer \
  --set apihub.accessToken=<token> \
  --set-file registryAuth.configJson=$HOME/.docker/config.json
```

## Configuration

The worker reads environment variables; [`java-task-consumer.env`](java-task-consumer.env) is the Compose example.

| Variable | Default | Description |
|----------|---------|-------------|
| `APIHUB_BACKEND_ADDRESS` | (required) | Backend host:port |
| `APIHUB_API_KEY` / `APIHUB_API_KEY_FILE` | (required) | System API key |
| `JAVA_BUILDER_ID` | random UUID | Worker identity for the task queue |
| `JOB_REQUEST_INTERVAL` | `3000` | Poll interval (ms) |
| `JOB_STATUS_INTERVAL` | `5000` | Running heartbeat (ms) |
| `HEALTH_PORT` | `3000` | `/live` port |
| `WORK_DIR` | `/tmp/java-task-consumer` | Temp files |
| `JDIFF_JAPICMP_JAR` | `/opt/jdiff/japicmp.jar` | japicmp fat jar path |
| `JDIFF_THREADS` | `4` | Parallelism for upgrade-impact |

For `java-upgrade-impact` with `subject.type = docker`, the worker pulls image layers straight from the OCI registry
(Docker Registry HTTP API V2, no `podman` or `docker` CLI). The images are expected to follow the
[qubership-java-base](https://github.com/Netcracker/qubership-core-base-images/pkgs/container/qubership-java-base)
layout (`/app/*.jar`) or the Quarkus fast-jar layout (`/app/app`, `/app/lib`). Library versions come from
`pom.properties` in the image; Maven resolves the upgrade-target JARs, not the POM of the subject. For private
registries, mount Docker config (`DOCKER_CONFIG` or `~/.docker/config.json`) with the registry credentials.

## API specifications

The worker talks to the **libraries backend**, not to the main APIHUB backend. The HTTP notes are in
[`docs/backend-api.md`](docs/backend-api.md); the Pact file and the provider verification are in
[`docs/pact-libraries-backend.md`](docs/pact-libraries-backend.md).

| Operation | Method and path |
|-----------|-----------------|
| Take task | `POST /api/v2/java-builders/{builderId}/tasks`: `204` or a ZIP |
| Status | `POST /api/v3/packages/{packageId}/java-publish/{publishId}/status` |

The task ZIP contains `config.json`. The result ZIP contains `report.json` (`DiffReport` from the proof of concept).
Regenerate the Pact file with:

```bash
mvn -pl java-task-consumer -am test -Dtest=RegistryClientPactTest -Dsurefire.failIfNoSpecifiedTests=false
```

## Further reading

- [Design](docs/DESIGN.md)
- [Implementation plan](docs/archive/IMPLEMENTATION-PLAN.md) (archived)
- [Backend API](docs/backend-api.md) and [Pact handoff](docs/pact-libraries-backend.md)
- [Local debug harness](docs/local-debug.md)
