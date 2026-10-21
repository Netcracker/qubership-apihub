# APIHUB API diff

The API diff library computes the difference between two JSON-based API documents and classifies each change as
breaking, non-breaking, deprecated, or annotation. It is published as the npm package
`@netcracker/qubership-apihub-api-diff` and works in Node.js and in the browser. Use it to generate an API changelog,
to find breaking changes, and to keep API versioning consistent.

It sits in the processing layer: `api-processor` calls it, and it unifies its input with `api-unifier`. See the
[processing libraries guide](../../docs/architecture/processing-libraries.md) and the
[architecture overview](../../docs/architecture/overview.md).

## Modifications

Modified version of [udamir/api-smart-diff](https://github.com/udamir/api-smart-diff)

- changed concept from effective to declarative changes calculation
- performance improvements
- introduced scopes instead of classification rules inversion
- all unification code extracted to API Unifier
- cycled JSO supported as input
- input specification is automatically unified
- diff storing for arrays unified with all other types
- support diffs for changing of combiners to non-combiners and vice versa
- diffs caused by default values when type is changed no longer reported
- added number of tests
- introduced testing against compatibility suit
- fixed a number of bugs in OpenAPI diffs classification
- correct handling of sparse arrays that could arise when processing incorrect specification
- supported de-normalization to remove excessive diffs for default values
- debug tooling for cycled JSO extended with diffs support
- supported new graphapi structure

## Supported API specifications

- OpenAPI 3.0 and 3.1
- AsyncAPI 3.x
- JSON Schema (drafts 04, 06, and 07)
- GraphQL, through GraphAPI
- DDLAPI 1.0

The version is detected from the document (`openapi`, `asyncapi`, `graphapi`, `ddlapi`). AsyncAPI 2.x and gRPC are
not supported. `api-processor` converts Swagger 2.0 to OpenAPI before it compares.

## Features

- Generate diff for supported specifications
- Generate merged document with changes in metadata
- Classify all changes as breaking, non-breaking, deprecated and annotation
- Human-readable change description
- Supports custom classification rules
- Supports custom comparison or match rules
- Supports custom transformations
- Supports custom human-readable changes annotation
- Resolves all $ref pointers, including circular
- TypeScript syntax support out of the box
- Can be used in Node.js or browser

## Build, test, and lint

The Nx project is `api-diff`. Run from the repository root:

```bash
pnpm exec nx run api-diff:build
pnpm exec nx run api-diff:test
pnpm exec nx run api-diff:lint:check
```

`pnpm --filter @netcracker/qubership-apihub-api-diff run test:compatibility-suites` runs the cases of
[`compatibility-suites`](../compatibility-suites/README.md), and `test:human-readable` checks the change descriptions.
See [Build and test](../../docs/development/build-and-test.md).

## Run and debug locally

A library has nothing to run: the tests are the feedback loop. Run one file from the library folder with
`cd frontend/api-diff && pnpm exec jest <file> -t "<test name>"`. Breakpoints and the dependency build order:
[Debugging: TypeScript library](../../docs/development/debugging.md#typescript-library). Setup:
[Getting started](../../docs/development/getting-started.md).

## Configuration

The library reads no configuration file. The caller passes the options and the custom rules to the compare function.

## Further reading

- [Archived plans](docs/archive/)
- [`api-unifier`](../api-unifier/README.md), which normalizes the documents before the comparison
- Contributing: keep the library free of new package dependencies, and add unit tests with every change.
