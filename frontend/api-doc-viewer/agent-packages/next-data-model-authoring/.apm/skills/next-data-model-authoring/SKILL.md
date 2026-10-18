---
description: Extend next-data-model tree builders (plain → with-diffs inheritance), diff aggregators, and json-crawl rules for viewer data layers.
---

# Authoring next-data-model

next-data-model is the type-safe successor to `api-data-model`. It builds
tree structures consumed by api-doc-viewer components. Code lives under
`packages/next-data-model/src/`.

## Source of truth

Design documents in `docs/design/` define the behaviour this skill implements:
`docs/design/<api-type>/display-coverage.md`, `architecture/data-model-*.md`, `features/`, and the
shared contracts in `docs/design/shared/`. This skill and its reference files (`json-schema/`,
`node-visibility/`) add implementation paths, traps, and session lessons. When code or this skill
disagrees with the design, report it; update the design first when the implementation is the
approved behaviour.

Work test-first: fixtures, stories, ITs, and unit tests (`api-doc-viewer-testing`) come before the
data-layer change; see `docs/design/README.md` → Workflow.

## Layered layout

Two top-level layers; never mix responsibilities:

| Layer | Path | Role |
| --- | --- | --- |
| Model | `src/model/` | Tree node types, interfaces, implementations |
| Building service | `src/building-service/` | Builders, crawl rules, diff aggregators |

Each layer has **abstract** contracts plus **spec-specific** implementations
(`jso/`, `async-api/`, `ddlapi/`, …). Abstract code defines shared API; spec
sub-layers implement node kinds, meta, and crawl behaviour.

When adding a feature, extend abstract contracts first, then wire the JSO,
AsyncAPI, DDL API, and/or JSON Schema sub-layer — do not fork logic only in one sub-layer
unless the behaviour is genuinely spec-specific.

## Encapsulation in building service

Do **not** mix a class hierarchy with exported free functions in sibling files.

| Avoid | Prefer |
| --- | --- |
| `shared/foo-helper.ts` exporting `buildX()` / `formatY()` imported by transformers | `protected` / `private` methods on the transformer (or builder) class |
| Shared plain functions between plain and with-diffs paths | **Inheritance**: plain builder/transformer + with-diffs subclass |
| Exporting internal preparation steps | Export only public entry types: transformer/builder classes, crawl-rule getters, shared **types** |

Rationale:

1. Free helpers break encapsulation — they look like a public utility API.
2. They hide that the logic belongs to one cohesive preparation pipeline.

**Patterns (non-JSO):**

- Transformers: `DdlApiSpecTransformer` owns Realm → crawl-document mapping as
  private methods; `DdlApiSpecWithDiffsTransformer` extends it and overrides a
  diff-attachment hook, reusing the base transform.
- Tree builders: `<Spec>TreeWithDiffsBuilder` extends `<Spec>TreeBuilder` and
  overrides factory hooks (`createTree`, `prepareSource`, …); see **Spec tree
  builders** below. JSO keeps a separate parallel stack — see **JSO exception**.

If a module grows very large, split by **class** (e.g. a non-exported nested
class in the same file), not by exported functions. Exception: `json-crawl`
transformer **functions** referenced from crawl rules remain functions — they
are rule hooks, not domain preparation logic.

## Type narrowing (type guards)

When you would write a type assertion (`value as SomeType`) and are confident
the runtime shape matches, prefer a **type guard** (`value is SomeType`) instead.

| Avoid | Prefer |
| --- | --- |
| `schemaType as IntegerType` after a `kind` check | `isIntegerType(schemaType)` from shared guards |
| `spec as DdlApiTableOrientedSpecWithDiffs` | Explicit construction or a guard-backed factory method |
| Scattered `as` at every call site | Reusable guards in `src/utilities.ts` or `src/shared/<spec>/guards/` |

Type guards are **too generic to hide inside a single class** — place them in the
package shared utilities area when reused (see `src/shared/ddlapi/guards/`).
Domain preparation logic stays on the transformer/builder; guards only narrow types.

Apply this rule in `packages/next-data-model/` and `packages/api-doc-viewer/` when
you touch code that needs narrowing. Exceptions: `as const`, import aliases, and
reduce accumulators typed via a generic parameter instead of `as`.

**Pattern:** `DdlApiSpecTransformer` uses `isBoolType`, `isIntegerType`, … from
`shared/ddlapi/guards/`; `DdlApiSpecWithDiffsTransformer` builds the with-diffs
spec via `createTableOrientedSpecWithDiffs()` instead of casting.

## Spec tree builders: plain and with-diffs

Default for API types under `building-service/<spec>/` (for example `ddlapi`,
`async-api`): **one crawl/build pipeline** shared by plain and with-diffs trees.
Do not duplicate `build()`, building hooks, `createNodeFromRaw`, key resolution,
or crawl wiring.

