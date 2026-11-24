# API sources for functional design

Search in this order. Prefer an OpenAPI operation with a clear `summary` over guessing from UI copy.

## Portal (API Registry)

| Source | Path | Use for |
| ------ | ---- | ------- |
| **Primary OpenAPI** | `backend/portal-backend/docs/api/APIHUB_API.yaml` | Almost all Portal REST the UI calls |
| Internal OpenAPI | `backend/portal-backend/docs/api/APIHUB_API_internal.yaml`, `Admin API.yaml` | Internal and admin routes |
| Go wiring | `backend/portal-backend/` controllers, services | Confirm path, permission checks, when spec is ambiguous |
| UI callers | see below | See which hook hits which path for a screen |

Portal UI calls REST from several places; grep for `requestJson`, `requestVoid`, or the path:

- `frontend/ui/packages/portal/src/api-hooks/`
- `frontend/ui/packages/portal/src/routes/**/api/` and the `use*.ts` hooks next to the pages
- `frontend/ui/packages/shared/src/hooks/` and `frontend/ui/packages/shared/src/widgets/**/api/`
- `frontend/ui/packages/portal/src/mocks/handlers/`: MSW mocks, a quick index of the paths the UI uses

**Link from a file in `docs/design/<area>/` to the spec** (repo-relative):

`../../../backend/portal-backend/docs/api/APIHUB_API.yaml`

In wiki-style `docs/design` items, Related API bullets often look like:

`Create workspace (POST /api/v2/packages)` with an optional markdown link to the YAML file.

## Other backend services

| Service | OpenAPI |
| ------- | ------- |
| API Linter | `backend/api-linter-service/docs/api/linter_service_api.yaml`, `admin_api.yaml` |
| Agents backend | `backend/agents-backend/docs/api/Agents-Backend-API.yaml`, `Admin-API.yaml` |
| Agent (discovery sidecar) | `backend/agent/docs/api/Admin-API.yaml` |

Extensions and plugins (JavaAPI Library, API Linter plugin) may use Portal routes **plus** feature flags or
extension URLs in `portal-backend` config — trace in code when the FD names a plugin.

## What counts as evidence

| Confidence | Meaning |
| ---------- | ------- |
| **Verified** | Operation exists in OpenAPI; summary/path match the FD row |
| **Inferred** | UI hook or Go handler found; weak or partial OpenAPI summary |
| **Draft** | FD describes planned behaviour; no operation in OpenAPI — mark **TBD** or **Draft:** |
| **Client-only** | No REST (pure UI validation, routing) — state rule in API / Logic column |

## FD field targets

| Template | Fill |
| -------- | ---- |
| Metadata **Related API** | Distinct endpoints used across the feature (human label + METHOD path) |
| T1 **Execution** | `API to … — METHOD /path` under the step |
| T2/T3 **API / Logic** | Per-row endpoint or logic; one primary call per row when possible |

Do not paste full request schemas into the FD unless the user asks. Name method, path, and 1–3 decisive params.

## Search tactics

1. Grep OpenAPI for nouns from the Use Case (package, version, library, operation, export).
2. Grep `APIHUB_API.yaml` for path prefix (`/api/v2/packages`, `/api/v2/versions`, `/api/v3/`).
3. Grep the Portal UI callers listed above for the path or the hook name of the feature.
4. If multiple operations match, pick the one the **happy path** row describes; list alternates in the trace report.
