# APIHUB UI auto-tests (Playwright)

Playwright-based test project for APIHUB UI:

- Portal UI end-to-end tests (`--project=Portal`)
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

### Run Portal end-to-end tests

```Shell
npx playwright test --project=Portal
```

## Documentation map (project-local)

### Engineering guidelines

- [docs/CODING_GUIDELINES.md](docs/CODING_GUIDELINES.md) — canonical conventions (test structure, assertions, TDM, POM, locator strategy)
- [docs/pom-in-practice.md](docs/pom-in-practice.md) — real POM patterns + examples
- [docs/localhost-run.md](docs/localhost-run.md) — localhost/proxy specifics

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

### Required

| Variable           | Meaning                     |
| ------------------ | --------------------------- |
| BASE_URL           | Test environment base URL   |
| TEST_USER_PASSWORD | Password used by test users |

### Required only for localhost modes

| Variable                | Meaning                                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| PLAYGROUND_BACKEND_HOST | Backend host used for localhost Playground tests (see [docs/localhost-run.md](docs/localhost-run.md))          |
| DEV_PROXY_MODE          | When `true`, skip tests that cannot run in dev proxy mode (see [docs/localhost-run.md](docs/localhost-run.md)) |

### Optional

| Variable          | Meaning                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| TICKET_SYSTEM_URL | Adds interactivity to links to test cases and issues                                           |
| AUTH (deprecated) | Deprecated legacy auth toggle. Not required; kept temporarily until old auth logic is removed. |
| CREATE_TD         | Test data creation (`all`, `skip`, or default behavior)                                        |
| CLEAR_TD          | Test data deletion (`all`, `skip`, or default behavior)                                        |
| TEST_ID_R         | Reusable test data ID (4 chars); auto-generated if unset                                       |
| TEST_ID_N         | Non-reusable test data ID (4 chars); auto-generated if unset                                   |
| ADV_FILE          | Filename with URLs for `ADV-operations` and `ADV-comparisons` projects                         |

## Running tests

### Common commands

```Shell
npx playwright test --project=Portal
```

```Shell
npx playwright test --project=Portal --last-failed
```

```Shell
npx playwright test --project=Portal --headed --trace=on
```

### HTML report

```Shell
npx playwright show-report reports/playwright
```

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
