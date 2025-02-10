# APIHUB UI auto-tests
This project is used to create and run auto-tests, primarily for UI E2E. The framework used is [Playwright](https://playwright.dev/).

[Features of running on a **localhost**](docs/localhost-run.md)

## Contents
- [Installation](#installation)
- [Environment variables](#environment-variables)
- [Running tests](#running-tests)
- [Projects](#projects)

## Installation
[System requirements](https://playwright.dev/docs/intro#system-requirements)

Install dependencies:
```Shell
npm i
```
Install browsers:
```Shell
npx playwright install
```
## Environment variables
Before starting test execution, you need to set environment variables in any convenient way. `.env` is supported. 

### Required environment variables:
**BASE_URL** - Test environment URL.

**TEST_USER_PASSWORD** - The password that will be used by test users.

**PLAYGROUND_BACKEND_HOST** - Only Required for testing on **localhost**. The host that will be used in the test to create a custom server for sending requests. More information can be found at the [link](docs/localhost-run.md).

**DEV_PROXY_MODE** - Only Required for testing on **localhost** in dev proxy mode.

`true` - skip tests that cannot be executed in this mode.

### Optional environment variables:
**TICKET_SYSTEM_URL** - Base address of the ticket management system. Adds interactivity to links to test cases and issues.

**AUTH** - Authentication management.

`skip` - Skip authentication. Used if authentication was performed earlier and the data was saved to the storage state file.

`undefined` or any other - authentication will be performed.

**CREATE_TD** - Test data creation.

`all` - create reusable and non-reusable test data with random test ID. Used when new reusable test data is needed without deleting the old one.

`skip` - do not create any test data.

`undefined` or any other - create only non-reusable test data (if the reusable data does not exist, it will also be created with default test ID).

**CLEAR_TD** - Test data deletion.

`all` - delete reusable and non-reusable test data with current test IDs.

`skip` - do not delete any test data.

`undefined` or any other - delete only non-reusable test data and keep reusable test data.

**TEST_ID_R** - Set specific test id for reusable test data.

`4 chars` (numbers or letters)

`undefined` - will be generated automatically

**TEST_ID_N** - Set specific test id for reusable test data.

`4 chars` (numbers or letters)

`undefined` - will be generated automatically

**ADV_FILE** - The name of the file with URLs that is used in "ADV-operations" and "ADV-comparisons" tests.

## Running tests
### Local test running
Example of running tests for the Portal with three workers:
```Shell
 npx playwright test --project=Portal --workers=3
```
Example of running only the tests that failed in the previous run:
```Shell
 npx playwright test --project=Portal --last-failed
```
You can open the HTML report with the following command:
```Shell
 npx playwright show-report reports/playwright
```

More launch options can be found on the [Running and debugging tests](https://playwright.dev/docs/running-tests) and [Command line](https://playwright.dev/docs/test-cli)

The most common commands:

`--headed` - Run tests in headed browsers. Useful for debugging.

`-g <grep>` or `--grep <grep>` - Only run tests matching this regular expression. For example, this will run `'should add to cart'` when passed `-g "add to cart"`. The regular expression will be tested against the string that consists of the project name, test file name, `test.describe` titles if any, test title and all test tags, separated by spaces, e.g. `chromium my-test.spec.ts my-suite my-test @smoke`.

`--debug` - Run tests with Playwright Inspector.

`--workers <number>` or `-j <number>` - The maximum number of concurrent worker processes that run in parallel.

`--trace <mode>` - Force tracing mode, can be `on`, `off`, `on-first-retry`, `on-all-retries`, `retain-on-failure`

## Projects
**Portal** - Portal E2E tests.

**ADV-operations** and **ADV-comparisons** - The test runs through the URLs specified in the file and checks the success of rendering using messages in the console.

**Cleanup** - Removes all test data on the environment.