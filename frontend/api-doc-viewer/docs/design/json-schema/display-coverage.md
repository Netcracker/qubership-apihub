# JSON Schema — display coverage

Baseline for the JSON Schema stack (`JsonSchemaViewer` / `JsonSchemaDiffsViewer` +
`JsonSchemaTreeBuilder` / `JsonSchemaTreeWithDiffsBuilder`). Assumes **current behaviour is
correct**: this document records what is shown today, what is omitted on purpose, and how to
classify a gap before planning work or writing tests.

Last reviewed against the codebase: 2026-10-01.

## Sources

Keep in sync when behaviour changes.

| Layer | Location |
| --- | --- |
| Tree model (plain) | `packages/next-data-model/src/model/json-schema/` (`types/`, `tree/`) |
| Tree model (with diffs) | `packages/next-data-model/src/model/json-schema/tree-with-diffs/` |
| Resolvers | `packages/next-data-model/src/model/json-schema/{type-label,bound-range,value-range,validation-keys}.ts` |
| Crawl rules / builders | `packages/next-data-model/src/building-service/json-schema/` |
| Row visibility (plain) | `packages/next-data-model/src/building-service/json-schema/tree/node-visibility-data/` |
| Row visibility (with diffs) | `packages/next-data-model/src/building-service/json-schema/tree-with-diffs/node-visibility-data/` |
| Hiding unchanged nodes | `packages/next-data-model/src/building-service/json-schema/tree-with-diffs/changed-only/` |
| Viewers | `packages/api-doc-viewer/src/components/JsonSchemaViewer/` |
| Fixture catalogues | `packages/samples/json-schema/README.md`, `packages/samples/json-schema-diffs/README.md` |

## Scope

One JSON Schema document (plain) or one merged `apiDiff` document (with diffs), rendered as a
property tree. Not OpenAPI path navigation. The legacy api-data-model based `JsonSchemaViewer` has been removed and its next-data-model successor (formerly `JsonSchemaNextViewer` / `JsonSchemaNextDiffsViewer`) now owns the name; the
JSON Schema stack also renders AsyncAPI headers, payload and channel parameters.

| Viewer | Props |
| --- | --- |
| `JsonSchemaViewer` | `schema`, `expandedDepth`, `displayMode`, `devMode`, `initialLevel`, `customizationOptions`, `topLevelPropsMediaTypes` |
| `JsonSchemaDiffsViewer` | same except `topLevelPropsMediaTypes`, plus `diffMetaKeys`, `diffTypes` (placeholder — accepted, ignored), `hideUnchangedNodes` (default `true`) |

`customizationOptions.headerRowTitle` replaces the root title; `suppressRootNestingIndicator`
flattens a synthetic wrapper schema into a top-level property list (used by AsyncAPI).

## Pipeline

```text
schema / merged schema
  → JsonSchemaTreeBuilder | JsonSchemaTreeWithDiffsBuilder   (lazy: materializeDepth / expandedDepth)
  → JsonSchemaTree | JsonSchemaTreeWithDiffs
  → JsonSchemaViewer | JsonSchemaDiffsViewer
  → JsonSchemaNodeViewer[WithDiffs] → SchemaNodeViewer[WithDiffs] | CombinerNodeViewer[WithDiffs]
```

Diagrams: [architecture/](architecture/).

## Classification tags

| Tag | Meaning |
| --- | --- |
| **`viewer`** | Shown today. |
| **`ndm-reserved`** | Resolved in next-data-model but not painted; keep for consumers or future UI. |
| **`intentional-gap`** | Product decision — do **not** treat absence as a regression. |
| **`planned`** | Accepted follow-up with a recorded design; not implemented yet. |

## Displayed (plain)

### Title row (`SchemaNodeViewer`)

