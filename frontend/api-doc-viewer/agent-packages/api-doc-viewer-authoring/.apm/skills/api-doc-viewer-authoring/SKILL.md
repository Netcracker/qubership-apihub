---
description: Extend api-doc-viewer React viewers — components, layout modes, diff rendering, and Storybook stories.
---

# Authoring api-doc-viewer

api-doc-viewer renders API specifications (JSON Schema, GraphQL, AsyncAPI,
JSO, DDL tables) as human-readable React trees. The view layer lives under
`packages/api-doc-viewer/src/`; tree construction and diff aggregation live
in `packages/next-data-model/` (see the `next-data-model-authoring` skill).

**Documentation scope:** skills and agent docs for this repository describe
library behaviour only. Do **not** name or reference consuming applications,
their repositories, file paths, or UI components — use generic terms such as
*host application*, *integrator*, or *embedder*.

## Component families

| Family | Plain viewer | Diffs viewer | Status |
| --- | --- | --- | --- |
| JSON Schema | `JsonSchemaViewer` | `JsonSchemaDiffViewer` | legacy — do not change without approval |
| GraphQL schema | `GraphSchemaViewer` | — | legacy |
| GraphQL operation | `GraphQLOperationViewer` | `GraphQLOperationDiffViewer` | legacy |
| AsyncAPI operation | `AsyncApiOperationViewer` | `AsyncApiOperationDiffsViewer` | active |
| JSO | `JsoViewer` | `JsoDiffsViewer` | active |
| DDL table | `DdlTableViewer` | `DdlTableDiffsViewer` | active |

Public exports are registered in `src/index.ts`. Keep internal helpers
(style hooks, base renderers) out of the package API.

## Always-on rule

Do not modify legacy viewers (`JsonSchemaViewer`, `GraphSchemaViewer`,
`GraphQLOperationViewer`) without explicit user approval. Prefer
`AsyncApiOperationViewer`, `JsoViewer`, and `DdlTableViewer` for new work.

## Layout and display modes

**Layout mode** (`LayoutMode` in `src/types/LayoutMode.ts`):

- `document` — single-sided rendering, no diff chrome.
- `side-by-side-diffs` — before/after columns with diff markers (default for
  diffs viewers).
- `inline-diffs` — inline diff markers in one column.

**Display mode** (`DisplayMode`):

- `simple` — titles and types only.
- `detailed` — descriptions, deprecation, annotations, and other metadata.

Pass modes through the matching React contexts (`LayoutModeContext`,
`DisplayModeContext`) rather than threading props through every child.

## View / data split

Plain viewers instantiate a tree builder from `next-data-model` and walk
`childrenNodes()` / `nestedNodes()`:

- JSO — `JsoTreeBuilder` → `JsoPropertyNodeViewer`.
- JSO diffs — `JsoTreeWithDiffsBuilder` with `diffMetaKeys` →
  `JsoPropertyNodeViewerWithDiffs`.

Diffs viewers wrap children in `DiffMetaKeysContext`, `DiffTypesContext`, and
force `SIDE_BY_SIDE_DIFFS_LAYOUT_MODE`. Do not re-derive diff metadata in the
view layer — consume precalculated fields from tree nodes
(`nodeDiffs`, `nodeDiffsSeverities`, `nodeDescendantDiffs`, summaries).

Keep plain and diffs pipelines separate: wrappers orchestrate; shared base
renderers (`BaseJsoValue`, layout rows) only draw resolved values and CSS
classes.

## Shared UI building blocks

Reuse existing rows and layout primitives under
`src/components/shared-components/` (`TitleRow`, `TextRow`, `OneSideLayout`,
`SideBySideLayout`, diff badges). Diff styling lives in
`src/components/shared-styles/diffs/`.

New node viewers should follow the established pattern: memoised FC, optional
`ErrorBoundary`, `LevelContext` / `AsyncLevelContextProvider` for nesting
depth, `WithPrecededByProps` for indent connectors.

## Component file naming

Name the source file after the **default or primary exported React component**
(PascalCase), not a kebab-case description of the feature:

| Prefer | Avoid |
| --- | --- |
| `DefaultNavigationLink.tsx` | `navigation-link.tsx` |
| `ForeignKey/ForeignKey.tsx` | `foreign-key.tsx` |

Co-locate types that exist only for that component (e.g. `NavigationLinkProps`
in `DefaultNavigationLink.tsx`). Shared cross-package types belong in
`next-data-model` or a dedicated `types/` module.

## React hooks

Never invoke hooks conditionally. Call every hook (`useMemo`, `useState`,
`useCallback`, `useContext`, custom hooks, etc.) on every render, in a fixed
order, before any early `return`.

Common viewer pattern: outer wrapper may return `null` when `source === null`
**before** rendering an inner component; the inner component runs all hooks,
then returns `null` when the tree root is missing or the wrong kind (see
`AsyncApiOperationViewer` / `DdlTableViewer`).

## Type narrowing (type guards)

