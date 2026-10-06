# api-doc-viewer monorepo — Agent Instructions

Instructions for AI assistants working on **qubership-apihub-api-doc-viewer** (Cursor, Claude
Code, and compatible tools).

## Repository role

This monorepo ships two npm packages consumed by integrators:

| Package | Path | Role |
| --- | --- | --- |
| **api-doc-viewer** | `packages/api-doc-viewer/` | React viewers (JSON Schema, GraphQL, AsyncAPI, JSO, DDL) |
| **next-data-model** | `packages/next-data-model/` | Tree builders, crawl rules, diff aggregators for viewer data |

**View / data split:** React components render precomputed tree nodes. Diff aggregation,
transformers, and crawl logic belong in **next-data-model** — not in the view layer.

GraphQL viewers are **legacy** (external `api-data-model` / `api-state-model`). JSON Schema,
AsyncAPI, DDL API, and JSO are the active API types.

## Source of truth and workflow

- **Design is the source of truth:** `docs/design/` (index and conventions:
  `docs/design/README.md`). Per API type: `display-coverage.md`, `architecture/` (four
  diagrams), `entities/`, `features/`, `notes/`; cross-API contracts in `docs/design/shared/`.
- Skills derive from the design: `api-doc-viewer-testing`, `next-data-model-authoring`, and
  `api-doc-viewer-authoring` from the design; `api-doc-viewer-using` from those skills. Report
  every disagreement between code, skills, and design; update the design first when the
  implementation is the approved behaviour.
- **Test-first:** design → fixtures + catalogue, stories, screenshot ITs, unit tests
  (`api-doc-viewer-testing`) → implementation (`*-authoring`) → repeat until the developer
  confirms the feature is done.
- Fixture catalogues live next to fixtures: `packages/samples/README.md`.

## Clarification before coding

- Do **not** generate or modify code until task requirements are clear.
- Ask targeted questions when scope, layout (title row vs follow-on row), or acceptance
  criteria are ambiguous.
- Consult `docs/design/<api-type>/display-coverage.md` before treating missing UI as a bug —
  current behaviour is the intentional baseline unless the ticket says otherwise.
- If you must assume something, state assumptions explicitly and keep changes minimal until
  confirmed.

## Primary skills (APM)

Install or refresh agent packages from the repository root:

```bash
apm install --target cursor,claude --legacy-skill-paths
```

| Skill | When |
| --- | --- |
| `api-doc-viewer-authoring` | React viewers, rows, diff chrome, Storybook under `packages/api-doc-viewer/src/` |
| `next-data-model-authoring` | Builders, aggregators, crawl rules under `packages/next-data-model/src/`; JSON Schema row reference docs under its `json-schema/` folder |
| `api-doc-viewer-testing` | Screenshot ITs, fixtures, snapshot regeneration; **troubleshooting hangs/timeouts** (read skill first) |
| `api-doc-viewer-review-session` | End-of-session retrospective — surface findings, update skills |
| `api-doc-viewer-reviewing` | Architecture review / refactoring of one API type stack (shared rules + `review/<api-type>.md` briefs) |
| `api-doc-viewer-using` | Integrator-facing consumption patterns (host apps) |
| `next-data-model-using` | Consuming tree builders from another TypeScript project |
| `ddlapi-using` | ddlapi Realm / merged diff documents (external package) |
| `json-crawl-using` | json-crawl rules (external package) |

Canonical skill sources live under `agent-packages/`. After editing skills there, run
`apm install` so `.cursor/`, `.claude/`, and `.agents/` stay in sync.

## Always-on conventions

- **Legacy viewers** — do not change `GraphSchemaViewer`, `GraphQLOperationViewer`,
  `GraphQLOperationDiffViewer`, or `components/common/diffs/` (`DiffTags`, `DiffBadge`)
  without explicit approval. The legacy (api-data-model based) `JsonSchemaViewer` is
  removed; its next-data-model successor now owns the name — use `JsonSchemaViewer` /
  `JsonSchemaDiffsViewer` (formerly `JsonSchemaNextViewer` / `JsonSchemaNextDiffsViewer`,
  see **JSON Schema viewer names** below).
