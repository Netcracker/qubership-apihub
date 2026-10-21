# APIHUB test service

The test service is a mock Go microservice for tests. It has no business logic: it exposes REST, GraphQL, and AsyncAPI
specifications on endpoints that follow the [agent discovery contract](../../docs/user-guide/agent-discovery.md), so
the [agent](../agent/README.md) and the E2E suites have something to discover. The module ships the image
`qubership-apihub-test-service`.

Use it to check the discovery of the agent, specification parsing, endpoint registration, and the exposure of several
API types at once. It sits outside the product: see the [architecture overview](../../docs/architecture/overview.md)
for the services it stands in for.

## Build, test, and lint

The Nx project is `test-service` (tag `lang:go`). Run from the repository root:

```bash
pnpm exec nx run test-service:build
pnpm exec nx run test-service:test
```

The service does not use `commons-go`, so it builds from its own folder. For the image, see
[Build and test: Images](../../docs/development/build-and-test.md#images).

## Run and debug locally

Run `go run .` in this folder. The service listens on `:8080`; set `LISTEN_ADDRESS` to change the address. The
specifications it serves are in [`static/`](static/). To debug it, see
[Debugging: Go service](../../docs/development/debugging.md#go-service).

## Configuration

The only setting is the environment variable `LISTEN_ADDRESS`. The chart that deploys the service is in
[`helm-template/`](helm-template/README.md).

## Further reading

- [Make a service discoverable by the agent](../../docs/user-guide/agent-discovery.md)
- Changing a path or a document under `static/` can break the Postman collections in
  [`tests/postman-collections`](../../tests/postman-collections/README.md) and the agent runners.
