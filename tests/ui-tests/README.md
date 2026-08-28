# APIHUB UI auto-tests (Playwright)

Playwright-based test project for APIHUB UI:

- Portal UI end-to-end tests (`--project=Portal`)
- Agent UI end-to-end tests (`--project=Agent`)
- ADV smoke-style checks (`ADV-operations`, `ADV-comparisons`)
- Cleanup project (`--project=Cleanup`)

## Quick start

### Prerequisites

- Playwright system deps: see [Playwright system requirements](https://playwright.dev/docs/intro#system-requirements)
- Node.js + npm

### Install

```Shell
npm ci
```

```Shell
npx playwright install
```

### Configure environment

`.env` is supported (recommended for local runs).

Minimum required variables:

- `BASE_URL`
- `TEST_USER_PASSWORD`
- `AGENT_TEST_CLOUD` (Agent tests only)
- `ADV_FILE` (`ADV-operations` / `ADV-comparisons` projects only)
- `PLAYGROUND_BACKEND_HOST` (localhost / Docker Compose; see [docs/localhost-run.md](docs/localhost-run.md))

See [Environment variables](#environment-variables) for the full list.

### Run Portal end-to-end tests

```Shell
npx playwright test --project=Portal
```

### Run Agent end-to-end tests

Requires a running Agent and a Kubernetes cloud the Agent can discover. Set `AGENT_TEST_CLOUD` (see [Environment variables](#environment-variables)).

```Shell
npx playwright test --project=Agent
```

## Documentation map (project-local)

### Engineering guidelines

- [docs/CODING_GUIDELINES.md](docs/CODING_GUIDELINES.md) — canonical conventions (test structure, assertions, TDM, POM, locator strategy)
- [docs/pom-in-practice.md](docs/pom-in-practice.md) — real POM patterns + examples
- [docs/localhost-run.md](docs/localhost-run.md) — localhost/proxy specifics
- [docs/custom-reporter.md](docs/custom-reporter.md) — custom Playwright reporter (summary HTML, GitHub Step Summary, CI status)

The project uses **ESLint** for code quality and style.

### AI Agents

- [AGENTS.md](AGENTS.md) — mandatory workflow for AI agents
- [docs/ai-instructions/](docs/ai-instructions/) — task playbooks and guides

### Suite artifacts colocated with tests

Keep suite artifacts (feature overview / POM instructions / test plan) next to the tests.

- If a suite has a single spec file, keep artifacts in the same folder as the spec.
- If a suite has multiple spec files, group them in a dedicated folder and keep artifacts in that folder too.

Example (API Quality suite folder):

- [src/tests/portal/00-serial/15-api-quality/](src/tests/portal/00-serial/15-api-quality/)

## Environment variables

`.env` is loaded via `dotenv` in `playwright.config.ts`. Global setup prints a subset of variables at run start (`src/tests/apihub-setup.ts`).

### Required

| Variable           | Meaning                                                                 |
| ------------------ | ----------------------------------------------------------------------- |
| BASE_URL           | Test environment base URL                                               |
| TEST_USER_PASSWORD | Password for local test users (`TEST_SYSADMIN_LOCAL`, `TEST_USER_1`..4) |

### Required for Agent (`--project=Agent`)

| Variable         | Meaning                                                                               |
| ---------------- | ------------------------------------------------------------------------------------- |
| AGENT_TEST_CLOUD | Cloud name shown in the Agent UI selector. Example for kind: `kind_qubership-apihub`. |

Hardcoded cluster objects (see `src/test-data/agent/other.ts`):

- Namespaces: `api-hub-ci` (full end-to-end / discovery running), `api-hub-preprod` (other Agent scopes)
- Services: `apihub-agent-test-service`, `apihub-backend`

### Required for ADV (`--project=ADV-operations`, `--project=ADV-comparisons`)

| Variable | Meaning                                                                                             |
| -------- | --------------------------------------------------------------------------------------------------- |
| ADV_FILE | Basename of a JSON file under `src/tests/adv/urls/` (without `.json`). Example: `adv-operations-01` |

### Required for localhost / Docker Compose

| Variable                | Meaning                                                                                                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PLAYGROUND_BACKEND_HOST | Backend host for Playground API calls when `BASE_URL` points to localhost (see [docs/localhost-run.md](docs/localhost-run.md)). Example: `http://host.docker.internal:8081` |

### Optional - localhost behavior

| Variable       | Meaning                                                                                                        |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| DEV_PROXY_MODE | When `true`, skip tests that cannot run in dev proxy mode (see [docs/localhost-run.md](docs/localhost-run.md)) |

### Optional - test data lifecycle

| Variable  | Values                         | Meaning                                                                                                 |
| --------- | ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| CREATE_TD | unset (default), `all`, `skip` | unset: create non-reusable data only; `all`: also create reusable data; `skip`: skip test data creation |
| CLEAR_TD  | unset (default), `all`, `skip` | unset: clear non-reusable data only; `all`: also clear reusable data; `skip`: skip teardown cleanup     |
| TEST_ID_R | 4-5 uppercase alnum            | Reusable test data suffix; default `0000` unless `CREATE_TD=all` (then random). Auto-generated if unset |
| TEST_ID_N | 4-5 uppercase alnum            | Non-reusable test data suffix; auto-generated if unset                                                  |

### Optional - Agent workspace / group names

Override defaults used in `src/test-data/agent/` when the target environment uses different naming.

| Variable                     | Default      | Meaning                       |
| ---------------------------- | ------------ | ----------------------------- |
| TEST_DEFAULT_WORKSPACE_NAME  | `Qubership`  | Agent default workspace       |
| TEST_DEFAULT_WORKSPACE_ALIAS | `QS`         | Agent default workspace alias |
| TEST_PRODUCT_GROUP_NAME      | `QS Product` | Agent product group name      |
| TEST_PRODUCT_GROUP_ALIAS     | `QS`         | Agent product group alias     |
| TEST_SUB_GROUP_NAME          | `Sub Group`  | Agent sub-group name          |
| TEST_SUB_GROUP_ALIAS         | `SG`         | Agent sub-group alias         |

### Optional - conditional test suites

Tests are skipped when the corresponding variable is unset.

| Variable                  | Enables                                                                      |
| ------------------------- | ---------------------------------------------------------------------------- |
| TEST_SSO_USER_EMAIL       | SSO authentication tests (`1.1-authentication.spec.ts`, `@specific`)         |
| TEST_SSO_USER_PASSWORD    | Password for `TEST_SSO_USER` (used together with `TEST_SSO_USER_EMAIL`)      |
| TEST_CLOUD_ADMIN_NAME     | Agent Gateway Routing report tests (`01-with-discovery.spec.ts`)             |
| TEST_CLOUD_ADMIN_PASSWORD | Password for `TEST_CLOUD_ADMIN` (used together with `TEST_CLOUD_ADMIN_NAME`) |

### Optional - tooling and reports

| Variable               | Meaning                                                                                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| CHROME_EXECUTABLE_PATH | Path to a Chrome/Chromium binary. Unset = Playwright bundled Chromium. Custom-Chrome CI example: `./chrome-linux64/chrome` |
| TICKET_SYSTEM_URL      | Base URL for clickable Test Case / issue links in test annotations (origin only is used)                                   |

### CI / pipeline (usually set by the runner, not `.env`)

| Variable            | Meaning                                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| CI                  | Standard CI flag. Enables headless browsers, more workers/retries, `forbidOnly`, `maxFailures`                        |
| GITHUB_ACTIONS      | When `true`, enables GitHub Step Summary in `CustomReporter` (see [docs/custom-reporter.md](docs/custom-reporter.md)) |
| GITHUB_STEP_SUMMARY | GitHub Actions file path for the job summary (set by Actions; used by `@actions/core`)                                |
| CI_PW_BRANCH        | Branch name shown in `summary-report.html` (default `-`)                                                              |
| CI_JOB_LINK         | Link to the CI job in `summary-report.html`                                                                           |
| CI_JOB_NUMBER       | Job number appended to `CI_JOB_LINK` label in `summary-report.html`                                                   |
| CI_USER             | Triggering user shown in `summary-report.html` (default `-`)                                                          |

## Running tests

### Common commands

```Shell
npx playwright test --project=Portal --project=Agent
```

```Shell
npx playwright test --project=Portal --project=Agent --last-failed
```

```Shell
npx playwright test --project=Portal --project=Agent --headed --trace=on
```

### HTML report

```Shell
npx playwright show-report reports/playwright
```

### Custom summary report

`CustomReporter` writes `reports/summary/status` (CI gate) and, for non-unit runs, `reports/summary/summary-report.html`. In GitHub Actions it also appends a Markdown summary to the job page.

See [docs/custom-reporter.md](docs/custom-reporter.md) for configuration and behavior.

More options:

- [Playwright test CLI](https://playwright.dev/docs/test-cli)
- [Running and debugging tests](https://playwright.dev/docs/running-tests)

### Handy Playwright flags

- `--headed` — run headed browsers
- `--debug` — open Playwright Inspector
- `--workers <n>` — configure parallelism
- `--trace <mode>` — `on`, `off`, `on-first-retry`, `on-all-retries`, `retain-on-failure`
- `--grep <regex>` — run only matching tests (matches project + file + describe + test title + tags)
- `--repeat-each <n>` — run each test `n` times (useful for checking stability)

### Filtering with `--grep` in shell and CI

When the pattern contains alternation (`|`), pass `--grep` with **single quotes**:

```shell
npx playwright test --project=Portal --grep='P-GEN-1.2\]|P-GEN-1.1\]|P-ODPPG-1\]'
```

In bash scripts (including GitHub Actions steps that `echo` CLI arguments into `$GITHUB_STEP_SUMMARY`), do not place `--grep="..."` inside an outer double-quoted string. The inner `"` closes the string early and bash treats `|` as a pipe (`command not found`, exit code 127) even when Playwright would run the tests correctly.
