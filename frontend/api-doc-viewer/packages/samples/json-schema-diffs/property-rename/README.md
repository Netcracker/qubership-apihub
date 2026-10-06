# JSON Schema diff fixtures — property rename

Hand-written pairs for a **renamed property key** (`rename` node-level diff) in
`JsonSchemaDiffsViewer`. Design: `docs/design/json-schema/features/node-key-rename.md`.

- Total cases: 9
- Layout: `json-schema-diffs/property-rename/<case-id>/before.yaml` and `.../after.yaml`
- Each file is a **single-operation OpenAPI 3.0 document**, not a standalone JSON Schema.

## Why OpenAPI fixtures

`apiDiff` never renames a JSON Schema property: its object mapping pairs equal keys only, so a
changed key is `remove` + `add`. A `rename` reaches the viewer only from a schema synthesized from
another structure. The stories reproduce that pipeline:

1. `mergeOpenApiDocuments()` (`packages/api-doc-viewer/src/stories/preprocess.ts`) merges the pair.
   `apiDiff` maps **path** parameters by their position in the path template, so a renamed path
   parameter becomes a `name` replace on the parameter.
2. `synthesizeParametersSchema()` (`src/stories/json-schema-diffs-suite/parameters-schema-synthesis.ts`)
   builds an object schema with one property per parameter: the `name` replace becomes a `rename`
   in `properties[diffsMetaKey]` (keyed by the after name), parameter-level diffs (`description`,
   `deprecated`, …) and the parameter schema diffs become the property's diffs, whole-parameter
   add/remove becomes a property add/remove, `required` becomes the `required` array.

Every renamed parameter carries an unchanged `description`, so the description row must stay
unhighlighted unless the case changes it.

## Cases

| Case id | Change |
| --- | --- |
| `01-renamed-only` | `id` → `userId`; sibling `orderId` unchanged |
| `02-renamed-and-description-changed` | `id` → `userId`; description replaced (description row yellow) |
| `03-renamed-and-type-changed` | `id` → `userId`; `string` → `integer`, `format: int64` added |
| `04-renamed-and-validation-changed` | `id` → `userId`; `maxLength` 36 → 64, `pattern` added |
| `05-renamed-and-deprecated` | `id` → `userId`; parameter became `deprecated` |
| `06-renamed-object-parameter` | `filter` → `period` (object schema); nested `to.format` `date` → `date-time`, nested `from` unchanged |
| `07-two-parameters-renamed` | `id` → `userId` and `oid` → `orderId` |
| `08-renamed-with-query-parameter-added` | `id` → `userId`; query parameter `verbose` added |
| `09-query-parameter-renamed-is-removed-and-added` | query `q` → `query`: query parameters are matched by name, so this is `remove` + `add`, no rename |

## Storybook and screenshot tests

| Story | IT |
| --- | --- |
| `JSON Schema Diffs Suite/Property Rename` — `src/stories/json-schema-diffs-suite/property-rename.stories.tsx` | `src/it/json-schema-diffs-suite/property-rename.it-test.ts` |

Rendered with `hideUnchangedNodes: false`. Both files are generated from the case folders: after
adding a case folder, run `node bin/generate-json-schema-property-rename-suite.mjs` from
`packages/api-doc-viewer/` and commit the output (not part of the `generate-stories` /
`generate-tests` npm scripts).