When you would write a type assertion (`value as SomeType`) or assign
`childrenNodes()` to a wider node array via a type annotation alone, prefer a
**type guard** (`value is SomeType`) instead.

| Avoid | Prefer |
| --- | --- |
| `node.childrenNodes() as DdlApiTreeNode[]` | `getDdlApiChildNodes(node)` |
| `const children: DdlApiTreeNode[] = parent.childrenNodes()` | `getDdlApiChildNodes(parent)` |
| Per-kind `as` at every viewer call site | Reusable guards in `src/utils/<spec>/node-type-checkers.ts` |

`ITreeNode.childrenNodes()` is typed with the **parent** node's value/kind
generics, so child lists need guard-backed helpers before dispatching to
per-kind viewers. Place guards next to other viewer utilities (see
`src/utils/ddlapi/node-type-checkers.ts`: `isColumnNode`, `getColumnChildNodes`,
…). Exceptions: `as const`, import aliases, and reduce accumulators typed via a
generic parameter instead of `as`.

Apply this rule in `packages/api-doc-viewer/` when touching tree walk or node
dispatch code. For builder/transformer narrowing, see `next-data-model-authoring`.

## Storybook and samples

Stories live in `src/stories/` grouped by suite (`jso-suite/`,
`async-api-diffs-suite/`, `ddlapi-suite/`, etc.). Fixture YAML/SQL under
`packages/samples/` is loaded via `import.meta.glob`.

Diff-suite stories typically:

1. Glob `before.yaml` / `after.yaml` pairs from `packages/samples/`.
2. Build viewer args through suite-specific utils (e.g.
   `async-api-diffs-utils.tsx`).
3. Export one Storybook story per sample case; story export names become
   kebab-case story IDs (`metaId--story-name`).

Compatibility-suite stories and tests are **generated** — run
`npm run generate-stories` / `npm run generate-tests` inside
`packages/api-doc-viewer` rather than hand-editing
`src/stories/compatibility-suite/` or `src/it/compatibility-suite/`.

## DDL viewer notes

**Coverage baseline:** which ddlapi model fields are shown vs omitted is documented in
`packages/api-doc-viewer/ddlapi-display-coverage.md`. Consult it before adding rows/badges,
writing Storybook assertions, or treating missing UI as a bug. Current behaviour is the
intentional baseline.

DDL stories parse SQL through `buildFromDdlInBrowser` (dynamic import with
`?ddlapi-browser-parser`) so libpg-query stays in an async chunk. When
touching DDL crawl or navigation, also apply the `ddlapi-using` skill from
the ddlapi package.

### Foreign-key navigation (`navigationLinkBuilder` / `navigationLinkComponent`)

FK badges in `ForeignKey/ForeignKey.tsx` link to related tables. URL construction
and link rendering are **separate concerns**:

| Piece | Location | Role |
| --- | --- | --- |
| `NavigationLinkBuilder` | `next-data-model` type; required `DdlTableViewer` prop | `(schema, table, column) => string` — href for the referenced table |
| `navigationLinkComponent` | optional `DdlTableViewer` prop | React component that renders the FK label as a link |
| `DefaultNavigationLink` | `DefaultNavigationLink.tsx` | Default implementation — plain `<a href>` |
| `DdlTableViewerContext` | `DdlTableViewerContext.tsx` | Supplies builder + component to `ForeignKey` |

**Authoring rules:**

- Do **not** add `react-router-dom` (or any host-router dependency) to
  api-doc-viewer. Hosts inject routing via `navigationLinkComponent`.
- Default when the prop is omitted: `DefaultNavigationLink`.
- Export public types from `src/index.ts`: `NavigationLinkProps`,
  `NavigationLinkComponent` (builder type is re-exported from next-data-model).
- `ForeignKey` must read both values from `useDdlTableViewerContext()` and
  render `<NavigationLinkComponent href={…} className="ddlapi-foreign-key-link">`.
- Storybook and screenshot suites keep the default anchor — no custom link
  component unless a story explicitly tests link chrome.
- When implementing `DdlTableDiffsViewer`, forward the same props/context pattern.

**Host integration** (for `api-doc-viewer-using`): pass a wrapper around the
host router's link primitive; keep `navigationLinkBuilder` returning pathname +
search the host router accepts.

### Stacked rows — do not collapse into one custom row

Many viewers are a **vertical stack** of row components, not one row with
everything inline. Reference patterns:

| Viewer / area | Stack |
| --- | --- |
| `JsonPropNodeBody` | `HeaderRow` → `Annotations` / `Validations` / `Extensions` |
| Legacy JSON Schema | `HeaderRow` → `AdditionalInfoArrayRow` / `AdditionalInfoObjectRow` |
| DDL column (evolving) | `TitleRow` → optional `TextRow` → `AdditionalInfoRow` |

**Clarify before coding** when a task mentions a row “like” an existing viewer
but with layout differences:

1. **Replace** existing JSX, or **append** a new row below code that must stay
   unchanged?
2. Should metadata live in `TitleRow.subheader` (same line as title) or on a
   **separate row below** the header?

