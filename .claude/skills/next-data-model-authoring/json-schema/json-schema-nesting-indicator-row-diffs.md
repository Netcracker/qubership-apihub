# JSON Schema nesting-indicator row diffs — agent reference

Design (source of truth): `docs/design/json-schema/features/nesting-indicator-row-diffs.md` and the
cross-API rule `docs/design/shared/features/section-header-colorizing.md`.

Reference for AI assistants adding diff highlighting to `NestingIndicatorTitleRow` (the
"Properties"/"Items" header `SchemaNodeViewer` renders above a node's children list) in the
JSON Schema stack. Covers three cases: the owning node (or an inherited parent/container) was
wholly added/removed; every visible child was uniformly added or uniformly removed while the
owning node itself was untouched; and the node's own `type` keyword crossed the primitive/
non-primitive boundary (e.g. `string` → `array`), which must colorize as a single-sided add/remove
— not the default symmetric replace — since only one side actually gains/loses children. Includes
session learnings from wiring row background, label visibility, and the diff floating badge, plus
the shared component stack this row's (and the title row's) type-value text now renders through
(see "Shared type-value rendering architecture" below). Also covers a fourth, orthogonal concern —
this row's own **nesting level/indentation** inside `CombinerNodeViewer` (see lesson 10) — which is
about level computation, not diff colorizing, but touches the same row.

**Primary code paths**

| Layer | Role | Path |
| --- | --- | --- |
| Row colorizing diff | `aggregateNestingIndicatorRowColorizingDiff`, `collectJsonSchemaChildKeys` | `next-data-model/.../node-diffs/kind-any.ts` (`aggregateByDescendantDiffs` override) |
| Primitive-crossing colorizing | `resolveTypePrimitivenessCrossing`, `buildTypePrimitivenessCrossingRowColorizingDiff`, `isChildlessTypeValue` | `next-data-model/.../node-diffs/kind-any.ts` (same file, `typeLabelFieldDiffs` branch) |
| Special `any`/`nothing` pseudo-type guard | `isJsonSchemaSpecialValueType` | `next-data-model/.../shared/json-schema/guards/schema-value.ts` (kept separate from `isJsonSchemaPrimitiveValueType` — see lesson 9) |
| Row diff field | `nestingIndicatorRowColorizingDiff` | `next-data-model/.../property-row-diffs.types.ts` (`JsonSchemaKindAnyNodeDiffs`) |
| Row diff accessor | `takeJsonSchemaNestingIndicatorRowColorizingDiff` | `next-data-model/.../property-row-diffs.ts` |
| Row severity | `NodeDiffsSeverityPlacemennt.NestingIndicatorRow` | `next-data-model/.../node-diffs-severities/kind-any.ts` |
| Viewer wiring | `diff` + `diffsSeverities` + `diffsSeverityPlacement` props | `api-doc-viewer/.../SchemaNodeViewer/SchemaNodeViewer.tsx` |
| Row rendering (chrome) | background, label visibility, floating badge | `shared-components/NestingIndicatorTitleRow/{NestingIndicatorTitleRow,NestingIndicatorTitleRowContent,NestingIndicatorTitleLabel}.tsx` |
| Row rendering (type-value text) | leaf/wrapper/orchestrator stack, both title row and nesting-indicator row | `api-doc-viewer/.../SchemaNodeViewer/TypeValue/` — see "Shared type-value rendering architecture" below |
| Combiner nesting **level** (indentation, not diff colorizing) | `resolveNextLevelPair`, `CombinerNodeViewer`'s `selectorBeforeLevel`/`selectorAfterLevel` | `api-doc-viewer/.../JsonSchemaViewer/utils/resolve-nesting-level.ts` + `CombinerNodeViewer/CombinerNodeViewer.tsx` — see lesson 10 |
| Reference pattern (async-api) | row diff + matching severity, same source diff | `AsyncApiOperationViewer/MessageChannelServerNodeViewer/MessageChannelServerNodeViewer.tsx` + `AsyncApiNodeDiffsSeveritiesAggregatorKindAny` |
| Reference pattern (ddlapi) | uniform-descendant-diff detection (different storage target — see lesson 1) | `next-data-model/.../ddlapi/tree-with-diffs/node-diffs-data/shared/property-list-section-diff-utils.ts` (`aggregateUniformWholeNodeDescendantDiff`) |

**Regression**

