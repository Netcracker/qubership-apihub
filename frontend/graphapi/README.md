# APIHUB GraphAPI

The GraphAPI library converts a GraphQL schema into a GraphAPI document and back. The GraphAPI specification is an
alternative to GraphQL introspection that is based on JSON Schema: OpenAPI for GraphQL. The library is published as the
npm package `@netcracker/qubership-apihub-graphapi` and has no package dependencies.

It is a foundation library: `api-unifier`, `api-diff`, `api-processor`, and `api-doc-viewer` consume GraphAPI
documents. See the [processing libraries guide](../../docs/architecture/processing-libraries.md) and the
[architecture overview](../../docs/architecture/overview.md).

## Modifications

Modified version of [udamir/graphapi](https://github.com/udamir/graphapi)

- Structure changed to better account for GraphQL specifics
- Changed nullability handling
- Field description/output description separation
- Reduced number of unnatural diffs during later processing, caused by following OpenAPI structure

## Features

- JSON Schema-based representation of GraphQL document, similar to OpenAPI
- Support custom directives in schema (meta)
- GraphAPI document can be build from GraphQL Schema or Introspection
- GraphAPI document can be converted to GraphQL Schema
- Typescript syntax support out of the box
- No dependencies, can be used in nodejs or browser

## Build, test, and lint

The Nx project is `graphapi`. Run from the repository root:

```bash
pnpm exec nx run graphapi:build
pnpm exec nx run graphapi:test
pnpm exec nx run graphapi:lint:check
```

See [Build and test](../../docs/development/build-and-test.md).

## Run and debug locally

A library has nothing to run: the tests are the feedback loop. Run one file from the library folder with
`cd frontend/graphapi && pnpm exec jest <file> -t "<test name>"`. Breakpoints and the dependency build order:
[Debugging: TypeScript library](../../docs/development/debugging.md#typescript-library). Setup:
[Getting started](../../docs/development/getting-started.md).

The library has a Storybook: `pnpm exec nx run graphapi:storybook`. CI publishes the
[Storybooks](https://netcracker.github.io/qubership-apihub/storybook/) of every branch.

## Configuration

The library reads no configuration file.

## API specifications

GraphQL schemas and introspection results are the input; the GraphAPI document is the output.

## Usage

### Build GraphAPI document from Schema or Introspection

```ts
import { buildSchema, graphqlSync, getIntrospectionQuery } from "graphql"
import { buildFromSchema, buildFromIntrospection } from '@netcracker/qubership-apihub-graphapi'

// build from GraphQL schema
const schema = buildSchema(data)
const graphapi1 = buildFromSchema(schema)

// build from GraphQL introspection
const introspection = graphqlSync(data, getIntrospectionQuery()).data
const graphapi2 = buildFromIntrospection(introspection)

```

> Important: only deprecated directives will be in result, as introspection not support custom directives meta

### Print GraphQL schema document from GraphAPI document

```ts
import { printGraphApi } from '@netcracker/qubership-apihub-graphapi'

const schema = printGraphApi(graphapi)
console.log(schema)

```

## Further reading

- [`api-doc-viewer`](../api-doc-viewer/README.md), which renders GraphAPI documents
- Contributing: keep the library free of package dependencies, and add unit tests with every change.