**Common misread (session lesson):** assuming “subheader” always means
`TitleRow.subheader` on one line. For DDL additional metadata, the product
intent is often a **second row** (`AdditionalInfoRow`) with label + externally
composed chips — analogous to `AdditionalInfoArrayRow`, not a fork of
`TitleRow`.

**Scope discipline:**

- Do **not** replace `TitleRow` with a bespoke row or refactor sibling node
  viewers unless explicitly requested.
- Do **not** generalize `JsoValue`, remove `DdlApiPropertyValue`, or touch
  unrelated viewers as part of adding one new row — that is “redundant impact”.
- Prefer **additive** changes: keep existing `TitleRow` / `TextRow` blocks;
  append new rows after them.

### Generated column badge (`ColumnRowBadges`)

When `DdlApiColumnRowValue.isGenerated` is true, `ColumnRowBadges` shows a single
**generated** badge. Do **not** branch badge text on `generatedBy`:

- `generatedBy: 'identity'` (PostgreSQL `GENERATED … AS IDENTITY`) and
  `generatedBy: 'expression'` (`GENERATED ALWAYS AS (…) STORED`) both render
  **generated**.
- Keep `generatedBy` on the data model unchanged — it distinguishes ddlapi
  sources for other consumers; only the viewer collapses the label.
- For expression-generated columns, the SQL expression still appears on the
  separate `AdditionalInfoRow` (label `As`) when `generatedExpression` is set.

### `AdditionalInfoRow` and `AdditionalInfoPiece` (DDL)

Location: `packages/api-doc-viewer/src/components/DdlTableViewer/`.

| Component | Role |
| --- | --- |
| `AdditionalInfoRow` | Follow-on row: `label` + `subheader` callback (same API shape as `TitleRow`) |
| `AdditionalInfoPiece` | Block-only value chip (JsoValue `.block` styling); no `text` variant |

**Orchestration:** the **node viewer** (`ColumnNodeViewer`, etc.) owns the
stack and passes domain content into `subheader`; `AdditionalInfoRow` only
provides layout/indent/label styling — it does not import badges or formatters.

**Indent:** mirror `TitleRowContent` (`LevelIndicator` + expander column), but
replace `Expander` / `NestingHorizontalIndicator` with an empty **`w-4`**
spacer (same horizontal footprint as the expander column). This is not
`LevelIndicator lastInvisible` and not removing vertical lines entirely.

**Label styling:** `#626D82`, `font-size: 12px`, `font-weight: 400`
(`.additional-info-row-label`).

**Diff highlighting (session lesson):**

- **`AdditionalInfoRow`** applies side **background** from the **row colorizing** diff prop
  (`colorizingDiff`), not from the chip-level diff — same pattern as enum **Values** row.
- **`AdditionalInfoPiece`** renders values in a **two-layer** DOM (JsoValue `.block` pattern):
  outer span keeps the grey block chip; inner span receives `textHighlighterColor` via
  `takeDiffSideTextHighlighterColor`; outer span may receive `borderShadowColor` via
  `takeDiffSideBorderShadowColor` — do not compound `.block.diffs-highlighter_*` on one element.
- **Generated expression** (`As` row): pass `textHighlighterColor` only; add/remove uses row
  background; replace sets yellow text highlighter in the data layer.
- **Default value** (`Default` row): pass **both** `textHighlighterColor` and
  `borderShadowColor` from `takeColumnDefaultValueDiff` — boolean replace uses yellow border
  shadow only (JSO predefined-value parity); scalar replace uses yellow text highlighter only.
- **Enum literals** (`Values` row): pass `textHighlighterColor`, `borderShadowColor`, and
  `isFontMuted` per side item — mirror `resolveColumnEnumValueSideItems` orchestration.

### Column default value diffs (`ColumnNodeViewerWithDiffs`)

Follow the **enum Values row** split: row background vs chip chrome are separate diffs.

| Diff field | Role | Viewer wiring |
| --- | --- | --- |
| `defaultValueRowColorizingDiff` | Row green/red/yellow background | `AdditionalInfoRow colorizingDiff={…}` via `takeColumnDefaultValueRowColorizingDiff` |
| `defaultValue` | Chip side visibility (add/remove) or replace highlight | `AdditionalInfoPiece` style props via `takeColumnDefaultValueDiff` |
| Side display value | Text shown per layout side | `resolveColumnDefaultValueSideDisplay(node, layoutSide)` — show diff side even when merged row has no `defaultValue` |

**Visibility:** `hasDefaultValue` must be true when either merged `value.defaultValue` or either
default diff accessor is present — otherwise replace/remove rows disappear on one side.

**Stack order:** `TitleRow` → optional description `TextRow` → optional enum **Values** row →
**Default** row → **As** (generated) row. Reuse `buildColumnViewerContexts` for
`additionalInfoPrecededBy` and `data-ddl-list-last-row` on the terminal additional-info row.

**JSO parity (boolean replace):** when `columnType.kind === BoolType`, replace highlight is
yellow **`borderShadowColor`** on the chip, not `textHighlighterColor` — match JSO predefined
boolean values (`JsoPropertyNodeViewerWithDiffs` / `borderShadowColor` on block values).