| Mode | Suite |
| --- | --- |
| Unit (data layer) | `packages/next-data-model/tests/unit-tests/json-schema-with-diffs.test.ts` — describe blocks `"JsonSchema nesting-indicator row colorizing diff"` and `"JsonSchema nesting-indicator type label diffs"` |
| Storybook (case 1 — uniform children) | `packages/samples/json-schema-diffs/type-changes/object-properties/003…008` |
| Storybook (case 2 — whole node) | `packages/samples/json-schema-diffs/hiding-unchanged-rows/complex-object/` cases `2.6`, `2.7` |
| Storybook (case 3 — primitive/non-primitive `type` crossing) | `packages/samples/json-schema-diffs/type-changes/type-value-changes/` — any `*-to-array`/`*-to-object` or `array-to-*`/`object-to-*` pair (e.g. `004-string-to-array`, `021-array-to-string`, `026-object-to-string`, `027-object-to-number`); `030-object-to-array` (complex↔complex, non-crossing) is the regression guard that must stay yellow/replace |
| Storybook (case 3b — special `any`/`nothing` pseudo-type crossing) | `all-of-combiner-diffs-suite` cases `041-array-add-option-string` / `042-array-remove-option-string` / `053-object-add-option-number` / `054-object-remove-option-number` (array/object option intersected with an incompatible option via `allOf` reduces the merged `type` to `nothing`) — no YAML fixtures, built programmatically, see `combiner-diff-case-definitions.ts` |
| Storybook/manual (lesson 10 — combiner children level) | `json-schema` (plain) `one-of-combiner-suite` case `049-object-schema-one-of-one-of` (3-level nested combiner, object leaf); `json-schema-diffs` `one-of-combiner-diffs-suite`/`any-of-combiner-diffs-suite` cases `009`/`010`/`017`/`018` (single-level, object/array leaf) — no YAML fixtures, see `packages/samples/json-schema/{oneOf,anyOf,allOf}/README.md` for the case matrix |

---

## Session learnings — what was non-obvious

### 1. The row is not a tree node — do not reuse `NODE_LEVEL_DIFF_KEY` for it

ddlapi's closest precedent (`DdlApiNodeDiffsAggregatorKindPropertyListSection` +
`aggregateUniformWholeNodeDescendantDiff`) stores its "every child uniformly added/removed"
result directly into `nodeDiffs[NODE_LEVEL_DIFF_KEY]` — correct there because DDL's "Columns" /
"Indexes" section **is** a dedicated node kind whose own title row is exactly what should be
colored.

`NestingIndicatorTitleRow` is **not** a node — it is auxiliary UI that `SchemaNodeViewer` renders
inside the **owning** node's body, above that node's real children. Writing the synthetic diff
into that owning node's `NODE_LEVEL_DIFF_KEY` would incorrectly also recolor the owning node's own
title row (`aggregateTitleRowDiff` reads that same key). The fix needed a **separate** field,
`nestingIndicatorRowColorizingDiff`, computed independently and consumed only by
`NestingIndicatorTitleRow`.

### 2. `nodeDescendantDiffs` is polluted with non-child keys — do not count it directly

`JsonSchemaNodeDescendantDiffsAggregatorKindAny` pushes the node's **own** raw diffs record
(`crawlValue[diffsMetaKey]`) into the same bag it builds descendant diffs from, so
`nodeDescendantDiffs` can contain entries for plain scalar fields (`description`,
`minProperties`, …) alongside real per-child diffs, keyed by whatever the raw diff literal key
happened to be. Naively porting ddlapi's `descendantDiffEntries.length !== childCount` check
(`Object.values(nodeDescendantDiffs).length`) breaks the moment a sibling field changes alongside
the children (a very common real-world case) — the count is inflated and "uniform" detection
silently stops firing.

**Fix:** explicitly enumerate the node's real child keys from the raw crawl value (`properties`,
`patternProperties`, `items` tuple entries, singleton `additionalProperties` / `additionalItems`
— **not** `allOf`/`oneOf`/`anyOf`, which are `nestedNodes()`, not `childrenNodes()`) and look up
each one individually in `nodeDescendantDiffs`, rather than trusting the record's own key count.

### 3. `aggregateByDescendantDiffs` already existed — JSON Schema had just never overridden it

`AbstractNodeDiffsAggregator.aggregateByDescendantDiffs` is a no-op hook on the abstract base,
already wired into the builder's `assignNodeDiffs` (`updateNodeDiffsByDescendantDiffs`, called
**after** `node.diffs` and `node.descendantDiffs` are both populated) and already used by
async-api and ddlapi. JSON Schema's `kind-any.ts` had simply never overridden it. This is the
right place for "combine already-computed node diffs with already-computed descendant diffs"
logic — do not recompute descendant diffs a second time inside `aggregate()`, and do not try to
do this in the severities pass instead.

The hook's return value is **discarded** by the caller — implementations must **mutate** the
`nodeDiffs` object passed in, not just return a new one.

### 4. Diagnosed the wrong root cause first — traced layout, not data

When told "we lost the floating diff badge", the first fix hypothesized a **DOM/CSS** cause:
conditionally unmounting `<NestingIndicatorTitleLabel>` on the hidden side was assumed to shrink
that side's row height and break the badge's positioning, so the fix wrapped that theory in a
`visibility: hidden` toggle instead. The actual cause was unrelated to layout: `diffType` /
`diffTypeCause` in `NestingIndicatorTitleRow.tsx` come from `diffsSeverities?.[placement]`, and
`diffsSeverities` had **never been passed** from `SchemaNodeViewer.tsx` in the first place — the
severities side of the feature had not been wired at all (see lesson 5).