**Exception — JSO:** keep JSO on its own patterns (see **JSO exception** below).
Do not reshape JSO builders to this inheritance model unless the task explicitly
requires that change.

### Preferred inheritance (non-JSO)

| Role | Class | Extends |
| --- | --- | --- |
| Plain | `<Spec>TreeBuilder` | abstract `TreeBuilder` |
| With diffs | `<Spec>TreeWithDiffsBuilder` | **`<Spec>TreeBuilder`** (not abstract `TreeWithDiffsBuilder`) |

TypeScript allows only one superclass. Concrete with-diffs builders need the
spec plain builder's crawl and node-creation logic, so they extend that class
and keep the diffs contract by convention (diff methods + with-diffs tree
types). Abstract `TreeWithDiffsBuilder` remains a reference shape for the diffs
method surface; non-JSO specs do not inherit from it as well as from the
concrete plain builder.

### JSO exception

JSO uses a **parallel plain / with-diffs stack**, not plain → with-diffs
inheritance:

| Role | Class | Extends |
| --- | --- | --- |
| Plain | `JsoTreeBuilder` | abstract `TreeBuilder` |
| With diffs | `JsoTreeWithDiffsBuilder` | abstract `TreeWithDiffsBuilder` |

Each flavour has its own `build()`, building hooks, crawl rules/state, and
node-data builder. With-diffs also uses JSO-specific value/diff source types
(`JsoTreeNodeValueWithDiffs`, `JsoTreeNodeDiffsSource`) that differ from the
plain tree value type.

Canonical locations:

- Building service: `packages/next-data-model/src/building-service/jso/`
- Tree model: `packages/next-data-model/src/model/jso/`

When editing JSO, follow existing JSO files and the diffs specification
`docs/design/jso/features/diffs.md`; do not assume the ddlapi / async-api
builder layout applies.

### What the plain builder owns

`<Spec>TreeBuilder` crawls the prepared source via `json-crawl` rules, creates
nodes through `node-data/builder.ts`, and assembles `<Spec>Tree`.

Node values hold document fragments picked by typed allow-lists; meta holds
structural facts (kind, complexity, keys).

Expose **protected extension points** so a with-diffs subclass can specialise
without copying `build()`:

| Hook | Purpose |
| --- | --- |
| `createTree()` | Return `<Spec>Tree` or `<Spec>TreeWithDiffs` |
| `createNodeDataBuilder()` | Plain vs with-diffs node-data builder |
| `prepareSource()` | Plain vs with-diffs spec transformer (construct locally; do not keep a fixed transformer field that blocks overrides) |
| `logPrefix` | Log tag (`[Spec]` vs `[Spec][WithDiffs]`) |
| Optional value hooks | e.g. `takeCrawlValue()` when plain and with-diffs normalise crawl values differently |

Keep constructor-injected inputs that both flavours need (`source`, keys,
`logger`, …) as `protected`. Call `this.createTree()` / `this.createNodeDataBuilder()`
from the constructor so subclass factories run before `build()`.

Share one building-hooks module (`tree/building-hooks.ts`) and the plain crawl
state / rule types. Export node-params types the subclass needs
(`<Spec>TreeBuildingNodeParams`). When the with-diffs builder reuses that
module, do not keep a redundant `tree-with-diffs/building-hooks.ts` or unused
`*WithDiffsCrawlState` / `*WithDiffsCrawlRule` aliases (JSO may still need
separate hooks and crawl types).

### What the with-diffs builder owns

On the default (non-JSO) pattern, `<Spec>TreeWithDiffsBuilder` extends the
plain builder and adds only diffs work:

1. `public declare readonly tree: <Spec>TreeWithDiffs` — retype the inherited
   `tree` without re-initialising it.
2. Override the extension points above; `build()` calls `super.build()` and
   returns the with-diffs tree.
3. Override `createNodeFromRaw`: call `super.createNodeFromRaw(...)`, narrow with
   `is<Spec>TreeNodeWithDiffs` from `src/shared/<spec>/guards/`, then
   `assignNodeDiffs(...)`.
4. Keep `createNodeDiffs`, summaries, descendant diffs, severities, and
   `assignNodeDiffs` only on this class.

**Never use type assertions** to bridge plain ↔ with-diffs node types. Place
reusable guards under `src/shared/<spec>/guards/` (see Type narrowing above).

After each node is created, **aggregator factories** under `node-diffs-data/`
populate diff-related fields:

| Field | Meaning |
| --- | --- |
| `nodeDiffs` | Diffs on this node; keys are property names, except `""` (`NODE_LEVEL_DIFF_KEY`) for whole-node add/remove/replace and a node key rename |
| `nodeDescendantDiffs` | Summarised diffs from direct descendants; keys match descendant `key` |
| `nodeDiffsSummary` / `nodeDescendantDiffsSummary` | Unique diff-type sets for badges |
| `nodeDiffsSeverities` | Severity per UI placement (`title-row`, `description-row`, …) |

