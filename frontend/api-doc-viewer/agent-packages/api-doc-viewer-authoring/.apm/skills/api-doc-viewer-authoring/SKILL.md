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
| Vertical spacing between items | — | CSS via `preceded-by.css` + list markers |

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

### `LevelIndicator` continuity and row height (non-obvious)

Product expectation for property lists:

1. **Continuous vertical grey line** through all items in a section (no 1 px
   white gaps between row segments).
2. **Minimum row height 26 px** — the vertical line segment must span the full
   row, not a shorter inner band.
3. **Symmetric vertical indents** between items in the **content** area (6 px
   between middle title rows today: 3 px + 3 px row-body padding; 4 px per side
   only where content fits — see **UxBadge height budget** below).
4. **First item** — keep top margin from section header (8 px on
   `DDL_SECTION_HEADER`).
5. **Last item** — 16 px bottom margin on the **terminal row** (`TitleRow` or
   last `AdditionalInfoRow`, not description `TextRow` unless product says
   otherwise).

**Why this is easy to break (session lesson):**

Row components (`.title-row-content`, `.additional-info-row-content`) are flex
rows. `LevelIndicator` lives in the **flex content box**. **Vertical padding or
margin on the row wrapper** sits outside that box (or creates empty bands the
line does not paint). Symptom: short grey segments and visible gaps — even when
`min-h-[26px]` is set on the row.

**Correct layout for `.ddlapi-property` (DDL — implemented):**

```text
.title-row-content.flex.items-stretch.min-h-[26px]   ← NO vertical padding
├── .level-indicator-column.self-stretch           ← line spans full row height
│   ├── LevelIndicator
│   └── Expander (or w-4 spacer on AdditionalInfoRow)
└── .ddlapi-property-row-body                       ← vertical padding HERE only
    ├── TextValue (title)
    └── subheader (type, badges, …)
```

- `TitleRowUsage.DdlApiProperty` in `TitleRowContent`: indent column in
  `header`; **`headerValue` only inside** `.ddlapi-property-row-body` — never
  in both (duplicates titles and breaks layout).
- Non-DDL `TitleRow` stays `{header}{subheader}` unchanged.
- Row wrappers inside `.ddlapi-property` must **explicitly zero** vertical
  padding in CSS — global `[data-precededby="ddl-column-row"]` rules still add
  `padding-top` / `padding-bottom` unless overridden with
  `.ddlapi-property .title-row-content { padding-top: 0; padding-bottom: 0; }`.

**Margin vs padding for list spacing:**

- **Padding on `.ddlapi-property-row-body`** — content indents; line stays
  continuous.
- **Margin on row wrapper** — only for **list boundaries** (first item
  `margin-top: 8px` from section; last item `margin-bottom: 16px` via
  `data-ddl-list-last-row="true"`).
- **Never** use `margin-top` between middle list items — it creates line gaps.

**UxBadge height budget (session lesson — do not regress):**

Middle column/index title rows use `min-h-[26px]`, `items-stretch`, and vertical
padding on `.ddlapi-property-row-body` only (see `preceded-by.css` for
`ddl-column-row`, `ddl-column-after-additional-info-row`, `ddl-index-row`).
First list items use `DDL_SECTION_HEADER` with **no** row-body padding — badges
look fine there; middle items looked “wrong” until padding was reduced.

**Math (border-box row-body inside a 26 px row):**

| Component | Height |
| --- | --- |
| `UxBadge` (`.ux-badge` + `<pre>`) | ~**19 px** (1 px top pad + 12 px × 1.5 line-height) |
| Symmetric row-body padding **4 + 4** | 8 px → **18 px** inner area → badge squeezed (~1 px); pill text looks shifted/clipped at the bottom |
| Symmetric row-body padding **3 + 3** | 6 px → **20 px** inner area → badge fits |

Confirmed in browser DevTools: equal `padding-top` / `padding-bottom` **≥ 4 px**
reproduces the defect; **≤ 3 px** per side does not. Asymmetric padding “fixes”
it only because total vertical padding drops below 8 px.

**Implemented rule** (`preceded-by.css`): **3 px** top/bottom on title-row
row-body for middle list markers (not 4 px). `AdditionalInfoRow` / description
`TextRow` may keep 4 px where they do not host `UxBadge` in the title band.