**Lesson:** when a diff-driven visual element (badge, background, chip) "disappears" or "never
appears", trace what **data** it renders from first (`diffType`/`diffTypeCause` ← `diffsSeverities`
← the node's `diffsSeverities` field ← the severities aggregator) before hypothesizing a
layout/CSS explanation. The layout theory was plausible-sounding but wrong, and shipping a fix
for it before verifying cost a full extra round trip that had to be reverted.

### 5. Row-level colorizing and row-level severity are two separate wiring steps — do both together

Adding a `*RowColorizingDiff` field (drives the `diff` prop / background) does **not**
automatically drive `diffsSeverities` / `DiffFloatingBadgeWrapper` — they are separate props read
from separate node fields (`node.diffs.<field>` vs `node.diffsSeverities[placement]`), populated
by separate aggregators (`node-diffs/` vs `node-diffs-severities/`) that both need updating.

The async-api `ServerAddressRow` pattern (`MessageChannelServerNodeViewer.tsx` +
`AsyncApiNodeDiffsSeveritiesAggregatorKindAny`) is the reference: a **dedicated**
`NodeDiffsSeverityPlacemennt` member per row (`NestingIndicatorRow` was added here, alongside
`ServerAddressRow` / `AddressRow` / `BindingVersionRow`), whose severity is built from **the same
diff object** already used for the row's colorizing — not a separately re-derived one. Whenever
you add a new row-level colorizing diff for any spec, add its matching severities placement in
the **same** change; do not treat severities as an optional cosmetic follow-up.

### 6. Whole-node cascade covers "node itself or its parent/container" for free

`nodeDiffs[NODE_LEVEL_DIFF_KEY]` on a JSON Schema node is already populated by inheritance when a
**parent or container** was wholly added/removed (`JsonSchemaNodeDiffsAggregatorKindAny.aggregate`
— the `containerNode` / `parentNode` branches at the top of the method run before the node's own
crawl diffs are read). By the time `aggregateNestingIndicatorRowColorizingDiff` runs, that
inherited diff is already sitting in `nodeDiffs[NODE_LEVEL_DIFF_KEY]`. So "node itself wholly
added/removed" and "its parent/container was wholly added/removed" did not need two separate
checks — reading `NODE_LEVEL_DIFF_KEY` once covers both.

### 7. Hiding-unchanged-nodes interplay needed no extra plumbing

`hasOwnChangeSignals` (`changed-only/has-own-change-signals.ts`) treats **any** non-empty
`node.diffs` record as a change signal — it does not special-case individual field names. Storing
the new field on `node.diffs` was therefore enough to keep the owning node (and its
`NestingIndicatorTitleRow`) out of collapsed "N unchanged nodes" placeholders automatically; no
change was needed in `resolveJsonSchemaUnchangedBlocks` / `isJsonSchemaNodeChanged`. Verify this
holds instead of assuming it does — it is easy to over-engineer a fix here that duplicates
existing behaviour.

### 8. A `type`-field replace can still need add/remove colorizing — "replace" is not the safe default

The `typeLabelFieldDiffs` branch of `aggregateNestingIndicatorRowColorizingDiff` unconditionally
called `asReplaceRowColorizingDiff` on the representative field diff, which always yields a
symmetric yellow background on both sides for a `replace` action. That is correct when the `type`
keyword changes but children exist (or don't) on **both** sides equally (`object`→`array`,
`string`→`number`, a `title`/`format`-only change). It is **wrong** when `type` crosses the
primitive/non-primitive boundary (`string`→`array`, `object`→`string`, …): only the non-primitive
side actually has a children row to introduce or remove, so the row should colorize as a
single-sided **add** (non-primitive lands on the changed/after side) or **remove** (non-primitive
was on the origin/before side) — exactly like the whole-node-add/remove branch above it, just
triggered by a field diff instead of a node-level diff.

The fix reused an **already-correct check that existed one method away**:
`resolveTypeLabelNestingLevelFlags` (a few lines below `aggregateNestingIndicatorRowColorizingDiff`
in the same file) already computed `beforeIsPrimitive !== afterIsPrimitive` to decide
`flags.increaseLevel` per side — it had simply never been consulted for the row's `data`/`styles`,
only for nesting depth. Extracting that check into `resolveTypePrimitivenessCrossing` (shared by
both call sites) and feeding it into a new `buildTypePrimitivenessCrossingRowColorizingDiff` —
which synthesizes a single-side `DiffAdd`/`DiffRemove` literal from the `type` field's own
`before`/`afterDeclarationPaths` and routes it through the existing `buildChangedPropertyMetaDataFromDiff`
— needed no new concept, only reusing `buildWholeNodeInheritedRowColorizingDiff`'s existing
single-side-literal-diff technique with a different trigger condition.

**Lesson:** when a row's colorizing diff comes from a field-level diff (not a node-level or
uniform-children diff) and that field's before/after values differ in a way that changes *what
content exists* on each side (not just its label), check whether the row still needs an
add/remove split — do not assume "the diff action was `replace`" implies "the row background
should be `replace`". Look for a sibling method in the same aggregator that already encodes the
relevant per-side distinction (here, nesting-level `flags`) before writing a new check from
scratch.

