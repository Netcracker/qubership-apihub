# Qubership APIHUB — administrator guide

Audience: **platform owners and SRE/DevOps** wiring APIHUB into an environment. Portal end users should start with the
[User guide](./user-guide.md) and the [Portal user guide](user-guide/portal.md).

---

## Documentation map

| Need | Read first |
|------|------------|
| Who reads YAML vs env at runtime (+ Helm precedence) | [Configuration reference](./configuration-reference.md) — **Source of truth hierarchy** |
| Install paths, ports | [Installation guide](./installation-guide.md) |
| Database backup and restore, TTL cleanup, migration analysis | [Maintenance guide](./maintenance-guide.md) |
| Security model, data maintenance, business metrics, static resource templates | [Administration topics](#administration-topics) |
| Architecture/features product context | [Architecture overview](architecture/overview.md), [root readme](../README.md) |

---

## Backend configuration file

The registry is configured through **`config.yaml`**, whose annotated super-set is
[**`config.template.yaml`**](../backend/portal-backend/config.template.yaml) (module: `backend/portal-backend/`).

### Operational routine

1. Maintain a **golden copy** separate from live secrets (Git ignores or sealed secrets), diff against the template when
   upgrading between product versions.
2. Keep **`security.apihubExternalUrl`** truthfully matching the hostname users type; mismatches break OAuth/SAML
   redirects and deep links.
3. **`extensions`** must list every sidecar the UI should hit (linter, agents-backend); `baseUrl` + `pathPrefix` pair
   must match what you publish (internal DNS in Kubernetes, `host.docker.internal` patterns in desktop Compose).
4. **`zeroDayConfiguration.accessToken`** bootstraps privileged automation; pair it with **`APIHUB_API_KEY`** /
   **`APIHUB_ACCESS_TOKEN`** variables in workers until you adopt service accounts or PAT-based automation from the
   product.

### Production mode

- With **`security.productionMode: true`** local APIHUB accounts cannot authenticate—plan IdP onboarding before flipping
  the flag.

---

## Kubernetes Helm operations

Chart: **`deploy/helm-templates/qubership-apihub/`**. Values file is self-commented.

- **Rolling configuration changes**: prefer `helm upgrade` with declarative **`values.yaml`** revision control; pods
  pick up regenerated Secrets/ConfigMaps.
- **Ingress/TLS**: `qubershipApihubUi.tlsIngress` bundles cert material; ACM/Let's Encrypt integrations are
  customer-specific — wire them into the secret Helm consumes.
- **Scaling builders**: adjust `qubershipApihubBuildTaskConsumer.replicas` alongside PostgreSQL saturation monitoring.
- **Prometheus**: `qubershipApihubBackend.env.monitoring.enabled` toggles `ServiceMonitor` creation when your Prometheus
  operator/stack expects that CRD.

---

## Docker Compose on workstations

Scripts under **`deploy/docker-compose/apihub-generic/`**:

- **`generate_env_and_up_compose.sh`** randomizes JWT, admin bootstrap, token, substitutes env files, launches Podman
  Compose. Assume **files mutate** unless you checkpoint them first.
- **Persistence**: follow readme guidance on **`PGDATA=/pgdata`**, `./data`, and Podman/WSL metadata for Windows mounts.
- **`host.docker.internal`**: unify browser URL, **`APIHUB_URL`**, **`extensions[].baseUrl`**, and SSO IdP redirects
  when mixing published ports vs internal DNS names.

---

## Extension services

| Extension | Operational note |
|-----------|-------------------|
| **API Linter** | Own PostgreSQL; Olric discovery mode mirrors backend guidelines; Spectral binaries ship in image (`linters.spectral.binPath` in `config.yaml`). Optional AI lint pulls OpenAI keys through `config.yaml` / Helm secret. |
| **Agents Backend** | Own PostgreSQL; **`cleanup.snapshots.schedule`** (`cron`) + **`cleanup.snapshots.ttlDays`** in `config.yaml` regulate snapshot retention. Align **`businessParameters.defaultWorkspaceId`** with a real workspace slug when cloning package trees after discovery |
| **K8s Agent** | Installed separately; config file from [`agent config.template.yaml`](../backend/agent/config.template.yaml); requires reachable **`agentUrl`**, **`cloudName`**, **`namespace`**, **`apihub.url`/`accessToken`**. |

---

## Security operations checklist

| Task | Guidance |
|------|----------|
| IdP onboarding | SAML metadata / OIDC client credentials live under **`externalIdentityProviders`**. Detailed flows: [**security-model.md**](administration/security-model.md). Keycloak Compose recipe: **`deploy/docker-compose/with-keycloak/`**. |
| Rotate JWT signing key | Plan user re-login sessions; coordinate with SSO session lifetime. Replace **`jwt.privateKey`**, bounce backend pods/deployments. |
| Rotate system token (the home for token handling; behavior is in [Access Tokens Management](design/package-settings/di-portal-ps-003-access-tokens-management.md)) | Change backend **`accessToken`**, the builder **`APIHUB_API_KEY`**, and linter / agents-backend **`technicalParameters.apihub.accessToken`** concurrently; regenerate the Helm config Secrets (`build-task-consumer`, linter, agents-backend). |
| Playground proxy hardening | Keep **`security.insecureProxy`** / **`allowedHostsForProxy`** tight; never expose unsafe proxy settings on untrusted networks. |

---

## Log format

Every service writes log lines in one format. The timestamp is UTC:

```text
[2026-10-28T14:03:12.345] [INFO] [request_id=7f3c] [tenant_id=] [thread_id=] [class=] Package version published
```

| Field | Go services | `java-task-consumer` | `build-task-consumer` | UI (nginx access log) |
|---|---|---|---|---|
| Level | `TRACE` to `PANIC` | `TRACE` to `ERROR` | `TRACE` to `FATAL` | always `INFO` |
| `request_id` | `X-Request-Id` of the request, when the log call passes the request context | empty | empty | `X-Request-Id` header |
| `tenant_id` | empty | empty | empty | empty |
| `thread_id` | empty | thread name | empty | empty |
| `class` | empty | logger name | Nest logger context | empty |

A multi-line message, such as a stack trace, keeps its lines; only the first line has the prefix. Go services append
structured fields after the message as `key=value`. The nginx error log keeps the native nginx format.

---

## Support data pack (when opening issues)

Gather **chart version/tag**, sanitized **`values.yaml`**, **`kubectl describe`** for failing workloads,
**`config.yaml`** with secrets stripped, Compose file set if reproducible desktop case, PostgreSQL logs for migration
failures.

---

## Administration topics

| Topic | Page |
|-------|------|
| Authentication, authorization, and roles | [Security model](administration/security-model.md) |
| Cleanup jobs and data retention | [Data maintenance](administration/data-maintenance.md) |
| Usage-oriented business metrics | [Business metrics](administration/business-metrics.md) |
| AI prompt and document templates bundled in the image | [Static resources customization](administration/static-resources-customization.md) |
| Fixing published sources after the fact | [Modify published sources](administration/modify-published-sources.md) |
| Stored-spec migration jobs | [Operations migration analysis](administration/operations-migration-analysis.md) |
| Feature behavior behind the settings | [Design items](design/README.md) |

---

See also the **[Maintenance guide](./maintenance-guide.md)** for database backup and restore, cleanup, and migration
analysis.
