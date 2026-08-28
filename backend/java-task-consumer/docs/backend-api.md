# Java build API contract (backend specification)

This document describes the HTTP contract between **apihub-backend** and
**java-task-consumer** (JTC). Backend implementation is a separate work track.

JTC mirrors the existing **build-task-consumer** pull-worker pattern with a dedicated Java
build queue.

## Authentication

All requests use the `api-key` header (system access token). Task polling requires sysadmin
privileges (same as `POST /api/v2/builders/{builderId}/tasks` today).

## Endpoints

### Poll for a task

```
POST /api/v2/java-builders/{builderId}/tasks
```

| Response | Meaning |
|----------|---------|
| `204 No Content` | No free tasks |
| `200 OK` | Task assigned; body is `application/zip` |

**Task ZIP** must contain `config.json` at the archive root.

### Post build status

```
POST /api/v3/packages/{packageId}/java-publish/{publishId}/status
Content-Type: multipart/form-data
```

| Field | Required | Values |
|-------|----------|--------|
| `status` | yes | `running`, `complete`, `error` |
| `builderId` | yes | Worker identity from poll |
| `data` | when `complete` | ZIP file (`package.zip`) containing `report.json` |
| `errors` | when `error` | Human-readable error text |

Success response: `204 No Content`.

## `config.json` schema

```json
{
  "publishId": "string",
  "packageId": "string",
  "buildType": "java-api-report | java-api-diff | java-upgrade-impact",
  "metadata": { }
}
```

### `java-api-report`

```json
{
  "gav": "groupId:artifactId:version"
}
```

Or separate fields: `groupId`, `artifactId`, `version`, optional `classifier`.

### `java-api-diff`

```json
{
  "groupId": "com.example",
  "artifactId": "lib",
  "oldVersion": "1.0.0",
  "newVersion": "2.0.0"
}
```

### `java-upgrade-impact`

```json
{
  "subject": {
    "type": "gav",
    "groupId": "com.app",
    "artifactId": "service",
    "version": "1.0.0"
  },
  "upgrades": [
    { "groupId": "org.lib", "artifactId": "core", "version": "2.0.0" }
  ]
}
```

Future `subject.type = docker`:

```json
{
  "type": "docker",
  "imageReference": "ghcr.io/org/app:1.0.0",
  "jarPathInImage": "BOOT-INF/lib/app.jar"
}
```

Not implemented in JTC v1; backend may accept the schema but JTC returns `error`.

## Result ZIP

Single entry: `report.json` — canonical `DiffReport` JSON from jdiff-engine (see PoC
`qubership-java-diff-service`).

## Worker identity

Each JTC instance generates a `builderId` (UUID) on startup, or reads `JAVA_BUILDER_ID`.
Backend must bind a polled task to that `builderId` and validate it on status posts.

## Suggested backend entities

- Separate queue table or `build_type = java` discriminator on existing build tasks
- Store `report.json` (or full ZIP) in object storage / build result table on `complete`
- Expose publish status to UI analogous to existing package publish flow