### 9. The crossing check needed a third, non-primitive "childless" category — the special `any`/`nothing` pseudo-types

Lesson 8's fix only checked `isJsonSchemaPrimitiveValueType` (string/number/integer/boolean vs.
object/array). It missed a class of node whose merged `type` becomes one of two **special
pseudo-types** the schema-merge pipeline can synthesize onto a node's `type` field: `any` (no real
constraint — e.g. an `allOf` branch that adds nothing, or `additionalProperties: true`, see
`additional-properties-node-value.ts`) and `nothing` (a self-contradictory `allOf` intersection —
e.g. an `array` option combined with an incompatible `string` option). Both have no genuine
children, same as a real primitive, so a `type` replace crossing to/from `object`/`array` on either
of them hit the exact same symmetric-yellow bug lesson 8 fixed for real primitives — reported via
`all-of-combiner-diffs-suite` cases `041`/`042` (`array` ↔ `nothing`) and `053`/`054` (`object` ↔
`nothing`), all four showing every validation row's floating badge pointing at an unrelated field
(e.g. `minLength`) because the row background fell through to the symmetric-replace default.

**Root cause was a missing category, not a wrong check:** `isJsonSchemaPrimitiveValueType("any")`
and `isJsonSchemaPrimitiveValueType("nothing")` both correctly return `false` (they are genuinely
not primitive JSON Schema `type` keyword values) — but the crossing check
(`resolveTypePrimitivenessCrossing`) only treats a transition as a "crossing" when exactly one side
is primitive. `nothing` → `array` had `beforeIsPrimitive === false` and `afterIsPrimitive === false`
(both "not primitive"), so the function returned `undefined` (no crossing) and fell through to the
symmetric-replace default — the same failure shape as if `object` → `array` were miscategorized as
a crossing, just from the opposite direction.

**Fix — a new, deliberately separate guard, not a merge into the primitive list:**
`isJsonSchemaSpecialValueType` (`shared/json-schema/guards/schema-value.ts`) recognizes only `any`/
`nothing`; a new private `isChildlessTypeValue` in `kind-any.ts` composes
`isJsonSchemaPrimitiveValueType(type) || isJsonSchemaSpecialValueType(type)` and is what
`resolveTypePrimitivenessCrossing` now calls instead of `isJsonSchemaPrimitiveValueType` directly.
Do **not** just add `'any'`/`'nothing'` into `JSON_SCHEMA_PRIMITIVE_VALUE_TYPES` — that list is
reused elsewhere (viewer nesting-indicator visibility, the unit test literally titled "classifies
primitive vs complex type keyword values") where "primitive" means the real JSON-Schema-standard
four types; blurring that would make `isJsonSchemaPrimitiveValueType`'s own name misleading for
those other callers. The returned crossing object's field names (`beforeIsPrimitive`/
`afterIsPrimitive`) keep their historical spelling for the two existing call sites, but the boolean
they now carry means "has no children" (primitive **or** special), not literally "is a primitive
type" — read the JSDoc on `resolveTypePrimitivenessCrossing`/`isChildlessTypeValue`, don't infer
meaning from the field name alone.

**Reproducing `any`/`nothing` in a test requires the real merge options — a plain `apiDiff` call
won't produce them.** The `any`/`nothing` synthesis happens inside `@netcracker/qubership-apihub-api-unifier`'s
schema-merge logic, gated behind `apiDiff`'s `unify: true` + `liftCombiners: true` options (plus
`validate: true`, `allowNotValidSyntheticChanges: true`, a `syntheticTitleFlag`) — exactly
`DEFAULT_NORMALIZE_OPTIONS` in `api-doc-viewer/src/stories/preprocess.ts`, which every combiner
diff story goes through. A test (or a manual repro) that calls `apiDiff(before, after, { beforeSource,
afterSource, metaKey })` **without** those options — the shape the plain `mergeSchemas` test helper
in `json-schema-with-diffs.test.ts` already used for every other fixture in this file — merges an
`allOf` of `array` + `string` into a document that keeps `type: "array"` and appends a `not:
{anyOf: [...]}` guard instead of ever writing `type: "nothing"`. Discovering this took building a
scratch repro with each option added back one at a time; don't assume the default `mergeSchemas`
helper covers every merge scenario in this file — check which options a given Storybook pipeline
(`prepareJsonDiffSchema`/`prepareJsonDiffSchemaWithInlineTemplate` for combiner suites) actually
passes before writing a fixture that's supposed to mirror it.

