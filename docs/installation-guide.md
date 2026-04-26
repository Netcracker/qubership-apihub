# Qubership APIHUB Installation Guide

This guide describes Qubership APIHUB installation process

- [3rd party dependencies](#3rd-party-dependencies)
- [HWE](#hwe)
- [docker-compose](#docker-compose)
  * [Minimal parameters set](#minimal-parameters-set)
  * [Full ENV VARs list per container](#full-env-vars-list-per-container)
- [Helm](#helm)
  * [Prerequisites](#prerequisites)
  * [Set up values.yml](#set-up-valuesyml)
  * [Execute helm install](#execute-helm-install)

# 3rd party dependencies

| Name | Version | Mandatory/Optional | Comment |
| ---- | ------- |------------------- | ------- |
| PostgreSQL | 14+ | Mandatory |  |
| S3 | Any | Optional | For store cold data and reduce load to PG |
| SAML provider | Any | Optional | For SSO via SAML protocol |
| OIDC provider | Any | Optional | For SSO via OIDC protocol (e.g. Keycloak) |
| LDAP | Any | Optional | For User info sync |

# HWE

|     | CPU request | CPU limit | RAM request | RAM limit |
| --- | ----------- | --------- | ----------- | --------- |
| Dev level        | 200m | 4   | 3Gi | 3Gi |
| Production level | 2    | 11  | 9Gi | 9Gi |

# docker-compose

Two docker-compose configurations are provided:

- [`docker-compose/apihub-generic`](../docker-compose/apihub-generic/README.md) — standalone deployment with local PostgreSQL
- [`docker-compose/with-keycloak`](../docker-compose/with-keycloak/README.md) — deployment with pre-configured Keycloak for OIDC SSO

Please refer to the corresponding README for detailed instructions.

## Minimal parameters set

For **qubership-apihub-backend** (`qubership-apihub-backend-config.yaml`):
```YAML
database:
  host: 'pg.local'
  port: 5432
  name: 'apihub'
  username: 'apihub'
  password: 'apihub'
security:
  productionMode: false
  jwt:
    privateKey: '{use generated key here}'
  apihubExternalUrl: 'https://apihub.example.com'
zeroDayConfiguration:
  accessToken: '<put_your_key_here - any random string, minimum 30 characters>'
  adminEmail: '<admin_login, example: apihub@mail.com>'
  adminPassword: '<admin_password, example: password>'
```

For **qubership-apihub-build-task-consumer**:
```INI
# Must match zeroDayConfiguration.accessToken from qubership-apihub-backend config
APIHUB_API_KEY=${any string, minimal 30 characters}
```

For **qubership-api-linter-service**:
```INI
APIHUB_URL=http://qubership-apihub-ui:8080
APIHUB_ACCESS_TOKEN=${same value as zeroDayConfiguration.accessToken}
LINTER_POSTGRESQL_HOST=pg.local
LINTER_POSTGRESQL_PORT=5432
LINTER_POSTGRESQL_DB_NAME=api_linter
LINTER_POSTGRESQL_USERNAME=api_linter_user
LINTER_POSTGRESQL_PASSWORD=api_linter_password
```

For **qubership-apihub-agents-backend**:
```INI
APIHUB_URL=http://qubership-apihub-ui:8080
APIHUB_ACCESS_TOKEN=${same value as zeroDayConfiguration.accessToken}
AGENTS_BACKEND_POSTGRESQL_HOST=pg.local
AGENTS_BACKEND_POSTGRESQL_PORT=5432
AGENTS_BACKEND_POSTGRESQL_DB_NAME=agents_backend
AGENTS_BACKEND_POSTGRESQL_USERNAME=agents_backend_user
AGENTS_BACKEND_POSTGRESQL_PASSWORD=agents_backend_password
```

**NOTE:** All databases (`apihub`, `api_linter`, `agents_backend`) must be pre-created.

## Full ENV VARs list per container

| ENV name | Mandatory | Default Value | Example | Description |
| --- | --- | --- | --- | --- |
| **qubership-apihub-backend** |     |     |     |     |
| APIHUB\_CONFIG\_FOLDER | No | ./ | /app | Directory path where the application looks for the config.yaml configuration file |
| LOG\_LEVEL | No | INFO | DEBUG | Set log level on init to specified value. Values: Info, Warn, Error, etc |

qubership-apihub-backend configuration is implemented via a configuration file (config.yaml). For the full configuration please refer to [the template file](https://github.com/Netcracker/qubership-apihub-backend/blob/develop/qubership-apihub-service/config.template.yaml).

| Deploy Parameter name | Mandatory | Default Value | Example | Description |
| --- | --- | --- | --- | --- |
| **qubership-apihub-ui** |     |     |     |     |
| APIHUB_URL | Yes |  | `https://apihub.example.com` | APIHUB server external URL. |
| APIHUB_BACKEND_ADDRESS | Yes | apihub-backend:8080 | `qubership-apihub-backend:8080` | apihub-backend internal address. |
| APIHUB_NC_SERVICE_ADDRESS | Yes | apihub-backend:8080 | `qubership-apihub-backend:8080` | Custom add-on service address. |
| API_LINTER_SERVICE_ADDRESS | No | apihub-backend:8080 | `qubership-api-linter-service:8080` | api-linter-service internal address. |
| APIHUB_AGENTS_BACKEND_ADDRESS | No | apihub-backend:8080 | `qubership-apihub-agents-backend:8080` | agents-backend internal address. |

| Deploy Parameter name | Mandatory | Default Value | Example | Description |
| --- | --- | --- | --- | --- |
| **qubership-apihub-build-task-consumer** |     |     |     |     |
| APIHUB_API_KEY | Yes |  | `access-token-12345` | APIHUB server admin access token. Must match `zeroDayConfiguration.accessToken` in backend config. |
| APIHUB_BACKEND_ADDRESS | Yes | apihub-backend:8080 | `qubership-apihub-backend:8080` | apihub-backend internal address. |
| FOLDER_STORE | No | /tmp | `/var/lib/apihub/cache` | Folder to store file cache. Not required to be a persistent volume. |
| LOG_LEVEL | No | INFO | DEBUG | Set log level. Values: Info, Warn, Error, etc. |
| OPERATIONS_BUILD_BATCH | No | 16 | `16` | Number of operations processed in a single build batch. |

| Deploy Parameter name | Mandatory | Default Value | Example | Description |
| --- | --- | --- | --- | --- |
| **qubership-api-linter-service** |     |     |     |     |
| APIHUB_URL | Yes |  | `http://qubership-apihub-ui:8080` | APIHUB server URL (internal). |
| APIHUB_ACCESS_TOKEN | Yes |  | `access-token-12345` | APIHUB admin access token. Must match `zeroDayConfiguration.accessToken` in backend config. |
| LINTER_POSTGRESQL_HOST | Yes | localhost | `pg.local` | PostgreSQL host. |
| LINTER_POSTGRESQL_PORT | Yes | 5432 | `5432` | PostgreSQL port. |
| LINTER_POSTGRESQL_DB_NAME | Yes | apihub_linter | `api_linter` | Database name for linter service. Must be pre-created. |
| LINTER_POSTGRESQL_USERNAME | Yes | apihub_linter | `api_linter_user` | Database user. |
| LINTER_POSTGRESQL_PASSWORD | Yes |  | `api_linter_password` | Database password. |
| LOG_LEVEL | No | INFO | DEBUG | Set log level. |
| SPECTRAL_BIN_PATH | No | resources/spectral/linux/spectral | `./resources/spectral/linux/spectral` | Path to Spectral binary inside the container. |
| SPECTRAL_LINTER_WORKERS | No | 1 | `4` | Number of Spectral linter workers. |
| OLRIC_DISCOVERY_MODE | No | local | `lan` | Olric distributed cache discovery mode. |
| OLRIC_REPLICA_COUNT | No | 1 | `1` | Olric replica count. |
| ENABLE_AI_OAS_LINTER | No | false | `true` | Enable AI-powered OAS linter. |
| OPENAI_API_KEY | No |  | `sk-...` | OpenAI API key (required when AI linter enabled). |
| OPENAI_API_PROXY | No |  | `http://proxy.example.com:8080` | Proxy URL for OpenAI requests. |
| OPENAI_MODEL | No |  | `gpt-4o` | OpenAI model to use. |
| OPENAI_RATE_LIMIT_RPS | No | 10 | `10` | OpenAI API rate limit (requests per second). |
| OPENAI_RATE_LIMIT_BURST | No | 30 | `30` | OpenAI API rate limit burst. |
| AI_LINTER_WORKERS | No | 1 | `4` | Number of AI linter workers. |
| AI_LINTER_EXCLUDED_PACKAGES | No |  | `pkg1,pkg2` | Comma-separated package IDs to exclude from AI linting. |
| AI_LINTER_INCLUDED_PACKAGES | No |  | `pkg1,pkg2` | Comma-separated package IDs to include for AI linting (empty = all). |

| Deploy Parameter name | Mandatory | Default Value | Example | Description |
| --- | --- | --- | --- | --- |
| **qubership-apihub-agents-backend** |     |     |     |     |
| APIHUB_URL | Yes |  | `http://qubership-apihub-ui:8080` | APIHUB server URL (internal). |
| APIHUB_ACCESS_TOKEN | Yes |  | `access-token-12345` | APIHUB admin access token. Must match `zeroDayConfiguration.accessToken` in backend config. |
| AGENTS_BACKEND_POSTGRESQL_HOST | Yes | localhost | `pg.local` | PostgreSQL host. |
| AGENTS_BACKEND_POSTGRESQL_PORT | Yes | 5432 | `5432` | PostgreSQL port. |
| AGENTS_BACKEND_POSTGRESQL_DB_NAME | Yes | apihub_agents_backend | `agents_backend` | Database name for agents-backend. Must be pre-created. |
| AGENTS_BACKEND_POSTGRESQL_USERNAME | Yes | apihub_agents_backend | `agents_backend_user` | Database user. |
| AGENTS_BACKEND_POSTGRESQL_PASSWORD | Yes |  | `agents_backend_password` | Database password. |
| LOG_LEVEL | No | INFO | DEBUG | Set log level. |
| DEFAULT_WORKSPACE_ID | No |  | `QS` | Default workspace ID. If set, package structure is copied from this workspace during discovery. |
| INSECURE_PROXY | No | false | `true` | Enable proxy without authorization. Not recommended. |
| ORIGIN_ALLOWED | No |  | `https://localhost:5137` | Extra allowed CORS origin. For debugging only; should be empty on prod. |
| DRAFTS_CLEANUP_SCHEDULE | No | `0 2 * * 0` | `0 2 * * 0` | Cron schedule for snapshots cleanup job. |

# Helm

Qubership APIHUB Helm Chart located here: [`helm-templates/qubership-apihub`](../helm-templates/qubership-apihub/Chart.yaml)

## Prerequisites

1. kubectl installed and configured for k8s cluster access. Namespace admin permissions required.
1. Helm installed
1. Supported k8s version - 1.23+

## Set up values.yml

1. Download Qubership APIHUB helm chart
1. Fill `values.yaml` with corresponding deploy parameters. `values.yaml` is self-documented, so please refer to it

The file is split into five top-level sections — one per service. The table below shows which parameter groups require attention for each service.

### qubershipApihubBackend

| Group | Mandatory | What to fill |
| ----- | --------- | ------------ |
| `env.database` | Yes | PostgreSQL host, port, database name, username, password |
| `env.security.jwt.privateKey` | Yes | Self-generated PKCS#8 private key (base64). Use `generate_jwt_pkey.sh` to create one |
| `env.security.apihubExternalUrl` | Yes | Public HTTPS URL of the APIHUB instance (e.g. `https://apihub.example.com`) |
| `env.zeroDayConfiguration.accessToken` | Yes | Any random string (≥ 30 chars). Used as the initial system API token; must be copied to other services |
| `env.security.productionMode` | — | Set to `false` for non-prod: allows login with local APIHUB users |
| `env.zeroDayConfiguration.adminEmail/Password` | — | If set, a local admin account is created automatically on first startup |
| `env.security.externalIdentityProviders` | — | SAML or OIDC provider config for SSO (see inline examples in `values.yaml`) |
| `env.security.ldap` | — | LDAP connection for user info sync (relevant when SAML/OIDC is enabled) |
| `env.s3Storage` | — | S3 connection for offloading cold data from PostgreSQL |
| `env.ai.chat.openAI` | — | OpenAI API key and model for AI-assisted chat feature |
| `env.monitoring.enabled` | — | Set to `true` to create a Prometheus `ServiceMonitor` |

### qubershipApihubBuildTaskConsumer

| Group | Mandatory | What to fill |
| ----- | --------- | ------------ |
| `env.accessToken` | Yes | Must be the same value as `qubershipApihubBackend.env.zeroDayConfiguration.accessToken` |

All other parameters (resource limits, replicas) have production-ready defaults.

### qubershipApihubUi

| Group | Mandatory | What to fill |
| ----- | --------- | ------------ |
| `apihubUrl` | Yes | Public HTTPS URL of the APIHUB instance — same value as backend's `apihubExternalUrl` |
| `tlsIngress.tlsSecret` | Yes | TLS certificate and private key (base64) for HTTPS ingress |
| `ingress.enabled` | — | Enable plain HTTP ingress in addition to HTTPS (disabled by default) |

Internal service addresses (`apihubBackendAddress`, etc.) use k8s DNS defaults and typically do not need to be changed.

### qubershipApiLinterService

| Group | Mandatory | What to fill |
| ----- | --------- | ------------ |
| `env.database` | Yes | Separate PostgreSQL database for the linter service (`apihub_linter` by default) |
| `env.apihub.accessToken` | Yes | Same value as `qubershipApihubBackend.env.zeroDayConfiguration.accessToken` |
| `env.ai` | — | Enable AI-powered OAS linter and provide OpenAI API key |

### qubershipApihubAgentsBackend

| Group | Mandatory | What to fill |
| ----- | --------- | ------------ |
| `env.database` | Yes | Separate PostgreSQL database for agents-backend (`apihub_agents_backend` by default) |
| `env.apihub.accessToken` | Yes | Same value as `qubershipApihubBackend.env.zeroDayConfiguration.accessToken` |
| `env.defaultWorkspaceId` | — | If set, package structure is copied from this workspace on agent discovery |

## Execute helm install

In order to deploy Qubership APIHUB to your k8s cluster execute the following command:

```
helm install apihub -n qubership-apihub --create-namespace -f ./helm-templates/qubership-apihub/values.yaml ./helm-templates/qubership-apihub
```

In order to uninstall Qubership APIHUB from your k8s cluster execute the following command:

```
helm uninstall apihub -n qubership-apihub
```
