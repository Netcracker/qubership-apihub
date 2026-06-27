# Configuration reference — files, environment variables, and Helm values

This page ties together **what you edit in GitOps** versus **what the processes actually load**. Pair it with [Installation guide](./installation-guide.md).

---

## Source of truth hierarchy

1. **`qubership-apihub` Helm chart** ([`helm-templates/qubership-apihub/`](../helm-templates/qubership-apihub/) — **`values.yaml` + templates**) is the **canonical delivery contract for Kubernetes**: it defines Secrets, mounts, injected env vars, images, probes. Supported production shapes should be expressible **without bypassing** the chart (operators extend via values/overlays).

2. **Component source code** is the **authority on runtime behaviour**: which knobs are read from **`config.yaml`**, which from **environment**, and exact variable names. The umbrella Markdown is a map; disagreeing forks should be settled against code on `develop`.

3. **`docker-compose/` stacks** reproduce the **same split** for local rigs; they are **downstream helpers**, not replacements for Helm when you argue about cluster installs.

Annotated **YAML schemas** used by file-backed binaries live only where the loader exists today:

| Component | Boot-time YAML template | Loader / pointers |
|-----------|--------------------------|-------------------|
| API Registry | [`config.template.yaml`](https://github.com/Netcracker/qubership-apihub-backend/blob/develop/qubership-apihub-service/config.template.yaml) (`../qubership-apihub-backend/qubership-apihub-service/` locally) | `APIHUB_CONFIG_FOLDER` → `config.yaml`; see backend service bootstrap. |
| Kubernetes Agent | [`config.template.yaml`](https://github.com/Netcracker/qubership-apihub-agent/blob/develop/qubership-apihub-agent/config.template.yaml) | Agent image (file-based like backend). |
| **API Linter** | *(none)* | **No `config.yaml` for process startup.** Operational settings arrive **only via environment variables** aggregated in [`system_info.go`](https://github.com/Netcracker/qubership-api-linter-service/blob/develop/qubership-api-linter-service/service/system_info.go) (`Getenv`). YAML files are **Spectral ruleset payloads** managed through the linter API/database — that is **data**, not a replacement for env-based service config unless the product introduces a YAML loader upstream. |
| Builders / Agents-backend / UI | *(none)* | Env only (NestJS/UI nginx wrappers). |

**Golden path for admins:** derive intent from Helm values → rendered manifests → confirm against the Go/TS loaders above when in doubt.

---

## 1. Configuration model per component

| Service | Primary runtime configuration | Remarks |
|---------|-------------------------------|---------|
| **qubership-apihub-backend** | **`config.yaml` on disk** | Path via **`APIHUB_CONFIG_FOLDER`**; optional **`LOG_LEVEL`** and **`GOMEMLIMIT`** (Go runtime soft limit; Helm **`goMemLimit`**). Most behaviour (DB, security, SSO, S3, Olric, cleanup, AI chat, `extensions`) is file-backed. Helm serializes **`qubershipApihubBackend.env`** into the same YAML shape (`qubership-apihub-backend-config-secret.yaml`). |
| **qubership-apihub-ui** | Environment variables only | Internal upstream DNS (`*_ADDRESS`). Public URL stays in **`security.apihubExternalUrl`** (backend file). See [Installation guide § UI](./installation-guide.md#portal-ui-internal-addresses). |
| **qubership-apihub-build-task-consumer** | Environment variables only | **`APIHUB_BACKEND_ADDRESS`** + **`APIHUB_API_KEY`** (aligned with backend **`zeroDayConfiguration.accessToken`** on bootstrap). |
| **qubership-api-linter-service** | **Environment variables only** | Full list originates from code (`system_info.go` above). Helm’s **`qubershipApiLinterService.env`** mirrors pod injection in-cluster; **`GOMEMLIMIT`** comes from **`goMemLimit`**. YAML shows up elsewhere as Spectral rule documents, **not** as service boot configuration. |
| **qubership-apihub-agents-backend** | Environment variables only | DB + **`APIHUB_URL`** / **`APIHUB_ACCESS_TOKEN`**, **`SNAPSHOTS_*`**, **`GOMEMLIMIT`** (Helm **`goMemLimit`**), … — see deployment template / `agents-backend` source. |

**Kubernetes agent** (optional extension, not started by default Compose bundle): configured like the backend pattern — **`config.yaml`** from [`config.template.yaml`](https://github.com/Netcracker/qubership-apihub-agent/blob/develop/qubership-apihub-agent/config.template.yaml), plus Ingress for **`agentUrl`**.

---

## 2. Helm — mapping `values.yaml` → runtime (integration first)

Chart: **[`helm-templates/qubership-apihub/`](../helm-templates/qubership-apihub/)**. File: **`values.yaml`** with inline semantics.

| `values.yaml` root key | Produced runtime configuration |
|------------------------|-------------------------------|
| `qubershipApihubBackend.env` | Rendered **as YAML** into Secret `config.yaml`, mounted under **`/app/qubership-apihub-service/etc/`** with **`APIHUB_CONFIG_FOLDER=/app/qubership-apihub-service/etc/`**. Olric **`namespace`** / **`replicaCount`** patched from Helm. Same schema as **`config.template.yaml`**. |
| `qubershipApihubBackend.customCa` | Optional Kubernetes Secret mounted at **`/tmp/cert`** on the backend pod. Used with the [qubership-core-base](https://github.com/Netcracker/qubership-core-base-images) runtime image: the entrypoint loads PEM files into the system trust store before the app starts (OIDC, SAML, playground proxy, AI chat). Set **`enabled: true`** and **`secretName`**. |
| `qubershipApihubBackend.goMemLimit` | Pod env **`GOMEMLIMIT`** (Go runtime soft limit; not part of `config.yaml`). Default **`410MiB`** (~80% of default **`resource.memory.limit`** `512Mi`). |
| `qubershipApihubBuildTaskConsumer.env` | Pod env (**`APIHUB_API_KEY`**, etc.). Address often mirrors **`qubershipApihubUi.env.apihubBackendAddress`**. **`accessToken`** must match backend **`zeroDayConfiguration.accessToken`** on clean install. |
| `qubershipApihubUi.env` + `apihubUrl`, ingress TLS | UI env + public **`apihubUrl`** (keep equal to **`security.apihubExternalUrl`**). |
| `qubershipApiLinterService.env` | Pod env vars only (**no YAML mount for service config** in current chart): DB refs, **`APIHUB_URL`/`APIHUB_ACCESS_TOKEN`**, Spectral/Olric/AI knobs. |
| `qubershipApiLinterService.customCa` | Optional Kubernetes Secret mounted at **`/tmp/cert`** on the linter pod. Same [qubership-core-base](https://github.com/Netcracker/qubership-core-base-images) contract for HTTPS outbound calls to APIHUB and OpenAI. Set **`enabled: true`** and **`secretName`**. |
| `qubershipApiLinterService.goMemLimit` | Pod env **`GOMEMLIMIT`**. Default **`800MiB`** (~80% of default **`resource.memory.limit`** `1000Mi`). |
| `qubershipApihubAgentsBackend.env` | Agents pod env; Helm maps schedule/TTL strings to **`SNAPSHOTS_*`** env names. |
| `qubershipApihubAgentsBackend.customCa` | Optional Kubernetes Secret mounted at **`/tmp/cert`** on the agents-backend pod. Same [qubership-core-base](https://github.com/Netcracker/qubership-core-base-images) contract for HTTPS outbound calls to APIHUB and remote agents. Set **`enabled: true`** and **`secretName`**. |
| `qubershipApihubAgentsBackend.goMemLimit` | Pod env **`GOMEMLIMIT`**. Default **`205MiB`** (~80% of default **`resource.memory.limit`** `256Mi`). |

Default **`extensions`** URLs use cluster DNS (`http://qubership-api-linter-service:8080`, …); Compose substitutes **`host.docker.internal`** — keep both sides coherent.

Commands: [Installation guide — Helm](./installation-guide.md#helm-kubernetes). Template reference: **`templates/qubership-*-deployment.yaml`** in the chart.

### Custom CA Kubernetes Secret (Helm)

When **`customCa.enabled: true`**, create the Secret **before** `helm install` / `helm upgrade`. Each key under **`data`** or **`stringData`** becomes a filename under **`/tmp/cert`** (use **`.crt`**, **`.cer`**, or **`.pem`** suffixes). One Secret per service is typical; PEM contents may be identical across backend, linter, and agents-backend.

**Backend** — save as `apihub-backend-custom-ca-secret.yaml`, set **`namespace`** to your APIHUB release namespace, then `kubectl apply -f apihub-backend-custom-ca-secret.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: apihub-backend-custom-ca
  namespace: qubership-apihub
type: Opaque
stringData:
  company-root-ca.pem: |
    -----BEGIN CERTIFICATE-----
    # paste PEM body from your corporate CA
    -----END CERTIFICATE-----
```

**Linter** — same shape; change **`metadata.name`** to match **`qubershipApiLinterService.customCa.secretName`** (for example `apihub-linter-custom-ca`).

**Agents-backend** — same shape; change **`metadata.name`** to match **`qubershipApihubAgentsBackend.customCa.secretName`** (for example `apihub-agents-backend-custom-ca`).

Enable the mount in **`values.yaml`** (defaults keep **`enabled: false`**):

```yaml
qubershipApihubBackend:
  customCa:
    enabled: true
    secretName: apihub-backend-custom-ca
```

Alternative: `kubectl create secret generic apihub-backend-custom-ca --from-file=company-root-ca.pem=./company-root-ca.pem -n qubership-apihub`.

MinIO/S3 endpoint CA stays in **`s3Storage.crt`** inside the backend config Secret — not in **`/tmp/cert`**.

---

## 3. Compose — which file to edit

Repository path: **[`docker-compose/apihub-generic/`](../docker-compose/apihub-generic/)** (standalone) and **`docker-compose/with-keycloak/`** (Keycloak SSO example).

| File | Service | Role |
|------|---------|------|
| `qubership-apihub-backend-config.yaml` | Backend | Mounted as `config.yaml`. Uses **`${JWT_PRIVATE_KEY}`**, **`${APIHUB_ACCESS_TOKEN}`**, **`${APIHUB_ADMIN_EMAIL}`**, **`${APIHUB_ADMIN_PASSWORD}`** for `generate_env_and_up_compose.sh` substitution. **`extensions[].baseUrl`** must be reachable **from users’ browsers and from the backend** (see Compose stack readme — often `host.docker.internal` plus published ports). |
| `certs/` (optional) | Backend, linter, agents-backend | Place corporate CA **`.crt`/`.cer`/`.pem`** files in **`certs/`** and uncomment **`./certs:/tmp/cert:ro`** in **`docker-compose.yml`** on the three services. Uses the [qubership-core-base](https://github.com/Netcracker/qubership-core-base-images) **`/tmp/cert`** contract. MinIO/S3 custom CA remains in **`s3Storage.crt`** inside the backend config YAML. |
| `docker-compose.yml` (`qubership-apihub-backend` `environment`) | Backend | **`APIHUB_CONFIG_FOLDER`**, **`GOMEMLIMIT`** (Go runtime soft limit; default **`800MiB`** for Compose **`memory: 1G`** limit). |
| `qubership-apihub-ui.env` | Portal UI | Internal upstream addresses (`APIHUB_BACKEND_ADDRESS`, `API_LINTER_SERVICE_ADDRESS`, …). |
| `qubership-apihub-build-task-consumer.env` | Builder | **`APIHUB_API_KEY`**, **`APIHUB_BACKEND_ADDRESS`**. Compose uses **`host.docker.internal:8090`** so the worker reaches the backend through the published host port. |
| `qubership-api-linter-service.env` | Linter | DB + **`APIHUB_URL`** (Portal base URL as seen from the linter pod) + token + **`GOMEMLIMIT`** (default **`1600MiB`** for Compose **`memory: 2G`** limit). |
| `qubership-apihub-agents-backend.env` | Agents backend | DB + **`APIHUB_URL`** + token + **`SNAPSHOTS_CLEANUP_SCHEDULE`** / **`SNAPSHOTS_TTL_DAYS`** + **`GOMEMLIMIT`** (default **`205MiB`** for Compose **`memory: 256M`** limit). |
| `scripts/init-db/init.sql` | PostgreSQL init | Creates users/DBs: `apihub_backend`, `api_linter`, `agents_backend`. |

Secrets helper: **`generate_jwt_pkey.sh`** (JWT private key PEM → base64 for YAML), **`generate_env_and_up_compose.sh`** (random token/admin + `envsubst`). **Important:** running `generate_env_and_up_compose.sh` **overwrites** the processed `.env` and backend YAML placeholders with substituted values — use version control if you care about reproducible templates.

---

## 4. Cross-cutting token and URL consistency

These must stay **aligned across files/env**:

1. **`zeroDayConfiguration.accessToken`** (backend YAML) = **`APIHUB_API_KEY`** (builder) = **`APIHUB_ACCESS_TOKEN`** (linter) = **`APIHUB_ACCESS_TOKEN`** (agents backend) on greenfield Compose/Helm.
2. **`security.apihubExternalUrl`** (backend) = public HTTPS/HTTP origin users open = **`apihubUrl`** (Helm UI) ≈ Compose example **`http://host.docker.internal:8081`** (only for local desktops).
3. **`APIHUB_URL`** for linter and agents backend is **the Portal base URL reachable from inside their containers** (`http://qubership-apihub-ui:8080` in-cluster; `http://host.docker.internal:8081`-style patterns on Compose with published UI port).
4. **`GOMEMLIMIT`** on Go backends (backend, linter, agents-backend) should stay **below the container memory limit** — chart and Compose defaults use ~80% of the paired **`resource.memory.limit`** / Compose **`deploy.resources.limits.memory`**. When you raise memory limits, update **`goMemLimit`** (Helm) or **`GOMEMLIMIT`** (Compose) in the same change.

---

## 5. Where to drill deeper by topic

| Topic | Prefer |
|-------|--------|
| Auth / SAML / OIDC model | Backend [security_model.md](https://github.com/Netcracker/qubership-apihub-backend/blob/develop/docs/security/security_model.md), **`security.externalIdentityProviders`** in **`config.template.yaml`** |
| Data retention / cleanup jobs | Backend **`cleanup`** section + [data_maintenance](https://github.com/Netcracker/qubership-apihub-backend/blob/develop/docs/data_maintenance.md) |
| End user workflows | Portal & Agents Markdown guides ([Portal User Guide](https://github.com/Netcracker/qubership-apihub-ui/blob/develop/docs/Portal%20User%20Guide.md), [Agent User Guide](https://github.com/Netcracker/qubership-apihub-ui/blob/develop/docs/Agent%20User%20Guide.md)) + [Wiki](https://github.com/Netcracker/qubership-apihub/wiki) |