**What this fix deliberately did NOT touch — `node-type-checkers.ts`'s content-hiding guards are a
different question with a different answer.** `isJsonSchemaNestingIndicatorHiddenForPlainNode` /
`isJsonSchemaNestingIndicatorHiddenForSide` (`api-doc-viewer/.../JsonSchemaViewer/utils/`) also
call `isJsonSchemaPrimitiveValueType` and look superficially like they need the same `any`/`nothing`
treatment. They do **not**: those guards hide the nesting-indicator row's content when a side has
**no real crawled children at all**, but a `nothing`-typed merged node can still carry a genuine
structural child. Verified directly: merging `allOf: [array]` → `allOf: [array, string]` (the case
041 shape) produces a root node whose **value** is stripped down to `{ type: "nothing" }` (the
`NOTHING` case in `builder.ts`'s `getJsonSchemaTreeNodeValueProps` only picks the common props —
`items`/`minItems`/etc. are dropped), but whose **`childrenNodes()`** still contains a real `items`
child — because tree crawling walks the raw JSON structure (an `items` key is still physically
present in the merged document from whichever `allOf` branch contributed it) independently of what
the resolved `type` value picks into the node's own stored value. Hiding that side's content
because the type is "childless" would hide a child node that's actually there. If this guard ever
needs a similar fix, verify with the same kind of structural check first — do not port lesson 9's
guard reuse here without re-testing the premise.

### 10. `CombinerNodeViewer` double-incremented the leaf's children level — selector row and its children must share one level

This bug is about **nesting level / indentation** (`resolveNextLevelPair`, `LevelIndicator`), a
separate axis from the diff-colorizing lessons above (1–9) — but it lives in the same viewer
(`CombinerNodeViewer.tsx`) and above the same `NestingIndicatorTitleRow` the rest of this doc
covers, so the fix is recorded here.

**The rule (product intent, stated explicitly by the user who reported this):** independently of
how many levels of combiner nesting a schema has (`oneOf` → `anyOf` → `allOf`, three deep, say),
`CombinerNodeViewer` always collapses every nested combiner's own `CombinerSelectorRow` onto **one
shared level** (`selectorBeforeLevel`/`selectorAfterLevel` — all `selectorLevels.map(...)` entries
render inside the same single `AsyncLevelContextProvider`). The active/selected leaf's own
**structural children** (e.g. an `object` option's `properties`, an `array` option's `items`) must
render at **that same level** — not one level deeper.

**The bug:** the leaf's children were wrapped in a *second*, independently-computed
`AsyncLevelContextProvider` (`leafBeforeLevel`/`leafAfterLevel`), produced by calling
`resolveNextLevelPair` **again** — this time seeded with the selector's own level pair and the
active leaf's own `nestingIndicatorRowColorizingDiff` (`takeJsonSchemaNestingIndicatorRowColorizingDiff(activeLeafWithDiffs)`).
Since `resolveNextLevelPair` increments by default whenever no diff is present (`increaseLevel ??
true` — see `resolve-nesting-level.ts`), this always produced `selectorLevel + 1`, one level too
deep, on both plain and with-diffs cases with no active flag/reduction. Reported against
`json-schema-diffs/{oneOf,anyOf}` cases `009`/`010`/`017`/`018` (single-level combiner, object/array
leaf) but the double-increment is structural, not diff-specific — it also affected the plain
(non-diff) `json-schema` combiner suite and every nesting depth.

**Why the second `resolveNextLevelPair` call looked plausible but was wrong:** it mirrors
`SchemaNodeViewer.tsx`'s own pattern almost exactly — a node's title row is at level `L`, and
`resolveNextLevelPair(currentLevel, ..., nestingIndicatorRowColorizingDiff)` places that node's own
children at `L + 1`. `CombinerNodeViewer` already does this once, correctly, going from the
**owner** node's level to the **selector**'s level (`ownerNestingIndicatorRowColorizingDiff`,
unchanged by this fix). The mistake was applying the *same* per-node "my own children go one level
deeper" step a *second* time for the **active leaf**, treating the leaf as if it were a distinct
node with its own title row at the selector's level. It isn't: the `CombinerSelectorRow` **is**
the leaf's visual representation (its option buttons render the leaf's type/format/title — see
"Shared type-value rendering architecture" below) — there is no separate "leaf title row" for a
second nesting step to originate from. The leaf's children are the selector row's own children,
one conceptual step, already spent going from owner to selector.

**Fix:** delete the second `resolveNextLevelPair` call (`leafBeforeLevel`/`leafAfterLevel`) and the
inner `AsyncLevelContextProvider` wrapping the leaf's `NestingIndicatorTitleRow` + children —
render them as plain siblings of the `CombinerSelectorRow` list, still inside the **outer**
`AsyncLevelContextProvider beforeLevel={selectorBeforeLevel} afterLevel={selectorAfterLevel}` that
already wraps `selectorLevels.map(...)`. `nestingIndicatorRowColorizingDiff` itself is **not**
removed — it is still read and still passed as the `diff`/`diffsSeverities` prop to that
`NestingIndicatorTitleRow` for its background/floating-badge chrome (lessons 1–9 above); only its
use for computing a *second* level increment was wrong.

**Lesson:** when a node's own visual representation is folded into another row (here: the leaf's
title-row-equivalent **is** the combiner selector row, not a separate row), do not mechanically
copy a "compute my children's level from my own level" step that assumes a standalone node with
its own title row. Check what level the *visible* anchor row actually renders at before adding
another `resolveNextLevelPair` hop beneath it — verify visually (e.g. Storybook, zoomed
screenshot) that a row's label and its children column line up, rather than trusting that mirroring
an existing per-node pattern one level lower is automatically correct.

