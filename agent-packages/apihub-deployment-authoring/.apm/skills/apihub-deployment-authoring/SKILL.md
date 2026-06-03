---
name: apihub-deployment-authoring
description: "Authors and updates APIHUB deployment assets in qubership-apihub: Helm values/templates, Docker Compose env wiring, docs/configuration-reference.md parity, local-k8s-quickstart, and optional extensions (linter, agents-backend). Use when changing helm-templates/, docker-compose/, or deployment docs under docs/."
---

# APIHub Deployment Authoring

Follow `AGENTS.md`. This repository is the **umbrella deployment project** — application
source code lives in sibling component repositories; do not implement Go/TS/UI features here.

## Workflow

1. **Identify the delivery surface** — Helm (production-oriented), Compose (local dev/test),
   or local-k8s-quickstart (developer/R&D only, not production).
2. **Read the configuration map** — [`docs/configuration-reference.md`](../../../../docs/configuration-reference.md)
   defines the hierarchy: Helm `values.yaml` → rendered Secrets/env → component loaders.
3. **Keep cross-file consistency** — tokens, URLs, and extension base URLs must align (see
   configuration reference § Cross-cutting token and URL consistency).
4. **Update docs in the same change** — when values/env names or behaviour change, update
   `docs/configuration-reference.md` and the relevant guide (`installation-guide.md`,
   `admin-guide.md`) so the map stays authoritative.

## Helm (`helm-templates/qubership-apihub/`)

- **`values.yaml`** is the canonical contract: `qubershipApihubBackend.env` renders into
  backend `config.yaml` via templates; UI, builder, linter, and agents-backend use pod env
  from their `*.env` sections.
- **Templates** — prefer extending existing `templates/qubership-*-deployment.yaml` and
  Secret/ConfigMap patterns; do not bypass the chart for supported production shapes.
- **Extensions** — default in-cluster DNS for linter and agents-backend; document Compose
  `host.docker.internal` equivalents when touching examples.
- **Images** — `repository` + `tag` under each component; match published `ghcr.io/netcracker/`
  images unless the task specifies overrides.

After chart edits, sanity-check against `docs/configuration-reference.md` § Helm table.

## Docker Compose (`docker-compose/`)

| Stack | Path | Notes |
|-------|------|-------|
| Generic | `apihub-generic/` | Default local rig |
| Keycloak SSO | `with-keycloak/` | SSO example; parallel env/YAML layout |

- **Backend** — `qubership-apihub-backend-config.yaml` mounted as `config.yaml`; placeholders
  `${JWT_PRIVATE_KEY}`, `${APIHUB_ACCESS_TOKEN}`, etc. via `generate_env_and_up_compose.sh`.
- **Per-service env** — `qubership-apihub-ui.env`, `qubership-apihub-build-task-consumer.env`,
  `qubership-api-linter-service.env`, `qubership-apihub-agents-backend.env`.
- **`APIHUB_API_KEY`** (builder) must match backend `zeroDayConfiguration.accessToken`.
- **`APIHUB_URL`** for linter/agents-backend is the Portal URL **reachable from their containers**
  (often `host.docker.internal` + published UI port on desktop Compose).
- **`extensions[].baseUrl`** in backend YAML must be reachable from users' browsers **and** from
  the backend process.

Do not treat Compose as replacing Helm for production install arguments.

## Local Kubernetes quickstart (`helm-templates/local-k8s-quickstart/`)

- **Not production-ready** — Kind/Rancher guides, overlay values, optional Superset chart.
- Entry: [`README.md`](../../../../helm-templates/local-k8s-quickstart/README.md) and
  `apihub-quickstart.sh` where present.
- Values templates: `local-k8s-values.yaml`, `with-keycloak-local-k8s-values.yaml`, secrets
  templates under `qubership-apihub/`.
- When changing quickstart assets, verify install/uninstall steps still match the README.

## Extensions (optional components)

| Extension | Helm values key | Compose env file | Component repo |
|-----------|-----------------|------------------|----------------|
| API Linter | `qubershipApiLinterService` | `qubership-api-linter-service.env` | qubership-api-linter-service |
| Agents backend | `qubershipApihubAgentsBackend` | `qubership-apihub-agents-backend.env` | qubership-apihub-agents-backend |

- Linter: **env-only** runtime config (no `config.yaml` mount in chart); Spectral rules are data,
  not boot config.
- Agents-backend: DB + `APIHUB_URL` / `APIHUB_ACCESS_TOKEN` + `SNAPSHOTS_*` schedule/TTL env names.

## Documentation parity

When adding or renaming a configuration knob:

1. Confirm the **authoritative loader** in the component repo (`config.template.yaml` for
   backend/agent, `system_info.go` for linter, env-only for UI/builder).
2. Update **`docs/configuration-reference.md`** tables (Helm mapping, Compose file list,
   cross-cutting consistency).
3. Link from **`docs/installation-guide.md`** when install steps change.
4. Keep line length ≤ **120** characters in Markdown (deployed `markdown-line-length-120` rule).

## Out of scope (redirect)

| Change type | Where to work |
|-------------|---------------|
| REST API, backend logic | qubership-apihub-backend |
| UI / Portal | qubership-apihub-ui |
| Build worker | qubership-apihub-build-task-consumer |
| Linter rules/engine code | qubership-api-linter-service |
| Cluster agent discovery | qubership-apihub-agent |
| Shared CI workflows / generic agent packages | qubership-apihub-ci |

Remind the developer when a deployment change implies a follow-up PR in a component repository.

## Completion checklist

- [ ] Helm values, templates, and/or Compose files updated consistently.
- [ ] Token/URL/extension URLs aligned across affected files.
- [ ] `docs/configuration-reference.md` (and guides if needed) updated.
- [ ] No application source code added under this umbrella repo.
- [ ] For GitHub tickets, `github-ticket-implementation-planner` was used before coding when applicable.
