# APIHUB API visitor

The API visitor library walks OpenAPI documents with the visitor pattern. It gives type-safe traversal of complex API
schemes, detects self-references, and prevents infinite recursion. It is published as the npm package
`@netcracker/qubership-apihub-api-visitor` in CommonJS and ES module formats.

It sits in the processing layer, on top of `api-unifier`: see the
[processing libraries guide](../../docs/architecture/processing-libraries.md) and the
[architecture overview](../../docs/architecture/overview.md).

## Build, test, and lint

The Nx project is `api-visitor`. Run from the repository root:

```bash
pnpm exec nx run api-visitor:build
pnpm exec nx run api-visitor:test
pnpm exec nx run api-visitor:lint:check
```

See [Build and test](../../docs/development/build-and-test.md).

## Run and debug locally

A library has nothing to run: the tests are the feedback loop. Run one file from the library folder with
`cd frontend/api-visitor && pnpm exec jest <file> -t "<test name>"`. Breakpoints and the dependency build order:
[Debugging: TypeScript library](../../docs/development/debugging.md#typescript-library). Setup:
[Getting started](../../docs/development/getting-started.md).

## Configuration

The library reads no configuration file. The `normalize` and `denormalize` options of `api-unifier` and the walker
options control the traversal; the usage example below shows both.

## API specifications

The visitor handles OpenAPI documents only.

## Features

- **Type-safe traversal:** The module provides mechanisms for safe traversal and transformation of OpenAPI documents
  with full TypeScript support.
- **Self loops processing:** Detects and marks self loops in schemas using the unique `valueAlreadyVisited` flag,
  preventing endless recursion.
- **Visitor Pattern:** Uses the visitor pattern to bypass and transform API specification elements, making it easier to
  analyze API structure.
- **Multiple distribution** formats: Supports CommonJS, ES modules, and integration with TypeScript projects, providing
  flexibility in use.

## Self loops

The APIHUB API Visitor automatically identifies and marks self-references in schemas using a reliable mechanism for
detecting and processing self-reference cycles during schema traversal. The mechanism is designed to prevent infinite
recursion when traversing objects that may contain circular references (direct or indirect).

## Usage

```ts
import { OpenApiWalker } from '@netcracker/qubership-apihub-api-visitor'
import { denormalize, normalize } from '@netcracker/qubership-apihub-api-unifier'
import type { DenormalizeOptions, NormalizeOptions } from '@netcracker/qubership-apihub-api-unifier'

const walker = new OpenApiWalker();

const options: NormalizeOptions = {
  resolveRef: true,
  validate: true,
  mergeAllOf: true,
  unify: true,
  liftCombiners: false,
  allowNotValidSyntheticChanges: true,
  originsAlreadyDefined: false,
  /* Add additional options if necessary */
}
const invertOptions: DenormalizeOptions = {
  ...options,
  originsAlreadyDefined: true,
  /* Add additional options if necessary */
}

/*
* Normalized OpenAPI document - a Dereferenced and Bundled version of OpenAPI spec, where all $ref references are resolved.
*
* 'normalize' - process resolves refs, merges allOf-s, sets default values according to specification,
* unwrap system "anyOf" (type "any") and so on. Some of the stages are revertable, some not.
* As a result we get completely "normalized" OpenAPI specification
* which has transparent structure and can be easily matched with another normalized OpenAPI specification.
*
* 'denormalize - revertable things will be reverted (e.g. defaults, unified system anyOf-s), but resolved refs and merge allOf-s will be saved.
* So it results to original specification with resolved refs and merged allOf-s.'
*/
const normalizedOpenApiDocument = denormalize(normalize(operationData, options), invertOptions)

walker.walkPathsOnNormalizedSource(normalizedOpenApiDocument, {
  // Handlers
  responseStart: ({ responseCode }) => {
    /* Do something */
    return true
  },
  responseEnd: () => {
    /* Do something */
  },
  mediaTypeStart: ({ mediaType }) => {
    /* Do something */
    return true
  },
  mediaTypeEnd: () => {
    /* Do something */
  },
  // Add other handlers as needed

}, { /* Options */ })

```

## Further reading

- [`api-unifier`](../api-unifier/README.md), which normalizes the document before the walk
- Contributing: add unit tests with every change.