---

## Shared type-value rendering architecture (title row + nesting-indicator row)

`packages/api-doc-viewer/src/components/JsonSchemaViewer/SchemaNodeViewer/TypeValue/` holds
the component stack that renders JSON Schema's "type value" text (`type`/`format`/`title`/
`nullable`, e.g. `string(date-time)<Email> or null`) — used by **both** the title-row subheader
and the nesting-indicator row, in **both** plain and with-diffs modes. Reuse it for any new JSON
Schema row that needs to render a type/title/format-style value (e.g. combiner selector buttons)
instead of re-implementing text+diff rendering.

| Layer | Files | Role |
| --- | --- | --- |
| Leaf | `JsonSchemaTypeValueText.tsx`(`.css`) | Draws text only; `color` prop defaults to `#64748B` (title row's color) |
| Diff wrapper | `JsonSchemaTypeValueDiffSegment.tsx` | Applies `DiffsClassesBuilder.highlighter`/`.background` chrome around the leaf for one text segment |
| Side-display renderer | `JsonSchemaTypeValueSideDisplay.tsx` | Renders a next-data-model `SideListDisplay` (`NO_DIFFS`/`WHOLE_DIFFS`/`PARTIAL_DIFFS`) through the leaf/wrapper — shared by both with-diffs orchestrators |
| Orchestrators (4) | `JsonSchemaTitleRowTypeValue[WithDiffs].tsx`, `JsonSchemaNestingIndicatorTypeValue[WithDiffs].tsx` | Resolve data (`resolveJsonSchemaTypeLabel` / `resolveJsonSchemaTypeLabelSideDisplay`), decide visibility, pass the nesting-indicator color override (`#94A3B8`) |
| Visibility guards | `isJsonSchemaNestingIndicatorHiddenForPlainNode`/`...ForSide` in `utils/node-type-checkers.ts` | Primitive types have no children — hide the nesting-indicator row's content on that side; title row never hides on primitiveness |

**Deliberate independence:** this stack does **not** use `SubheaderValue`/`SubheaderValueWithDiffs`
(`shared-components/SubheaderValue/`) nor `CommaSeparatedListWithDiffs` (a thin wrapper over the
former, also consumed by DDL) — both are cross-viewer shared components, and folding JSON Schema's
type-value-specific needs (per-side primitive gating, the nesting-indicator color override) into
them was judged higher blast-radius than a small local reimplementation. It **does** reuse the
lower-level, spec-agnostic utilities those components are themselves built on
(`DiffsClassesBuilder`, `takeDiffSideTextHighlighterColor`/`takeDiffSideBackgroundColor`) — reusing
those is fine; reusing the shared React components is what was avoided. `JsonSchemaTitleSubheader.tsx`
carries a one-line comment marking this divergence as deliberate and pending future reconciliation
with `SubheaderValue` — do not attempt that reconciliation as a drive-by part of an unrelated change.

**Color contract:** the leaf's default (`#64748B`, Tailwind `slate-500`) is the title row's own
color — title-row orchestrators rely on it rather than passing color explicitly. The
nesting-indicator orchestrators explicitly override to `#94A3B8` (Tailwind `slate-400`). This
override is scoped to these new components only — it does **not** change the generic, cross-viewer
`NestingIndicatorTitleLabel`'s own default color, which stays `text-slate-400` for its other
consumers (DDL, JSO, AsyncAPI, and JSON Schema's own *combiner*-kind nesting indicator title,
rendered via `resolveJsonSchemaCombinerNestingIndicatorTitle` — a separate, untouched code path
from the `type`-value nesting indicator this stack covers).

`JsonSchemaTypeValueText`'s `color` prop is `string | undefined | null`: omitted → the `#64748B`
default; a string → used as-is; **`null`** → no inline `color` is set at all, so an ambient CSS
color wins instead. This third state exists for a third pair of orchestrators,
`JsonSchemaCombinerOptionTypeValue[WithDiffs]`, which render **combiner-selector option button**
content (`CombinerNodeViewer.tsx`'s options, rendered via `CombinerSelectorRow` →
`shared-components/Selector/Selector.tsx`) — those buttons already carry their own
selected/unselected text color via `Selector.css` (`color: #8F9EB4` / `.selected { color: #626D82 }`),
so the orchestrators pass `color={null}` to avoid clobbering it with an inline style (diff
highlighter/background CSS classes only ever set `background-color`, never `color`, so they layer
safely regardless).

**Combiner option buttons — recursive leaf resolution:** a combiner variant can itself be a
nested combiner (`anyOf` → first variant is `allOf` → first variant is the real leaf). The option
button must show the **leaf's** type/format/title (not the immediate variant's, which may have no
`type` of its own), with a trailing `" (combinerKind)"` suffix per nesting level reflecting only
that level's own immediate combiner kind — not an accumulated chain. `JsonSchemaCombiner.resolveOptionLeafNode`
(`utils/resolve-combiner.ts`) gets the leaf by reusing the existing `resolveActiveLeafNode`
with an **empty** selections map (it already falls back to `nestedNodes[0]` when nothing is
selected for a given combiner id — no new recursive-walk code was needed). The suffix reuses the
existing `resolveCombinerOptionTitleSuffix` (`resolve-combiner-node-diffs.ts`, now exported) which
checks only the **option node itself** — the recursion for the suffix comes for free because each
nested combiner level gets its own `CombinerSelectorRow` with its own set of options, each
evaluated independently, not because the suffix logic itself recurses.

