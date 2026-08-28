# Java Task Consumer — Design

Status: approved skeleton (plain Java stack, 2026-08-28).

## Goals

Productize Java API analysis as an APIHUB worker microservice, reusing logic from
`qubership-java-diff-service` (PoC, unchanged) via incremental copy into `jdiff-engine`.

## Non-goals (v1)

- Backend implementation (contract spec only)
- Docker image JAR extraction (`DockerImageJarSource` stub)
- HTML/CSV/XLSX renderers (JSON `report.json` only)
- MCP / CLI surfaces

## Stack decision

**Plain Java worker** (not Quarkus): long-running poll loop; dominant cost is japicmp/jdeps/Maven, not HTTP.
Smaller baseline memory than a framework; consistent with PoC `jdiff-core`.

## Components

```
java-task-consumer/
  WorkerMain          — bootstrap, shutdown hook
  TaskPoller          — scheduled poll (one build at a time per instance)
  BuildOrchestrator   — heartbeat + dispatch + result ZIP
  BuildExecutor       — maps buildType → jdiff-engine pipeline
  RegistryClient      — backend HTTP (java.net.http)
  HealthServer        — GET /live (com.sun.net.httpserver)

jdiff-engine/
  pipeline.*          — ApiReport, ApiDiff, UpgradeImpact (from PoC)
  resolve.JarSource   — GavJarSource | DockerImageJarSource (stub)
  japicmp / jdeps     — subprocess runners (from PoC)
  model.DiffReport    — canonical JSON output
```

## Backend contract

Mirrors `build-task-consumer` with a **separate Java task queue**:

| Call | Endpoint | Notes |
|------|----------|-------|
| Poll | `POST /api/v2/java-builders/{builderId}/tasks` | `api-key` header; sysadmin; `204` or ZIP |
| Status | `POST /api/v3/packages/{id}/java-publish/{publishId}/status` | multipart: `status`, `builderId`, `data` or `errors` |

### `config.json`

```json
{
  "publishId": "uuid",
  "packageId": "my-package",
  "buildType": "java-api-report | java-api-diff | java-upgrade-impact",
  "metadata": { }
}
```

#### `java-api-report` metadata

```json
{ "groupId": "com.example", "artifactId": "lib", "version": "1.0.0" }
```

#### `java-api-diff` metadata

```json
{
  "groupId": "com.example",
  "artifactId": "lib",
  "oldVersion": "1.0.0",
  "newVersion": "2.0.0"
}
```

#### `java-upgrade-impact` metadata

```json
{
  "subject": { "type": "gav", "groupId": "...", "artifactId": "...", "version": "..." },
  "upgrades": [
    { "groupId": "org.foo", "artifactId": "bar", "version": "2.0.0" }
  ]
}
```

`subject.type = docker` is accepted in schema but returns `not implemented` until a later story.

### Result

ZIP with single file `report.json` — PoC `DiffReport` envelope.

## Deployment

- **Docker**: `ghcr.io/netcracker/qubership-java-base:21-alpine-*` (Corretto JDK 21), UID 10001, japicmp 0.26.1 at `/opt/jdiff/japicmp.jar`
- **Helm**: `helm/java-task-consumer/` (standalone chart; integrate into `qubership-apihub` umbrella later)
- **Compose**: `docker-compose.yml` + `java-task-consumer.env`

## Scaling

Stateless replicas; each generates its own `builderId` (or `JAVA_BUILDER_ID` env). Backend assigns at most one
task per successful poll (same semantics as existing builders).

## Security

- `api-key` authentication (file mount in K8s)
- Non-root container, read-only root FS, `WORK_DIR` on writable tmp
- No inbound APIs except `/live`