Orchestration example (default row subheader):

```tsx
subheader={(layoutSide) => (
  <AdditionalInfoPiece
    isVisible={true}
    value={resolveColumnDefaultValueSideDisplay(node, layoutSide)}
    textHighlighterColor={takeDiffSideTextHighlighterColor(defaultValueDiff, layoutSide)}
    borderShadowColor={takeDiffSideBorderShadowColor(defaultValueDiff, layoutSide)}
  />
)}
```

Fix wrong chip/row colours in **next-data-model** (`kind-column.ts` aggregators,
`ddlapi-spec-with-diffs-transformer.ts` nested default resolution) — not in `AdditionalInfoPiece`.

### DDL property title row — no column-name text highlight

`TitleRow` → `TextValue` reads `diff.styles.*.textHighlighterColor` from
`takeDdlPropertyTitleRowDiff` (via `buildDdlPropertyTitleRowDiffProps`). For DDL
**property lists**, product rule: **do not** yellow-highlight column or index
**names** — only the title-row **background** (including synthetic replace when
badges change).

| Symptom | Likely cause | Fix (data layer) |
| --- | --- | --- |
| Column name yellow on PK/FK/generated badge change | `TITLE_ROW_FLAG_AS_REPLACE_STYLES` had `textHighlighterColor` | Remove from synthetic title-row styles in `kind-any.ts` |
| Column name yellow on rename | `buildChangedPropertyMetaDataFromDiff` on `columnName` | Use `buildDdlPropertyNameChangedPropertyMetaDataFromDiff` in `aggregateTextDiff` |

Do **not** strip highlighter in `TextValue` for DDL only — fix diff metadata in
next-data-model so badges and expression chips keep their own contracts.

### Property list viewers (DDL columns/indexes, JSO, future specs)

Several viewers render a **flat or nested list of properties** under a section
header. Each list item is a node viewer (`ColumnNodeViewer`, `IndexNodeViewer`,
`JsoPropertyNodeViewer`, …) wrapped in a property container class
(`.ddlapi-property`, `.jso-property`, …).

| Concern | List parent (e.g. `ColumnsNodeViewer`, `IndexesNodeViewer`) | Item node viewer (e.g. `ColumnNodeViewer`) |
| --- | --- | --- |
| Section `TitleRow` | Own `data-precededby` from ancestor | — |
| `LevelContext` | `Provider value={level + 1}` around children | Consumes level for `LevelIndicator` |
| Cross-sibling `data-precededby` | **Precompute in one pass** (`buildColumnViewerContexts`, `buildIndexViewerContexts`) | Receive as props; do not inspect previous sibling |
| List position (first / middle / last) | Set `isLastInList`; pass to children | Apply terminal-row marker on **last structural row** |
| Vertical spacing between items | Section header `margin-bottom` (`TitleRowUsage.DdlApiSection`) | Uniform row-body padding in CSS — see **DDL API property-list indentations** |

**Reference implementations:**

- DDL columns — `ColumnsNodeViewer` → `ColumnNodeViewer` (stacked
  `TitleRow` / `TextRow` / `AdditionalInfoRow`).
- DDL indexes — `IndexesNodeViewer` → `IndexNodeViewer` (title only today;
  same list-spacing rules).
- JSO — `JsoViewer` → `JsoPropertyNodeViewer` (recursive; continuous vertical
  lines without extra row-body split because `.jso-property` rows carry **no**
  vertical padding on the row wrapper).

When adding OpenAPI / JSON Schema / GraphQL property lists, mirror the **list
parent precomputes context, item viewer renders stack** split — do not embed
“what came before in the list” logic inside each child.

### DDL API property-list indentations (`ddlapi-indentations-update`)

Authoritative **numeric** spacing lives in source — do not copy pixel values
into agent docs. When changing spacing, edit CSS/TSX and verify in Storybook or
screenshot ITs.

| Source | Role |
| --- | --- |
| `packages/api-doc-viewer/src/components/shared-styles/preceded-by.css` | `.ddlapi-property` row rules; section-header `margin-bottom` |
| `packages/api-doc-viewer/src/components/DdlTableViewer/ColumnsNodeViewer.tsx` | `Columns` section `TitleRow` with `TitleRowUsage.DdlApiSection` |
| `packages/api-doc-viewer/src/components/DdlTableViewer/IndexesNodeViewer.tsx` | `Indexes` section `TitleRow` with `TitleRowUsage.DdlApiSection` |
| `packages/api-doc-viewer/src/components/DdlTableViewer/TableNodeViewer.tsx` | `data-precededby` chain between table sections (e.g. Columns → Indexes) |
| `packages/api-doc-viewer/src/components/shared-components/TitleRow/TitleRowContent.tsx` | `DdlApiProperty` row layout, `data-usage`, `min-h-*` on property rows |
| `packages/api-doc-viewer/src/components/DdlTableViewer/AdditionalInfoRow/AdditionalInfoRowContent.tsx` | Additional-info property row chrome |
| `packages/api-doc-viewer/src/components/shared-components/TextRow/TextRowContent.tsx` | Description property row chrome |
| `packages/api-doc-viewer/src/components/shared-components/DiffFloatingBadgeWrapper/DiffFloatingBadgeWrapper.tsx` | Side-by-side diff badge wrapper (must not be offset by row margins) |
| `packages/api-doc-viewer/src/components/shared-components/Layout/SideBySideLayout.tsx` | Stretch behaviour for diff columns |
| `packages/api-doc-viewer/src/components/shared-components/WithPrecededByProps.ts` | `PrecededBy` / `data-ddl-list-last-row` enum values |