**`Selector`'s `title` widened to a per-side function:** button content used to be a plain
`string`; it is now `ReactNode | ((layoutSide: LayoutSide) => ReactNode)` — the same
"maybe-a-function" pattern `NestingIndicatorTitleRowContent` already uses for its `title` prop,
resolved with the `Selector`'s own `layoutSide` prop (which it already received, for its
unrelated add/remove visibility logic) at render time. `string` remains a valid `ReactNode`, so
existing AsyncAPI consumers (`MessageSectionsViewer.tsx`, `BindingsNodeViewer.tsx`, both pass
plain strings) needed no changes — this is why the type was **widened**, not replaced, when a
shared component's contract must grow to fit a new caller's needs without an unrelated caller's
being touched. `buildSelectorOption` (`utils/resolve-combiner.ts`) itself gained an
**optional** third `title` parameter (default: the old plain string, so untouched call sites in
tests keep working) rather than a required one — `CombinerNodeViewer.tsx` is the only caller that
passes the new rich `(layoutSide) => <JsonSchemaCombinerOption... />` function explicitly.

---

## Checklist — new row-level colorizing diff for JSON Schema (or any spec)

1. Compute the row's `ChangedPropertyMetaData` in `aggregateByDescendantDiffs` (or `aggregate`),
   as a field distinct from `NODE_LEVEL_DIFF_KEY` unless the row **is** the node's own title row.
2. Add a matching `NodeDiffsSeverityPlacemennt` member and populate it from **the same diff
   object**, in both the whole-node-cascade branch and the field-specific branch of the
   severities aggregator.
3. Wire the viewer: `diff` (background) **and** `diffsSeverities` + `diffsSeverityPlacement`
   (floating badge) — both, not just one.
4. If the row can hide content on one side, keep the element mounted and toggle
   `visibility`/inner content — but verify first whether the actual symptom is layout or a
   missing data field before choosing that fix (see lesson 4).
5. Confirm `hasOwnChangeSignals` doesn't need a change — it usually doesn't, since it reads
   `node.diffs` generically (see lesson 7).

---

## Cross-API-type rule: uniform-children colorizing requires full coverage

**This is one of the most significant rules in the whole diff-rendering stack — read it before
touching any children-list section header, in any spec.**

