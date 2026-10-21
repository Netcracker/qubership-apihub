# Tests

The end-to-end suites of APIHUB. They hold no product code and run against a deployed stack: Docker Compose or Kind.

| Suite | What it covers | Runner |
|-------|----------------|--------|
| [`postman-collections`](postman-collections/README.md) | The REST API of the portal backend and the agent | Newman 6.2.3 |
| [`ui-tests`](ui-tests/README.md) | The Portal and Agents SPAs in a browser | Playwright |

`ui-tests` is part of the pnpm workspace as an Nx project. `postman-collections` is not an Nx project.

## Newman collections

`tests/postman-collections/e2e/` holds the regression collections, numbered by purpose:

| Collection | Purpose |
|------------|---------|
| `1_1_Smoke_Portal` | Smoke test of the Portal API |
| `1_2_Smoke_Agent` | Smoke test of the agent; needs the agent, so Kind only |
| `1_3_Linter_Portal` | Linter integration |
| `2_1_Negative_Portal`, `2_2_Negative_Agent` | Negative cases of the Portal API and the agent |
| `3_1_Stories_Bugs`, `3_2_Stories_Bugs` | Regression cases of stories and bugs |
| `4_Access_control` | Roles and permissions |

Other files:

- `Syntetic_test_data.postman_collection.json` creates sample data fast. Its "Create Test Data" folder makes one
  workspace, one package with two versions that have every kind of change, and one dashboard with two package versions.
  Run it as often as you need more data. Its "Cleanup Test Data" folder removes the workspace and everything in it.
- `use_cases/` holds scenario collections, `environment/` the Postman environments, and `working-directory/` the
  fixture files.

To start, create a test internal user and an API key with system administrator rights. Put the user in the environment
file and the key in the `at-api-key` variable. The deployment can create both: see `APIHUB_ADMIN_EMAIL`,
`APIHUB_ADMIN_PASSWORD`, and `APIHUB_ACCESS_TOKEN` in the [installation guide](../docs/installation-guide.md).

## Playwright tests

`ui-tests` has these Playwright projects: `Portal`, `Agent`, `ADV-operations`, `ADV-comparisons`, and `Cleanup`. The
Agent project needs a running agent and a Kubernetes cloud it can discover. The minimum variables are `BASE_URL` and
`TEST_USER_PASSWORD`; the module README lists the rest. Tests tagged `@flaky` are excluded from CI runs, and `@smoke`
marks the smoke subset.

## How CI runs them

The `plan` job of `ci.yml` picks an E2E tier once per commit:

| Event | Tier |
|-------|------|
| Pull request | `full`; `none` when only `docs/` or Markdown files changed |
| Push to `release` | `full` |
| Push to any other branch | `none`; the pull request run covers the commit |

The `full` tier installs the Helm charts on Kind, runs the default Newman collections, and then the Playwright
`Portal` project without `@flaky` tests. Both suites run even when one fails, and every report is uploaded as an
artifact. The Kind run takes about 45 minutes. The workflows and the artifacts are in [CI](../docs/development/ci.md).

## Manual runs

`e2e-tests-manual.yml` ("E2E: Run tests (manual)") runs the suites against images you name. It builds and publishes
nothing and gates nothing. A schedule starts it every night at 00:00 UTC with the defaults. Start it from **Actions >
E2E: Run tests (manual) > Run workflow** or with `gh workflow run`.

| Input | Default | Meaning |
|-------|---------|---------|
| `runtime` | `kind` | `kind`, `compose` (`apihub-generic`), or `compose-keycloak` (`with-keycloak`); Compose runs no agent |
| `deploy-ref` | `main` | Ref of `deploy/` and of the agent chart |
| `image-tags` | every key `dev` | JSON object with `backend`, `buildTaskConsumer`, `ui`, `apiLinterService`, `agentsBackend`, and `agent` |
| `suites` | `all` | `all`, `postman`, or `playwright` |
| `postman-ref` | `develop` | Ref of `tests/postman-collections` |
| `postman-collections` | empty | Comma-separated collections; empty means the default list of the runtime |
| `playwright-ref` | `develop` | Ref of `tests/ui-tests` |
| `playwright-args` | empty | Arguments of `playwright test`; empty means `--project=Portal --grep-invert=@flaky` |
| `agent` | `true` | Deploy the agent and run its collection (Kind only) |

[CI](../docs/development/ci.md#manual-e2e) has the details and examples.

## Run locally

Start a stack as described in [Run APIHUB locally](../docs/development/local-run.md), then follow
[Debugging](../docs/development/debugging.md): it shows how to run one Newman collection and how to open Playwright in
UI mode. The environment variables of `ui-tests` are in its [README](ui-tests/README.md#environment-variables).

## Manual regression cases

[`ui-tests/docs/regression/`](ui-tests/docs/regression/) holds the regression cases that people run by hand for
features without an automated test, such as the linter, personal access tokens, and the playground.

## When to update the suites

- A change to the REST contract of `backend/portal-backend` usually needs the Newman collections updated, in the same
  pull request, together with the OpenAPI specification in `backend/portal-backend/docs/api/`.
- A change to visible behavior of `frontend/ui` usually needs `ui-tests` updated.
