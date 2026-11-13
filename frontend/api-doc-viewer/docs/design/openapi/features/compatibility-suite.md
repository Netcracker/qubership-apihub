# OpenAPI compatibility suite (Storybook and screenshot tests)

Every OpenAPI case of the
[`frontend/compatibility-suites`](../../../../../compatibility-suites/README.md)
module (`bin/comparison-base-suite/openapi/<suiteId>/<testId>/{before,after}.yaml`, optional
`metadata.yaml` with OAS version pairs) is rendered by `OpenApiOperationDiffsViewer` and captured
by a screenshot test. Ported from the legacy `qubership-apihub-apispec-view` (`packages/elements`:
`bin/generate-openapi-compatibility-suite-{stories,tests}.mjs`,
`src/web-components/__stories__/helpers/compatibility-suite-utils.tsx`). Status: **implemented**.

## Cases and grouping

| Item | Rule |
| --- | --- |
| Suites | every OpenAPI suite except `human-readable` (not an operation view; excluded in apispec-view too) |
| Variants | one story per (case, version pair): `getCompatibilitySuiteSpecificationVersionPairs` — the `metadata.yaml` pairs, or one default pair; `getCompatibilitySuite(…, pair)` patches the root `openapi:` of both samples |
| Groups | one per major.minor pair, in this order: `OAS 3.0 vs OAS 3.0`, `OAS 3.0 vs OAS 3.1`, `OAS 3.1 vs OAS 3.0`, `OAS 3.1 vs OAS 3.1` |
| Storybook | `OpenAPI Compatibility Suite/<group>/<suiteId>`; meta id `openapi-compatibility-suite-<before><after>-<suiteId>` (e.g. `-30-31-request-body`); story = `toPascalCase(testId)`, name = `testId` |
| Suite order | `.storybook/preview.ts`, operation top-down: general operation parameters, operation parameters, parameters schema / examples, headers, request, request body (+ schema, examples), response, response headers schema, response body schema / examples |
| Runner test runs | one per group: `openapi-compatibility-suite-30-30`, `-30-31`, `-31-30`, `-31-31`; suites = the suite ids of that group |

On 2026-10-29 (`compatibility-suites` `develop`): 813 cases, 1010 variants — 802 in 3.0 vs 3.0,
49 in 3.0 vs 3.1, 33 in 3.1 vs 3.0, 126 in 3.1 vs 3.1; 47 story / IT files.

## Story

`OpenApiStoryComponent` (`src/stories/utils/compatibility-suite-utils.tsx`):

| Item | Rule |
| --- | --- |
| Merge | `mergeOpenApiDocuments` (`src/stories/preprocess.ts`), the merge of the OpenAPI Operation Diffs Suite; apispec-view's `getCompareResult` (drops `components` except `securitySchemes`) is not ported |
| Operation | the only operation of the merged document; a case that adds / removes a path or a method has two and shows the **added / removed** one (`resolveOpenApiCompatibilitySuiteOperationKeys`, `compatibility-suite-utils-openapi.ts`). Read from the merged document, where path-item `$ref`s (`general-operation-parameters/*-method-in-path-item`) are resolved |
| Viewer | `OpenApiOperationDiffsViewer`, `displayMode: detailed`, `hideUnchangedNodes: false` (every row, as in the OpenAPI Operation Diffs Suite); both are story args (controls) |
| Fonts | rendered after the `Inter` font loads, as every compatibility story |

## Generation

Compatibility-suite artifacts are **generated** and gitignored (`*.generated.*`, root `AGENTS.md`):
`pnpm run generate-stories` / `generate-tests` (`bin/generate-compatibility-suite-{stories,tests}.mjs`,
shared helpers in `bin/compatibility-suite-generation-utils.mjs`) write
`src/stories/compatibility-suite/openapi-compatibility-suite-*.generated.stories.tsx` and
`src/it/compatibility-suite/openapi-compatibility-suite-*.generated.it-test.ts` next to the GraphQL
and DDL API ones. An IT opens the story, waits for `[data-testid="openapi-operation-diffs-viewer"]`,
and captures one screenshot (`src/it/compatibility-suite/<test-run>/__image_snapshots__/<metaId>-<testId>-1.png`,
committed; the test generator deletes only the gitignored `*.generated.it-test.ts` files there).

Run: `node bin/run-screenshot-test-suite.mjs regenerate openapi-compatibility-suite-30-31 [suite]`.

## Legacy workarounds

TypeScript / ESLint suppressions of the apispec-view code are collected, not fixed:
[../notes/2026-10-compatibility-suite-port-todo.md](../notes/2026-10-compatibility-suite-port-todo.md).

## Related documents

- [diffs.md](diffs.md), [oas-versions.md](oas-versions.md)
- `.storybook/preview.ts` and `bin/screenshot-test-run-order.json` — Storybook / runner order
  ([../../README.md](../../README.md#storybook-and-runner-order))