> A children-list section's nesting-indicator title (the "Properties"/"Items"/"Extensions"/
> "Columns"/"Indexes"/"Parameters"/… header `SchemaNodeViewer` — or the equivalent per-spec
> viewer — renders above a node's list of children) may be painted **wholly-added** or
> **wholly-removed** in exactly two situations:
>
> **(a)** the owning node itself (or an inherited ancestor container/parent) was wholly
> added/removed, **or**
>
> **(b)** the owning node itself was **not** wholly added/removed, but **every single one** of its
> visible children was uniformly added, or **every** child was uniformly removed.
>
> A mixed or partial set — some children added, some removed, some unchanged, some replaced, or
> even just **one** unchanged child sitting alongside otherwise-uniform changes — must leave the
> title **uncolored** (or yellow/partial, per that spec's convention for partial changes). It must
> **never** be painted wholly-added/removed on anything less than full, unanimous coverage.

Rule (a) is a **direct inheritance** check (`NODE_LEVEL_DIFF_KEY` cascading from a container/parent,
or the node's own whole-node diff) — cheap to get right, and rarely the source of bugs. Rule (b) is
where implementations go wrong: it is tempting to compute "uniform" over only the children/items
that **have** a diff, forgetting that an **unchanged** child must also be counted — and an
unchanged child never appears in a diffs record at all (there is nothing to record), so it is
invisible to a check that only inspects diff objects. **The fix is always the same shape:** compare
the number of children/items that have a diff against the **total** number of children/items
present on the merged node, not just those that changed. Every implementation below either does
this check or explicitly documents that it doesn't (JSO).

**Concrete regression this rule caught:** JSON Schema's own `Extensions` nesting-indicator row
(`aggregateExtensionsUniformRowColorizingDiff` below) painted wholly-green/red whenever *any*
subset of `x-*` extensions changed in one direction, even with other extensions on the same node
completely untouched — reproduced on nearly the entire
`packages/samples/json-schema-diffs/extensions/existing-1-*`/`existing-2-*` matrix (each case is
built specifically around "one extension changes, another coexists unchanged"). Fixed by comparing
`extensionDiffs.length` against the total extension-key count on the merged crawl value.

**Verified survey, grouped by API type** (source of truth — re-verify line numbers against current
code before trusting them blindly, they will drift):

| API type | Section | File → function | Full-coverage check? | Verdict |
| --- | --- | --- | --- | --- |
| JSON Schema | Properties/Items nesting indicator | `next-data-model/.../json-schema/tree-with-diffs/node-diffs-data/node-diffs/kind-any.ts` → `aggregateNestingIndicatorRowColorizingDiff` | Yes — `childDiffs.some(diff => !diff)` bails if any child lacks a diff | Correct |
| JSON Schema | **Extensions** nesting indicator | same file → `aggregateExtensionsUniformRowColorizingDiff` | Yes (fixed — previously **no**, see regression above) | **Fixed** |
| JSON Schema | enum / examples / allowedAdditionalPropertyNames row | `.../node-diffs/kind-property.ts` → `aggregateListRowColorizingDiff` | Yes — `itemDiffValues.length === listValue.length` | Correct (reference pattern both the Extensions fix and this rule's "how to fix it" are modeled on) |
| JSO | Property children | *(no `aggregateByDescendantDiffs` override anywhere under `next-data-model/.../building-service/jso/`)* | N/A | **Not implemented** — a known gap, not a false positive: JSO's `kind-any.ts` only implements rule (a) (parent/container inheritance), never rule (b) ("all children uniformly changed"). Leave as a documented limitation until a task explicitly asks for it — do not add proactively |
| DDL API | Columns / Indexes sections | `.../ddlapi/tree-with-diffs/node-diffs-data/shared/property-list-section-diff-utils.ts` → `aggregateUniformWholeNodeDescendantDiff` | Yes — `descendantDiffEntries.length !== childCount` | Correct |
| AsyncAPI | Channel Parameters | `.../async-api/tree-with-diffs/node-diffs-data/node-diffs/kind-parameters.ts` → `aggregateByDescendantDiffs` | Yes — `parametersCount !== nodeDiffsCount` | Correct |
| AsyncAPI | Bindings | `.../async-api/.../node-diffs/kind-bindings.ts` → `aggregateByDescendantDiffs` | Yes — falls back to a synthetic yellow "replace" for a partial set rather than leaving it uncolored | Correct (stricter variant of the rule — still never paints wholly-added/removed on a partial set) |
| AsyncAPI | Servers | `.../async-api/.../node-diffs/kind-servers.ts` → `aggregateByDescendantDiffs` | Yes — `serversCount !== nodeDiffsCount` | Correct |
| AsyncAPI | Extensions | `.../async-api/.../node-diffs/kind-extensions.ts` → `aggregateByDescendantDiffs` | Yes — `extensionsCount !== nodeDiffsCount` | Correct — notably AsyncAPI's own Extensions implementation never had JSON Schema's bug |

**When adding a new children-list section colorizing diff in any spec:** write the full-coverage
comparison *first*, before the uniform-action check — do not reuse a "some children have a diff"
shortcut, and do not assume "if it fires, it must have been uniform" without independently
verifying the count. Add a unit test for the specific partial-with-one-unchanged-sibling shape
(not just "all changed" or "genuinely mixed actions" — both of those are cheaper to get right and
don't exercise this rule) — see
`packages/next-data-model/tests/unit-tests/json-schema-with-diffs.test.ts`, the Extensions describe
block's "...but another sits unchanged alongside it" cases, for the pattern to copy.

---

## Related documents

- Diff inheritance / `NODE_LEVEL_DIFF_KEY` contract and the `aggregateByDescendantDiffs`
  extension point: `next-data-model-authoring` skill — "Diff inheritance contract (JSO)".
- ddlapi precedent for uniform-descendant colorizing:
  `packages/next-data-model/src/building-service/ddlapi/tree-with-diffs/node-diffs-data/shared/property-list-section-diff-utils.ts`.
- async-api precedent for row diff + severity pairing:
  `packages/api-doc-viewer/src/components/AsyncApiOperationViewer/MessageChannelServerNodeViewer/MessageChannelServerNodeViewer.tsx`.
- Hiding-unchanged-nodes mechanics:
  `packages/next-data-model/src/building-service/json-schema/tree-with-diffs/changed-only/`.
- Unit tests: `packages/next-data-model/tests/unit-tests/json-schema-with-diffs.test.ts`.
- Shared type-value component stack:
  `packages/api-doc-viewer/src/components/JsonSchemaViewer/SchemaNodeViewer/TypeValue/`.
- Type-label diff resolution (data layer, unchanged by this work — only its view-layer consumers
  were unified): `packages/next-data-model/src/model/json-schema/tree-with-diffs/type-label-diffs.ts`.
- Combiner option leaf resolution and suffix:
  `packages/api-doc-viewer/src/components/JsonSchemaViewer/utils/resolve-combiner.ts`
  (`JsonSchemaCombiner`: `resolveOptionLeafNode`, `resolveOptionTitleSuffix`,
  `buildSelectorOption`). Regression: `packages/api-doc-viewer/tests/resolve-combiner.test.ts`.
- Generic selector button host: `packages/api-doc-viewer/src/components/shared-components/Selector/Selector.tsx`
  (shared with AsyncAPI — widen its contract, don't fork it, when JSON Schema needs richer content).
