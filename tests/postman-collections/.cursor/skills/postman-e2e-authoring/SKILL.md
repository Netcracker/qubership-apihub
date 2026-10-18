---
name: postman-e2e-authoring
description: "Authors and maintains APIHUB backend Newman/Postman v2.1 collections, test scripts (pm.test/pm.expect), environments, and CI wiring. Use when adding or changing E2E requests, assertions, test data, or environment variables for qubership-apihub-postman-collections."
---

# Postman E2E authoring

Follow `AGENTS.md` and project rules. This repository contains **no application code** — only Postman collections and environments executed by Newman in CI.

## Collection format

- Use Postman Collection **v2.1** (`info.schema`: `https://schema.getpostman.com/json/collection/v2.1.0/collection.json`).
- Organize folders with numeric prefixes for execution order (e.g. `0. Init`, `1. Smoke`).
- Prefer `{{SERVER_HOST}}` and other variables from the active environment — avoid hard-coded hosts in requests.

## Test scripts

- Put assertions in the request **Tests** tab (`event` with `listen: "test"`).
- Use `pm.test("description", function () { ... })` and Chai-style `pm.expect(...)` (Newman runs the same runtime as Postman).
- Use **prerequest** scripts only for setup (tokens, IDs, dynamic URLs); keep assertions in **test** scripts.
- Parse JSON safely: `const data = pm.response.json();` inside try/catch or guard on status when bodies may be empty.
- Chain state via `pm.environment.set("key", value)` (e.g. `token` after login). Do not rely on collection variables for secrets in CI.

## Environments

| File | Purpose |
|------|---------|
| `environment/Env1.postman_environment.json` | Local/manual runs; set `Username`, `Password`, `SERVER_HOST`, and `at-api-key` per README |
| `environment/local.postman_environment.json` | Template for CI: placeholders substituted with `envsubst` in `run-e2e-tests.yml` |
| `environment/local_k8s.postman_environment.json` | K8s-oriented host defaults when needed |

CI runs Newman with `./ci.postman_environment.json` produced from `local.postman_environment.json` and deploy secrets (`APIHUB_ADMIN_EMAIL`, `APIHUB_ADMIN_PASSWORD`, `APIHUB_ACCESS_TOKEN`, `JWT_PRIVATE_KEY`).

## Repository layout

| Path | Role |
|------|------|
| `e2e/` | Regression collections (smoke, negative, linter, access control, stories/bugs) |
| `Syntetic_test_data.postman_collection.json` | Fast workspace/package/dashboard seed data and cleanup |
| `use_cases/` | Focused scenario collections (e.g. shareability) |
| `working-directory/` | Fixture payloads referenced by requests |
| `environment/` | Postman environment JSON files |

### E2E collections (`e2e/`)

| Collection | Focus |
|------------|--------|
| `1_1_Smoke_Portal.postman_collection.json` | Portal smoke |
| `1_2_Smoke_Agent.postman_collection.json` | Agent smoke |
| `1_3_Linter_Portal.postman_collection.json` | Linter integration |
| `2_1_Negative_Portal.postman_collection.json` | Portal negative cases |
| `2_2_Negative_Agent.postman_collection.json` | Agent negative cases |
| `3_1_Stories_Bugs.postman_collection.json` | Story/bug regressions |
| `4_Access_control.postman_collection.json` | Permissions / access control |

### Synthetic test data

`Syntetic_test_data.postman_collection.json` (note spelling) provides:

- **Create Test Data** — creates workspace `001 Test Workspace`, a package with two versions, and a dashboard.
- **Cleanup Test Data** — removes entities for that workspace.

Run create as many times as needed; run cleanup before re-seeding a clean slate.

## CI wiring (`qubership-apihub-ci`)

Workflow: [run-e2e-tests.yml](https://github.com/Netcracker/qubership-apihub-ci/blob/main/.github/workflows/run-e2e-tests.yml)

- Input `postman-repository-url` defaults to this repo.
- Input `postman-collections-list` is a **comma-separated** list of collection paths relative to the repo root (no spaces), e.g. `./e2e/1_1_Smoke_Portal.postman_collection.json`.
- Default collection in CI is only smoke portal; full regression requires passing a longer list when calling the workflow.
- Newman command pattern: `newman run "$collection" -e ./ci.postman_environment.json -x --reporters cli,htmlextra`.
- HTML reports land under `reports/` (gitignored).

When adding a new regression collection, update any workflow callers that should run it and document the path in the PR description.

## Aligning with backend REST changes

Before changing requests or assertions:

1. Read the canonical OpenAPI specs in **qubership-apihub-backend** (`docs/api/APIHUB_API.yaml`, `Admin API.yaml`, `APIHUB_API_internal.yaml` as applicable).
2. Match method, path, query, headers, and status codes to the spec; update request bodies when schemas change.
3. See backend docs: [postman_collections.md](https://github.com/Netcracker/qubership-apihub-backend/blob/main/docs/postman_collections.md) and [related-repositories.md](https://github.com/Netcracker/qubership-apihub-backend/blob/main/docs/agent/related-repositories.md).

## Checklist for a new or updated request

1. Correct URL path and auth (Bearer `{{token}}`, `at-api-key`, or basic per flow).
2. At least one `pm.test` covering the expected status code and critical JSON fields.
3. Environment variables documented if new keys are required.
4. If the change fixes a backend bug, add or extend coverage in the most specific `e2e/` collection.
5. Run locally with Newman or Postman against a running APIHUB instance before opening a PR.
