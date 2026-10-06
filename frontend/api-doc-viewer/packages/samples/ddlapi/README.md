# DDL API fixtures

Plain SQL fixtures for `DdlTableViewer`: `<category>/<case-id>/sample.sql`, parsed with ddlapi
`buildFromDdl`. Design: `docs/design/ddlapi/display-coverage.md`.

## Categories

| Category | Cases | Covers |
| --- | ---: | --- |
| `column-types/` | 45 | one PostgreSQL type per case (type label formatting) |
| `column-constraints/` | 21 | PK, FK (incl. custom schema), unique, not null, generated (identity, serial, expression) and their combinations |
| `indexes/` | 10 | one / two columns, unique, unnamed, expression, partial, covering (`INCLUDE`), `NULLS NOT DISTINCT` |
| `escaping-spec-chars/` | 10 | special characters in default values and generated expressions |
| `e2e-scenarios/` | 7 | realistic tables (employees, projects, petstore, users, …) |
| `display-mode-simple/` | 4 | simple display mode hides default, enum values, generated expression, long description |
| `table-descriptions/` | 2 | table comments |

## Storybook and screenshot tests

| Category | Story title | Story file (`src/stories/ddlapi-suite/`) |
| --- | --- | --- |
| `column-types/` | `DDL API Suite/Column Types` | `column-types.stories.tsx` |
| `column-constraints/` | `DDL API Suite/Column Constraints` | `column-constraints.stories.tsx` |
| `indexes/` | `DDL API Suite/Indexes` | `indexes.stories.tsx` |
| `escaping-spec-chars/` | `DDL API Suite/Escaping Spec Chars` | `escaping-spec-chars.stories.tsx` |
| `e2e-scenarios/` | `DDL API Suite/E2E Scenarios` | `e2e-scenarios.stories.tsx` |
| `display-mode-simple/` | `DDL API Suite/Display Mode Simple` | `display-mode-simple.stories.tsx` |
| `table-descriptions/` | `DDL API Suite/Table Descriptions` | `table-descriptions.stories.tsx` |

ITs: `packages/api-doc-viewer/src/it/ddlapi-suite/`. `DDL API Suite/Bugs` and
`Debug/DDL API from DDL SQL` are hand-written stories without fixtures here.

## Regenerate

From `packages/api-doc-viewer/`, then commit the output (do not add these to npm scripts):

```bash
node bin/generate-ddl-suite-stories.mjs
node bin/generate-ddl-suite-tests.mjs
```