Aggregators are spec-specific factories returning kind-aware implementations
(`DdlApiNodeDiffsAggregatorFactory`, `AsyncApiNodeDiffsAggregatorFactory`,
`JsoNodeDiffsAggregatorFactory`, …). Register new aggregation steps in the
builder's `createNodeDiffs()` flow, not in the view layer.

### Spec transformers (same inheritance idea)

For non-JSO specs, match builders: `<Spec>SpecTransformer` owns document
preparation; `<Spec>SpecWithDiffsTransformer` extends it and attaches diff
metadata via overrides/hooks. Prefer constructing the transformer inside
`prepareSource()` so the subclass can swap the with-diffs type without
constructor juggling.

## Diff inheritance contract (JSO)

Specification: `docs/design/jso/features/diffs.md`. Summary:

1. A child's `nodeDiffs[""]` is derived from the **parent only** — parent `nodeDiffs[""]`, else
   parent `nodeDescendantDiffs[nodeKey]`. The container is passed to the aggregator but not
   consulted.
2. Primitive-side inheritance reuses the parent metadata object; complex transitions build derived
   metadata (`inherited: true`, side visibility, `increaseLevel`).
3. All value-level diffs are written under `""`. The `value` key is reserved: read defensively in
   severity code, never written.
4. `title-row` severity propagates **parent-first, then container**, cycle-safe.
5. Descendant diff summaries include **add/remove only**.

### `aggregateByDescendantDiffs` — combining node diffs with descendant diffs

`AbstractNodeDiffsAggregator.aggregateByDescendantDiffs(crawlValue, nodeDiffs, nodeDescendantDiffs,
diffMetaKeys)` is a no-op hook on the abstract base, already wired into each spec's
`assignNodeDiffs` (called **after** both `node.diffs` and `node.descendantDiffs` are populated).
Use it — do not recompute descendant diffs a second time inside `aggregate()` — whenever a field
needs to react to "are my children uniformly added/removed" (ddlapi's
`DdlApiNodeDiffsAggregatorKindPropertyListSection`, async-api's binding/parameter/server kinds,
JSON Schema's nesting-indicator row colorizing — see `json-schema/json-schema-nesting-indicator-row-diffs.md`,
**"Nesting-indicator row diffs"**). It exists per spec already; check for an override before
adding new "count my descendant diffs" logic from scratch.

The hook's return value is **discarded** by the caller — implementations must **mutate** the
`nodeDiffs` object passed in.

**Trap:** `nodeDescendantDiffs` is not guaranteed to contain only real child-key entries — some
spec's descendant-diffs aggregators also fold in the node's own raw field-level diffs under their
literal key. Enumerate the actual child keys yourself and look each one up individually; do not
trust `Object.keys(nodeDescendantDiffs).length` as a child count.

**Row colorizing needs a matching severity, from the same diff object.** A `*RowColorizingDiff`
field only drives the `diff` prop (background). `diffsSeverities` / `DiffFloatingBadgeWrapper` is
a **separate** prop from a **separate** aggregator (`node-diffs-severities/`) that must be updated
in the same change — add a dedicated `NodeDiffsSeverityPlacemennt` member and build its severity
from the identical diff object already used for colorizing (see async-api's `ServerAddressRow`
pattern in `AsyncApiNodeDiffsSeveritiesAggregatorKindAny`). Do not treat severities as an optional
follow-up; a missing severity silently drops the floating diff badge with no error.

**One placement per row *instance*, not per row *component type*.** `NodeDiffsSeverities` is a
flat `Partial<Record<NodeDiffsSeverityPlacemennt, NodeDiffsSeverity>>` on the node — a single enum
member can hold only one severity at a time. If a node renders **several** rows built from the
same shared row component (e.g. api-doc-viewer's `AdditionalInfoRow`, reused for JSON Schema's
`Default` / `Examples` / `Allowed values` / each of 7 validation-constraint rows on one node), each
row still needs its **own** dedicated placement — reusing one generic member (there is a legacy
`NodeDiffsSeverityPlacemennt.AdditionalInfoRow` kept only for single-row callers, e.g. DDL) across
several sibling rows silently collapses all their badges into whichever row's diff has the highest
severity, with no type error and a badge whose `causedAt` path points at an unrelated field. See
**"Per-row floating-badge severity"** in
`json-schema/json-schema-validation-rows.md` for the concrete bug and fix (per-validation-row-key placements
via `JSON_SCHEMA_VALIDATION_ROW_SEVERITY_PLACEMENTS`, and the viewer-side `AdditionalInfoRow`
`diffsSeverityPlacement` prop that makes the placement caller-selectable instead of hardcoded).

