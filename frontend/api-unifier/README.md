# APIHUB API unifier

The API unifier library turns an API document into a normalized form: references resolved, `allOf` combiners merged,
and the other aspects of the specification unified. It supports OpenAPI, AsyncAPI, JSON Schema, and GraphQL (through
GraphAPI). It is published as the npm package `@netcracker/qubership-apihub-api-unifier` and works in Node.js and in
the browser.

It sits between the parsers and the comparison: `api-diff` and `api-processor` normalize every document with it. See
the [processing libraries guide](../../docs/architecture/processing-libraries.md) and the
[architecture overview](../../docs/architecture/overview.md).

## Modifications

Modified version of [udamir/allof-merge](https://github.com/udamir/allof-merge)

- Added cycles support during combiners resolve
- Added origins support- it is now possible for any value in the unified JSO to track its origins in the source
  specification
- Store original ref for the object if the object was resolved from ref
- Gathered various API unification adapters from different libraries in the stack to a single place
- Support data structure hash calculation
- Process different phases sequentially (reference resolving, allOf merge, unification)
- Support synthetic `any` and `nothing` type for OAS
- Added deprecated items calculation
- Support new graphapi format
- Feature flags added to control behavior during processing
- Added a large number of tests
- Debug tooling for cycled JSO

## Features

- Safe merging of schemas combined with allOf in whole document
- Fastest implementation - up to x3 times faster then other popular libraries
- Merged schema does not validate more or less than the original schema
- Removes almost all logical impossibilities
- Correctly merge additionalProperties, patternProperties and properties taking into account common validations
- Correctly merge items and additionalItems taking into account common validations
- Supports custom rules to merge other document types and JsonSchema versions
- Supports input with circular references (JavaScript references)
- Supports $refs and circular $refs either (internal references only)
- Correctly merge of $refs with sibling content (optionally)
- Correctly merge of combiners (anyOf, oneOf) with sibling content (optionally)
- TypeScript syntax support out of the box
- No dependencies (except json-crawl), can be used in Node.js or browser

## Supported API specifications

- [JSON Schema](https://json-schema.org/draft/2020-12/json-schema-core)
- [OpenAPI 3.x](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md)
- [AsyncAPI 3.x](https://www.asyncapi.com/docs/reference/specification/v3.0.0)
- GraphAPI
- DDLAPI 1.0
- Swagger 2.x is not supported (roadmap)

## Build, test, and lint

The Nx project is `api-unifier`. Run from the repository root:

```bash
pnpm exec nx run api-unifier:build
pnpm exec nx run api-unifier:test
pnpm exec nx run api-unifier:lint:check
```

`pnpm --filter @netcracker/qubership-apihub-api-unifier run test:coverage` adds a coverage report. See
[Build and test](../../docs/development/build-and-test.md).

## Run and debug locally

A library has nothing to run: the tests are the feedback loop. Run one file from the library folder with
`cd frontend/api-unifier && pnpm exec jest <file> -t "<test name>"`. Breakpoints and the dependency build order:
[Debugging: TypeScript library](../../docs/development/debugging.md#typescript-library). Setup:
[Getting started](../../docs/development/getting-started.md).

## Configuration

The library reads no configuration file. `NormalizeOptions` and the feature flags of the call control the processing.

## Further reading

- [Unification rules guidelines](docs/unification_rules_guidelines.md)
- [Hashing rules guidelines](docs/hashing_rules_guidelines.md)
- [Archived plans](docs/archive/)

## Other libraries

There are some libraries that can merge schemas combined with allOf. One of the most popular is
[mokkabonna/json-schema-merge-allof](https://github.com/mokkabonna/json-schema-merge-allof), but it has some limitatons:
Does not support circular $refs and no TypeScript syntax out of the box.

## External $ref

If schema contains an external $ref, you should bundle it via
[api-ref-bundler](https://github.com/udamir/api-ref-bundler) first.