#### Spacing hierarchy (three layers — do not collapse)

1. **Property row band** — every `TitleRow`, `TextRow`, and `AdditionalInfoRow`
   inside `.ddlapi-property` (`ColumnNodeViewer*`, `IndexNodeViewer*`) uses the
   **same** min-height and symmetric vertical padding on `.ddlapi-property-row-body`
   only. Inter-row gap = bottom padding of one row plus top padding of the next.
2. **Section header → first property** — gap from the `Columns` / `Indexes`
   section title down to the first column/index item is controlled only by
   **`margin-bottom`** on that section `TitleRow` (`TitleRowUsage.DdlApiSection`,
   targeted via `data-usage="ddlapi-section"` in CSS). Same rule for Columns
   and Indexes. This gap must be **larger** than a single row’s vertical padding
   and **smaller** than the gap between major table sections.
3. **Major section gap** (e.g. Columns block → Indexes block) — still driven by
   existing global `data-precededby` rules on the Indexes section header
   (`TableNodeViewer` wiring), not by per-item markers inside property lists.

#### Layout pattern (continuous `LevelIndicator`)

```text
.title-row-content.flex.items-stretch.min-h-[…]   ← NO vertical padding/margin
├── .level-indicator-column.self-stretch         ← line spans full row height
│   ├── LevelIndicator
│   └── Expander (or w-4 spacer on AdditionalInfoRow)
└── .ddlapi-property-row-body                     ← symmetric padding HERE only
    ├── TextValue (title)                         ← items-center with subheader
    └── subheader (type, badges, …)
```

- `TitleRowUsage.DdlApiProperty`: indent in `header`; **title + subheader only**
  in `.ddlapi-property-row-body` — never duplicate `headerValue` in both places.
- Inside `.ddlapi-property`, **zero** vertical padding and margin on
  `.title-row-content`, `.additional-info-row-content`, and `.text-row-content`
  wrappers — override global `[data-precededby="ddl-column-row"]` rules.
- **Never** put list spacing on property row wrappers (`margin-top` between
  middle items breaks the vertical line; wrapper `padding-top` misaligns diff
  badges — see bad patterns below).

#### React wiring

- **Section headers:** `ColumnsNodeViewer` / `IndexesNodeViewer` pass
  `usage={TitleRowUsage.DdlApiSection}` on the section `TitleRow`.
  `TitleRowContent` exposes `data-usage` for CSS selectors.
- **Property items:** all column/index title rows use the same list markers for
  spacing (`DDL_COLUMN_ROW` / `DDL_INDEX_ROW`) — **not** `DDL_SECTION_HEADER`
  for first-item gap (section margin replaces that role).
- **`buildColumnViewerContexts` / `buildIndexViewerContexts`:** still precompute
  `data-precededby` for line continuity and “previous column had additional-info
  rows” (`DDL_COLUMN_AFTER_ADDITIONAL_INFO_ROW`); do not use those markers to
  encode section-to-first-item or first-vs-middle padding differences.
- **`data-ddl-list-last-row`:** terminal row marker unchanged; list tail spacing
  is defined in CSS — see `preceded-by.css`.

#### UxBadge height budget

Title rows host `UxBadge` in the subheader band. Row min-height and row-body
padding must leave enough inner height for the badge — see comments in
`preceded-by.css` and verify in DevTools when touching badge CSS or row
min-height. Do not raise row-body padding without re-checking.

#### Reference viewer (JSO)

JSO property lists (`.jso-property`) use a related but separate model: no
row-body split, minimal wrapper padding. Align DDL with JSO **conceptually**
(full row height includes indent band; no wrapper margins that offset diff
chrome) but implement via the DDL `.ddlapi-property` rules above.

#### Bad patterns (rejected during `ddlapi-indentations-update`)

| Bad pattern | Why it fails |
| --- | --- |
| `padding-top` on `.title-row-content` for section or first-item gap | Creates a band above flex children; `DiffFloatingBadgeWrapper` / absolute diff badge extends above visible row; `LevelIndicator` does not span the padded band correctly |
| `margin-top` on first property `TitleRow` inside diffs layout | Margin collapse / wrapper height mismatch; diff badge no longer aligns with row |
| Different row-body padding for first vs middle items via `DDL_SECTION_HEADER` | Asymmetric bands; content sticks to diff background bottom; hard to match Columns and Indexes |
| `align-items: flex-start` on title-row `.ddlapi-property-row-body` | Title `TextValue` sits higher than subheader badges (badges are taller flex items) |
| Splitting “section gap” and “internal padding” across row wrapper and row-body without a single hierarchy | Repeated regressions; final model uses one row band + section `margin-bottom` + global section `precededby` |

