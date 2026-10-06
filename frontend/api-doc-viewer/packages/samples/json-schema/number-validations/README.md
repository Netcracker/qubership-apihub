# JSON Schema fixtures — number validations

Programmatic **value-range** plain cases for `type: number` (and `integer`). There are no YAML
fixtures in this folder: schemas are built by `buildValueRangeSchema()` in
`packages/api-doc-viewer/src/stories/shared/value-range-schema-builder.ts` from
`src/stories/json-schema-suite/value-range-plain-case-definitions.ts`.

## Cases

| Dialect | Cases per type |
| --- | ---: |
| OAS 3.0 (boolean exclusive flags) | 13 |
| OAS 3.1 (numeric exclusive bounds) | 19 |

## Storybook and screenshot tests

`{integer,number}-validations-value-range.stories.tsx` and
`{integer,number}-validations-value-range-oas-3-1.stories.tsx` in
`packages/api-doc-viewer/src/stories/json-schema-suite/`, with paired ITs.

## Regenerate

See [../README.md](../README.md#regenerate) (validation categories and value range).