| UI element | Condition | Source |
| --- | --- | --- |
| Root title | root node | `JsonSchemaNodeTitle.resolveDisplay` + `customizationOptions.headerRowTitle` |
| Property name + required `*` | non-root property required by its parent | `JsonSchemaNodeTitle.resolveDisplay` |
| Structural title badge | `items`, `additionalItems`, `additionalProperties`, `patternProperty` | `JsonSchemaNodeTitle` → `UxBadge` |
| Tuple item index | `item` kind | `[index]` |
| Type subheader | always, except boolean `additionalProperties` | `resolveJsonSchemaTypeLabel(value, meta)` |
| Broken `$ref` label | `meta.brokenRef` | type label shows `$ref: …` |
| **read-only** / **write-only** / **deprecated** tags | meta flags | `TagsWithDiffs` (no diff chrome in plain mode) |
| Circular ref icon | `node.isCycle` | `CircularRefIcon` + tooltip |
| Media type badge | root's direct property whose key is in `topLevelPropsMediaTypes` (plain only) | `UxBadge` `default-outline` — [features/top-level-props-media-types.md](features/top-level-props-media-types.md) |
| Expander | `resolvePlainPropertyIsExpandable`; never on cycle nodes | local React `expanded` state |
| Initial expansion | `expandedDepth` + `LevelContext` level | `resolvePlainPropertyInitiallyExpanded` |

### Nesting-indicator row

A `Properties` / `Items` header row (`NestingIndicatorTitleRow`) precedes a node's children list.
Hidden for the root when `suppressRootNestingIndicator` is set, and for boolean
`additionalProperties`.

### Content rows (detailed display mode only)

Order follows `SchemaNodePlainContent`; visibility comes from `resolvePlainPropertyNodeVisibility`.

| UI element | Condition | Visibility flag |
| --- | --- | --- |
| Deprecation reason | `x-deprecated-reason` in `extensions` | `showDeprecationReasonRow` |
| Description | `description` | `showDescription` |
| Allowed values | non-empty `enum` | `showEnumValuesRow` |
| Default | `default` defined | `showDefaultRow` |
| Examples | non-empty `examples` | `showExamplesRow` |
| Validation rows | at least one validation key for the type | `showValidationsSection` + `JsonSchemaValidationRows.resolve` |
| Allowed additional property names | `propertyNames` / additional-property name constraints | local flag in `SchemaNodePlainContent` |
| Custom annotations | `customAnnotations` on the value (for example AsyncAPI `Location`) | `showCustomAnnotationsRow` |
| Extensions | non-empty `extensions` | `showExtensionsRow` → embedded `JsoViewer` |

Validation row labels: `Value range`, `Value length`, `Value pattern`, `Value multipleOf`,
`Properties count`, `Items count`, `Unique items`. Display rules per row:
[features/validation-rows.md](features/validation-rows.md).

### Structure

| UI element | Condition | Notes |
| --- | --- | --- |
| Property children | materialized at build or on expand | gated by `expanded` and `!node.isCycle` |
| Combiner selector | `oneOf` / `anyOf` / `allOf` with ≥2 branches | `CombinerNodeViewer` → `CombinerSelectorRow` |
| Single combiner branch | exactly one branch | rendered without a selector |
| Nested combiners | combiner inside a combiner branch | one selector row per level (`JsonSchemaCombiner.resolveSelectorLevels`) |
| Extensions embedding | `extensions` object | `JsonSchemaEmbeddingContext` supplies the JSO component (default: `JsoViewer`) |

## Displayed (with diffs)

`JsonSchemaDiffsViewer` renders the same rows in `SIDE_BY_SIDE_DIFFS_LAYOUT_MODE`. All diff
state is precomputed by next-data-model; the viewer reads it through `JsonSchemaRowDiffs`,
`JsonSchemaCombinerSelectorRowResolver`, and `JsonSchemaTypeLabelResolver`.

