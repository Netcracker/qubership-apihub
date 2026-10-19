# Related modules in the monorepo

Backend features often require follow-up in **other modules of this monorepo**. Agents must **remind** the developer
with concrete actions and links, and make the follow-up change in the same pull request when it is in scope.

All paths below are relative to the repository root (`../../../../` from this file).

## Module map

| Area | Path | Notes |
|------|------|-------|
| Helm chart and local Kubernetes quickstart | [`deploy/helm-templates/`](../../../../deploy/helm-templates/) | Canonical Kubernetes contract |
| Docker Compose stacks | [`deploy/docker-compose/`](../../../../deploy/docker-compose/) | Same logical split as the chart |
| Configuration reference | [`docs/configuration-reference.md`](../../../../docs/configuration-reference.md) | Env names, ports, mounts |
| Newman E2E collections | [`tests/postman-collections/`](../../../../tests/postman-collections/) | API-level suite |
| Playwright UI tests | [`tests/ui-tests/`](../../../../tests/ui-tests/) | Browser tests |
| Web UI (Portal and Agents SPAs) | [`frontend/ui/`](../../../../frontend/ui/) | Consumes the REST API |
| Builder (NestJS) | [`frontend/build-task-consumer/`](../../../../frontend/build-task-consumer/) | Reads build tasks |
| Linter service | [`backend/api-linter-service/`](../../../api-linter-service/) | Called through `extensions` |
| Agents backend | [`backend/agents-backend/`](../../../agents-backend/) | Called through `extensions` |
| Shared Go library | [`backend/commons-go/`](../../../commons-go/) | Used by several services |

## Helm charts and Docker Compose

**Remind the developer to update the deployment assets when the backend change includes any of:**

- New or renamed **environment variables** or **secrets** (including defaults in `SystemInfoService` / config structs).
- New **feature flags** or config keys loaded at startup.
- New **ports**, health/readiness probes, or resource limits.
- New **background jobs**, cron schedules, or cleanup workers.
- New **volume mounts**, file paths, or object-storage settings.
- New **optional components** toggled at deploy time (e.g. AI chat enabled flag).

Update `deploy/helm-templates/`, `deploy/docker-compose/`, and `docs/configuration-reference.md` together (see the
root [`AGENTS.md`](../../../../AGENTS.md), section "Configuration discipline").

**Suggested reminder text (agent):**

> This change may require updates in the deployment assets: `deploy/helm-templates/`, `deploy/docker-compose/`, and
> `docs/configuration-reference.md`. Check env vars, values.yaml, and templates for new configuration.

## E2E / Postman integration tests

Canonical collections live in [`tests/postman-collections/`](../../../../tests/postman-collections/). The local
reference is `docs/postman_collections.md` and `docs/postman/` of this module (examples only).

**Remind the developer to update the E2E Postman collections when the change includes any of:**

- New or changed **REST endpoints** (method, path, query, headers).
- Changed **request or response** JSON shape or status codes.
- New **auth** or permission behavior worth asserting.
- New **error codes** or validation rules covered by integration tests.

**Suggested reminder text (agent):**

> Add or update requests and assertions in `tests/postman-collections/`. Align with OpenAPI changes in `docs/api/`.
