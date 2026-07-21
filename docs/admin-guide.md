# Qubership APIHUB — administrator guide

Audience: **platform owners and SRE/DevOps** wiring APIHUB into an environment. Portal end users should start with the [User guide](./user-guide.md) and the [Portal User Guide upstream](https://github.com/Netcracker/qubership-apihub-ui/blob/develop/docs/Portal%20User%20Guide.md).

---

## Documentation map

| Need | Read first |
|------|------------|
| Who reads YAML vs env at runtime (+ Helm precedence) | [Configuration reference](./configuration-reference.md) — **Source of truth hierarchy** |
| Install paths, ports | [Installation guide](./installation-guide.md) |
| Backups, TTL, auth deep links | [Maintenance guide](./maintenance-guide.md) |
| Architecture/features product context | [Wiki](https://github.com/Netcracker/qubership-apihub/wiki), [root README](../README.md) |

---

## Backend configuration file

The registry is configured through **`config.yaml`**, whose annotated super-set is [**`config.template.yaml`**](https://github.com/Netcracker/qubership-apihub-backend/blob/develop/qubership-apihub-service/config.template.yaml) (clone: `../qubership-apihub-backend/qubership-apihub-service/`).

**Operational routine**

1. Maintain a **golden copy** separate from live secrets (git ignores or sealed secrets), diff against the template when upgrading between product versions.
2. Keep **`security.apihubExternalUrl`** truthfully matching the hostname users type; mismatches break OAuth/SAML redirects and deep links.
3. **`extensions`** must list every sidecar the UI should hit (linter, agents-backend); `baseUrl` + `pathPrefix` pair must match what you publish (internal DNS in Kubernetes, `host.docker.internal` patterns in desktop Compose).
4. **`zeroDayConfiguration.accessToken`** bootstraps privileged automation; pair it with **`APIHUB_API_KEY`** / **`APIHUB_ACCESS_TOKEN`** variables in workers until you adopt service accounts or PAT-based automation from the product.

**Production mode**

- With **`security.productionMode: true`** local APIHUB accounts cannot authenticate—plan IdP onboarding before flipping the flag.

---

## Kubernetes Helm operations

Chart: **`helm-templates/qubership-apihub/`**. Values file is self-commented.

- **Rolling configuration changes**: prefer `helm upgrade` with declarative **`values.yaml`** revision control; pods pick up regenerated Secrets/ConfigMaps.
- **Ingress/TLS**: `qubershipApihubUi.tlsIngress` bundles cert material; ACM/Let's Encrypt integrations are customer-specific — wire them into the secret Helm consumes.
- **Scaling builders**: adjust `qubershipApihubBuildTaskConsumer.replicas` alongside PostgreSQL saturation monitoring.
- **Prometheus**: `qubershipApihubBackend.env.monitoring.enabled` toggles `ServiceMonitor` creation when your Prometheus operator/stack expects that CRD.

---

## Docker Compose on workstations

Scripts under **`docker-compose/apihub-generic/`**:

- **`generate_env_and_up_compose.sh`** randomizes JWT, admin bootstrap, token, substitutes env files, launches Podman Compose. Assume **files mutate** unless you checkpoint them first.
- **Persistence**: follow README guidance on **`PGDATA=/pgdata`**, `./data`, and Podman/WSL metadata for Windows mounts.
- **`host.docker.internal`**: unify browser URL, **`APIHUB_URL`**, **`extensions[].baseUrl`**, and SSO IdP redirects when mixing published ports vs internal DNS names.

---

## Extension services

| Extension | Operational note |
|-----------|-------------------|
| **API Linter** | Own PostgreSQL; Olric discovery mode mirrors backend guidelines; Spectral binaries ship in image (`linters.spectral.binPath` in `config.yaml`). Optional AI lint pulls OpenAI keys through `config.yaml` / Helm secret. |
| **Agents Backend** | Own PostgreSQL; **`cleanup.snapshots.schedule`** (`cron`) + **`cleanup.snapshots.ttlDays`** in `config.yaml` regulate snapshot retention. Align **`businessParameters.defaultWorkspaceId`** with a real workspace slug when cloning package trees after discovery |
| **K8s Agent** | Installed separately; config file from [`agent config.template.yaml`](https://github.com/Netcracker/qubership-apihub-agent/blob/develop/qubership-apihub-agent/config.template.yaml); requires reachable **`agentUrl`**, **`cloudName`**, **`namespace`**, **`apihub.url`/`accessToken`**. |

---

## Security operations checklist

| Task | Guidance |
|------|----------|
| IdP onboarding | SAML metadata / OIDC client credentials live under **`externalIdentityProviders`**. Detailed flows: [**security_model.md**](https://github.com/Netcracker/qubership-apihub-backend/blob/develop/docs/security/security_model.md). Keycloak Compose recipe: **`docker-compose/with-keycloak/`**. |
| Rotate JWT signing key | Plan user re-login sessions; coordinate with SSO session lifetime. Replace **`jwt.privateKey`**, bounce backend pods/deployments. |
| Rotate system token | Change backend **`accessToken`**, the builder **`APIHUB_API_KEY`**, and linter / agents-backend **`technicalParameters.apihub.accessToken`** concurrently; regenerate the Helm config Secrets (`build-task-consumer`, linter, agents-backend). |
| Playground proxy hardening | Keep **`security.insecureProxy`** / **`allowedHostsForProxy`** tight; never expose unsafe proxy settings on untrusted networks. |

---

## Support data pack (when opening issues)

Gather **chart version/tag**, sanitized **`values.yaml`**, **`kubectl describe`** for failing workloads, **`config.yaml`** with secrets stripped, Compose file set if reproducible desktop case, PostgreSQL logs for migration failures.

---

See also **[Maintenance guide](./maintenance-guide.md)** for scripted backup tables and housekeeping links into backend documentation.