| Area | What is diffed | Design reference |
| --- | --- | --- |
| Title row | whole-node add/remove/replace, type label segments, required `*`, meta tags | [features/meta-flags-and-required.md](features/meta-flags-and-required.md) |
| Property name (node key) | renamed key (`rename` diff): `beforeKey` / `afterKey` per side, highlighted | [features/node-key-rename.md](features/node-key-rename.md) |
| Nesting-indicator row | whole owner add/remove, uniform children add/remove | [features/nesting-indicator-row-diffs.md](features/nesting-indicator-row-diffs.md) |
| Content rows | description, deprecation reason, default, examples, allowed values, allowed additional property names, custom annotations | per-row `NodeDiffsSeverityPlacemennt` |
| Validation rows | per-row colorizing and per-chip side display | [features/validation-rows.md](features/validation-rows.md) |
| Combiner selector | changed variants, level reduction | `JsonSchemaCombinerSelectorRowResolver` |
| Floating severity badge | one per row, never shared between rows | `NodeDiffsSeverityPlacemennt` |
| Node changes summary | colored markers on a collapsed node (`UxMarkerPanel`) | `nodeDiffsSummary` ∪ `descendantDiffsSummary` |
| Hiding unchanged nodes | runs of unchanged siblings behind `Show N unchanged node(s)` | [features/hiding-unchanged-nodes.md](features/hiding-unchanged-nodes.md) |
| Extensions | diffs continue inside the embedded `JsoDiffsViewer` | [../jso/features/diffs.md](../jso/features/diffs.md) |

## Not displayed

| Item | Tag | Notes |
| --- | --- | --- |
| `const` constraint row | `intentional-gap` | Not requested by consumers; `enum` uses the Allowed values row. |
| Property sort toggle | `intentional-gap` | Legacy `onToggleSort` was not ported. |
| Identity vs. inherited badges for a wholly added property's meta flags | `intentional-gap` | Flags render as plain tags; see [notes/2026-09-architecture-review.md](notes/2026-09-architecture-review.md). |
| Filtering diffs by `diffTypes` (hiding and highlighting) | `planned` | `diffTypes` is an API placeholder with no implementation; all diffs render unfiltered. Hiding part is the planned third visibility mode (see `JsonSchemaDiffsNodesVisibilityMode`). A previous hiding-only implementation was removed: it read row-level helper entries in `node.diffs` (e.g. `nodeChangesSummary`) as diff records and crashed. |

## Triage rules

1. Check a fixture against **Displayed** before filing a bug; items under **Not displayed** are not
   regressions unless a ticket expands scope.
2. New data-layer fields start as `ndm-reserved` and reach the viewer only after product approval.
3. A diff that looks wrong is fixed in the aggregator or resolver first — never re-derived in React.

## Regression coverage

| Suite | Stories | Fixtures |
| --- | ---: | --- |
| `JSON Schema Suite` (types, validations, value range, combiners, circular, description) | 515 | `packages/samples/json-schema/` |
| `JSON Schema Suite (Extensions)` | 13 | `packages/samples/json-schema/extensions/` |
| `JSON Schema Suite (Performance)` | 1 | `packages/samples/json-schema/performance-tests/` |
| `JSON Schema Diffs Suite` | 1148 | `packages/samples/json-schema-diffs/` |
| `JSON Schema Diffs Suite (Extensions)` | 104 | `packages/samples/json-schema-diffs/extensions/` |
| `JSON Schema Diffs Suite (Hiding Unchanged Nodes)` | 18 | `packages/samples/json-schema-diffs/hiding-unchanged-rows/` |
| `JSON Schema Diffs Suite (Node Changes Summary)` | 18 | `packages/samples/json-schema-diffs/node-changes-summary/` |

Every story has a paired screenshot IT under `packages/api-doc-viewer/src/it/`. Generators and
per-case catalogues are listed in the fixture READMEs.

## Related documents

- Architecture diagrams: [architecture/](architecture/)
- Features: [features/](features/)
- Review notes: [notes/](notes/)
- Shared lazy materialization: [../shared/features/lazy-materialization.md](../shared/features/lazy-materialization.md)
