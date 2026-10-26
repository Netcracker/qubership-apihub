# JSON Schema validation rows — agent reference

Design (source of truth): `docs/design/json-schema/features/validation-rows.md`.

Reference for AI assistants working on **validation constraint rows** in the JSON Schema stack
(`JsonSchemaViewer` / `JsonSchemaDiffsViewer` + `JsonSchemaTreeWithDiffsBuilder`).

Implementation paths, session lessons, and troubleshooting.

**Primary code paths**

| Layer | Role | Path |
| --- | --- | --- |
| Plain chip text | `JsonSchemaValidationRows.resolve`, `resolveBoundRangeLabel`, `resolveValueRangeLabel` | `api-doc-viewer/.../utils/validation-rows.ts`, `next-data-model/.../bound-range.ts`, `value-range.ts` |
| Row ↔ source keys | `JSON_SCHEMA_VALIDATION_ROW_SOURCE_KEYS` | `next-data-model/.../validation-row-source-keys.ts` |
| Diff aggregation | `aggregateValidationRowDiffs` | `next-data-model/.../node-diffs/kind-any.ts` |
| Value-range dialect / partial logic | `isValueRangePartialBoundChange`, side entries | `next-data-model/.../value-range-diff-side-display.ts` |
| Side-entry resolution | `resolveJsonSchemaValidationRowSideEntries` | `next-data-model/.../property-row-diffs.ts` |
| Floating-badge severities | `JsonSchemaNodeDiffsSeveritiesAggregatorKindAny` / `KindProperty` | `next-data-model/.../node-diffs-severities/kind-any.ts`, `kind-property.ts` |
| Row → placement mapping | `JSON_SCHEMA_VALIDATION_ROW_SEVERITY_PLACEMENTS` | `next-data-model/.../validation-row-source-keys.ts` |
| Viewer | `AdditionalInfoRow` (+ `diffsSeverityPlacement` prop) + `AdditionalInfoPiece` chips | `SchemaNodePlainContent.tsx`, `shared-components/AdditionalInfoRow/` |

**Regression**

| Mode | Suites |
| --- | --- |
| Plain | `packages/samples/json-schema/` + `src/stories/json-schema-suite/` |
| With diffs | `packages/samples/json-schema-diffs/type-changes/` (YAML + programmatic value-range) |

---

## Session constraints and recommendations (value-range work)

These rules came from the value-range diff session and apply to all validation-row work:

| Constraint | Rationale |
| --- | --- |
| **View / data split** | Chip labels, side entries, row/chip diff metadata, and colorizing live in **next-data-model** aggregators and resolvers. Viewer reads precomputed `validationRow*` fields only. |
| **Fix aggregators first** | If row background or chip highlight is wrong, change `kind-property.ts` or `value-range-diff-side-display.ts` — not `AdditionalInfoRow` branching. |
| **Dialect-aware value range** | OAS 3.0 (boolean `exclusiveMinimum` / `exclusiveMaximum`) and OAS 3.1 (numeric exclusive bounds) use different partial-bound rules. Never assume one dialect when writing tests or cases. |
| **Programmatic value-range samples** | Case definitions in committed `value-range-diff-case-definitions.ts` — **not** YAML fixtures, **not** `.generated.ts` (gitignored; compatibility-suites only). |
| **Separate OAS 3.1 story builder** | OAS 3.1 cases convert boolean exclusive flags to numeric bounds (`convertValueRangeSchemaToOas31`). Do not reuse OAS 3.0 schema shape in OAS 3.1 stories. |

---

## Display rules

Row catalogue, order, value-range dialects, and with-diffs rules (whole row vs. partial replace,
boolean border, whole-list chip suppression, per-row severity) are design:
`docs/design/json-schema/features/validation-rows.md`. The sections below record implementation
details and the session lessons behind those rules.

Implementation map for the with-diffs rules:

| Rule | Where |
| --- | --- |
| Whole-row add/remove vs. partial replace | `aggregateValidationRowDiffs` (`kind-any.ts`), `rowHasOtherUnchangedContent` |
| Value-range partial bounds and dialects | `value-range-diff-side-display.ts` (`JsonSchemaValueRangeDiffResolver`), `bound-range.ts`, `json-schema-bound-range-dialect.ts` |
| Chip keys `"0"` / `"1"` (value range) | `buildValueRangeChipStringDiffs`, `mergeValueRangeLabelChipDiffs` |
| Side entries | `resolveJsonSchemaValidationRowSideEntries` (`property-row-diffs.ts`); pass `valueRangeCrawlDiffs` for value range |
| Canonical row order | `JsonSchemaValidationRows.sortByType` (`JsonSchemaViewer/utils/validation-rows.ts`) |

