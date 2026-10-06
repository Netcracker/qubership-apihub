# JSON Schema fixtures

Plain (non-diff) fixtures for `JsonSchemaViewer`. Each YAML case is
`<category>/<case-id>/sample.yaml`. Design baseline:
`docs/design/json-schema/display-coverage.md`.

## Categories

| Category | Cases | Source |
| --- | ---: | --- |
| `boolean/`, `string/`, `number/`, `integer/` | 8 each | generated YAML (`generate-json-schema-samples.mjs`) |
| `object/` | 34 | generated YAML |
| `array/` | 24 | generated YAML |
| `boolean-validations/` | 7 | generated YAML: default, example, examples |
| `string-validations/` | 24 | generated YAML: default, example, examples, enum, value length, pattern |
| `integer-validations/` | 13 | generated YAML: default, example, examples, multipleOf |
| `object-validations/` | 10 | generated YAML: default, example, examples, properties count |
| `array-validations/` | 10 | generated YAML: default, example, examples, items count, unique items |
| `number-validations/` | — | programmatic value range only, see [number-validations/README.md](number-validations/README.md) |
| Value range (integer, number) | 13 OAS 3.0 + 19 OAS 3.1 each | programmatic (`value-range-plain-case-definitions.ts`) |
| `oneOf/`, `anyOf/`, `allOf/` | 97 each | programmatic, see the category READMEs |
| `combiner/` | 1 | hand-written YAML |
| `description/` | 4 | hand-written YAML |
| `extensions/` | 13 | hand-written YAML |
| `performance-tests/` | 1 | hand-written YAML (large real-world schema) |

Every schema `title` in the validation categories starts with the validation subset in square
brackets, for example `[default] default = false` or
`[value-range-min-0-inclusive] Minimum 0 (inclusive)`.

## Combiner terminology

- **1st-combiner** — the top-level combiner; matches the category (`oneOf` / `anyOf` / `allOf`).
- **2nd-combiner**, **3rd-combiner** — a combiner nested inside an option of the previous one.
- **type-schema** — an option with a comprehensive schema (all applicable validation keywords) for
  one `type`.
- **type-title-format-schema** — the same plus optional `title` / `format` (`NULL` = omitted).
- **type-schema-combinerKind** — the 1st-combiner has one option that is a 2nd-combiner of the
  named kind, whose first variant is the type-schema (2 levels).
- **type-schema-combinerKind1-combinerKind2** — 1st → 2nd (`combinerKind1`) → 3rd (`combinerKind2`)
  → type-schema (3 levels); both nested kinds vary over all three kinds.

Six types are iterated: `string`, `number`, `integer`, `boolean`, `array`, `object`.

## Storybook and screenshot tests

Story files live in `packages/api-doc-viewer/src/stories/json-schema-suite/` (plus
`json-schema-extensions-suite/` and `json-schema-performance-suite/`); each has a paired IT in
`src/it/`.

| Story title | Story file |
| --- | --- |
| `JSON Schema Suite/<Type> And Validations/<Type>` | `<type>.stories.tsx` |
| `JSON Schema Suite/<Type> And Validations/<Type> Validations` | `<type>-validations.stories.tsx` |
| `JSON Schema Suite/…/Validations Value Range` (OAS 3.0, OAS 3.1) | `{integer,number}-validations-value-range[-oas-3-1].stories.tsx` |
| `JSON Schema Suite/Combiners/*` | `{one,any,all}-of-combiner-suite.stories.tsx`, `combiner.stories.tsx` |
| `JSON Schema Suite/Description` | `description.stories.tsx` |
| `JSON Schema Suite/Circular Ref` | `circular-ref.stories.tsx` |
| `JSON Schema Suite (Extensions)` | `json-schema-extensions-suite/extensions.stories.tsx` |
| `JSON Schema Suite (Performance)` | `json-schema-performance-suite/performance-tests.stories.tsx` |

## Regenerate

From `packages/api-doc-viewer/`, then commit the output:

```bash
# type categories
node bin/generate-json-schema-samples.mjs
node --experimental-strip-types bin/generate-json-schema-suite-stories.mjs
node --experimental-strip-types bin/generate-json-schema-suite-tests.mjs
# validation categories and value range
node bin/generate-json-schema-validation-samples.mjs
node --experimental-strip-types bin/generate-json-schema-validation-suite-stories.mjs
node --experimental-strip-types bin/generate-json-schema-validation-suite-tests.mjs
# combiners: see oneOf/README.md
```
