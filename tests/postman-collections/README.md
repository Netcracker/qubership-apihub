# APIHUB Postman collections

The Postman collections test the APIHUB REST APIs and the backend MCP server on a running stack.
Newman runs the collections and checks their `pm.test` assertions in CI. The module holds
collections, environments, and fixture files; it ships nothing and is not an Nx project.

The suite tests the product from outside, through the backend API; see the
[architecture overview](../../docs/architecture/overview.md) and [Tests](../README.md) for the whole E2E picture.

## Layout

| Path | Content |
|------|---------|
| `e2e/` | The regression collections, numbered by purpose (`1_1_Smoke_Portal`, `1_2_Smoke_Agent`, ..., `6_MCP`) |
| `use_cases/` | Scenario collections, such as `shareability` |
| `Syntetic_test_data.postman_collection.json` | Fast creation of sample data |
| `environment/` | `local`, `local_k8s`, and `Env1` Postman environments |
| `working-directory/` | Fixture files that the requests upload |

The table of collections and their order in CI is in [Tests](../README.md#newman-collections).

### The synthetic test data collection

The collection `Syntetic_test_data` creates sample data quickly. Its "Create Test Data" folder makes one workspace
`001 Test Workspace`, one package with two versions that have every kind of change, and one dashboard with two package
versions. Run it as often as you need more data. Its "Cleanup Test Data" folder removes the workspace and everything in
it.

## Build, test, and lint

There is nothing to build, and the module has no Nx targets. Newman 6.2.3 is the runner:

```bash
npm install -g newman@6.2.3
```

CI runs the collections in the order `1_1`, `1_2` (agent only), `1_3`, `2_1`, `3_1`, `3_2`, `4`, `5`, `6`.
See [Debugging: One Newman collection](../../docs/development/debugging.md#one-newman-collection)
and [Build and test: E2E tests](../../docs/development/build-and-test.md#e2e-tests).

## Run and debug locally

1. Start a stack: [Run APIHUB locally](../../docs/development/local-run.md).
2. Use a test internal user and an API key with system administrator rights. The deployment can create both:
   `APIHUB_ADMIN_EMAIL`, `APIHUB_ADMIN_PASSWORD`, and `APIHUB_ACCESS_TOKEN` in the
   [installation guide](../../docs/installation-guide.md).
3. Put the user in the environment file and the key in the `at-api-key` variable, then run:

   ```bash
   newman run e2e/1_1_Smoke_Portal.postman_collection.json -e environment/local.postman_environment.json \
     --env-var "Username=<admin email>" --env-var "User_email=<admin email>" \
     --env-var "Password=<admin password>" --env-var "at-api-key=<access token>"
   ```

To step through a request, import the collection and the environment into Postman. A manual CI run takes the
collections as an input; see [CI](../../docs/development/ci.md#manual-e2e).

## Migration tests

[`5_Migration`](e2e/5_Migration.postman_collection.json) runs on its own with `SERVER_HOST` and the
local administrator credentials `Username` and `Password`. It logs in, creates a unique workspace, publishes
two independent versions of each test package, checks the exact builds for each scope and version filter,
and deletes the workspace. Its token and test IDs use the `migrationScope` prefix and are cleared after cleanup.
It uses an embedded source archive and does not need another collection, exported state, or an API key.

Run it against an isolated test instance: operations migrations share an exclusive slot. If its own migration
times out, the collection requests cancellation and waits for it to stop before deleting test packages.
If the status cannot be read or cancellation does not finish, it fails and keeps the workspace for diagnosis.

From the repository root:

```bash
newman run tests/postman-collections/e2e/5_Migration.postman_collection.json \
  --env-var "SERVER_HOST=http://localhost:8081" \
  --env-var "Username=<admin email>" --env-var "Password=<admin password>"
```

Select `5_Migration` in the manual workflow to run it alone. It is also part of the default full collection list
for Kind, Compose, Compose with Keycloak, and nightly runs.

## MCP tests

[`6_MCP`](e2e/6_MCP.postman_collection.json) runs independently with `SERVER_HOST`, `Username`, and `Password`
against an APIHUB test instance. It creates its own administrator PAT and scoped API keys and publishes
OpenAPI, AsyncAPI, GraphQL, DDL, and MCP contracts from embedded fixture archives. Success assertions tie tool
results to the fixture packages, releases, and source documents. Negative cases check protocol errors, tool
errors, and scope enforcement. Cleanup revokes the credentials and deletes the fixture workspaces.

Run the collection from the repository root:

```bash
newman run tests/postman-collections/e2e/6_MCP.postman_collection.json \
  --env-var "SERVER_HOST=http://localhost:8081" \
  --env-var "Username=<admin email>" --env-var "Password=<admin password>"
```

For legacy search and the legacy package resource, set `ai.mcp.workspace` in the test backend configuration to
a fresh workspace ID such as `QS-MCP-E2E-LOCAL` and pass the same ID as `--env-var "MCP_LEGACY_WORKSPACE=<id>"`.
The collection creates that workspace during the run. With the default blank configuration, the suite checks that
those legacy capabilities fail with the expected errors. The full CI runs configure `QS-MCP-E2E` on both runtimes.
Select `6_MCP` in the manual workflow to run it alone.

## Configuration

`environment/local.postman_environment.json` points at `localhost:8081` (`SERVER_HOST`) and reads the credentials from
the variables `Username`, `User_email`, `Password`, and `at-api-key`. `local_k8s.postman_environment.json` is the
variant for the Kind cluster.

## API specifications

The collections test the OpenAPI specifications in
[`backend/portal-backend/docs/api/`](../../backend/portal-backend/docs/api/)
and [`backend/agent/docs/api/`](../../backend/agent/docs/api/). Update the collections in the same pull request as a
change to the REST contract; the `postman-e2e-followup` and `postman-e2e-authoring` skills list the steps.

## Further reading

- [Tests](../README.md): both suites, CI tiers, and manual runs
- [`backend/portal-backend/docs/postman/`](../../backend/portal-backend/docs/postman/): the AI chat collection of the
  backend
