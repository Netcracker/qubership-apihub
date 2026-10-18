# qubership-apihub-api-diff

This package provides utils to compute the diff between two Json based API documents.

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

## Purpose
- Generate API changelog
- Identify breaking changes
- Ensure API versioning consistency

## Supported API specifications

- [OpenApi 3.0](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md)
- [AsyncApi 2.x](https://v2.asyncapi.com/docs/reference)
- [JsonSchema](https://json-schema.org/draft/2020-12/json-schema-core.html)
- GraphQL via GraphApi
- ~~Swagger 2.0~~
- ~~[AsyncApi 3.x](https://www.asyncapi.com/docs/reference/specification/v3.0.0-explorer)~~ (Roadmap)
- ~~gRPC~~ (Roadmap)

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

## Contributing
When contributing, keep in mind that it is an objective of `api-smart-diff` to have no additional package dependencies. This may change in the future, but for now, no new dependencies.

Please run the unit tests before submitting your PR: `yarn test`. Hopefully your PR includes additional unit tests to illustrate your change/modification!