#### Lessons learnt

- **One row type, one band:** TitleRow, TextRow, and AdditionalInfoRow inside a
  column/index share the same vertical contract.
- **Section spacing is not row spacing:** tune gap under `Columns` / `Indexes`
  headers with section `margin-bottom`, not special first-item row rules.
- **Diffs layout is a constraint:** any vertical offset must increase the
  **content box** that `DiffFloatingBadgeWrapper` wraps, not margin outside it.
- **Title + subheader stay centred together:** keep `items-center` on title-row
  row-body; fix bottom inset with symmetric row-body padding, not flex-start.
- **Source of truth is CSS + Storybook**, not duplicated numbers in agent docs.

### `LevelIndicator` continuity and row height

Product expectation: continuous vertical grey line through all items in a
section; each row’s line segment spans the **full** row height (see min-height
on property rows in `TitleRowContent` / `AdditionalInfoRowContent` /
`TextRowContent`).

Follow the **DDL API property-list indentations** section above for where
padding and margins may live. Quick rules:

- Padding on `.ddlapi-property-row-body` only — line stays continuous.
- No `margin-top` between middle list items.
- Section and list-boundary margins are explicit exceptions documented in
  `preceded-by.css`.

### `data-precededby`, list markers, and CSS

Row components set `data-precededby={PrecededBy…}`. Enum values in
`WithPrecededByProps.ts` must stay in sync with selectors in
`shared-styles/preceded-by.css`.

**Separate attribute for list terminal row:**

- `data-ddl-list-last-row="true"` (`ATTRIBUTE_DDL_LIST_LAST_ROW`) — list tail
  spacing on the terminal row; does not replace `data-precededby`.

**Columns list — parent precomputes (`buildColumnViewerContexts`):**

| Prop / attribute | Set on | When |
| --- | --- | --- |
| `data-precededby` | `ColumnNodeViewer` → `TitleRow` | `DDL_COLUMN_ROW`, or `DDL_COLUMN_AFTER_ADDITIONAL_INFO_ROW` when **previous** column had ≥1 `AdditionalInfoRow` |
| `additionalInfoPrecededBy` | each `AdditionalInfoRow` | `DDL_COLUMN_ROW` default; `DDL_COLUMN_AFTER_ADDITIONAL_INFO_ROW` when previous column had additional-info rows |
| (within column) generated row | second `AdditionalInfoRow` | `DDL_COLUMN_AFTER_ADDITIONAL_INFO_ROW` when default row exists above |
| `isLastInList` | `ColumnNodeViewer` | From parent index; drives `data-ddl-list-last-row` on terminal row |
| `data-ddl-list-last-row` | `TitleRow` or last `AdditionalInfoRow` | Last column in list: title if no additional-info rows; else last additional-info row |

Use `hasDdlColumnAdditionalInfoRows()` from `utils/ddlapi/column-row-utils.ts`
(`defaultValue` or `generatedExpression` on `node.value()`).

**Indexes list — same pattern (`buildIndexViewerContexts`):**

| Prop | When |
| --- | --- |
| `DDL_INDEX_ROW` | All index title rows (uniform spacing; section gap is on section header) |
| `data-ddl-list-last-row` | Last index `TitleRow` only (no `AdditionalInfoRow` yet) |

**CSS checklist** when adding a new property-list family:

1. Add `.your-property-class .title-row-content { padding-top: 0; padding-bottom: 0; }`.
2. Put inter-item vertical spacing on a **content wrapper**, not the row root.
3. Use `items-stretch` on the row when an indent column must fill row height.
4. Override global `data-precededby` padding rules with **more specific**
   `.your-property-class .title-row-content[data-precededby="…"]` selectors.
5. Verify in DOM: one title text node per row; vertical line height ≥ row height.

### Pitfalls from DDL column/index spacing work