## Crawl rules

Document traversal rules live in
`src/building-service/<spec>/json-crawl-entities/rules/`. Builders pass
initial rules to `syncCrawl` and state through typed crawl-state objects.
Extend rules trees (`CrawlRules`) with path segments; keep transformers in
`transformers/` and building hooks colocated with the plain builder.

## Tests

Unit tests for builders and aggregators live in `packages/next-data-model/tests/`
(Jest). Add focused tests when changing inheritance, summary scope, or
severity propagation — do not rely on screenshot tests alone for data-layer
regressions.

## DDL API transformer scope

`DdlApiSpecTransformer` maps one `Table` from a ddlapi `Realm` into
`DdlApiTableOrientedSpec` (see `building-service/ddlapi/shared/ddlapi-spec-transformer.ts`).

**Coverage baseline:** which ddlapi fields are mapped vs intentionally omitted — and which
view-model fields the viewer does not paint — is documented in
`docs/design/ddlapi/display-coverage.md`. Use it to classify **`ndm-future`**
(add mapping here first) vs **`out-of-scope`** (no support needed) before extending
`node-value.ts` or the transformer.

## DDL API diff aggregators (kind split)

DDL property-row diffs follow the JSO pattern: **aggregators prepare; viewers consume**.

| Layer | Location | Owns |
| --- | --- | --- |
| Model accessors | `src/model/ddlapi/tree-with-diffs/property-row-diffs.ts` | `takeDdlPropertyTitleRowDiff`, `takeColumnFlagDiffs`, `takeIndexFlagDiffs`, `takeColumnDefaultValueDiff`, `takeColumnDefaultValueRowColorizingDiff`, `resolveColumnDefaultValueSideDisplay`, `isDdlFlagBadgeDiffHighlighted`, changed-property keys |
| Kind column / index | `node-diffs/kind-column.ts`, `kind-index.ts` | Private `aggregatePropertyTitleRowDiff`; default/enum value diff metadata; which changed keys win on title row |
| Kind any | `node-diffs/kind-any.ts` | `aggregateFlagDiff`, `aggregateFlagDiffSideVisibilityFromWholeNodeAddOrRemove`, `aggregatePresentFlagDiffsFromWholeNodeAddOrRemove`, `asReplaceFlagDiffForTitleRow`, protected `adoptPropertyRowDiffs` |
| Severities | `node-diffs-severities/kind-column.ts`, `kind-index.ts`, factory | Title-row and additional-info-row severity per changed property |
| Transformer | `ddlapi-spec-with-diffs-transformer.ts` | Row-level field diffs before crawl (generated columns, nested default values, …) |
| Display formatting | `shared/ddlapi/format-ddl-expr.ts` | `formatDefaultValueForDisplay`, `formatDefaultValueDisplayString` (strip SQL string quotes) |

**Encapsulation (session lesson):**

- Do **not** export orchestration such as `adoptPropertyRowDiffs` from
  `shared/ddlapi/guards/` — keep adoption on `DdlApiNodeDiffsAggregatorKindAny` as a
  **protected** method; kind subclasses pass their `DDL_*_CHANGED_PROPERTY_KEYS`.
- Do **not** put column-only title-row priority chains in `kind-any.ts` — they belong in
  `kind-column.ts` / `kind-index.ts`.
- `shared/ddlapi/guards/` is for **narrowing and predicates** (`isChangedPropertyMetaData`,
  `hasDdlPropertyTitleRowDiff`) — not aggregation pipelines.

### Boolean flag diffs and `DiffBadge` contract

ddlapi merged diffs often represent boolean row fields (`isNotNull`, `isUnique`, `isGenerated`,
…) as **`DiffReplace`**, not add/remove.

| Consumer | Expected diff shape | Normalisation |
| --- | --- | --- |
| Flag badges (`DiffBadge` in side-by-side) | **add** or **remove** per side | `aggregateFlagDiff` → `normalizeFlagDiff` using merged boolean via `takeBooleanFlagValue` |
| Title row (type / name replace) | synthetic **replace** | `asReplaceFlagDiffForTitleRow` when a changed flag should drive title-row chrome |

**Why:** api-doc-viewer `DiffBadge` returns **`null` for `replace`** in side-by-side layout.
Fixing “invisible not-null badge” in the viewer masks the root cause — normalise in
`aggregateFlagDiff` and add unit tests in `packages/next-data-model/tests/`.

Title-row replace and flag-badge add/remove are **different contracts** — do not assume one
normalisation fits both.

### Column default value diffs (kind-column + transformer)

Column **Default** additional-info rows mirror the enum **Values** row contract: **two**
aggregated diff fields plus a side-display resolver in `property-row-diffs.ts`.

