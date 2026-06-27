# Qubership APIHUB — installation and deployment

This guide covers **Docker Compose** (local/bare-metal), **Helm on Kubernetes**, and the **local-k8s quickstart**. For the source-of-truth hierarchy (which service reads a YAML file, which reads env vars, and how Helm is the canonical K8s contract), see [Configuration reference](./configuration-reference.md).

---

## Table of contents

- [Third-party dependencies](#third-party-dependencies)
- [Hardware sizing](#hardware-sizing)
- [Configuration model per service](#configuration-model-per-service)
- [Docker Compose](#docker-compose)
  - [Minimal required parameters](#minimal-required-parameters)
  - [Full parameter reference per container](#full-parameter-reference-per-container)
- [Helm (Kubernetes)](#helm-kubernetes)
  - [Minimal values.yaml to fill](#minimal-valuesyaml-to-fill)
  - [Full Helm parameter reference](#full-helm-parameter-reference)
- [Local Kubernetes quickstart](#local-kubernetes-quickstart)

---

## Third-party dependencies

| Name | Version | Required | Notes |
|------|---------|----------|-------|
| **PostgreSQL** | 14+ | Yes | Three logical databases required: `apihub_backend`, `api_linter`, `agents_backend` (names are configurable). Pre-create them before first start — see `scripts/init-db/init.sql` in the Compose folder. |
| **S3-compatible storage** | Any | Optional | Offloads build artefacts; reduces PG growth. Configure under `s3Storage` in backend `config.yaml` / Helm values. |
| **SAML / OIDC identity provider** | Any | Optional | Required when `security.productionMode: true`. Keycloak example: [`docker-compose/with-keycloak/`](../docker-compose/with-keycloak/). |
| **LDAP** | Any | Optional | User directory sync when federated login is active (`security.ldap` in backend config). |

---

## Hardware sizing

Defaults in `values.yaml` and `docker-compose.yml` are enough for sandboxes. For production:

|     | CPU request / limit | RAM request / limit |
|-----|---------------------|---------------------|
| **Backend** (dev/sandbox) | 100m / 1 | — / 512Mi |
| **Backend** (production) | ~3 / up to ~11 | ~3Gi / 3Gi |
| **Builder** (any) | 100m / 1.25 | 750Mi / 4200Mi; scale with replicas (3–6 for load) |
| **UI** | 30m / 1 | 64Mi / 256Mi |
| **Linter** | 30m / 1.25 | 150Mi / 1000Mi |
| **Agents backend** | 30m / 1 | 256Mi / 256Mi |
| **PostgreSQL** (Compose) | 1 | 3GB (tuned in `docker-compose.yml`) |

---

## Configuration model per service

| Service | Boot configuration | Key env var(s) |
|---------|-------------------|----------------|
| **qubership-apihub-backend** | **`config.yaml`** (path set by `APIHUB_CONFIG_FOLDER`, default `./`) | `APIHUB_CONFIG_FOLDER`, `LOG_LEVEL`, `GOMEMLIMIT` |
| **qubership-apihub-ui** | Env vars only | `APIHUB_BACKEND_ADDRESS`, `APIHUB_NC_SERVICE_ADDRESS`, `API_LINTER_SERVICE_ADDRESS`, `APIHUB_AGENTS_BACKEND_ADDRESS` |
| **qubership-apihub-build-task-consumer** | Env vars only | `APIHUB_BACKEND_ADDRESS`, `APIHUB_API_KEY`, `LOG_LEVEL`, `FOLDER_STORE`, `OPERATIONS_BUILD_BATCH` |
| **qubership-api-linter-service** | **`config.yaml`** (path set by `LINTER_CONFIG_FOLDER`) | `LINTER_CONFIG_FOLDER`, `LOG_LEVEL`, `GOMEMLIMIT` |
| **qubership-apihub-agents-backend** | **`config.yaml`** (path set by `AGENTS_BACKEND_CONFIG_FOLDER`) | `AGENTS_BACKEND_CONFIG_FOLDER`, `LOG_LEVEL`, `GOMEMLIMIT` |
| **qubership-apihub-agent** *(K8s, optional)* | **`config.yaml`** (same pattern as backend) | `APIHUB_CONFIG_FOLDER` |

**Helm:** `qubershipApihubBackend.env`, `qubershipApiLinterService.env`, and `qubershipApihubAgentsBackend.env` in `values.yaml` are each serialised as YAML into a per-service Secret `config.yaml`, mounted under `/app/<service>/etc/`. The UI and builder receive env vars injected directly by Deployment templates.

---

## Docker Compose

### Layout

| Folder | Use case |
|--------|----------|
| [`docker-compose/apihub-generic/`](../docker-compose/apihub-generic/) | Full stack + bundled PostgreSQL. Recommended for local development and demos. |
| [`docker-compose/with-keycloak/`](../docker-compose/with-keycloak/) | Same stack + Keycloak pre-configured for SAML and OIDC. |

**Prerequisites:**
- **Podman with compose plugin** (`podman compose up`). Docker Compose also works.
- On **Windows**: add `127.0.0.1 host.docker.internal` to `hosts` file.
- `openssl` for JWT key generation (used by `generate_jwt_pkey.sh`).
- `envsubst` (GNU gettext) only needed when using `generate_env_and_up_compose.sh`.

### Quick start — one command

```bash
# Generates JWT key, random admin/token, substitutes placeholders, starts all containers
./docker-compose/apihub-generic/generate_env_and_up_compose.sh
```

⚠️ This script **overwrites** template files in-place (`.env` files + every `*-config.yaml`). Stash or branch before running if you want reproducibility.

After start: <http://localhost:8081/login> — Portal UI.

### Published ports (generic compose)

| Host port | Service | Purpose |
|-----------|---------|---------|
| **8081** | `qubership-apihub-ui` | Portal (browser entry point) |
| **8090** | `qubership-apihub-backend` | Backend REST API (builder reaches it via `host.docker.internal:8090`) |
| **8091** | `qubership-api-linter-service` | Linter API |
| **8092** | `qubership-apihub-agents-backend` | Agents backend API |
| 5432 | `postgres` | PostgreSQL |
| 47375–47376 | `qubership-apihub-backend` | Prometheus metrics / Olric cluster ports |

---

### Minimal required parameters

Below is the minimum you must fill to get a running stack. Everything else has working defaults.

#### `qubership-apihub-backend-config.yaml` (backend)

```yaml
database:
  host: 'host.docker.internal'   # PostgreSQL host visible from container
  port: 5432
  name: 'apihub_backend'
  username: 'apihub_backend_user'
  password: 'apihub_backend_password'

security:
  productionMode: false           # set true when using SSO only; local login disabled when true
  jwt:
    privateKey: '<base64-encoded PKCS#8 RSA private key>'  # generate with generate_jwt_pkey.sh
  apihubExternalUrl: 'http://localhost:8081'  # browser-visible Portal URL

zeroDayConfiguration:
  accessToken: '<any random string, ≥ 30 characters>'  # system API token — copy to other services
  adminEmail: 'admin@example.com'   # local admin auto-created on first boot (productionMode: false)
  adminPassword: 'changeme'

extensions:
  - name: api-linter
    baseUrl: 'http://host.docker.internal:8091'
    pathPrefix: api-linter
  - name: agents-backend
    baseUrl: 'http://host.docker.internal:8092'
    pathPrefix: agents-backend
```

> **JWT key generation:**
> ```bash
> ./docker-compose/apihub-generic/generate_jwt_pkey.sh
> # outputs base64 value to ./jwt_private_key
> ```

#### `qubership-apihub-build-task-consumer.env` (builder)

```ini
APIHUB_BACKEND_ADDRESS=host.docker.internal:8090
APIHUB_API_KEY=<same value as zeroDayConfiguration.accessToken>
```

#### `qubership-api-linter-service-config.yaml` (linter)

```yaml
database:
  host: 'host.docker.internal'
  port: 5432
  name: 'api_linter'
  username: 'api_linter_user'
  password: 'api_linter_password'
technicalParameters:
  apihub:
    url: 'http://host.docker.internal:8081'
    accessToken: '<same value as zeroDayConfiguration.accessToken>'
```

#### `qubership-apihub-agents-backend-config.yaml` (agents backend)

```yaml
database:
  host: 'host.docker.internal'
  port: 5432
  name: 'agents_backend'
  username: 'agents_backend_user'
  password: 'agents_backend_password'
technicalParameters:
  apihub:
    url: 'http://host.docker.internal:8081'
    accessToken: '<same value as zeroDayConfiguration.accessToken>'
```

#### `qubership-apihub-ui.env` (portal UI)

Defaults already work for the generic compose network — only change if you rename container aliases:

```ini
APIHUB_BACKEND_ADDRESS=qubership-apihub-backend:8080
APIHUB_NC_SERVICE_ADDRESS=qubership-apihub-backend:8080
API_LINTER_SERVICE_ADDRESS=qubership-api-linter-service:8080
APIHUB_AGENTS_BACKEND_ADDRESS=qubership-apihub-agents-backend:8080
```

> There is **no `APIHUB_URL` in the UI env file** — the public URL is `security.apihubExternalUrl` in the backend config.

---

### Full parameter reference per container

#### qubership-apihub-backend

Configuration is via **`config.yaml`** (path: `APIHUB_CONFIG_FOLDER`). The annotated full template: [`config.template.yaml`](https://github.com/Netcracker/qubership-apihub-backend/blob/develop/qubership-apihub-service/config.template.yaml).

Process-level env vars (the only ones the backend binary reads directly):

| Env var | Mandatory | Default | Description |
|---------|-----------|---------|-------------|
| `APIHUB_CONFIG_FOLDER` | No | `./` | Directory where the process looks for `config.yaml` |
| `LOG_LEVEL` | No | `INFO` | Bootstrap log level. Values: `DEBUG`, `INFO`, `WARN`, `ERROR` |
| `GOMEMLIMIT` | No | `410MiB` (Helm default); `800MiB` (Compose) | Go runtime memory soft limit. Keep below the container memory limit (~80% of limit in chart/Compose defaults). Helm: `qubershipApihubBackend.goMemLimit`. Compose: `docker-compose.yml` `environment`. |

**Custom CA certificates (HTTPS outbound):** from backend and linter releases with
[qubership-core-base](https://github.com/Netcracker/qubership-core-base-images), mount PEM files at **`/tmp/cert`**
(Compose: **`./certs:/tmp/cert:ro`** on backend, linter, and agents-backend; Helm: **`*.customCa`** values).
The base image entrypoint imports them into the system trust store before the process starts.
MinIO/S3 endpoint CA stays in **`s3Storage.crt`** in `config.yaml`.
See [Configuration reference — custom CA Secret](./configuration-reference.md#custom-ca-kubernetes-secret-helm).

All other parameters are `config.yaml` keys. Most important:

| `config.yaml` key | Mandatory | Default | Description |
|-------------------|-----------|---------|-------------|
| `database.host` | Yes | `localhost` | PostgreSQL host |
| `database.port` | Yes | `5432` | PostgreSQL port |
| `database.name` | Yes | `apihub` | Database name (must be pre-created) |
| `database.username` | Yes | `apihub` | Database user |
| `database.password` | Yes | `apihub` | Database password |
| `security.productionMode` | No | `true` | `false` allows local APIHUB account login; `true` requires IdP |
| `security.jwt.privateKey` | Yes | — | PKCS#8 RSA private key, base64-encoded (≥2048 bit, ≤4096 bit) |
| `security.jwt.accessTokenDurationSec` | No | `1800` | JWT access token TTL (seconds) |
| `security.jwt.refreshTokenDurationSec` | No | `43200` | JWT refresh token TTL (seconds) |
| `security.apihubExternalUrl` | Yes | — | Public URL of the Portal (e.g. `https://apihub.example.com`) |
| `security.allowedHostsForProxy` | No | `[]` | Hosts allowed in REST playground proxy requests |
| `security.allowedOrigins` | No | `[]` | Extra CORS origins (dev only; empty on prod) |
| `security.autoLogin` | No | `false` | Auto-redirect to IdP, skip APIHUB login page |
| `security.legacySaml` | No | `true` | Backward-compat workaround for SAML upgrade path; scheduled for removal |
| `security.externalIdentityProviders[]` | No | `[]` | SAML / OIDC provider list (see template for full structure) |
| `security.ldap.server` | No | — | LDAP URL for user sync (e.g. `ldap://ldap.example.com:389`) |
| `security.ldap.user` | No | — | LDAP bind user |
| `security.ldap.password` | No | — | LDAP bind password |
| `security.ldap.baseDN` | No | — | LDAP base DN |
| `security.ldap.organizationUnit` | No | — | LDAP OU |
| `security.ldap.searchBase` | No | — | LDAP search base |
| `zeroDayConfiguration.accessToken` | Yes | — | System API token provisioned on first boot (minimum 30 characters). Must match `APIHUB_API_KEY` / `APIHUB_ACCESS_TOKEN` in all other services. |
| `zeroDayConfiguration.adminEmail` | Yes | — | Local admin login auto-created on first boot |
| `zeroDayConfiguration.adminPassword` | Yes | — | Local admin password |
| `technicalParameters.basePath` | No | `.` | Base path for binary and static files |
| `technicalParameters.listenAddress` | No | `:8080` | Backend HTTP listen address |
| `technicalParameters.apiSpecDirectory` | No | `basePath + "/api"` | Directory containing API specifications for exposure |
| `technicalParameters.migrationLockMaxWaitMinutes` | No | `30` | Max wait time (minutes) for lock release during migration restart |
| `technicalParameters.ephemeralFileDirectory` | No | `/tmp/apihub-ephemeral-files` | Base directory for ephemeral (temporary) file storage |
| `businessParameters.externalLinks` | No | `[]` | Links shown under (i) button in UI |
| `businessParameters.releaseVersionPattern` | No | `.*` | Regular expression for release name validation |
| `businessParameters.publishArchiveSizeLimitMb` | No | `50` | Max upload archive size (MB) |
| `businessParameters.publishFileSizeLimitMb` | No | `15` | Max single file size inside archive (MB) |
| `businessParameters.templateSizeLimitMb` | No | `1` | Max operation group template size (MB) |
| `businessParameters.shareabilityReportSizeLimitMb` | No | `10` | Max shareability report XLSX size (MB) |
| `businessParameters.systemNotification` | No | — | Banner text shown to all Portal users (e.g. maintenance window) |
| `businessParameters.failBuildOnBrokenRefs` | No | `true` | Fail package build if file references can't be resolved |
| `businessParameters.defaultWorkspaceId` | No | — | Default workspace for Agents UI |
| `businessParameters.ephemeralFileMaxSizeMb` | No | `50` | Max size (MB) for ephemeral (temporary) files |
| `businessParameters.ephemeralFileTTLMinutes` | No | `30` | TTL (minutes) for ephemeral files before they expire |
| `monitoring.enabled` | No | `false` | Create Prometheus `ServiceMonitor` CRD |
| `s3Storage.enabled` | No | `false` | Enable S3 for build artefact offload |
| `s3Storage.url` | No | — | S3 endpoint URL |
| `s3Storage.username` | No | — | S3 access key ID |
| `s3Storage.password` | No | — | S3 secret key |
| `s3Storage.crt` | No | — | S3 CA certificate (base64) |
| `s3Storage.bucketName` | No | — | S3 bucket name |
| `s3Storage.storeOnlyBuildResult` | No | `false` | Store only processed results (not source archives) in S3 |
| `olric.discoveryMode` | No | `local` | Olric cluster discovery: `local` (single pod), `lan` (K8s multi-pod) |
| `olric.replicaCount` | No | `1` | Olric replica count (Helm patches automatically from `replicas`) |
| `olric.namespace` | No | — | K8s namespace for Olric discovery (Helm patches automatically) |
| `cleanup.revisions.schedule` | No | `0 21 * * 0` | Cron for old revision cleanup |
| `cleanup.revisions.ttlDays` | No | `365` | Revisions older than this are eligible for deletion |
| `cleanup.revisions.deleteLastRevision` | No | `false` | Also delete the last revision of a version |
| `cleanup.revisions.deleteReleaseRevisions` | No | `false` | Also delete revisions with `release` status |
| `cleanup.comparisons.schedule` | No | `0 5 * * 0` | Cron for old ad-hoc comparison cleanup |
| `cleanup.comparisons.ttlDays` | No | `30` | Ad-hoc comparisons TTL (days) |
| `cleanup.comparisons.timeoutMinutes` | No | `360` | Max runtime for comparison cleanup job |
| `cleanup.softDeletedData.schedule` | No | `0 22 * * 5` | Cron for soft-deleted data purge |
| `cleanup.softDeletedData.ttlDays` | No | `730` | Soft-deleted data TTL (days) |
| `cleanup.softDeletedData.timeoutMinutes` | No | `600` | Max runtime |
| `cleanup.unreferencedData.schedule` | No | `0 15 * * 6` | Cron for unreferenced data cleanup |
| `cleanup.unreferencedData.timeoutMinutes` | No | `360` | Max runtime |
| `cleanup.maintenanceVacuum.schedule` | No | `0 2 * * 1` | Cron for maintenance vacuum job (`VACUUM FULL ANALYZE`) |
| `cleanup.maintenanceVacuum.timeoutMinutes` | No | `300` | Max runtime for maintenance vacuum phase |
| `cleanup.builds.schedule` | No | `0 1 * * 0` | Cron for build table cleanup |
| `cleanup.ephemeralFiles.schedule` | No | `*/5 * * * *` | Cron for ephemeral files cleanup |
| `ai.mcp.workspace` | No | — | Default workspace for MCP integration |
| `ai.chat.enabled` | No | `false` | Master kill-switch for AI chat routes and retention job |
| `ai.chat.retentionDays` | No | `30` | Chat retention period (days) |
| `ai.chat.pinnedForeverCount` | No | `10` | Number of pinned chats kept indefinitely |
| `ai.chat.compactAtContextPercent` | No | `80` | Context usage threshold (%) to trigger chat compaction |
| `ai.chat.cleanupSchedule` | No | `15 3 * * *` | Cron for chat retention cleanup |
| `ai.chat.openAI.apiKey` | Cond. | — | OpenAI API key for AI chat feature (required when `ai.chat.enabled: true`) |
| `ai.chat.openAI.model` | No | `gpt-4o` | OpenAI model (e.g. `gpt-5`) |
| `ai.chat.openAI.proxyURL` | No | — | HTTP proxy for OpenAI requests |
| `ai.chat.openAI.temperature` | No | `1.0` | Model temperature (0.0–2.0) |
| `ai.chat.openAI.reasoningEffort` | No | `medium` | Reasoning depth for o-series / gpt-5: `minimal` / `low` / `medium` / `high` |
| `ai.chat.openAI.verbosity` | No | `medium` | Response verbosity: `low` / `medium` / `high` |
| `extensions[]` | No | see values | List of sidecar extensions. Each entry: `name`, `baseUrl`, `pathPrefix`. Defaults wire linter + agents-backend. |
| `featureFlags.useV3Search` | No | `false` | Use v3 search API instead of v4 |

---

#### qubership-apihub-ui

All configuration via **environment variables** (nginx config template is populated at container start).

| Env var | Mandatory | Default | Description |
|---------|-----------|---------|-------------|
| `APIHUB_BACKEND_ADDRESS` | Yes | `apihub-backend:8080` | Internal address of the backend service |
| `APIHUB_NC_SERVICE_ADDRESS` | Yes | `apihub-backend:8080` | Internal address of the custom add-on service (same pod as backend in typical deployments) |
| `API_LINTER_SERVICE_ADDRESS` | No | `apihub-backend:8080` | Internal address of the linter service |
| `APIHUB_AGENTS_BACKEND_ADDRESS` | No | `apihub-backend:8080` | Internal address of the agents backend service |

> The **browser-facing public URL** is **not** configured here. It is `security.apihubExternalUrl` in the backend `config.yaml`.

---

#### qubership-apihub-build-task-consumer

All configuration via **environment variables**.

| Env var | Mandatory | Default | Description |
|---------|-----------|---------|-------------|
| `APIHUB_BACKEND_ADDRESS` | Yes | `apihub-backend:8080` | Internal address of the backend service |
| `APIHUB_API_KEY` | Yes | — | System API token. Must match `zeroDayConfiguration.accessToken` in backend config on initial install |
| `LOG_LEVEL` | No | `INFO` | Log level: `DEBUG`, `INFO`, `WARN`, `ERROR` |
| `FOLDER_STORE` | No | `/tmp` | Directory for temporary file cache (does not need to be a persistent volume) |
| `OPERATIONS_BUILD_BATCH` | No | `16` | Number of operations processed per build batch (rarely needs tuning) |

---

#### qubership-api-linter-service

All configuration via **`config.yaml`** (path: `LINTER_CONFIG_FOLDER`). Helm renders
`qubershipApiLinterService.env` into this file; Compose mounts `qubership-api-linter-service-config.yaml`.
`LOG_LEVEL` and `GOMEMLIMIT` stay container environment variables (`GOMEMLIMIT` default `800MiB` Helm /
`1600MiB` Compose; Helm key `qubershipApiLinterService.goMemLimit`).

**Custom CA certificates (HTTPS outbound):** with the [qubership-core-base](https://github.com/Netcracker/qubership-core-base-images) runtime image, mount PEM files at **`/tmp/cert`** (Compose: uncomment the linter **`./certs:/tmp/cert:ro`** volume; Helm: **`qubershipApiLinterService.customCa`**). Required for corporate HTTPS to APIHUB or OpenAI when public CAs are insufficient.

| Config key | Mandatory | Default | Description |
|------------|-----------|---------|-------------|
| `database.host` | Yes | `localhost` | PostgreSQL host |
| `database.port` | Yes | `5432` | PostgreSQL port |
| `database.name` | Yes | `apihub_linter` | Database name (must be pre-created) |
| `database.username` | Yes | `apihub_linter` | Database user |
| `database.password` | Yes | — | Database password |
| `technicalParameters.apihub.url` | Yes | `http://localhost:8090` | Portal base URL reachable from inside the linter container (e.g. `http://qubership-apihub-ui:8080`) |
| `technicalParameters.apihub.accessToken` | Yes | — | System API token. Must match `zeroDayConfiguration.accessToken` in backend config |
| `technicalParameters.basePath` | No | `.` | Base path for binary and static files |
| `technicalParameters.listenAddress` | No | `:8080` | Listen address for the HTTP server |
| `technicalParameters.apiSpecDirectory` | No | `<basePath>/api` | Directory of API specifications to expose |
| `security.allowedOrigins` | No | `[]` | Extra CORS origins (dev only; empty on prod) |
| `linters.spectral.binPath` | Yes | `resources/spectral/linux/spectral` | Path to the Spectral binary inside the container |
| `linters.spectral.workers` | No | `1` | Number of concurrent Spectral linter workers |
| `linters.ai.enabled` | No | `false` | Enable the AI-powered OpenAPI linter |
| `linters.ai.workers` | No | `1` | Number of concurrent AI linter workers |
| `linters.ai.excludedPackages` | No | `[]` | Package IDs to exclude from AI linting |
| `linters.ai.includedPackages` | No | `[]` | Package IDs to include (empty = all) |
| `linters.ai.openAI.apiKey` | Cond. | — | OpenAI API key (required when `linters.ai.enabled: true`) |
| `linters.ai.openAI.apiProxy` | No | — | HTTP proxy for OpenAI requests |
| `linters.ai.openAI.model` | No | — | OpenAI model to use (e.g. `gpt-4o`) |
| `linters.ai.openAI.rateLimitRPS` | No | `10` | OpenAI requests per second limit |
| `linters.ai.openAI.rateLimitBurst` | No | `30` | OpenAI burst limit |
| `olric.discoveryMode` | No | `local` | Olric discovery: `local` (single pod) or `lan` (multi-pod) |
| `olric.replicaCount` | No | `1` | Olric replica count |
| `olric.namespace` | No | — | Olric discovery namespace (set by Helm to the release namespace) |

---

#### qubership-apihub-agents-backend

All configuration via **`config.yaml`** (path: `AGENTS_BACKEND_CONFIG_FOLDER`). Helm renders
`qubershipApihubAgentsBackend.env` into this file; Compose mounts `qubership-apihub-agents-backend-config.yaml`.
`LOG_LEVEL` and `GOMEMLIMIT` stay container environment variables (`GOMEMLIMIT` default `205MiB`; Helm key
`qubershipApihubAgentsBackend.goMemLimit`).

| Config key | Mandatory | Default | Description |
|------------|-----------|---------|-------------|
| `database.host` | Yes | `localhost` | PostgreSQL host |
| `database.port` | Yes | `5432` | PostgreSQL port |
| `database.name` | Yes | `apihub_agents_backend` | Database name (must be pre-created) |
| `database.username` | Yes | `apihub_agents_backend` | Database user |
| `database.password` | Yes | — | Database password |
| `technicalParameters.apihub.url` | Yes | `http://localhost:8090` | Portal base URL reachable from inside the agents-backend container |
| `technicalParameters.apihub.accessToken` | Yes | — | System API token. Must match `zeroDayConfiguration.accessToken` |
| `technicalParameters.basePath` | No | `.` | Base path for binary and static files |
| `technicalParameters.listenAddress` | No | `:8080` | Listen address for the HTTP server |
| `technicalParameters.apiSpecDirectory` | No | `<basePath>/api` | Directory of API specifications to expose |
| `businessParameters.defaultWorkspaceId` | No | — | If set, package structure is copied from this workspace to the target workspace during discovery |
| `security.allowedOrigins` | No | `[]` | Extra CORS origins (dev debugging only) |
| `security.insecureProxy` | No | `false` | Deprecated. Enable the unauthenticated proxy endpoint. Dangerous — do not enable on prod |
| `cleanup.snapshots.schedule` | No | `0 22 * * 0` | Cron schedule for the snapshots cleanup job |
| `cleanup.snapshots.ttlDays` | No | `30` | Retention period in days for snapshots (`0` removes all) |

**Custom CA certificates (HTTPS outbound):** with the [qubership-core-base](https://github.com/Netcracker/qubership-core-base-images) runtime image, mount PEM files at **`/tmp/cert`** (Compose: uncomment the agents-backend **`./certs:/tmp/cert:ro`** volume; Helm: **`qubershipApihubAgentsBackend.customCa`**). Required for corporate HTTPS to APIHUB or remote agents when public CAs are insufficient.

---

## Helm (Kubernetes)

Chart: **[`helm-templates/qubership-apihub/`](../helm-templates/qubership-apihub/)**.

**Prerequisites:**
- `kubectl` with namespace admin access
- Helm 3.x
- Kubernetes 1.23+

### Minimal values.yaml to fill

Copy `values.yaml`, fill mandatory fields. Everything else has sensible defaults.

```yaml
qubershipApihubBackend:
  env:
    database:
      host: 'pg.example.com'
      port: 5432
      name: 'apihub_backend'
      username: 'apihub_backend_user'
      password: 'changeme'
    security:
      productionMode: true
      jwt:
        privateKey: '<base64 PKCS#8 RSA key>'   # generate_jwt_pkey.sh
      apihubExternalUrl: 'https://apihub.example.com'
    zeroDayConfiguration:
      accessToken: '<random string ≥ 30 chars>'
      adminEmail: 'admin@example.com'
      adminPassword: 'changeme'

qubershipApihubBuildTaskConsumer:
  env:
    accessToken: '<same value as zeroDayConfiguration.accessToken>'

qubershipApihubUi:
  apihubUrl: 'https://apihub.example.com'   # same as apihubExternalUrl
  tlsIngress:
    tlsSecret:
      certificate: '<base64 TLS cert>'
      certificateKey: '<base64 TLS key>'

qubershipApiLinterService:
  env:
    database:
      host: 'pg.example.com'
      name: 'api_linter'
      username: 'api_linter_user'
      password: 'changeme'
    technicalParameters:
      apihub:
        url: 'http://qubership-apihub-ui:8080'
        accessToken: '<same value as zeroDayConfiguration.accessToken>'

qubershipApihubAgentsBackend:
  env:
    database:
      host: 'pg.example.com'
      name: 'agents_backend'
      username: 'agents_backend_user'
      password: 'changeme'
    technicalParameters:
      apihub:
        url: 'http://qubership-apihub-ui:8080'
        accessToken: '<same value as zeroDayConfiguration.accessToken>'
```

### Install / upgrade / uninstall

```bash
helm install apihub -n qubership-apihub --create-namespace \
  -f ./helm-templates/qubership-apihub/values.yaml \
  ./helm-templates/qubership-apihub
```

```bash
helm upgrade apihub -n qubership-apihub \
  -f ./helm-templates/qubership-apihub/values.yaml \
  ./helm-templates/qubership-apihub
```

```bash
helm uninstall apihub -n qubership-apihub
```

### Full Helm parameter reference

`qubershipApihubBackend.env` in `values.yaml` maps 1:1 to `config.yaml` keys — same table as [qubership-apihub-backend above](#qubership-apihub-backend). Helm additionally auto-patches `olric.namespace` and `olric.replicaCount` from the release namespace and `replicas` value.

| `values.yaml` section | Mandatory to fill | Maps to |
|----------------------|-------------------|---------|
| `qubershipApihubBackend.env.database.*` | Yes | Backend `config.yaml` `database.*` |
| `qubershipApihubBackend.env.security.jwt.privateKey` | Yes | Backend `config.yaml` `security.jwt.privateKey` |
| `qubershipApihubBackend.env.security.apihubExternalUrl` | Yes | Backend `config.yaml` `security.apihubExternalUrl` |
| `qubershipApihubBackend.env.zeroDayConfiguration.accessToken` | Yes | Backend `config.yaml` `zeroDayConfiguration.accessToken` |
| `qubershipApihubBackend.env.zeroDayConfiguration.adminEmail` | Yes | Backend `config.yaml` `zeroDayConfiguration.adminEmail` |
| `qubershipApihubBackend.env.zeroDayConfiguration.adminPassword` | Yes | Backend `config.yaml` `zeroDayConfiguration.adminPassword` |
| `qubershipApihubBackend.env.security.productionMode` | No | Default `true`. Set `false` for non-prod local-login |
| `qubershipApihubBackend.env.security.externalIdentityProviders` | Cond. | SAML / OIDC config (required when `productionMode: true`) |
| `qubershipApihubBackend.goMemLimit` | No | → `GOMEMLIMIT` (default `410MiB`, ~80% of default `memory.limit` `512Mi`) |
| `qubershipApihubBackend.env.security.ldap.*` | No | LDAP user sync |
| `qubershipApihubBackend.env.s3Storage.*` | No | S3 offload |
| `qubershipApihubBackend.env.technicalParameters.*` | No | Listen address, ephemeral file directory, migration lock timeout |
| `qubershipApihubBackend.env.cleanup.*` | No | Data retention schedules / TTLs |
| `qubershipApihubBackend.env.ai.chat.openAI.*` | No | AI chat feature |
| `qubershipApihubBackend.env.monitoring.enabled` | No | `true` creates Prometheus `ServiceMonitor` |
| `qubershipApihubBackend.customCa` | No | Optional Secret mounted at `/tmp/cert` for corporate HTTPS outbound |
| `qubershipApihubBuildTaskConsumer.env.accessToken` | Yes | → `APIHUB_API_KEY` (must match `zeroDayConfiguration.accessToken`) |
| `qubershipApihubBuildTaskConsumer.replicas` | No | Scale workers (3–6 for load) |
| `qubershipApihubUi.apihubUrl` | Yes | → UI env, must equal `apihubExternalUrl` |
| `qubershipApihubUi.tlsIngress.tlsSecret.certificate` | Yes | TLS cert for HTTPS ingress (base64) |
| `qubershipApihubUi.tlsIngress.tlsSecret.certificateKey` | Yes | TLS key (base64) |
| `qubershipApihubUi.env.*BackendAddress` | No | K8s DNS defaults — change only if you rename services |
| `qubershipApiLinterService.env.database.*` | Yes | Linter `config.yaml` `database.*` |
| `qubershipApiLinterService.env.technicalParameters.apihub.accessToken` | Yes | Must match `zeroDayConfiguration.accessToken` |
| `qubershipApiLinterService.env.technicalParameters.apihub.url` | No | Default `http://localhost:8090`; in-cluster set to `http://qubership-apihub-ui:8080` |
| `qubershipApiLinterService.goMemLimit` | No | → `GOMEMLIMIT` (default `800MiB`, ~80% of default `memory.limit` `1000Mi`) |
| `qubershipApiLinterService.env.linters.spectral.*` | No | Spectral binary path and worker count |
| `qubershipApiLinterService.env.linters.ai.*` | No | AI linter (OpenAI key, workers, include/exclude lists) |
| `qubershipApiLinterService.env.olric.*` | No | Olric discovery mode / replicas (namespace set by Helm) |
| `qubershipApiLinterService.customCa` | No | Optional Secret mounted at `/tmp/cert` for corporate HTTPS outbound |
| `qubershipApihubAgentsBackend.env.database.*` | Yes | Agents-backend `config.yaml` `database.*` |
| `qubershipApihubAgentsBackend.env.technicalParameters.apihub.accessToken` | Yes | Must match `zeroDayConfiguration.accessToken` |
| `qubershipApihubAgentsBackend.env.technicalParameters.apihub.url` | Yes | Portal base URL reachable from the agents-backend pod |
| `qubershipApihubAgentsBackend.goMemLimit` | No | → `GOMEMLIMIT` (default `205MiB`, ~80% of default `memory.limit` `256Mi`) |
| `qubershipApihubAgentsBackend.env.businessParameters.defaultWorkspaceId` | No | Default workspace copied into the target during discovery |
| `qubershipApihubAgentsBackend.env.security.insecureProxy` | No | Deprecated; unauthenticated proxy (do not enable on prod) |
| `qubershipApihubAgentsBackend.env.cleanup.snapshots.schedule` | No | Snapshots cleanup cron (default `0 22 * * 0`) |
| `qubershipApihubAgentsBackend.env.cleanup.snapshots.ttlDays` | No | Snapshots retention in days (default `30`) |
| `qubershipApihubAgentsBackend.customCa` | No | Optional Secret mounted at `/tmp/cert` for corporate HTTPS outbound |

For secrets management on production clusters use Kubernetes **ExternalSecrets**, CSI driver, or sealed-secrets — do not commit plaintext credentials in `values.yaml`.

---

## Local Kubernetes quickstart

**Not for production.** [`helm-templates/local-k8s-quickstart/`](../helm-templates/local-k8s-quickstart/README.md) contains scripts for Kind or Rancher Desktop with an ingress controller and PostgreSQL. Optional Apache Superset can be deployed for analytics.

```bash
# One-liner: creates Kind cluster + installs APIHUB
./helm-templates/local-k8s-quickstart/apihub-quickstart.sh
# Portal at: http://qubership-apihub.localtest.me/login
```

---

## Further reading

- [Configuration reference](./configuration-reference.md) — source-of-truth hierarchy, Helm vs env model
- [Admin guide](./admin-guide.md) — SSO, token rotation, Helm operations, Compose tips
- [Maintenance guide](./maintenance-guide.md) — backups, data TTL, auth links
- [User guide](./user-guide.md) — Portal workflows

Wiki (architecture, features): **[Qubership APIHUB Wiki](https://github.com/Netcracker/qubership-apihub/wiki)**
