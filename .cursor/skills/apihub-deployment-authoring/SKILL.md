---
name: apihub-deployment-authoring
description: "Authors and updates APIHUB deployment assets in the qubership-apihub monorepo: Helm values and templates, Docker Compose env wiring, docs/configuration-reference.md parity, local-k8s-quickstart, and optional extensions (linter, agents-backend). Use when changing deploy/helm-templates/, deploy/docker-compose/, or deployment docs under docs/."
---

# APIHub Deployment Authoring

Follow `AGENTS.md`, `deploy/AGENTS.md`, and the module file of the delivery surface you change. The deployment
assets and the application source live in this one repository: when a service changes its config, env, ports, or
mounted files, update the assets in the same change. Application features themselves belong in the module that owns
them (`backend/`, `frontend/`).

## Workflow

1. **Identify the delivery surface** — Helm (production-oriented), Compose (local dev/test),
   or local-k8s-quickstart (developer/R&D only, not production).
2. **Read the configuration map** — [`docs/configuration-reference.md`](../../../../../docs/configuration-reference.md)
   defines the hierarchy: Helm `values.yaml` → rendered Secrets/env → component loaders.
3. **Keep cross-file consistency** — tokens, URLs, and extension base URLs must align (see
   configuration reference § Cross-cutting token and URL consistency).
4. **Update docs in the same change** — when values/env names or behaviour change, update
   `docs/configuration-reference.md` and the relevant guide (`installation-guide.md`,
   `admin-guide.md`) so the map stays authoritative.

## Helm (`deploy/helm-templates/qubership-apihub/`)

- **`values.yaml`** is the canonical contract: `qubershipApihubBackend.env`,
  `qubershipApiLinterService.env`, and `qubershipApihubAgentsBackend.env` each render into a
  service `config.yaml` via templates (mounted from a config Secret); UI and builder use pod env
  from their `*.env` sections.
- **Templates** — prefer extending existing `templates/qubership-*-deployment.yaml` and
  Secret/ConfigMap patterns; do not bypass the chart for supported production shapes.
- **Extensions** — default in-cluster DNS for linter and agents-backend; document Compose
  `host.docker.internal` equivalents when touching examples.
- **Images** — `repository` + `tag` under each component; match published `ghcr.io/netcracker/`
  images unless the task specifies overrides.

After chart edits, sanity-check against `docs/configuration-reference.md` § Helm table, and run `helm lint` and
`helm template` when Helm is installed (say so when it is not).

## Docker Compose (`deploy/docker-compose/`)

| Stack | Path | Notes |
|-------|------|-------|
| Generic | `apihub-generic/` | Default local rig |
| Keycloak SSO | `with-keycloak/` | SSO example; parallel env/YAML layout |
| GitLab | `with-gitlab/` | Backend config example only |

- **Config-file services** — `qubership-apihub-backend-config.yaml`,
  `qubership-api-linter-service-config.yaml`, and `qubership-apihub-agents-backend-config.yaml`
  are each mounted as `config.yaml`; placeholders (`${JWT_PRIVATE_KEY}`, `${APIHUB_ACCESS_TOKEN}`,
  `${OPENAI_TOKEN}`, …) are substituted by `generate_env_and_up_compose.sh`.
- **Per-service env** — `qubership-apihub-ui.env`, `qubership-apihub-build-task-consumer.env`.
- **`APIHUB_API_KEY`** (builder) must match backend `zeroDayConfiguration.accessToken`.
- **`technicalParameters.apihub.url`** for linter/agents-backend is the Portal URL **reachable
  from their containers** (often `host.docker.internal` + published UI port on desktop Compose).
- **`extensions[].baseUrl`** in backend YAML must be reachable from users' browsers **and** from
  the backend process.

Do not treat Compose as replacing Helm for production install arguments. Check a file with
`docker compose -f <file> config` when Docker is available.

## Local Kubernetes quickstart (`deploy/helm-templates/local-k8s-quickstart/`)

- **Not production-ready** — Kind/Rancher guides, overlay values, optional Superset chart.
- Entry: [`README.md`](../../../../../deploy/helm-templates/local-k8s-quickstart/README.md) and
  `apihub-quickstart.sh`, `apihub-with-keycloak-quickstart.sh`.
- Values templates and secrets templates sit under `qubership-apihub/` and the other folders there.
- When changing quickstart assets, verify install/uninstall steps still match the README.

## Extensions (optional components)

| Extension | Helm values key | Compose config file | Module |
|-----------|-----------------|---------------------|--------|
| API Linter | `qubershipApiLinterService` | `qubership-api-linter-service-config.yaml` | `backend/api-linter-service` |
| Agents backend | `qubershipApihubAgentsBackend` | `qubership-apihub-agents-backend-config.yaml` | `backend/agents-backend` |

- Both extensions load a `config.yaml` (the `*.env` value block rendered into a config Secret on
  Helm; a mounted file on Compose) and read only `LOG_LEVEL`, `GOMEMLIMIT`, and `*_CONFIG_FOLDER`
  from pod env.
- Linter `config.yaml`: `database`, `technicalParameters.apihub.*`, `linters.spectral.*`,
  `linters.ai.*`, and `olric.*`. Spectral rulesets stay data managed through the linter API.
- Agents-backend `config.yaml`: `database`, `technicalParameters.apihub.*`,
  `businessParameters.defaultWorkspaceId`, `security.*`, and `cleanup.snapshots.{schedule,ttlDays}`.

## Documentation parity

When adding or renaming a configuration knob:

1. Confirm the **authoritative loader** in the owning module (`config.template.yaml` for backend, agent,
   linter, and agents-backend; env-only for UI/builder).
2. Update **`docs/configuration-reference.md`** tables (Helm mapping, Compose file list,
   cross-cutting consistency).
3. Link from **`docs/installation-guide.md`** when install steps change.
4. Keep line length ≤ **120** characters in Markdown (deployed `markdown-line-length-120` rule).

## Out of scope (redirect)

| Change type | Where to work |
|-------------|---------------|
| REST API, backend logic | `backend/portal-backend` |
| UI / Portal | `frontend/ui` |
| Build worker | `frontend/build-task-consumer` |
| Linter rules/engine code | `backend/api-linter-service` |
| Cluster agent discovery | `backend/agent` |
| Adding a whole Go service | `apihub-add-go-service` skill |

Do the deployment edit in the same change as the module edit that causes it.

## Completion checklist

- [ ] Helm values, templates, and/or Compose files updated consistently.
- [ ] Token/URL/extension URLs aligned across affected files.
- [ ] `docs/configuration-reference.md` (and guides if needed) updated.
- [ ] No application source code added under `deploy/`.
- [ ] For GitHub tickets, `github-ticket-implementation-planner` was used before coding when applicable.