---

## Row ordering (canonical type-grouped order) — session lesson

Rows are not rendered in `JsonSchemaValidationRows.resolve` push order alone. `SchemaNodePlainContent`
appends **diff-only rows** (a row whose source keys have no *current* value — the owning type
was fully removed, or not yet added — but still carries semantic diffs per
`hasJsonSchemaValidationRowSemanticDiffs`) **after** the base rows, then sorts the combined list
through `JsonSchemaValidationRows.sortByType` (`JsonSchemaViewer/utils/validation-rows.ts`)
before rendering.

**Why a sort, not just careful push order:** concatenating `[...baseRows, ...diffOnlyRows]`
without a final sort is order-**unstable** — which group ends up first flips depending on
whether the changed type is gaining or losing rows. Example: `string → number` puts String rows
in `baseRows` (present) and Number rows in `diffOnlyRows` (diff-only), landing String-then-Number;
the reverse case `number → string` puts Number in `baseRows` and String in `diffOnlyRows`, which
without a final sort would land Number-then-String — same type pair, opposite group order. The
canonical order must be re-imposed after combining, not preserved by the order rows happen to be
pushed in.

**Canonical order** (`VALIDATION_ROW_ORDER` in that file), mirrors legacy `Validations.tsx`:

1. `valueLength`, `valuePattern` — **String**
2. `valueRange`, `valueMultipleOf` — **Number** (covers `integer` too — legacy has no separate
   Integer group; do not invent one)
3. `propertiesCount` — **Object**
4. `uniqueItems`, `itemsCount` — **Array**

The shared/common rows (`default`, `enum`/"Allowed values", `examples`) are **not** validation
rows and are not part of this sort — they render as separate `AdditionalInfoRow`s before the
validation-rows block, unconditionally ordered by JSX position in `SchemaNodePlainContent`.

The sort function lives in a standalone **CSS-free** `.ts` file specifically so it can be unit
tested directly — see **Testability trap** below.

## Boolean-valued replace diffs use `borderShadowColor` — session lesson

Every REPLACE diff on a validation-row chip, `default`, or an enum/examples list item used to get
`textHighlighterColor: Yellow` unconditionally. When the value being replaced is a JS boolean
(`uniqueItems: true → false`, a boolean `default`, a boolean enum/examples literal), the correct
chrome is `borderShadowColor: Yellow` instead — DDL already had this rule for column defaults
(`columnType.kind === TypeKind.BoolType`, see `next-data-model-authoring` skill).

**Do not port the check as-is.** DDL checks the **node's declared type**
(`columnType.kind === TypeKind.BoolType`) because a DDL column's default value type always
matches its column type. JSON Schema has a keyword that breaks that assumption: `uniqueItems` is
a validation-row chip whose value is **always** a JS boolean, but it lives on an **`array`**-typed
node (`node.type` is `"array"`, never `"boolean"`) — a node-type check silently never highlights
it. The fix checks `typeof diff.beforeValue / diff.afterValue === "boolean"` on the **diff's own
value**, per side, independently — `buildBooleanAwareChipReplaceDiffMetadata` in `kind-any.ts`,
used by `buildListValueDiffMetadata` (validation-row chips, enum/examples items) and
`buildDefaultValueDiffMetadata` (`kind-property.ts`). Per-side independence also matters: if
`default` changes `true → "foo"` alongside `type: boolean → string`, only the boolean side (the
`before` side here) gets `borderShadowColor` — the other side keeps `textHighlighterColor`.

When adding a new chip-shaped value diff in this stack, reuse
`buildBooleanAwareChipReplaceDiffMetadata` rather than re-deriving the boolean check from a
node's `type` field.

## Partial vs whole row add/remove — generic guard (session lesson)

`aggregateValidationRowDiffs` (private, `kind-any.ts`) used to treat "every diff on this row's
active source keys is `add`" as sufficient for a whole-row green add (symmetrically for remove).
That is wrong whenever the row has **other source keys with unchanged, pre-existing content** —
e.g. `maxItems` newly added while `minItems` already existed and is untouched: the row already
existed, so this must be a **yellow partial replace** (with only the `maxItems` chip highlighted
via add/remove `borderShadowColor`), not a whole-row green add.