| Field | Aggregator | Contract |
| --- | --- | --- |
| `defaultValue` | `aggregateDefaultValueDiff` → `buildDefaultValueDiffMetadata` | Chip: side visibility only on add/remove; replace chip highlight |
| `defaultValueRowColorizingDiff` | `aggregateDefaultValueRowColorizingDiff` | Row background green/red/yellow |
| Side text | `resolveColumnDefaultValueSideDisplay` | Pick before/after value from `defaultValue` diff when merged row lacks `defaultValue` |

**Replace chip highlight (`buildDefaultValueDiffMetadata`):**

| Column type | Replace chip styles | Row replace |
| --- | --- | --- |
| `BoolType` | Yellow `borderShadowColor`; **no** `textHighlighterColor` | Yellow row via `asReplaceFlagDiffForTitleRow` on row colorizing diff |
| Other scalars (bigint, text, bit, …) | Yellow `textHighlighterColor`; **no** chip `backgroundColor` | Yellow row (same) |

Pass **`crawlValue`** into `buildDefaultValueDiffMetadata` — detect boolean via
`columnType.kind === TypeKind.BoolType`, not from diff literal values `'true'`/`'false'`.

**Add/remove:** reuse `buildEnumValueDiffMetadataSideVisibilityOnly` — plain chip (no border,
no text highlighter, no muted font); row colorizing diff carries green/red background only.

**Type-transition synthetic rows (`DDL_DEFAULT_VALUE_COLUMN_TRANSITION`):**

| Transition | When | Row colorizing |
| --- | --- | --- |
| `Lost` | Column becomes generated; merged row has no `defaultValue` | Synthetic **remove** (red row) when no real `defaultValue` diff |
| `Gained` | Column loses generated; merged row regains `defaultValue` | Synthetic **add** (green row) when no real `defaultValue` diff |

Parallel to `DDL_ENUM_COLUMN_TYPE_TRANSITION` — extract pseudo-enums as named constants, not
inline `'lost' | 'gained'` strings.

**Transformer — nested default diffs (non-obvious):**

ddlapi often attaches default changes under nested paths, not as a flat column `defaultValue`
crawl diff. `resolveDefaultValueDiff` in `ddlapi-spec-with-diffs-transformer.ts` resolves in
order:

1. `column.default` — whole default add/remove
2. `default.value` — `Literal` replace (e.g. bigint `301`)
3. `default.expr` — `RawExpr` replace (e.g. bit `302`/`303`)

Normalize sides with `normalizeDefaultValueDiff` / `takeDefaultValueDisplay` before crawl.
Without step 2/3, bit default replaces produce no `defaultValue` diff and the UI stays unhighlighted.

**Display formatting:** `formatDefaultValueDisplayString` unwraps SQL single-quoted string
literals (`'draft'` → `draft`) but leaves bit literals (`b'101'`) and unquoted numerics unchanged.
Apply in plain transformer, with-diffs transformer, and `formatDefaultValueDiffSide` accessor.

Regression samples: `packages/samples/ddlapi-diffs/column-default-changes/` (101–304);
unit tests in `ddlapi-property-row-diffs.test.ts` and `ddlapi-spec-with-diffs-transformer.test.ts`.

### Whole-node add/remove flag badges (session lesson)

When a **column or index row** is wholly added or removed, boolean flags on that row (`isUnique`,
`isPrimaryKey`, `isNotNull`, `isGenerated`, …) ride along with the row transition — they are not
independent field changes.

| Transition | Product rule for flag badges (e.g. `unique`) |
| --- | --- |
| Whole row **add** | Visible on **changed** side only; **plain** badge (no diff chrome) |
| Whole row **remove** | Visible on **origin** side only; **plain** badge (no diff chrome) |
| Flag-only change on an existing row (403/503 **column** rows) | Side-aware **and** diff-highlighted via `aggregateFlagDiff` |

**Aggregation (`kind-column.ts` / `kind-index.ts`):** before the whole-node early return, call
`aggregatePresentFlagDiffsFromWholeNodeAddOrRemove()` (in `kind-any.ts`) for each present flag
on the merged crawl value. That helper delegates to
`aggregateFlagDiffSideVisibilityFromWholeNodeAddOrRemove()` — side visibility only, no yellow
row/badge background on the flag metadata.

**Highlighting contract:** whole-node-derived flag metadata uses
`DIFF_HIGHLIGHTING_MODES_DDL_FLAG_BADGE_SIDE_VISIBILITY_ONLY` (`Default` → `Invisible`). The
viewer passes `$changes` to `DiffBadge` only when `isDdlFlagBadgeDiffHighlighted(flagDiff)` is
true.

**Accessors:** `takeColumnFlagDiffs` / `takeIndexFlagDiffs` still return flag diffs when a
whole-node add/remove is present — do **not** suppress them.

