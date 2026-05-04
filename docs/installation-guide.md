# Qubership APIHUB — installation and deployment

This guide tracks **Podman/Docker Compose**, **Helm**, and the **local Kubernetes quickstart** shipped in [`qubership-apihub`](https://github.com/Netcracker/qubership-apihub). For the **source-of-truth hierarchy** (Helm as K8s integration contract, Compose as local helper, runtime facts from service code), read [Configuration reference](./configuration-reference.md) first — especially [Source of truth hierarchy](./configuration-reference.md#source-of-truth-hierarchy).

---

## Table of contents

- [Architecture of configuration](#architecture-of-configuration)
- [Third-party dependencies](#third-party-dependencies)
- [Hardware sizing (rough)](#hardware-sizing-rough)
- [Docker Compose](#docker-compose)
- [Helm (Kubernetes)](#helm-kubernetes)
- [Local Kubernetes quickstart](#local-kubernetes-quickstart)

---

## Architecture of configuration

**Ordering:** for **Kubernetes**, treat the Helm chart ([`helm-templates/qubership-apihub/`](../helm-templates/qubership-apihub/)) as the **canonical way** the platform is wired (values → rendered Secrets/Deployments). For **what each binary actually consumes** (file vs env vs both), use **component source code** on `develop` if this doc and the chart disagree — see [Configuration reference — Source of truth](./configuration-reference.md#source-of-truth-hierarchy).

| Layer | What operators edit | Runtime consumer | Notes |
|-------|---------------------|------------------|-------|
| **API Registry (Go backend)** | **`config.yaml`** (schema from [`config.template.yaml`](https://github.com/Netcracker/qubership-apihub-backend/blob/develop/qubership-apihub-service/config.template.yaml)); **`APIHUB_CONFIG_FOLDER`**, optional **`LOG_LEVEL`** | Backend reads YAML from disk | DB, JWT, **`apihubExternalUrl`**, SSO, S3, Olric, **`extensions`**, cleanup, AI chat, limits — all in YAML. |
| **Portal UI** | Environment variables | UI / nginx bootstrap | **`*_ADDRESS`** for internal routing; public URL stays in **`security.apihubExternalUrl`** (backend YAML). |
| **Build worker**, **Agents-backend** | Environment variables only | Respectively NestJS / Go | Tokens, DB URLs, **`APIHUB_URL`**, etc. |
| **API Linter** | Environment variables only | Go service ([`system_info.go`](https://github.com/Netcracker/qubership-api-linter-service/blob/develop/qubership-api-linter-service/service/system_info.go): `Getenv`) | Process **bootstrap** uses **env**, not a `config.yaml` file.YAML in the linter world is Spectral ruleset **content** (via API/store), distinct from startup config — see [Configuration reference](./configuration-reference.md#source-of-truth-hierarchy). |

**Helm:** subtree **`qubershipApihubBackend.env`** renders into Secret **`config.yaml`** mounted at **`/app/qubership-apihub-service/etc/`** (see **`templates/qubership-apihub-backend-config-secret.yaml`**). Other services are env-only in their Deployment templates. **Compose:** mount **`qubership-apihub-backend-config.yaml`** as backend `config.yaml`; companion **`.env`** files mirror the env-only services’ variables.

---

## Third-party dependencies

| Name | Version | Required | Purpose |
|------|---------|----------|---------|
| **PostgreSQL** | 14+ supported | Yes | Separate logical DBs/services for backend, linter, agents-backend (`init.sql` in Compose illustrates naming). |
| **S3-compatible object storage** | Any | Optional | Cold/large artefacts; configure under **`s3Storage`** in backend YAML. |
| **SAML / OIDC IdP** | Any supported | Optional | SSO; **`security.externalIdentityProviders`** in YAML. Example: [`docker-compose/with-keycloak/`](../docker-compose/with-keycloak/). |
| **LDAP** | Any | Optional | User directory when using federated login; **`security.ldap`** in YAML. |

---

## Hardware sizing (rough)

Starting point — tune for your payloads and concurrency.

| Profile | CPU (request→limit hint) | Memory (hint) |
|---------|----------------------------|----------------|
| Sandbox / Compose | fractions of cores per container (`docker-compose.yml` limits) | 2–8 GB total including PostgreSQL |
| Production (Kubernetes) | See commented defaults per subchart in `values.yaml`; raise backend replicas for Olric-heavy workloads | Follow `values.yaml` comments; PostgreSQL isolated |

---

## Docker Compose

### Layout

- **`docker-compose/apihub-generic/`** — full stack + bundled PostgreSQL; best for desktops and demos.
- **`docker-compose/with-keycloak/`** — same idea plus Keycloak and SAML/OIDC wiring.

Both folders ship **prefilled template files**:

- `qubership-apihub-backend-config.yaml`
- Per-service `.env` files
- **`scripts/init-db/init.sql`** — creates `apihub_backend`, `api_linter`, `agents_backend` databases (names must match backend YAML / `.env`).

### Prerequisites

- **Compose with Podman** is the documented default (`podman compose up`). Recent **Docker Compose** usually works too; keep port bindings identical.
- On **Windows**, add **`127.0.0.1 host.docker.internal`** to `hosts` if your runtime does not provide it automatically (called out in the Keycloak variant README).
- **GNU gettext `envsubst`** is required only if you use **`generate_env_and_up_compose.sh`**.

### Bootstrap flow

1. **Adjust backend YAML** [`qubership-apihub-backend-config.yaml`](../docker-compose/apihub-generic/qubership-apihub-backend-config.yaml):
   - Copy structure from **`config.template.yaml`** when adding keys (same schema as Helm **`qubershipApihubBackend.env`**).
   - **`security.apihubExternalUrl`**: browser-reachable Portal URL (`http://localhost:8081`, `http://host.docker.internal:8081`, etc.).
   - **`security.productionMode: false`** for local-login testing; **`true`** in production-like setups with SSO only.
   - **`jwt.privateKey`**: PKCS#8 RSA private key **base64** (`generate_jwt_pkey.sh`: PEM → strip newlines → plug into **`${JWT_PRIVATE_KEY}`** placeholder if using envsubst workflow).
   - **`zeroDayConfiguration`**: **`accessToken`** (≥30 chars recommended) aligns with **`APIHUB_API_KEY` / APIHUB_ACCESS_TOKEN** sections in other `.env` files.
   - **`extensions`** `baseUrl` entries must resolve from **clients and from the backend** — generic stack uses **`http://host.docker.internal:8091`** (linter) and **`:8092`** (agents) because backends publish those ports.

2. **Service `.env` files** — defaults match `init.sql`. Builder example: **`APIHUB_BACKEND_ADDRESS=host.docker.internal:8090`** (maps to **`qubership-apihub-backend`** host port **`8090:8080`**). Linter and agents-backend use **`APIHUB_URL=http://host.docker.internal:8081`** (published UI **`8081:8080`**).

3. **Optional one-shot generator** [`generate_env_and_up_compose.sh`](../docker-compose/apihub-generic/generate_env_and_up_compose.sh):
   - Generates random admin + token + JWT, runs **`envsubst`** over **`*.env`** and **`qubership-apihub-backend-config.yaml`**, then **`podman compose up`**.
   - **Destructive:** it **writes** substitutions into tracked files — commit resets or stash copies first.

### Published ports (generic compose)

| Host port | Container | Purpose |
|-----------|-----------|---------|
| 8081 | `qubership-apihub-ui:8080` | Portal HTTPS entry (HTTP in dev) |
| 8090 | `qubership-apihub-backend:8080` | REST API exposed to builder via `host.docker.internal` |
| 8091 / 8092 | Linter / agents-backend | Matches **`extensions.baseUrl`** in sample backend YAML |
| 47375 / 47376 | Backend | Prometheus/metrics scrape (backend image) |

Default UI login URL: **`http://localhost:8081/login`** (README in compose folder).

### Portal UI internal addresses

Template [`qubership-apihub-ui.env`](../docker-compose/apihub-generic/qubership-apihub-ui.env) sets:

- **`APIHUB_BACKEND_ADDRESS=qubership-apihub-backend:8080`**
- **`API_LINTER_SERVICE_ADDRESS`**, **`APIHUB_AGENTS_BACKEND_ADDRESS`** on the compose network aliases

There is **no** `APIHUB_URL` in this file by design—the public origin comes from **`security.apihubExternalUrl`**.

---

## Helm (Kubernetes)

Chart path: **`helm-templates/qubership-apihub/`**. Entry documentation: **`helm-templates/README.md`**.

### Prerequisites

- **`kubectl`** with namespace admin privileges
- **Helm 3.x**
- Cluster **Kubernetes 1.23+** (prefer current vendor-supported minors)

### What to edit

Primary file: **`helm-templates/qubership-apihub/values.yaml`** — commented blocks mirror runtime keys.

| Section (`values.yaml`) | Configure |
|-------------------------|-----------|
| **`qubershipApihubBackend.env`** | Entire backend config (same YAML shape as **`config.template.yaml`**): `database`, `security.*`, `zeroDayConfiguration`, `extensions`, `cleanup`, `s3Storage`, `ai`, … |
| **`qubershipApihubBuildTaskConsumer.env.accessToken`** | Same semantic value as **`zeroDayConfiguration.accessToken`** for initial bootstrap |
| **`qubershipApihubUi.apihubUrl` + `tlsIngress`** | External URL users see + TLS secrets (base64 cert/key) |
| **`qubershipApiLinterService.env`** | Linter DB, **`apihub.url`/`accessToken`**, Spectral/Olric/AI knobs |
| **`qubershipApihubAgentsBackend.env`** | Agents DB, **`apihub.url`/`accessToken`**, **`snapshotsCleanupSchedule`/`snapshotsTtlDays`** (rendered `SNAPSHOTS_*`) |

Charts wire cross-service URLs for you (e.g. default **`extensions`** URLs use **`http://qubership-api-linter-service:8080`**).

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

Treat **`values.yaml` checked into git like a workbook** — for real clusters keep secrets in **`ExternalSecrets`**, CSI, or sealed manifests; never ship live keys in plaintext.

---

## Local Kubernetes quickstart

Not suitable for production: **[`helm-templates/local-k8s-quickstart/`](../helm-templates/local-k8s-quickstart/README.md)** (Kind/Rancher, nginx ingress helpers, optional Superset demo). Intended for engineers validating Chart behaviour locally.

---

## API linter service env

Compose-style variables (subset — see Helm template `qubership-api-linter-service-deployment.yaml` for full list Helm injects):

| Variable | Mandatory | Typical Compose | Notes |
|----------|-----------|-----------------|-------|
| `APIHUB_URL` | Yes | `http://host.docker.internal:8081` | Base URL Portal uses; must work from linter container |
| `APIHUB_ACCESS_TOKEN` | Yes | Same as backend `accessToken` | Admin/system-equivalent privileges for callbacks |
| `LINTER_POSTGRESQL_*` | Yes | From `init.sql` | Dedicated DB (`api_linter` in samples) |
| `LINTER_PG_SSL_MODE` | No | `disable`/`require` … | Preferred over legacy docs when SSL required |
| `OLRIC_*` / `SPECTRAL_*` / `ENABLE_AI_*` / `OPENAI_*` | Optional | See `.env` | AI lint requires secrets management in prod |

---

## Further reading

- [Configuration reference](./configuration-reference.md) — file/env/Helm lookup table  
- [Admin guide](./admin-guide.md) — day-two operations  
- [Maintenance guide](./maintenance-guide.md) — backups, retention, SSO links  
- [User guide](./user-guide.md) — portal workflows (product audience)  

Wiki (architecture/features): **[Qubership APIHUB Wiki](https://github.com/Netcracker/qubership-apihub/wiki)**.
