# APIHUB Postman collections

The Postman collections are the REST end-to-end suite of APIHUB. They call the API of the portal backend and the agent
on a running stack and check the answers with `pm.test` assertions. Newman runs them in CI. The module holds
collections, environments, and fixture files; it ships nothing and is not an Nx project.

The suite tests the product from outside, through the backend API; see the
[architecture overview](../../docs/architecture/overview.md) and [Tests](../README.md) for the whole E2E picture.

## Layout

| Path | Content |
|------|---------|
| `e2e/` | The regression collections, numbered by purpose (`1_1_Smoke_Portal`, `1_2_Smoke_Agent`, ..., `4_Access_control`) |
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

CI runs the collections in the order `1_1`, `1_2` (agent only), `1_3`, `2_1`, `3_1`, `3_2`, `4`. The commands for a
single collection are in [Debugging: One Newman collection](../../docs/development/debugging.md#one-newman-collection)
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