**Same rule applies one level up, in JSON Schema's `enum`/`examples`/`allowedAdditionalPropertyNames`
rows:** once a row's own background already says "every item here was added/removed", each item's
own chip must go plain too (no colored border, no muted font) — the chip highlight would be
redundant on top of the row color. See
`json-schema/json-schema-validation-rows.md` → "Whole-list add/remove: row color suppresses per-chip highlight"
for the JSON Schema-side implementation (`aggregateListRowColorizingDiff` in
`node-diffs/kind-property.ts`, reusing `buildChipAddRemoveDiffMetadata` without `chipHighlight` —
the same "plain, side-visibility-only" idea as `DIFF_HIGHLIGHTING_MODES_DDL_FLAG_BADGE_SIDE_VISIBILITY_ONLY`
above, just not routed through `highlightingMode` since JSON Schema chips read `.styles` directly).

**One level up from that, the "whole section" analogue of this same DDL pattern is a separate,
even more significant rule:** a children-list section's own nesting-indicator title (this section's
own `aggregatePresentFlagDiffsFromWholeNodeAddOrRemove`/whole-row logic, and its equivalents for
Columns/Indexes/Parameters/Extensions/etc. across every spec) may only be painted wholly-added/
removed when the owning node itself was wholly changed, **or** every single one of its children
changed the same direction — never on a partial/mixed set, and never by checking only the children
that happen to have a diff (an unchanged child is invisible to that check and must be counted
separately). See `json-schema/json-schema-nesting-indicator-row-diffs.md` →
"Cross-API-type rule: uniform-children colorizing requires full coverage" for the full rule
statement and a verified table of every implementation of it across JSON Schema, JSO, DDL API, and
AsyncAPI.

**Descendant-diff trap:** array-element add/remove inherits `NODE_LEVEL_DIFF_KEY` from
`node-descendant-diffs/kind-any.ts` where `styles.*.isContentVisible` is **false on both
sides** (title row uses `isHeaderVisible` instead). Do **not** reuse node-level diff styles for
badge side visibility in the viewer — fix in aggregators above. A node key **rename** is the
exception: it keeps content and header visible and does not end the node's aggregation (see
`json-schema/json-schema-node-key-rename.md`).

**Regression samples:** `203-add-column-unique`, `303-remove-column-unique` (column);
`403-existing-column-became-unique` / `503-existing-column-lost-unique` **index** rows (plain
badge); same cases on **column** rows keep diff-highlighted `unique` badges. Unit tests:
`packages/next-data-model/tests/unit-tests/ddlapi-whole-node-flag-diffs.test.ts`.

### Index part names side display (`resolveIndexPartNamesSideDisplay`)

Location: `packages/next-data-model/src/model/ddlapi/tree-with-diffs/index-part-name-diffs.ts`.
Shared list helpers: `list-side-display.ts` (`resolveListSideItems`,
`buildCommaSeparatedListSideSegments`).

**Product rule:** subheader part names for a **named** index always render as tight parentheses
around a comma-separated list — `(c1, c2)` — matching plain `IndexNodeViewer`, including when
there are no per-part diffs (whole-index add/remove, unique-flag-only changes).

**Resolver contract:**

```typescript
resolveIndexPartNamesSideDisplay(node, layoutSide)
```

- No `parenthesesStyle` argument — index lists always use `"tight"`. Column type labels use
  `"spaced"` via `resolveColumnTypeLabelSideDisplay` instead.
- When `partNameDiffs` is absent, map merged `partNames` to plain side items (no diff metadata).
- When `partNameDiffs` is present, use `resolveListSideItems(mergedPartNames, partNameDiffs,
  layoutSide)`.
- Always call `buildCommaSeparatedListSideSegments(sideItems, "tight")` and return
  `kind: "segmented"` when segments are non-empty; empty side → `kind: "plain", text: ""`.

**Trap:** returning `kind: "plain"` with `mergedPartNames.join(", ")` when `!partNameDiffs`
skips parentheses and breaks visual parity for `index-changes` samples 01–08, 11–15, 17–18.
Append/remove column cases (09, 10, 16) still had `partNameDiffs` and looked correct — do not
use those alone as regression signal.

Unit tests: `ddlapi-property-row-diffs.test.ts` — unchanged list (no part diffs), append, replace.

### Generated columns in `DdlApiSpecWithDiffsTransformer`

`resolveGeneratedColumnDiff` must handle both ddlapi sources:

| Source | `generatedBy` | Field diffs |
| --- | --- | --- |
| `AttrKind.GeneratedExpr` | `'expression'` | `generatedExpression` / expr on row |
| `PgAttrKind.Identity` | `'identity'` | generation / seqStart / seqIncrement |

- Use diff type guards (`isDiffAdd`, `isDiffRemove`, `isDiffReplace`) in
  `resolveDiffSideValue` — not raw `'afterValue' in diff` checks.