| Mistake | Symptom | Fix |
| --- | --- | --- |
| Padding on row wrapper for “symmetric indent” | Gaps in vertical line; short line segments | Padding on `.ddlapi-property-row-body` only — see **ddlapi-indentations-update** |
| `headerValue` in both `header` and row body (`DdlApiProperty`) | Duplicated column/index titles | Indent in `header`; title + subheader only in row body |
| `{headerValue}{subheader}` replaced by `{rowBody}` for all usages | Section headers duplicated (`Columns Columns`) | Non-DDL: keep `{header}{subheader}`; DDL only uses row body |
| Global `preceded-by.css` rules assumed scoped | Mystery padding on `.ddlapi-property` rows | Explicit zero padding on property row wrappers |
| `margin-top` on middle list items | Line breaks between siblings | Uniform row-body padding; section gaps on section headers only |
| First-item spacing via `DDL_SECTION_HEADER` row rules | Asymmetric diff bands; badge/title misalignment | Section `margin-bottom` + uniform property rows |
| Wrapper `padding-top` for section gap under diffs | Diff badge protrudes above row | Section `margin-bottom` on `DdlApiSection` header; no wrapper padding |
| `align-items: flex-start` on title row-body | Title above subheader/badges | `items-center` on title-row row-body |
| Deriving “previous sibling had X” in child viewer | Fragile, hard to test | One-pass `build*ViewerContexts` in list parent |
| `data-ddl-list-last-row` on description `TextRow` | Wrong bottom spacing | Terminal row = last `TitleRow` or `AdditionalInfoRow` per product rule |
| Row-body padding too large with `UxBadge` in title band | Badge clipped or shifted | Re-check UxBadge height budget in `preceded-by.css` comments |
| Re-derive diff logic in `ColumnRowBadgesContent` | Duplicates JSO pattern; misses normalisation | Use `takeColumnFlagDiffs` / `takeIndexFlagDiffs` / title-row accessors from node |
| Viewer `nodeLevelDiff` for badge side visibility | Hides badges on both sides (203/303) or wrong highlight | Fix in next-data-model `aggregatePresentFlagDiffsFromWholeNodeAddOrRemove` |
| Whole-node flag badge diff-highlighted | Misleading — row add/remove drives the change | Data layer: `DIFF_HIGHLIGHTING_MODES_DDL_FLAG_BADGE_SIDE_VISIBILITY_ONLY`; viewer: `isDdlFlagBadgeDiffHighlighted` |
| Viewer workaround for `DiffReplace` on flags | Badge still null in side-by-side | Normalise in next-data-model `aggregateFlagDiff` |
| Yellow highlight on column **name** when only badges changed | Title-row diff carried `textHighlighterColor` | Fix in next-data-model (`TITLE_ROW_FLAG_AS_REPLACE_STYLES`, name diff builder) — not in `TextValue` |
| Global add/remove `textHighlighterColor` in `kind-any` | Wrong for generated expression; needed for FK links | FK exception in `kind-column`; expression add/remove omit text highlighter |
| Default row missing on remove/replace side | `hasDefaultValue` only checks merged `value.defaultValue` | Also OR in `defaultValueDiff` / `defaultValueRowColorizingDiff` |
| Boolean default replace shows yellow text fill | Chip metadata used `textHighlighterColor` | Data layer: `BoolType` replace → `borderShadowColor` only; viewer passes both accessors |
| Bit default replace not highlighted | ddlapi diff on `default.expr`, not column `defaultValue` | Fix transformer `resolveDefaultValueDiff` nested resolution — not aggregator |
| Index subheader part names missing `(…)` | Resolver returned `kind: "plain"` when `partNameDiffs` absent | Fix `resolveIndexPartNamesSideDisplay` — always segmented + `"tight"`; not viewer `hasNamedIndex` branch |

### Integration example (column default value row — plain)

Append after existing `TitleRow` / optional `TextRow`:

```tsx
{value.defaultValue && (
  <AdditionalInfoRow
    data-precededby={additionalInfoPrecededBy}
    {...{ [ATTRIBUTE_DDL_LIST_LAST_ROW]: isDefaultAdditionalInfoListLastRow || undefined }}
    label={ADDITIONAL_INFO_LABEL_DEFAULT}
    subheader={(_layoutSide) => (
      <AdditionalInfoPiece isVisible value={value.defaultValue} />
    )}
  />
)}
```

### DDL diffs viewers (`DdlTableDiffsViewer`, `*WithDiffs`)

Follow the JSO / AsyncAPI split: plain and diffs pipelines stay separate.

| Concern | Plain | Diffs |
| --- | --- | --- |
| Wrapper | `DdlTableViewer` | `DdlTableDiffsViewer` |
| Builder | `DdlApiTreeBuilder` | `DdlApiTreeWithDiffsBuilder` |
| Column item | `ColumnNodeViewer` | `ColumnNodeViewerWithDiffs` |
| Badges | `ColumnRowBadges` / `ColumnRowBadgesContent` | Same content component; flag diffs from model |

**View / data contract (session lesson):**

- Do **not** re-derive diff priority, boolean normalisation, or title-row vs flag-badge
  contracts in React — consume precomputed node fields from next-data-model:
  `takeDdlPropertyTitleRowDiff`, `takeColumnFlagDiffs`, `takeIndexFlagDiffs`,
  `takeColumnDefaultValueDiff`, `takeColumnDefaultValueRowColorizingDiff`,
  `resolveColumnDefaultValueSideDisplay`, `resolveColumnEnumValueSideItems`,
  `resolveIndexPartNamesSideDisplay`, `isDdlPropertySubheaderVisible`,
  `isDdlFlagBadgeDiffHighlighted`, `node.diffsSeverities`.
- Keep badge orchestration in `ColumnRowBadgesContent`; `DiffBadge` only renders the diff
  object it receives. Pass `$changes` only when `isDdlFlagBadgeDiffHighlighted(flagDiff)`.
