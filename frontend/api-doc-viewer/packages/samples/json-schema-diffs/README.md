# JSON Schema diff fixtures

Before/after fixtures for `JsonSchemaDiffsViewer`. YAML cases are
`<category>/[<group>/]<case-id>/{before,after}.yaml`, each a standalone JSON Schema document;
stories merge them with `prepareJsonDiffSchema()` (`packages/api-doc-viewer/src/stories/preprocess.ts`).
Design baseline: `docs/design/json-schema/display-coverage.md`.

## Categories

| Category | Cases | Source | Catalogue |
| --- | ---: | --- | --- |
| `type-changes/` | 507 YAML + 110 programmatic value range | generated YAML (`generate-json-schema-type-changes-samples.mjs`), programmatic value range | [type-changes/README.md](type-changes/README.md), [Value range](#value-range) |
| `oneOf/`, `anyOf/`, `allOf/` | 177 each | programmatic | category READMEs |
| `extensions/` | 104 | hand-written YAML | [extensions/README.md](extensions/README.md) |
| `hiding-unchanged-rows/` | 18 | hand-written YAML | [hiding-unchanged-rows/README.md](hiding-unchanged-rows/README.md) |
| `node-changes-summary/` | 7 (18 stories) | generated once (`generate-node-changes-summary-samples.mjs`) | [node-changes-summary/README.md](node-changes-summary/README.md) |
| `property-rename/` | 9 | hand-written OpenAPI pairs (synthesized parameters schema); stories/ITs generated (`generate-json-schema-property-rename-suite.mjs`) | [property-rename/README.md](property-rename/README.md) |

`type-changes/` renders with `hideUnchangedNodes: false`; the other categories use the viewer
default unless stated in their catalogue.

## Value range

Number value-range diffs are programmatic, not YAML. Cases are defined in the committed
`packages/api-doc-viewer/src/stories/json-schema-diffs-suite/value-range-diff-case-definitions.ts`
and resolved by `value-range-diff-samples.ts` (OAS 3.0, via `prepareJsonDiffSchema`) and
`value-range-diff-oas-31-samples.ts` (OAS 3.1, via `prepareJsonDiffSchemaOas31`, which converts
boolean exclusive flags to numeric bounds) in the same folder. Design:
`docs/design/json-schema/features/validation-rows.md`.

| Dialect | Cases | Story file (`json-schema-diffs-suite/`) |
| --- | ---: | --- |
| OAS 3.0 | 53 | `number-validation-value-range.stories.tsx` |
| OAS 3.1 | 57 | `number-validation-value-range-oas-3-1.stories.tsx` |

Regenerate stories and ITs from `packages/api-doc-viewer/` with
`node bin/generate-value-range-diff-stories.mjs` and commit the output.

## Storybook and screenshot tests

| Story root | Story folder (`packages/api-doc-viewer/src/stories/`) | IT files (`src/it/`) |
| --- | --- | --- |
| `JSON Schema Diffs Suite` | `json-schema-diffs-suite/` | `json-schema-diffs-suite/` |
| `JSON Schema Diffs Suite (Extensions)` | `json-schema-diffs-extensions-suite/` | `json-schema-diffs-extensions-suite.*.it-test.ts` |
| `JSON Schema Diffs Suite (Hiding Unchanged Nodes)` | `json-schema-diffs-hiding-unchanged-nodes-suite/` | `json-schema-diffs-hiding-unchanged-nodes-suite.*.it-test.ts` |
| `JSON Schema Diffs Suite (Node Changes Summary)` | `json-schema-diffs-node-changes-summary-suite/` | `json-schema-diffs-node-changes-summary-suite.*.it-test.ts` |

## Regenerate

Each category README lists its generator. Generated output is committed; do not add these
generators to the `generate-stories` / `generate-tests` npm scripts.