- Share a pipeline between identity and expression; branch only on attr kind and field mapping.
- Viewer still collapses both to a single **generated** badge label — see
  `api-doc-viewer-authoring` (`ColumnRowBadges`).

**Omit `isGenerated` crawl diff when the column stays generated (FK parallel):**

When only the generated *mechanism* changes (expression ↔ identity, cases 602/603),
`isGenerated` remains `true` on both sides — same idea as FK target replacement
where `isForeignKey` stays `true` and only `foreignKeyTargets` diffs appear.
Emit **`generatedExpression`** add/remove only; strip `isGenerated` in
`finalizeGeneratedColumnDiff` / `shouldOmitIsGeneratedFlagDiff`.

| Case | Keep `isGenerated` diff? | Keep `generatedExpression` diff? |
| --- | --- | --- |
| Kind switch (expr ↔ identity) | **No** | Yes (add or remove) |
| Expression body replace only (601) | **No** | Yes (replace) |
| Column loses generated entirely (505) | **Yes** (remove) | Yes (remove) |
| New generated column / attr add | Yes (add) | Yes (add) |

**Trap (505 regression):** on merged ddlapi documents the removed `GeneratedExpr`
attr often **still exists** on the column object with a remove diff attached.
`findGeneratedColumnAttr(attrs) !== undefined` therefore does **not** mean “still
generated after merge”. To detect kind switch vs de-generation, check for an
**incoming** generated attr (`hasIncomingGeneratedColumnAttrDiff`: add of
Identity/GeneratedExpr, or replace whose before/after kinds differ) — not merely
presence of a generated attr on the merged column.

### Chip highlight styles in DDL aggregators (`textHighlighterColor` / `borderShadowColor`)

`TextValue`, `AdditionalInfoPiece`, and FK link text read precomputed
`styles.before/after.textHighlighterColor` and/or `borderShadowColor`. Set both in
**next-data-model only** — do not patch highlight in the viewer.

| Field / consumer | add/remove | replace/rename |
| --- | --- | --- |
| `defaultValue` → `AdditionalInfoPiece` (non-boolean) | **No** chip highlight (row background only) | Yellow **`textHighlighterColor`** |
| `defaultValue` → `AdditionalInfoPiece` (`BoolType`) | **No** chip highlight (row background only) | Yellow **`borderShadowColor`** only (JSO predefined parity) |
| `generatedExpression` → `AdditionalInfoPiece` | **No** text highlighter (row background only) | Yellow text highlighter |
| `foreignKeyTargetDiffs` → FK link text | Red/green text highlighter (kind-column only) | — |
| `columnName` / `indexName` → title `TextValue` | **No** text highlighter | **No** text highlighter (yellow row background only) |
| Synthetic title-row replace (`TITLE_ROW_FLAG_AS_REPLACE_STYLES`) | — | **No** text highlighter (badges carry their own diff chrome) |

**Split row vs chip:** for default and enum additional-info rows, chip metadata (`defaultValue`,
`enumValueDiffs[*]`) must **clear** `backgroundColor` on replace — yellow fill belongs on
`defaultValueRowColorizingDiff` / `enumValuesRowColorizingDiff` only. Reusing
`buildChangedPropertyMetaDataFromDiff` for the chip diff without clearing background duplicates
the row highlight on the chip.

Do **not** restore add/remove text highlighter globally in
`buildChangedPropertyMetaDataFromDiff` — FK, generated-expression, and default-value contracts
differ. FK link highlighting belongs in `kind-column.buildForeignKeyTargetDiffMetadata`;
property names use `buildDdlPropertyNameChangedPropertyMetaDataFromDiff` via
`aggregateTextDiff`; boolean default replace belongs in `buildDefaultValueDiffMetadata`.

## JSON Schema validation rows

Display rules (design): `docs/design/json-schema/features/validation-rows.md`. When aggregating or
resolving **constraint rows** (`validationRowDiffs`, `validationRowValueDiffs`,
`validationRowColorizingDiffs`) — especially **value range** with OAS 3.0/3.1 bound dialects —
also read the implementation reference:

`agent-packages/next-data-model-authoring/.apm/skills/next-data-model-authoring/json-schema/json-schema-validation-rows.md`

Fix diff metadata in `kind-property.ts` and `value-range-diff-side-display.ts`; do not patch viewer
components to compensate.

**Session lessons (read before changing row aggregation or aggregator dispatch):**

- **Boolean-valued replace chips** (`uniqueItems`, boolean `default`, boolean enum/examples
  literals) need `borderShadowColor`, not `textHighlighterColor` — but the check must be
  `typeof diff.beforeValue/afterValue === "boolean"` on the diff's own value, **not** the owning
  node's `type` keyword (`uniqueItems` is boolean-valued on an `array`-typed node, so a node-type
  check silently never fires). See `buildBooleanAwareChipReplaceDiffMetadata` in `kind-any.ts`.