- **Type guards over casts** — use reusable guards in `src/utils/<spec>/` (viewer) or
  `src/shared/<spec>/guards/` (data layer); see authoring skills.
- **Encapsulation** — domain preparation and diff aggregation stay on builder/transformer/
  aggregator classes; do not export orchestration helpers from `shared/` unless they are
  narrow type guards or accessors.
- **Plain → with-diffs builders** — default for API types such as `ddlapi` and
  `async-api`: `<Spec>TreeWithDiffsBuilder` extends `<Spec>TreeBuilder` and
  reuses crawl/node creation; keep only diffs methods and factory overrides on
  the subclass. **JSO is exceptional:** parallel plain / with-diffs stacks under
  `packages/next-data-model/src/building-service/jso/` and
  `packages/next-data-model/src/model/jso/` — do not assume the default layout.
  Details: `next-data-model-authoring`.
- **Property lists** — list parents precompute sibling context (`buildColumnViewerContexts`,
  `buildIndexViewerContexts`); item viewers render stacked rows only.

## Generated filenames (`*.generated.*`) — important

`.gitignore` excludes `*.generated.*`.

**Use the `.generated` suffix only** for artifacts driven by the **external**
[`qubership-apihub-compatibility-suites`](https://github.com/Netcracker/qubership-apihub-compatibility-suites)
repository (compatibility-suite `*.generated.stories.tsx` /
`*.generated.it-test.ts`).

**Do not** use `.generated.ts`, `.generated.stories.tsx`, or `.generated.it-test.ts` for output
from **in-repo** bin scripts or utilities. Those files are internal (not from an external
source), must be **committed**, and use normal names — for example
`value-range-diff-case-definitions.ts` and
`number-validation-value-range.stories.tsx` (regenerated by
`bin/generate-value-range-diff-stories.mjs`).

| Correct (committed, in-repo) | Wrong (gitignored, do not use) |
| --- | --- |
| `value-range-diff-case-definitions.ts` | `value-range-diff-case-definitions.generated.ts` |
| `number-validation-value-range.stories.tsx` | `…value-range.generated.stories.tsx` |
| `src/it/ddlapi-suite/*.it-test.ts` (DDL generator) | `*.generated.it-test.ts` for local suites |

Details: `api-doc-viewer-testing` skill — **Generated vs hand-written suites**.

## `generate-stories` / `generate-tests` npm scripts (mandatory)

In `packages/api-doc-viewer/package.json`, **`generate-stories` and `generate-tests` must
invoke only the compatibility-suite generators**:

- `node bin/generate-compatibility-suite-stories.mjs`
- `node bin/generate-compatibility-suite-tests.mjs`

**Do not** add DDL, JSON Schema, or any other `bin/generate-*.mjs` to those npm scripts.

All other Storybook stories and screenshot ITs (DDL, JSON Schema, JSO, AsyncAPI, hand-written
diff suites, …) are **persistent** — normal committed files under `src/stories/` and
`src/it/`. When fixtures change, run the matching generator **explicitly** (for example
`node bin/generate-ddl-suite-stories.mjs`), commit the output, and leave `package.json`
unchanged.

`build:showcase`, `development:storybook`, and `screenshot-test` call `generate-stories` /
`generate-tests` before Storybook or Jest — that hook is **only** for refreshing
`*.generated.*` compatibility-suite artifacts.

## next-data-model layout conventions (active development)

- **No re-export shims** — when code moves (e.g. visibility managers into
  `building-service/.../node-visibility-data/`), update import paths at call sites.
  Do **not** leave `model/...` files that only re-export from the new location.
- **No `@deprecated` aliases in source** during active refactors — rename types and
  fix imports directly. Record legacy ↔ new names in this file (or the authoring
  skill) until the stack stabilises.
- **Shared guards** — group small type guards under `shared/<spec>/guards/` by
  domain (e.g. `schema-value.ts`, `tree-node.ts`), not one file per function.
  Export through `shared/<spec>/guards/index.ts` when the folder has multiple modules.
- **Typed keys** — put branded string keys and their guards in
  `shared/<spec>/types/` (see `shared/json-schema/types/extension-key.ts`, mirroring
  `shared/async-api/types/operation-keys.ts`).

### JSON Schema viewer names (api-doc-viewer)

| Legacy | Current |
| --- | --- |
| `components/JsonSchemaNextViewer/` | `components/JsonSchemaViewer/` |
| `JsonSchemaNextViewer` / `JsonSchemaNextViewerProps` | `JsonSchemaViewer` / `JsonSchemaViewerProps` |
| `JsonSchemaNextDiffsViewer` / `JsonSchemaNextDiffsViewerProps` | `JsonSchemaDiffsViewer` / `JsonSchemaDiffsViewerProps` |
| `JsonSchemaNextViewerContext` / `useJsonSchemaNextViewerContext` | `JsonSchemaViewerContext` / `useJsonSchemaViewerContext` |
| `data-testid="json-schema-next-viewer"` | `data-testid="json-schema-viewer"` |
| `data-testid="json-schema-next-diffs-viewer"` | `data-testid="json-schema-diffs-viewer"` |
| `waitForJsonSchemaNextDiffsViewer` (local copies in screenshot ITs) | `waitForJsonSchemaDiffsViewer(page, options)` from `src/it/service/viewer-waits.ts` |

### JSON Schema type names (next-data-model)

| Legacy (api-data-model / early draft) | Current |
| --- | --- |
| `JsonSchemaNodeType` | `JsonSchemaNodeValueType` |
| `IJsonSchemaBaseType` | `JsonSchemaTreeNodeValueBase` |
| `IJsonSchemaStringType` | `JsonSchemaTreeNodeValueTypeString` |
| `IJsonSchemaNumberType` | `JsonSchemaTreeNodeValueTypeNumber` |
| `IJsonSchemaObjectType` | `JsonSchemaTreeNodeValueTypeObject` |
| `IJsonSchemaArrayType` | `JsonSchemaTreeNodeValueTypeArray` |
| Value types live in | `model/json-schema/types/node-value.ts` |
| Node kinds live in | `model/json-schema/types/node-kind.ts` |
| Plain visibility resolvers live in | `building-service/json-schema/tree/node-visibility-data/` |

## Cross-package DDL diffs workflow

DDL table diffs touch both packages and fixtures:

1. **Transformer** — `DdlApiSpecWithDiffsTransformer` maps ddlapi merged diffs onto row fields
   (`packages/next-data-model/.../ddlapi-spec-with-diffs-transformer.ts`).
2. **Aggregators** — kind-specific files under `node-diffs-data/node-diffs/` and
   `node-diffs-severities/` populate `nodeDiffs`, flag diffs, and severities.
3. **Viewer** — `DdlTableDiffsViewer` + `*WithDiffs` node viewers consume accessors such as
   `takeDdlPropertyTitleRowDiff` and `takeColumnFlagDiffs`; do not re-derive in React.
4. **Fixtures** — SQL pairs under `packages/samples/ddlapi-diffs/`; hand-written stories and
   ITs under `src/stories/ddlapi-diffs-suite/` and `src/it/ddlapi-diffs-suite/`.
5. **Tests** — unit tests in `packages/next-data-model/tests/` for aggregation and
   transformer logic; screenshot ITs after visual changes (`npm run regenerate-screenshots` in
   `packages/api-doc-viewer/`).

**Non-obvious DDL diff traps (keep in data layer):**

- **Stable flags vs nested diffs** — FK target replacement and generated kind switches
  keep boolean flags (`isForeignKey`, `isGenerated`) unchanged; emit nested/target or
  `generatedExpression` diffs only. Omitting flag diffs requires merge-aware checks
  (incoming generated attr), not `findGeneratedColumnAttr` alone on merged columns.
- **`textHighlighterColor` is field-specific** — expression replace yes; expression
  add/remove no; FK link text yes; column/index names never. Synthetic title-row
  replace uses row background only.
- **Index subheader part names** — always `(c1, c2)` for named indexes in diffs, including
  when `partNameDiffs` is absent; fix `resolveIndexPartNamesSideDisplay`, not viewer
  parentheses branching.
- **Viewer consumes; do not patch** — `TextValue`, `AdditionalInfoPiece`, and `DiffBadge`
  read precomputed styles; fix aggregators/transformers first.

JSO diffs specification: `docs/design/jso/features/diffs.md`.

## JSON Schema Diffs Suite (type changes)

Generated YAML pairs under `packages/samples/json-schema-diffs/type-changes/` exercise
validation-row and metadata diffs with **`hideUnchangedNodes: false`**.

1. **Case definitions** — `packages/api-doc-viewer/bin/json-schema-type-changes-cases.mjs`
2. **Generate** — `node bin/generate-json-schema-type-changes-samples.mjs` writes fixtures,
   `src/stories/json-schema-diffs-suite/*`, and `src/it/json-schema-diffs-suite/*`
3. **Catalogue** — `packages/samples/json-schema-diffs/type-changes/README.md`
4. Storybook root title: **`JSON Schema Diffs Suite`** (sub-groups: Type Flags, Description
   Changes, String Validation …, Extended …, Circular)

### Value range (programmatic — not YAML)

Number validation **value-range** cases are built programmatically (OAS 3.0 and OAS 3.1).
Catalogue: `packages/samples/json-schema-diffs/README.md` → Value range.

| Role | Path |
| --- | --- |
| Case definitions (committed `.ts`, not `.generated.ts`) | `src/stories/json-schema-diffs-suite/value-range-diff-case-definitions.ts` |
| OAS 3.0 resolver | `src/stories/json-schema-diffs-suite/value-range-diff-samples.ts` |
| OAS 3.1 resolver | `src/stories/json-schema-diffs-suite/value-range-diff-oas-31-samples.ts` |
| Regenerate stories/ITs | `node bin/generate-value-range-diff-stories.mjs` |

### Validation rows (plain and with-diffs)

Design: `docs/design/json-schema/features/validation-rows.md` (row catalogue, order, OAS 3.0/3.1
dialects, with-diffs rules). Implementation traps and session lessons:
`agent-packages/next-data-model-authoring/.apm/skills/next-data-model-authoring/json-schema/json-schema-validation-rows.md`.

### Meta flags and `required` (type-flags diffs)

Design: `docs/design/json-schema/features/meta-flags-and-required.md`. See
`agent-packages/next-data-model-authoring/.apm/skills/next-data-model-authoring/json-schema/json-schema-meta-flags-and-required.md`
for parent-scoped `required` propagation, legacy index-keyed diff records, crawl-fragment lookup traps,
title asterisk vs subheader badge layout, and type-flags sample case conventions (`001`–`013`).

### Nesting-indicator row diffs (`NestingIndicatorTitleRow`)

The "Properties"/"Items" header row above a node's children list highlights when the owning node
(or an inherited parent/container) was wholly added/removed, or when every visible child was
uniformly added/removed. Design: `docs/design/json-schema/features/nesting-indicator-row-diffs.md`
and `docs/design/shared/features/section-header-colorizing.md`. See
`agent-packages/next-data-model-authoring/.apm/skills/next-data-model-authoring/json-schema/json-schema-nesting-indicator-row-diffs.md`
for why the row can't reuse `NODE_LEVEL_DIFF_KEY`, the `nodeDescendantDiffs` pollution trap, and the
row-colorizing-vs-severity pairing rule. Apply when changing `SchemaNodeViewer`'s nesting-indicator
wiring or the shared `NestingIndicatorTitleRow` components.

## JSON Schema diffs workflow (hiding unchanged rows)

Hand-written diff sample suites follow the AsyncAPI / JSO pattern:

1. **Fixtures** — YAML pairs under `packages/samples/json-schema-diffs/hiding-unchanged-rows/`
   (`before.yaml` / `after.yaml` per case). Catalogue:
   `packages/samples/json-schema-diffs/hiding-unchanged-rows/README.md`.
2. **Merge** — `prepareJsonDiffSchema()` in `packages/api-doc-viewer/src/stories/preprocess.ts`
   wraps each pair in a synthetic OAS template and runs `apiDiff`.
3. **Stories** — `packages/api-doc-viewer/src/stories/json-schema-diffs-hiding-unchanged-nodes-suite/`
   globs fixtures, merges via the shared `json-schema-diffs-suite/json-schema-diffs-utils.tsx`
   (case factories called with `defaultHideUnchangedNodes = true`), renders with
   **`JsonSchemaDiffsViewer`** (`hideUnchangedNodes` defaults to `true`). Storybook root title:
   `JSON Schema Diffs Suite (Hiding Unchanged Nodes)`.
4. **Screenshot ITs** — paired `src/it/json-schema-diffs-hiding-unchanged-nodes-suite.*.it-test.ts`;
   wait for `[data-testid="json-schema-diffs-viewer"]` before capture (see
   `api-doc-viewer-testing` skill).
5. **Changed-only rows** — data-layer `isJsonSchemaNodeChanged` /
   `resolveJsonSchemaUnchangedBlocks` plus viewer `UnchangedBlocksContext` and
   `SchemaNodeChildrenListWithDiffs`; design in
   `docs/design/json-schema/features/hiding-unchanged-nodes.md` and
   `docs/design/shared/features/hiding-unchanged-nodes.md`.

**Non-obvious hiding trap (design remark A / B / C):**

- Hiding applies only among **`childrenNodes()` siblings** at one list level.
- **A** is the parent row; **B** and **C** are its **descendants** (typically direct children
  that are siblings under A). **B** is changed, **C** is unchanged.
- **A** and **B** stay visible; **C** is hidden behind `Show 1 unchanged node(s)` in **A**'s
  child list. Map to fixture **2.8**: **A** = `prop2`, **B** = a changed nested property
  (e.g. `nested1`), **C** = an unchanged nested sibling (e.g. a nested field with no diffs).
- **A** is classified changed via `isJsonSchemaNodeChanged` walking its own subtree until it
  reaches **B**; **C** is unchanged among A's siblings only — diff signals on **B** do not
  hide **A** and must not mark **C** as changed.
- Do not use `hasOwnChangeSignals` alone for sibling grouping when the node is an object
  sibling that must reflect nested edits (same predicate as initial expand).

When adding a case: YAML pair → story export → matching `it(...)` with Storybook slug from
**9009** `index.json` (not guessed from folder name alone).

## Related repositories

| Repository | Relationship |
| --- | --- |
| [qubership-apihub-ddlapi](https://github.com/Netcracker/qubership-apihub-ddlapi) | PostgreSQL DDL schema model and merged diff documents |
| [qubership-apihub-json-crawl](https://github.com/Netcracker/qubership-apihub-json-crawl) | Document crawl engine used by tree builders |
| [qubership-apihub-api-diff](https://github.com/Netcracker/qubership-apihub-api-diff) | Diff types consumed by with-diffs builders |
| [qubership-apihub-compatibility-suites](https://github.com/Netcracker/qubership-apihub-compatibility-suites) | **Only** external source for `*.generated.*` stories/tests |

## Cross-platform development

Team members use **Linux** and **Windows (often with WSL or Git Bash)**. Prefer repo-relative
paths and portable bash when renaming fixture directories. When bulk-renumbering sample case
folders, rename from **highest index downward** via a temporary prefix — avoid naive
zero-padded renames that treat `08`/`09` as octal in shell arithmetic.

## Documentation

- Design (source of truth): `docs/design/README.md` — coverage baselines, architecture diagrams,
  entities, features, and review notes per API type.
- Fixture catalogues: `packages/samples/README.md` and the `README.md` next to each fixture folder.
- JSON Schema reference docs (validation rows, meta flags / `required`, nesting-indicator row
  diffs): `agent-packages/next-data-model-authoring/.apm/skills/next-data-model-authoring/json-schema/`.
- Refactoring candidates (viewer CSS, hiding-unchanged toggle):
  `agent-packages/api-doc-viewer-authoring/.apm/skills/api-doc-viewer-authoring/refactoring-notes.md`.
- This file is **hand-written and committed**. Do not run `apm compile` at the repository root —
  it overwrites `AGENTS.md`.
- Do **not** add minor feature notes to the repository root `README.md` unless asked.
