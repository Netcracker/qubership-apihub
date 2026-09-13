# qubership-apihub-java-task-consumer

Stateless APIHUB worker for **Java API specification builds**: API inventory, jar-to-jar API diff, and
dependency-upgrade impact analysis. Uses vendored `jdiff-engine` (from `qubership-java-diff-service` PoC)
with **plain Java** (no application framework), **japicmp**, and **jdeps**.

## Architecture

```
libraries-backend  ←── HTTP poll + status ──→  java-task-consumer
                                                      └── jdiff-engine
```

| Build type | Engine pipeline | Tools |
|------------|-----------------|-------|
| `java-api-report` | `ApiReportPipeline` | japicmp (same jar as old+new) |
| `java-api-diff` | `ApiDiffPipeline` | japicmp |
| `java-upgrade-impact` | `UpgradeImpactPipeline` | japicmp + jdeps |

See [docs/DESIGN.md](docs/DESIGN.md), [docs/IMPLEMENTATION-PLAN.md](docs/IMPLEMENTATION-PLAN.md),
[docs/backend-api.md](docs/backend-api.md) (HTTP contract), and
[docs/pact-libraries-backend.md](docs/pact-libraries-backend.md) (Pact provider handoff).

## Modules

| Module | Role |
|--------|------|
| `jdiff-engine` | Analysis engine (PoC code copied incrementally) |
| `java-task-consumer` | Poll loop, backend HTTP client, `/live`, build dispatch |

## Build

```bash
mvn -q verify
```

Fat JAR: `java-task-consumer/target/java-task-consumer-*.jar`

## Run locally

```bash
export APIHUB_BACKEND_ADDRESS=localhost:8080
export APIHUB_API_KEY=<access-token>
java -jar java-task-consumer/target/java-task-consumer-*.jar
```

Health: `GET http://localhost:3000/live`

## Docker

```bash
mvn -q package -DskipTests
podman build -t ghcr.io/netcracker/qubership-apihub-java-task-consumer:dev .
```

Or with compose:

```bash
mvn -q package -DskipTests
podman compose up --build
```

## Helm

```bash
helm upgrade --install jtc ./helm/java-task-consumer \
  --set apihub.backendAddress=qubership-apihub-backend:8080 \
  --set apihub.accessToken=<token>
```

### Private OCI registries (docker subject)

For `java-upgrade-impact` with `subject.type = docker`, mount a Docker `config.json` so the worker
can pull subject images from private registries (daemonless HTTPS pull).

**Option A — existing Secret (recommended):**

```bash
kubectl create secret generic jtc-registry-auth \
  --from-file=config.json=$HOME/.docker/config.json

helm upgrade --install jtc ./helm/java-task-consumer \
  --set apihub.backendAddress=qubership-apihub-backend:8080 \
  --set apihub.accessToken=<token> \
  --set registryAuth.existingSecret=jtc-registry-auth
```

**Option B — inline config (dev/CI only):**

```bash
helm upgrade --install jtc ./helm/java-task-consumer \
  --set apihub.accessToken=<token> \
  --set-file registryAuth.configJson=$HOME/.docker/config.json
```

The chart sets `DOCKER_CONFIG=/etc/secrets/docker` and mounts the secret read-only.

Integrate templates into the umbrella `qubership-apihub` chart in a follow-up step.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `APIHUB_BACKEND_ADDRESS` | (required) | Backend host:port |
| `APIHUB_API_KEY` / `APIHUB_API_KEY_FILE` | (required) | System API key |
| `JAVA_BUILDER_ID` | random UUID | Worker identity for task queue |
| `JOB_REQUEST_INTERVAL` | `3000` | Poll interval (ms) |
| `JOB_STATUS_INTERVAL` | `5000` | Running heartbeat (ms) |
| `HEALTH_PORT` | `3000` | `/live` port |
| `WORK_DIR` | `/tmp/java-task-consumer` | Temp files |
| `JDIFF_JAPICMP_JAR` | `/opt/jdiff/japicmp.jar` | japicmp fat jar path |
| `JDIFF_THREADS` | `4` | Parallelism for upgrade-impact |

For `java-upgrade-impact` with `subject.type = docker`, the worker pulls image layers directly from
the OCI registry (Docker Registry HTTP API V2, no `podman`/`docker` CLI). Images are expected to
follow [qubership-java-base](https://github.com/Netcracker/qubership-core-base-images/pkgs/container/qubership-java-base)
layout (`/app/*.jar`). Private registries: mount Docker config (`DOCKER_CONFIG` or
`~/.docker/config.json`) with registry credentials.

## Container runtime (local)

This workspace uses **Podman** instead of Docker on the developer machine. Use `podman` for
build/run/compose; command shapes match Docker (`podman build`, `podman run`, `podman compose`).

```bash
mvn -q package -DskipTests
podman build -t ghcr.io/netcracker/qubership-apihub-java-task-consumer:dev .
podman compose up --build
```

Health check: `curl http://localhost:3001/live` (compose maps host `3001` → container `3000`).

## Backend API contract

The worker talks to **libraries-backend** (not the main APIHUB backend). HTTP notes:
[docs/backend-api.md](docs/backend-api.md). Pact file and provider verification:
[docs/pact-libraries-backend.md](docs/pact-libraries-backend.md).

| Operation | Method / path |
|-----------|---------------|
| Take task | `POST /api/v2/java-builders/{builderId}/tasks` → `204` or ZIP |
| Status | `POST /api/v3/packages/{packageId}/java-publish/{publishId}/status` |

Task ZIP contains `config.json`. Result ZIP contains `report.json` (`DiffReport` from PoC).

Regenerate the pact file:

```bash
mvn -pl java-task-consumer -am test -Dtest=RegistryClientPactTest -Dsurefire.failIfNoSpecifiedTests=false
```

## Image

Runtime base: [`ghcr.io/netcracker/qubership-java-base`](https://github.com/Netcracker/qubership-core-base-images/pkgs/container/qubership-java-base)
(`21-alpine-*`, Amazon Corretto JDK 21, UID 10001). Application image:
`ghcr.io/netcracker/qubership-apihub-java-task-consumer` with japicmp bundled at `/opt/jdiff/japicmp.jar`.

Override base tag at build time: `podman build --build-arg JAVA_BASE_TAG=21-alpine-latest .`