- **Whole add/remove vs partial replace:** a row is only a whole-row add/remove when **none** of
  its other source keys already carry unchanged content (`rowHasOtherUnchangedContent` guard in
  `aggregateValidationRowDiffs`) — generic across every bound-range row, not row-key-specific.
- **Aggregator dispatch:** `JsonSchemaNodeDiffsAggregatorFactory` returns `KindProperty` (which
  extends `KindAny`, calling `super.aggregate()` first) for **every** node kind, not just
  PROPERTY/ROOT — `KindProperty`'s default/enum/examples/required aggregation is a strict
  superset, not PROPERTY/ROOT-specific. A per-kind switch that hands out a "lesser" aggregator to
  other kinds silently drops default/enum/examples/validation diffs for them (e.g.
  `additionalProperties`, `items`, combiner variants).
- **Row ordering:** combining "present" rows with diff-only rows (rows whose type was fully
  removed/not-yet-added but still carry semantic diffs) needs a **sort** by canonical
  type-group order after combining — concatenation alone flips group order between a type change
  and its reverse (`string→number` vs `number→string`).

Full detail: `agent-packages/next-data-model-authoring/.apm/skills/next-data-model-authoring/json-schema/json-schema-validation-rows.md`.

**Meta flags and parent `required`** (design: `docs/design/json-schema/features/meta-flags-and-required.md`):
`resolveRequiredMetaDiff` in `kind-property.ts` reads parent crawl fragments — not picked
`parent.value().required`. See
`agent-packages/next-data-model-authoring/.apm/skills/next-data-model-authoring/json-schema/json-schema-meta-flags-and-required.md`.
Unit tests: `json-schema-meta-flag-diffs.test.ts` (include OAS-normalized merge cases for Storybook parity).

**Nesting-indicator row diffs** (design: `docs/design/json-schema/features/nesting-indicator-row-diffs.md`,
shared rule: `docs/design/shared/features/section-header-colorizing.md`):
`nestingIndicatorRowColorizingDiff` in `kind-any.ts`
(`aggregateByDescendantDiffs` override) covers whole-node add/remove (including inherited
parent/container) and uniform-children add/remove for the row `SchemaNodeViewer` renders above a
node's children list. See
`agent-packages/next-data-model-authoring/.apm/skills/next-data-model-authoring/json-schema/json-schema-nesting-indicator-row-diffs.md`.

**Node key rename** (design: `docs/design/json-schema/features/node-key-rename.md`):
a `rename` diff on a property (parent's `properties` diff record, keyed by the after key,
`beforeKey` / `afterKey`) is the node-level diff of the property. `apiDiff` never emits it for JSON
Schema — only consumers synthesizing a schema do — so JSON Schema fixture pairs cannot produce it
(the screenshot suite uses OpenAPI path-parameter fixtures and a synthesized parameters schema).
The title shows `JsonSchemaRowDiffs.PropertyName.resolveSideText` per side; the node's own diffs are
still aggregated. The rename sits under `NODE_LEVEL_DIFF_KEY` but is **not** a whole-node change:
"whole node changed" consumers (description row, severities, `required` tag) must use
`JsonSchemaRowDiffs.NodeLevel.takeWholeNodeDiff`, never the raw key. See
`agent-packages/next-data-model-authoring/.apm/skills/next-data-model-authoring/json-schema/json-schema-node-key-rename.md`.
Unit tests: `json-schema-property-rename-diffs.test.ts`.

## Cross-package boundary

View components in `packages/api-doc-viewer` import builders and node types
by subpath. Keep diff meta key configuration (`DiffMetaKeys`) supplied by the
caller; the data layer reads keys from crawl state, not from React context.

## Node visibility sub-layer

When implementing or refactoring **which property-row parts are visible** (Phase 1
data-layer work) or when the user asks to refactor a plain / with-diffs
**`*NodeViewer` component pair**, read the node-visibility docs **first**:

| Doc | Path |
| --- | --- |
| Entry (Phase 1 vs 2, session lessons) | [node-visibility/authoring.md](./node-visibility/authoring.md) |
| Cross–API-type structure | [node-visibility/general-approach.md](./node-visibility/general-approach.md) |
| DDL API reference (`1f1e561`) | [node-visibility/ddlapi.md](./node-visibility/ddlapi.md) |

Do not extract viewer JSX layout (Phase 2) before visibility rules live in
next-data-model. Do not add `node-visibility-data/shared/` or per-kind utility
files — kind managers in `tree/node-visibility-data/kind-*.ts` own protected
visibility algorithms; with-diffs delegates diff-free rules to plain tree managers.
