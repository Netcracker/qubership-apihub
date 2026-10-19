# APIHUB Postman collections — Agent Instructions

Instructions for AI assistants working on `tests/postman-collections` of the qubership-apihub monorepo (Cursor,
Claude Code, and compatible tools). Follow the root [`AGENTS.md`](../../AGENTS.md) and
[`tests/AGENTS.md`](../AGENTS.md).

## What this module is

**Newman/Postman E2E tests** for the APIHUB backend. There is **no application source code** here: only Postman
Collection v2.1 JSON, environment files, fixtures under `working-directory/`, and CI-oriented assets.

When the REST API of `backend/portal-backend` changes (new endpoints, paths, payloads, status codes, or auth),
update the matching requests and `pm.test` / `pm.expect` assertions here, in the same change.

## Backend documentation (read before editing collections)

| Topic | Location |
|-------|----------|
| Postman collections overview | [`backend/portal-backend/docs/postman_collections.md`](../../backend/portal-backend/docs/postman_collections.md) |
| When to update E2E tests | [`backend/portal-backend/docs/agent/related-repositories.md`](../../backend/portal-backend/docs/agent/related-repositories.md) |
| OpenAPI contracts | [`backend/portal-backend/docs/api/`](../../backend/portal-backend/docs/api/) |
| Local setup / Newman | [README.md](README.md) in this module |

## Clarification before editing

- Do **not** change collections until requirements are clear (endpoint, expected status, response shape, auth).
- State assumptions explicitly when the OpenAPI spec or ticket is ambiguous.

## Layout (quick reference)

| Path | Purpose |
|------|---------|
| `e2e/` | Regression collections (smoke, negative, linter, access control, stories) |
| `Syntetic_test_data.postman_collection.json` | Seed and cleanup test workspaces and packages |
| `environment/` | `Env1.postman_environment.json` (local), `local.postman_environment.json` (CI template) |
| `use_cases/` | Additional scenario collections |
| `working-directory/` | Fixtures the collections upload |

## Build and test

This module is not an Nx project and has no build. Run a collection with Newman against a running stack (see
`README.md` for the user and the `at-api-key` variable). CI installs `newman@6.2.3`:

```bash
newman run tests/postman-collections/e2e/1_1_Smoke_Portal.postman_collection.json \
  -e tests/postman-collections/environment/Env1.postman_environment.json
```

CI runs the collections through `.github/workflows/e2e-tests-compose.yml`, `e2e-tests-kind.yml`, and
`e2e-tests-manual.yml` (input `postman_collections`, comma-separated paths under `tests/postman-collections`).
The default run is `e2e/1_1_Smoke_Portal.postman_collection.json`.

## Traps

- Collections are JSON with embedded scripts: keep the diff small, do not let an export tool reformat the whole
  file.
- `Syntetic_test_data.postman_collection.json` creates and removes the shared workspace and packages; check it
  before you rename or delete anything the e2e collections read.
- Never commit real tokens or passwords; the environment files hold placeholders only.

## Agent packages

Local packages (`agent-packages/`):

- `postman-e2e-authoring` (skill and rule for `tests/postman-collections/**/*.json` and `e2e/**`): use when adding
  or changing requests, assertions, test data, or environment variables.
- `postman-e2e-followup` (skill and rule for `backend/portal-backend/docs/api/**` and `controller/**`): use after a
  REST or OpenAPI change in the backend, to decide what the collections need.

Other packages: `advanced-verification` (skill, `backend/portal-backend`) builds a new collection to verify a
backend change end to end. Store packages: `development-conventions`, `github-ticket-implementation-planner`,
`english-developer-style`, `markdown-line-length-120`.

Deploy local packages with `apm install --target cursor,claude --legacy-skill-paths` from the repository root
(never `apm compile`).
