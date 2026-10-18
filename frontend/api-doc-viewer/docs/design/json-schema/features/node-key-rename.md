# Node key rename

How a renamed property key — a `rename` diff on the node itself — is shown in the title row of
`JsonSchemaDiffsViewer`. Status: implemented.

## Source of the diff

`apiDiff` never produces this diff for a JSON Schema document: the JSON Schema object mapping pairs
equal keys only, so a property whose key changed is a `remove` of the old key plus an `add` of the
new one. A `rename` reaches the viewer only from a consumer that **synthesizes** a schema from
another structure, for example one property per OpenAPI path parameter, where a path parameter's
`name` change (`apiDiff` maps path parameters by their position in the path template) is mapped
to a rename of the property key.

### Diff shape

| Field | Value |
| --- | --- |
| Location | the parent's `properties` diff record, keyed by the property's **after** key |
| `action` | `rename` |
| `beforeKey` / `afterKey` | the property key before / after |
| `type`, declaration paths | as for any other diff |

The merged schema itself contains only the after key. In the tree the diff arrives through the
parent's `nodeDescendantDiffs[nodeKey]` and is stored under `NODE_LEVEL_DIFF_KEY` of the property.

## With diffs

| Element | Rule |
| --- | --- |
| Property name | each side shows its own key — `beforeKey` on the origin side, `afterKey` on the changed side — highlighted yellow (`JsonSchemaRowDiffs.PropertyName.resolveSideText`) |
| Title row | yellow replace background on both sides |
| Required `*`, tags, type label | unchanged rules; their own diffs apply on top of the rename |
| Content rows and children | shown on both sides — a renamed key is the same node, not a removed and an added one |
| Description and other content rows | **not** painted by the rename: no background, no floating badge — only their own diffs apply (e.g. a description replace) |
| Floating badge | title row only (from the title-row diff) |

### Title-row priority

A rename ranks right after whole-node add / remove and before every field-level change: meta
flags, required status, and type-label field diffs. The full order is in
[meta-flags-and-required.md](meta-flags-and-required.md#title-row-priority).

### Data model contract

- `node-descendant-diffs/kind-any.ts` styles a `rename` with content and header **visible** on both
  sides and a yellow text highlighter. The background color is left to the title-row diff.
  (A whole-node `replace` there hides content, which must not apply to a rename.)
- `node-diffs/kind-any.ts` does **not** return early for an inherited `rename` the way it does for
  an inherited add / remove: the renamed node's own field diffs (type label, flags, validation
  rows, …) are still aggregated. A primitive (boolean) property schema keeps the rename too.
- `asReplaceRowColorizingDiff` treats a `rename` like a `replace`; both title-row aggregators
  (`aggregateTitleRowDiff`, `aggregatePropertyTitleRowDiff`) use it for a renamed node.
- The rename lives under `NODE_LEVEL_DIFF_KEY`, but it is **not** a whole-node diff. Consumers that
  paint every row of the node from the node-level diff read
  `JsonSchemaRowDiffs.NodeLevel.takeWholeNodeDiff` (node-level diff except a `rename`) instead of
  `node.diffs[NODE_LEVEL_DIFF_KEY]`: the description row (`JsonSchemaRowDiffs.Description.takeRowDiff`),
  the `required` tag (`JsonSchemaTitleRowViewProps.buildTagsProps`), and the severities aggregator
  (`node-diffs-severities/kind-any.ts`), which badges a rename on the title row only, `causedAt` =
  the before declaration path.

## Plain

No change: `JsonSchemaViewer` shows the node key (`JsonSchemaNodeTitle.resolveDisplay`).

## Not displayed

- Renames of non-property keys (combiner branches, tuple items) — no producer exists.

## Regression coverage

- Data layer: `packages/next-data-model/tests/unit-tests/json-schema-property-rename-diffs.test.ts`
  builds a merged schema with the diff shape above.
- Storybook / screenshot ITs: `JSON Schema Diffs Suite/Property Rename`
  (`packages/samples/json-schema-diffs/property-rename/`). JSON Schema fixtures cannot express the
  diff, so the fixtures are OpenAPI documents with a renamed **path** parameter; the stories merge
  them with `apiDiff` and synthesize the parameters schema (one property per parameter, `name`
  replace → property `rename`). Catalogue: `packages/samples/json-schema-diffs/property-rename/README.md`.

## Related documents

- [meta-flags-and-required.md](meta-flags-and-required.md) — title-row priority
- [../display-coverage.md](../display-coverage.md)
- Shared node-diffs record: [../../shared/architecture/data-model-with-diffs.md](../../shared/architecture/data-model-with-diffs.md)
