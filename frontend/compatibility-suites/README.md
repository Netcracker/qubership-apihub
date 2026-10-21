# APIHUB compatibility suites

The compatibility suites are a collection of the most important cases of API changes, written to test how a change is
classified. They contain cases for OpenAPI, GraphQL, AsyncAPI, and DDLAPI. The package is
`@netcracker/qubership-apihub-compatibility-suites`; it holds test data and a small JavaScript API that serves it, and
the libraries that classify changes consume it in their tests.

It sits next to the processing libraries, below `api-diff`: see the
[processing libraries guide](../../docs/architecture/processing-libraries.md) and the
[architecture overview](../../docs/architecture/overview.md).

## Build, test, and lint

The Nx project is `compatibility-suites`. It has no tests of its own: the clients run the cases. Run from the
repository root:

```bash
pnpm exec nx run compatibility-suites:build
pnpm exec nx run compatibility-suites:type-check
```

`build` generates `generated/suite-data.ts` from `bin/comparison-base-suite/**` and bundles the package;
`generate` alone refreshes the generated file. See [Build and test](../../docs/development/build-and-test.md).

## Run and debug locally

Nothing runs by itself. Add a case under `bin/comparison-base-suite/`, run `pnpm exec nx run
compatibility-suites:generate`, then run the suite of a client:
`pnpm --filter @netcracker/qubership-apihub-api-diff run test:compatibility-suites`. Debugging a client test:
[Debugging: TypeScript library](../../docs/development/debugging.md#typescript-library).

## Configuration

The package reads no configuration file. The version matrix of an OpenAPI case is in its `metadata.yaml`; see
[Structure](#structure).

## Structure

The cases path structure is `bin/comparison-base-suite/<suiteType>/<suiteId>/<testId>`
Each case contains two specifications - `before` and `after` (or is rendered from a template, see below).

Reflects one specific change (or may contain multiple variations of representing the same change).

### OpenAPI metadata (version matrix)

OpenAPI cases may additionally contain `metadata.yaml` with a version matrix:

- `version_combinations`: a non-empty array of `[beforeVersion, afterVersion]` pairs.
- Only OAS `3.0.x` and `3.1.x` are supported (other versions are rejected by the generator).

### Schema base store (JSON Schema fragments)

Schema suites reuse schema deltas from a base store:

- `bin/comparison-base-suite/schemas/json-schema/<testId>/{before.yaml,after.yaml}`

### Schema suites (template-rendered suites)

Schema suites use templates rendered at runtime:

- `bin/comparison-base-suite/<apitype>/<suiteId>/template.yaml.tpl`
- The template must include a **single** line-only `__SCHEMA__` placeholder.
- If a full sample exists (`before/after`), it takes precedence over rendering (used for exceptions like `$ref` with
  `components:`).

## Usages

When used as a dependency, it exposes a JavaScript map of cases (prebuilt in `dist/`), which can be accessed using the
public API methods below.

```ts
export type SpecificationVersion = string
export type SpecificationVersionPair = [SpecificationVersion, SpecificationVersion]

export function getCompatibilitySuite(
  suiteType: TestSpecType,
  suiteId: string,
  testId: string,
  specificationVersionPair?: SpecificationVersionPair,
): [string, string]

export function getCompatibilitySuites(specType?: TestSpecType): Map<string, string[]>

export function getCompatibilitySuiteSpecificationVersionPairs(
  suiteType: TestSpecType,
  suiteId: string,
  testId: string,
): SpecificationVersionPair[]
```

`getCompatibilitySuite` accepts specification type (`openapi`, `graphql`, `asyncapi`, `ddlapi`), suite name and case
name.
It returns a pair of strings: `[before, after]`.

`getCompatibilitySuites` enumerates suite cases and returns a map: `suiteId -> testIds[]` (optionally filtered by
`specType`).
When `specType` is omitted, `suiteId` must be unique across suite types or later entries overwrite earlier ones.

`getCompatibilitySuiteSpecificationVersionPairs` returns supported specification version pairs for a given case:

- OpenAPI:
  - **with** `metadata.yaml`: returns declared `version_combinations` (order preserved)
  - **without** `metadata.yaml`: returns a single default pair (used for enumeration/grouping)
- non-OpenAPI suite types: returns a single default pair (stub; no version matrix yet)

### Behavior: `specificationVersionPair` and metadata

- If `specificationVersionPair` is **not provided**: returns stored samples as-is.
- If `specificationVersionPair` is provided:
  - suite types without a version-pair patch strategy: throws (currently OpenAPI-only).
  - OpenAPI case **without** `metadata.yaml`: returns stored samples as-is (canonical; no patching).
  - OpenAPI case **with** `metadata.yaml`: validates the pair and patches the root `openapi:` in both samples.

## Development model (code generation)

This package generates `generated/suite-data.ts` from `bin/comparison-base-suite/**` during development.

- After changing compatibility suite cases or OpenAPI metadata in this repository, run
  `pnpm exec nx run compatibility-suites:generate` (or `build`) to refresh `generated/suite-data.ts`.

## Further reading

- [API changes reference](../../docs/reference/api-changes/README.md): the rules the cases verify.
- [`scripts/md-tables/`](scripts/md-tables/README.md): scripts that convert Markdown tables to CSV and back.

## Used by (clients)

- [`frontend/api-diff`](../api-diff/): runs compatibility suite tests and uses CS cases as inputs for diff
  classification.
- [`frontend/apispec-view`](../apispec-view/): generates Storybook stories and screenshot tests to visualize
  compatibility suite cases (OpenAPI).
- [`frontend/api-doc-viewer`](../api-doc-viewer/): generates Storybook stories and screenshot tests to visualize
  compatibility suite cases (GraphQL).

When writing tests, it is necessary to follow the structure of the compatibility suite:

- test should be located in a folder separated from all other tests
- tests should be grouped by specification types and suites
- one suite should corresponds to one test-suite
- one case corresponds to one test in a test suite.

It is recommended to have a separate command to run only the compatibility suite tests

```json
"scripts": {
  "test:compatibility-suites": "jest --detectOpenHandles test/compatibility-suites"
}
```
