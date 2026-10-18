# APIHUB Postman collections — Agent Instructions

Instructions for AI assistants working on **qubership-apihub-postman-collections** (Cursor, Claude Code, and compatible tools).

## What this repository is

This repo holds **Newman/Postman E2E tests** for the APIHUB backend. There is **no application source code** here — only Postman Collection v2.1 JSON, environment files, fixtures under `working-directory/`, and CI-oriented assets.

When the **qubership-apihub-backend** REST API changes (new endpoints, paths, payloads, status codes, or auth), update the matching requests and `pm.test` / `pm.expect` assertions in this repository.

## Backend documentation (read before editing collections)

| Topic | Location |
|-------|----------|
| Postman collections overview | [qubership-apihub-backend/docs/postman_collections.md](https://github.com/Netcracker/qubership-apihub-backend/blob/main/docs/postman_collections.md) |
| When to update E2E tests | [qubership-apihub-backend/docs/agent/related-repositories.md](https://github.com/Netcracker/qubership-apihub-backend/blob/main/docs/agent/related-repositories.md) |
| OpenAPI contracts | [qubership-apihub-backend/docs/api/](https://github.com/Netcracker/qubership-apihub-backend/tree/main/docs/api) |
| Local setup / Newman | [README.md](README.md) in this repo |

## Clarification before editing

- Do **not** change collections until requirements are clear (endpoint, expected status, response shape, auth).
- State assumptions explicitly when the OpenAPI spec or ticket is ambiguous.

## Repository layout (quick reference)

| Path | Purpose |
|------|---------|
| `e2e/` | Regression collections (smoke, negative, linter, access control, stories) |
| `Syntetic_test_data.postman_collection.json` | Seed/cleanup test workspaces and packages |
| `environment/` | `Env1.postman_environment.json` (local), `local.postman_environment.json` (CI template) |
| `use_cases/` | Additional scenario collections |

## CI execution

Collections are run by the reusable workflow **run-e2e-tests** in [qubership-apihub-ci](https://github.com/Netcracker/qubership-apihub-ci/blob/main/.github/workflows/run-e2e-tests.yml) via the `postman-collections-list` input (comma-separated paths). Default CI run uses `./e2e/1_1_Smoke_Portal.postman_collection.json`.

## Skills and conventions

- **postman-e2e-authoring** — Newman/Postman v2.1 structure, test scripts, environments, and CI wiring (triggered on `**/*.json` and `e2e/**`).
- Shared packages from APM: English developer style, markdown line length, common conventions, GitHub ticket planner.

Regenerate installed agent artifacts after changing `apm.yml` or local agent packages:

```bash
apm install --target cursor,claude --legacy-skill-paths --force
```

## GitHub CLI

Use **`gh`** for issues, pull requests, checks, and releases when working with this repository on GitHub.
