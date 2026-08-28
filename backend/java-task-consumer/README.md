# qubership-apihub-java-task-consumer

Stateless APIHUB worker for **Java API specification builds**: API inventory, jar-to-jar API diff, and
dependency-upgrade impact analysis. Uses vendored `jdiff-engine` (from `qubership-java-diff-service` PoC)
with **plain Java** (no application framework), **japicmp**, and **jdeps**.

## Architecture

```
apihub-backend (future)  ←── HTTP poll + status ──→  java-task-consumer
                                                          └── jdiff-engine
```

| Build type | Engine pipeline | Tools |
|------------|-----------------|-------|
| `java-api-report` | `ApiReportPipeline` | japicmp (same jar as old+new) |
| `java-api-diff` | `ApiDiffPipeline` | japicmp |
| `java-upgrade-impact` | `UpgradeImpactPipeline` | japicmp + jdeps |

See [docs/DESIGN.md](docs/DESIGN.md), [docs/IMPLEMENTATION-PLAN.md](docs/IMPLEMENTATION-PLAN.md), and
[docs/backend-api.md](docs/backend-api.md) (backend contract).

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

## Container runtime (local)

This workspace uses **Podman** instead of Docker on the developer machine. Use `podman` for
build/run/compose; command shapes match Docker (`podman build`, `podman run`, `podman compose`).

```bash
mvn -q package -DskipTests
podman build -t ghcr.io/netcracker/qubership-apihub-java-task-consumer:dev .
podman compose up --build
```

Health check: `curl http://localhost:3001/live` (compose maps host `3001` → container `3000`).

## Backend API contract (spec only)

| Operation | Method / path |
|-----------|---------------|
| Take task | `POST /api/v2/java-builders/{builderId}/tasks` → `204` or ZIP |
| Status | `POST /api/v3/packages/{packageId}/java-publish/{publishId}/status` |

Task ZIP contains `config.json`. Result ZIP contains `report.json` (`DiffReport` from PoC).

## Image

Runtime base: [`ghcr.io/netcracker/qubership-java-base`](https://github.com/Netcracker/qubership-core-base-images/pkgs/container/qubership-java-base)
(`21-alpine-*`, Amazon Corretto JDK 21, UID 10001). Application image:
`ghcr.io/netcracker/qubership-apihub-java-task-consumer` with japicmp bundled at `/opt/jdiff/japicmp.jar`.

Override base tag at build time: `podman build --build-arg JAVA_BASE_TAG=21-alpine-latest .`