- Mirror JSO: aggregators own semantics; viewers map severities and diffs to rows and
  badges only.

When extending DDL diffs UI, change **next-data-model first** if the bug is wrong diff shape
or missing severity — not `DiffBadge` workarounds in the viewer.

### Index part names in subheader (diffs)

Plain `IndexNodeViewer` wraps named-index part lists in `(…)` in the title-row subheader.
`IndexNodeViewerWithDiffs` must match that shape in side-by-side layout.

| Concern | Plain | Diffs |
| --- | --- | --- |
| Named index title | `value.indexName` | Same |
| Part list location | Subheader when `indexName` set | Subheader via `renderPartNames` |
| Part list formatting | `` `(${formatIndexPartNames(...)})` `` | `resolveIndexPartNamesSideDisplay` → `DdlCommaSeparatedListWithDiffs` |
| Unnamed index title | `formatIndexPartNames` (no parens) | Empty title when `partNameDiffs` present; else same as plain |

**View / data contract:**

- **Do not** branch on `hasNamedIndex` (or similar) in the viewer to choose parentheses —
  tight `(…)` wrapping is fixed in **next-data-model** (`index-part-name-diffs.ts`).
- `IndexNodeViewerWithDiffs` only orchestrates: call `resolveIndexPartNamesSideDisplay(node,
  layoutSide)` and pass the result to `DdlCommaSeparatedListWithDiffs`.
- Subheader visibility for part names still follows existing rules (`hasNamedIndex ||
  hasPartNameDiffs`, `isDdlPropertySubheaderVisible`).

**Trap (index-changes samples 01–08, 11–15, 17–18):** whole-index add/remove and unique-only
changes have **no** `partNameDiffs`. An early `resolveIndexPartNamesSideDisplay` implementation
returned `kind: "plain"` (`c1, c2`) in that case — only append/replace part diffs (e.g. samples
09, 10, 16) hit the segmented `(…)` path. Fix: always build side items (merged list when no
part diffs, `resolveListSideItems` when diffs exist) and always call
`buildCommaSeparatedListSideSegments(..., "tight")`. Do not expose a `parenthesesStyle` parameter
on the index resolver — column type labels use `"spaced"` parens via a separate resolver.

Regression: unit test in `ddlapi-property-row-diffs.test.ts` (no part diffs); visual check
`packages/samples/ddlapi-diffs/index-changes/`.

### `DiffBadge` and invisible flag badges (session lesson)

Symptom: parent `useMemo` returns a React element (e.g. `notNullBadge`) but nothing appears
in side-by-side layout.

**Root cause is often data-layer, not CSS:** `DiffBadge` renders **add** and **remove** on the
matching layout side only; it returns **`null` for `replace`** in side-by-side mode. ddlapi
merged diffs expose boolean flags (nullability, unique, generated, …) as **`DiffReplace`**
on the row field.

| Check | Action |
| --- | --- |
| `DiffBadge` receives `replace` for a flag | Fix in `aggregateFlagDiff` (next-data-model) — normalise boolean replace to add/remove using merged row value |
| Title row needs a synthetic replace | `asReplaceFlagDiffForTitleRow` — separate contract from flag badges |
| Badge visibility helper passes | Still trace `DiffBadge` action rules and layout side |

Do **not** patch the viewer to coerce `replace` → add/remove unless product explicitly requires
a view-only exception.

### Whole-node flag badges — side visibility without diff chrome (session lesson)

Symptom: on whole column/index add/remove (samples 203/303 column; 403/503 **index** rows),
`unique` (and sibling flags) appear on **both** sides, or disappear on both, or show diff
colours although only the row transitioned.

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Badge on both sides | `flagDiff` absent; `value.isUnique` true on merged row | next-data-model: `aggregatePresentFlagDiffsFromWholeNodeAddOrRemove` |
| Badge on neither side | Viewer reused `nodeLevelDiff.styles.isContentVisible` | Same aggregator fix — descendant diffs keep `isContentVisible: false` on both sides |
| Badge diff-coloured on row add/remove | Whole-node flags used `aggregateFlagDiff` | Use `aggregateFlagDiffSideVisibilityFromWholeNodeAddOrRemove` + `Invisible` highlighting mode |
| Column 403/503 lost highlight | Over-broad viewer guard | Column rows keep normal `aggregateFlagDiff`; gate `$changes` with `isDdlFlagBadgeDiffHighlighted` only |

`ColumnRowBadgesContent` already reads side visibility from flag diff `styles.before/after`.
Do **not** thread `nodeLevelDiff` into badge renderers for this — the data layer owns the
contract.

## Monorepo paths

Source imports use the `@apihub/` alias (maps to `packages/api-doc-viewer/src`).
Cross-package imports reach `@netcracker/qubership-apihub-next-data-model/…`
by subpath — mirror existing import paths when adding builders or types.

JSO diffs design notes and phased actions are in
`packages/api-doc-viewer/jso-diffs-implementation-actions.md` — read before
large diffs-viewer refactors.