Fix: `rowHasOtherUnchangedContent` — `sourceKeys.some(sourceKey => !activeSourceKeys.includes(sourceKey)
&& Reflect.get(crawlValue, sourceKey) !== undefined)` — gates `allAdd`/`allRemove` before the
whole-row branch runs. This is deliberately **generic across every bound-range row**
(`itemsCount`, `propertiesCount`, `valueLength`, …), not special-cased per row key — a row key
listed as one of your reported examples is a symptom, not the fix's scope.

**Separately:** rows on non-`PROPERTY`/`ROOT` nodes (`additionalProperties`, `items`, combiner
variants, …) used to show as unchanged on both sides with no diff highlighting at all, even when
the underlying field genuinely appeared/disappeared. Root cause was **not** in row aggregation —
`JsonSchemaNodeDiffsAggregatorFactory` dispatched a plain `KindAny` aggregator (validation rows
only) to every kind except `PROPERTY`/`ROOT`, which alone got `KindProperty` (adds
default/enum/examples/required aggregation). `KindProperty extends KindAny` and calls
`super.aggregate()` first, so it is a **strict superset** — nothing in it is actually
PROPERTY/ROOT-specific (default/enum/examples read a node's own crawl fields generically;
`required` resolution safely no-ops when a node isn't a named property of a parent object). Fix:
the factory now always returns the `KindProperty` instance for every kind. When adding a new kind
to this stack, do not assume a "lesser" aggregator is needed for kinds that aren't PROPERTY/ROOT —
verify the specialised aggregator's logic is actually kind-gated before forking dispatch.

## Per-row floating-badge severity — do not share one placement across rows (session lesson)

`AdditionalInfoRow`'s floating diff badge (`DiffFloatingBadgeWrapper`) reads its type/cause from
`diffsSeverities[placement]`, a flat `Partial<Record<NodeDiffsSeverityPlacemennt, NodeDiffsSeverity>>`
on the node (see `tree-node.interface.ts`). `SchemaNodePlainContent` renders **up to ten**
`AdditionalInfoRow`s per node — `Default`, `Examples`, `Allowed values`, and one per validation-row
key — all from the same node's `diffsSeverities`.

The original implementation computed **one** combined severity — the max `DiffType` across every
`default`/`enum`/`examples`/`validationRow*` diff on the node — and stored it under the single
shared `NodeDiffsSeverityPlacemennt.AdditionalInfoRow` key. Every row read that same key, so
whichever diff happened to win the max-severity comparison painted its badge (type + `causedAt`
path) onto **every** visible row, including rows with no diff of their own. Symptom: in
`all-of-combiner-diffs-suite` case `001` (adding a `number` option to an `allOf` combiner that
already had a `string` option — see `combiner-schema-builder.ts` `buildComprehensiveTypeSchema`),
every validation row's badge pointed at `minLength`, even on rows whose actual content (`Value
range`, `Value multiple of` — the genuinely added `number` fields) had nothing to do with
`minLength`.

**Fix:** one dedicated `NodeDiffsSeverityPlacemennt` member per row —
`DefaultRow`, `EnumRow`, `ExamplesRow`, and `ValueLengthRow` / `ValuePatternRow` / `ValueRangeRow`
/ `ValueMultipleOfRow` / `PropertiesCountRow` / `ItemsCountRow` / `UniqueItemsRow` (mapped from
`JsonSchemaValidationRowKey` via `JSON_SCHEMA_VALIDATION_ROW_SEVERITY_PLACEMENTS` in
`validation-row-source-keys.ts`). Each severities aggregator method now builds its severity from
**only that row's own diff objects**:

- `JsonSchemaNodeDiffsSeveritiesAggregatorKindAny.applyValidationRowSeverities` — loops the 7
  validation-row keys independently (every node kind, not just PROPERTY/ROOT — combiner variants
  get the same per-row badges).
- `JsonSchemaNodeDiffsSeveritiesAggregatorKindProperty` — three separate methods
  (`applyDefaultRowSeverity` / `applyEnumRowSeverity` / `applyExamplesRowSeverity`), each scoped to
  its own diff fields only (no more combined `maxChangedPropertyMetaDataByDiffType` call spanning
  all three).

**Viewer wiring:** `AdditionalInfoRow` previously **hardcoded**
`diffsSeverities?.[NodeDiffsSeverityPlacemennt.AdditionalInfoRow]` — it now accepts an optional
`diffsSeverityPlacement` prop (default: the old `AdditionalInfoRow` member, for DDL's callers —
see below) and reads `diffsSeverities?.[diffsSeverityPlacement]`, matching the existing pattern
already used by `TextRow` / `MarkdownTextRow` / `NestingIndicatorTitleRow`.
`SchemaNodePlainContent` passes the matching placement on every `AdditionalInfoRow` it renders.

**Generalize this rule:** any node that renders **more than one** `AdditionalInfoRow` (or any
other row component sharing one `NodeDiffsSeverityPlacemennt` value) needs one dedicated placement
per row instance, not one placement per row *component type*. A single shared enum member can only
ever hold one severity at a time on a given node — reusing it across sibling rows silently
collapses their badges into whichever diff has the highest severity, with no type error and no
visible symptom other than a badge with a suspicious/wrong `causedAt` path. **DDL has this same
latent gap as of this writing**: `ColumnNodeViewerWithDiffs` renders three `AdditionalInfoRow`s
(enum `Values`, `Default`, generated `As`) that all still pass `node.diffsSeverities` with no
`diffsSeverityPlacement` override, so they still share the one `AdditionalInfoRow` placement — it
has not been fixed, only the shared component capability (`diffsSeverityPlacement`) now exists to
fix it the same way if/when asked.

Unit-test pattern for this class of bug: assert the "leak" doesn't happen, not just that the
correct placement is set — e.g. after a `Value range` add, assert `ValueRangeRow` is defined
**and** `ValueLengthRow` / `UniqueItemsRow` are `undefined` on the same node (see
`json-schema-with-diffs.test.ts`, case "aggregates property metadata and constraint diffs for case
1.4"). A test that only checks the correct placement is set would have passed even with the old
shared-placement bug, since the shared key would coincidentally equal the right value whenever
only one row actually changed.

## Whole-list add/remove: row color suppresses per-chip highlight (session lesson)

**Product rule (stated explicitly by the user who reported this):** once a row's own background
already conveys "every item here was added" (green) or "every item here was removed" (red), the
individual item chips inside that row must **not** also carry their own add/remove chip chrome
(colored `borderShadowColor`, muted font for removed items). That per-chip highlight is redundant
once the row itself says the same thing — it must render as a **plain** chip, still visible only on
the correct side, with no extra color. This generalizes the same rule already applied to DDL's
whole-node flag badges (see `next-data-model-authoring` skill, "Whole-node add/remove flag badges"):
row/node-level add-or-remove chrome subsumes any nested per-item chrome it fully explains.

**Where this shows up:** `enum` / `examples` / `allowedAdditionalPropertyNames` rows, whenever
`aggregateListRowColorizingDiff`'s "every item in the merged list has its own diff, all agreeing on
the same add/remove action" branch fires (see "Tiered attachment" note above — this is the
Tier-2/3 case, e.g. `enum` newly appearing on a property that already has other unchanged sibling
fields, such as AsyncAPI channel-parameter samples
`packages/samples/async-api-diffs/channel-parameters/{6,7}-channel-parameters-fields-*`). Before the
fix, the row correctly painted green/red, but each chip (`buildListValueDiffMetadata`) still carried
its own `borderShadowColor`/`isFontMuted` — visually double-signaling the same add/remove on both
the row and every chip inside it.

**Fix (`kind-property.ts`, `aggregateListRowColorizingDiff`):** in the same branch that colors the
row, also walk every entry in `nodeDiffs[itemDiffsKey]` (the chip diffs, e.g. `enumValueDiffs`) and
rebuild each one via `this.buildChipAddRemoveDiffMetadata(entry.data)` **without** a `chipHighlight`
argument — that overload already exists (used for DDL's plain-badge/side-visibility-only case) and
produces the plain, side-visibility-only styles this rule needs: same `isContentVisible` per side,
no color. Do not delete the chip diffs outright — `resolveSideEntries`/list-side-display logic still
needs each entry's `.data` (action/before/afterValue) to decide which items render on which side;
only the **highlight styling** must be stripped, not the diff itself.

**Scope of the fix — do not over-apply:** this only applies to the "every item uniformly
added/removed" branch. A **partial** change (e.g. one value appended to an otherwise-unchanged,
already-existing list — `003-enum-value-appended`, or `propertyNames.enum` gaining one entry) keeps
its per-item chip highlight as-is; the row itself stays a yellow "replace" there precisely because
it does **not** fully explain every item's presence, so each changed item's own chip highlight is
still the only signal a reader has for *which* item changed. Only suppress chip highlight when the
row-level color is a true whole-list add or remove.

**Regression:** `packages/next-data-model/tests/unit-tests/json-schema-with-diffs.test.ts`, describe
block `"JsonSchema enum row: chip suppression when every item was uniformly added/removed"` — hand-
builds the crawl value's `enum` array with per-index add/remove diffs attached directly to the
array's own `diffsMetaKey` (mirroring the real AsyncAPI shape) rather than going through
`mergeSchemas`/`apiDiff`, because without AsyncAPI's `unify: true` normalization a plain OpenAPI
`apiDiff` call resolves this exact "new field alongside an unchanged sibling" shape to the *other*
attachment tier (a single field-level diff on the parent, already covered by the pre-existing
`001-enum-two-values-added`/`002-enum-two-values-removed` fixture tests) instead of per-item array
diffs. Confirm any future test for this rule reproduces the array-level per-item diff shape, not
just asserts on the row color.

## Testability trap: CSS imports break Jest unit tests (session lesson)

`SchemaNodePlainContent.tsx` transitively imports `.css` (via `AdditionalInfoRow` →
`DiffFloatingBadgeWrapper` → `UxDiffFloatingBadge` → `UxDiffFloatingBadge.css`). Jest's default
transform does not parse CSS, so importing **any** symbol from that file in a unit test — even a
pure, non-React helper defined at the top of the file — fails with
`SyntaxError: Unexpected token '.'` pointing at the `.css` file, not the actual import.

When logic in a viewer `.tsx` component needs a direct unit test (not a screenshot IT), extract it
to a sibling **CSS-free** `.ts` file under `utils/` first (e.g.
`JsonSchemaViewer/utils/validation-rows.ts`), import it back into the component,
and write the test against the utils file. Do not try to work around the Jest failure with mocks
or moduleNameMapper for CSS — extraction is simpler and keeps the logic reusable/testable
independent of the component tree.

## Troubleshooting checklist

| Symptom | Likely layer | Check |
| --- | --- | --- |
| Wrong chip operator (`>` vs `>=`) | Data | `bound-range.ts`, dialect in `json-schema-bound-range-dialect.ts` |
| OAS 3.0 case shows whole-row add but should be partial (or vice versa) | Data | `isValueRangePartialBoundChange` + dialect inference |
| Row yellow but chip not highlighted | Data | `validationRowValueDiffs` chip keys `"0"`/`"1"` or source keys |
| Row missing in diff view but field changed | Data | `hasJsonSchemaValidationRowSemanticDiffs`; diff-only row injection in viewer |
| Plain chips wrong | Viewer util | `JsonSchemaValidationRows.resolve` only — no diff fields involved |
| Side column shows wrong before/after text | Data | `resolveJsonSchemaValidationRowSideEntries` + crawl diffs for value range |
| Row group order flips depending on add- vs remove-direction of a type change | Viewer | `JsonSchemaValidationRows.sortByType` must run on the **combined** `[...baseRows, ...diffOnlyRows]` list, not rely on push order |
| Boolean value (e.g. `uniqueItems`) replace shows yellow text fill instead of border | Data | `buildBooleanAwareChipReplaceDiffMetadata` — check must be `typeof diff.value === "boolean"`, not `node.type` |
| Row wholly green/red when only one bound of an existing row changed | Data | `rowHasOtherUnchangedContent` guard in `aggregateValidationRowDiffs` |
| `additionalProperties` / `items` / combiner-variant rows show no diff at all | Data | `JsonSchemaNodeDiffsAggregatorFactory` must dispatch `KindProperty` (superset of `KindAny`) for every kind, not just PROPERTY/ROOT |
| Unit test importing from a viewer `.tsx` fails with `SyntaxError: Unexpected token '.'` in a `.css` file | Test | Extract the pure logic to a CSS-free `utils/*.ts` file and import the test from there |
| Floating diff badge on a validation/`Default`/`Examples`/`Allowed values` row points at the wrong field (e.g. always `minLength`) | Data + viewer | Missing dedicated `NodeDiffsSeverityPlacemennt` for that row, or `AdditionalInfoRow` not passed a `diffsSeverityPlacement` — see "Per-row floating-badge severity" below |
| Row already colored wholly add/remove (green/red), but each chip inside it is *also* individually highlighted (colored border, muted font) | Data | Redundant per-chip highlight — see "Whole-list add/remove: row color suppresses per-chip highlight" below; fix in `aggregateListRowColorizingDiff`'s uniform-item branch, not the viewer |

---

## Related documents

- Display baseline: `docs/design/json-schema/display-coverage.md`
- Value-range fixtures: `packages/samples/json-schema-diffs/README.md` → Value range
- Type-changes catalogue: `packages/samples/json-schema-diffs/type-changes/README.md`
- Unit tests: `packages/next-data-model/tests/unit-tests/json-schema-with-diffs.test.ts`,
  `json-schema-value-range-scan.test.ts`