**If you change badge typography or row min-height**, re-check this budget before
raising padding back to 4 px. Alternatives: `min-h-[27px]` only on rows that
contain `UxBadge` (19 + 8 = 27), or shrink badge CSS to ≤ 18 px — do not combine
26 px row + 8 px padding + ~19 px badge.

**Not the root cause:** extra wrapper in `ColumnRowBadges`, different
`data-precededby` alone, or `UxBadge` props — same badge markup; middle rows
differ by row-body padding + fixed 26 px cross-size.

### `data-precededby`, list markers, and CSS

Row components set `data-precededby={PrecededBy…}`. Enum values in
`WithPrecededByProps.ts` must stay in sync with selectors in
`shared-styles/preceded-by.css`.

**Separate attribute for list terminal row:**

- `data-ddl-list-last-row="true"` (`ATTRIBUTE_DDL_LIST_LAST_ROW`) — 16 px
  bottom margin on the row content element; does not replace `data-precededby`
  (chain context for top spacing is still needed).

**Columns list — parent precomputes (`buildColumnViewerContexts`):**

| Prop / attribute | Set on | When |
| --- | --- | --- |
| `data-precededby` | `ColumnNodeViewer` → `TitleRow` | First: `DDL_SECTION_HEADER`; later: `DDL_COLUMN_ROW`, or `DDL_COLUMN_AFTER_ADDITIONAL_INFO_ROW` when **previous** column had ≥1 `AdditionalInfoRow` |
| `additionalInfoPrecededBy` | each `AdditionalInfoRow` | `DDL_COLUMN_ROW` default; `DDL_COLUMN_AFTER_ADDITIONAL_INFO_ROW` when previous column had additional-info rows |
| (within column) generated row | second `AdditionalInfoRow` | `DDL_COLUMN_AFTER_ADDITIONAL_INFO_ROW` when default row exists above |
| `isLastInList` | `ColumnNodeViewer` | From parent index; drives `data-ddl-list-last-row` on terminal row |
| `data-ddl-list-last-row` | `TitleRow` or last `AdditionalInfoRow` | Last column in list: title if no additional-info rows; else last additional-info row |

Use `hasDdlColumnAdditionalInfoRows()` from `utils/ddlapi/column-row-utils.ts`
(`defaultValue` or `generatedExpression` on `node.value()`).

**Indexes list — same pattern (`buildIndexViewerContexts`):**

| Prop | When |
| --- | --- |
| `DDL_SECTION_HEADER` | First index title |
| `DDL_INDEX_ROW` | Later index titles |
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
| Padding on row wrapper for “symmetric indent” | Gaps in vertical line; lines &lt; 26 px | Padding on content wrapper only |
| `headerValue` in both `header` and row body (`DdlApiProperty`) | Duplicated column/index titles | Indent in `header`; title + subheader only in row body |
| `{headerValue}{subheader}` replaced by `{rowBody}` for all usages | Section headers duplicated (`Columns Columns`) | Non-DDL: keep `{header}{subheader}`; DDL only uses row body |
| Global `preceded-by.css` rules assumed scoped | Mystery padding on `.ddlapi-property` rows | Explicit zero padding on property row wrappers |
| `margin-top` on middle list items | Line breaks between siblings | Use content padding; margin only first/last |
| Deriving “previous sibling had X” in child viewer | Fragile, hard to test | One-pass `build*ViewerContexts` in list parent |
| `data-ddl-list-last-row` on description `TextRow` | Wrong bottom spacing | Terminal row = last `TitleRow` or `AdditionalInfoRow` per product rule |
| Row-body padding **4 + 4 px** on middle title rows with `UxBadge` | Badge bottom indent wrong; text ~1 px low/clipped | Keep **3 + 3 px** on title-row row-body, or raise row min-height to **27 px** with 4 px padding, or shrink badge to ≤ 18 px |

### Integration example (column default value row)

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

## Monorepo paths

Source imports use the `@apihub/` alias (maps to `packages/api-doc-viewer/src`).
Cross-package imports reach `@netcracker/qubership-apihub-next-data-model/…`
by subpath — mirror existing import paths when adding builders or types.

JSO diffs design notes and phased actions are in
`packages/api-doc-viewer/jso-diffs-implementation-actions.md` — read before
large diffs-viewer refactors.
