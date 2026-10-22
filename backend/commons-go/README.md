# APIHUB commons-go

A shared Go library for the APIHUB services. Nothing is published from this module and it has no image: the Go
services use it through the workspace. It holds one package today, [`api-spec-exposer`](api-spec-exposer/README.md),
which discovers API specifications in a file system and builds the HTTP endpoint configurations that expose them
at the URLs of the [agent discovery contract](../../docs/user-guide/agent-discovery.md).
`portal-backend`, `api-linter-service`, and `agents-backend` import the module with a `replace` directive in their
`go.mod`; see the [backend README](../README.md#go-workspace).

It is a library inside the backend, not a deployed component; see the
[architecture overview](../../docs/architecture/overview.md).

## Packages

| Package | Purpose |
|---------|---------|
| [`api-spec-exposer`](api-spec-exposer/README.md) | Finds and identifies API specifications (OpenAPI, GraphQL, Markdown) and returns handlers and default URL paths |

```text
.
├── api-spec-exposer/    # discovery and exposure of API specifications
│   ├── config/          # configuration and data types
│   └── internal/        # implementation
├── build.sh             # download, tidy, build, test, and vet in one run
├── go.mod
└── README.md
```

## Build, test, and lint

The Nx project is `commons-go` (tag `lang:go`). It has no `build` target, because a library has no binary. Run from the
repository root:

```bash
pnpm exec nx run commons-go:tidy
pnpm exec nx run commons-go:lint
pnpm exec nx run commons-go:test
```

They tidy the dependencies, format and vet the code, and run the tests of the whole module. From this folder,
`go test ./... -v` runs the tests directly, and `./build.sh` does the whole cycle. The Go version is in
[`backend/.go-version`](../.go-version). CI runs the same Nx targets; see
[Build and test](../../docs/development/build-and-test.md).

## Run and debug locally

There is nothing to run. A service that uses the library picks up your change at once, because the workspace in
`go.work` resolves the module from this folder. Debug a test with `dlv test ./api-spec-exposer`; see
[Debugging: Go service](../../docs/development/debugging.md#debug-a-go-test).

## Configuration

The library reads no configuration file. The caller passes the options of `api-spec-exposer` in code; they are
described in its [README](api-spec-exposer/README.md).

## Further reading

- [`api-spec-exposer` documentation](api-spec-exposer/README.md)
- [Development workflow](../../docs/development/workflow.md) and the [license](LICENSE)
