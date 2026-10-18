# Nesting-indicator row diffs

The nesting-indicator row is the `Properties` / `Items` header (`NestingIndicatorTitleRow`) that a
node renders above its children list. It is a row, not a tree node, so its diff is stored in its
own field (`nestingIndicatorRowColorizingDiff`), never under `NODE_LEVEL_DIFF_KEY`.

## When the row is colored

| Case | Trigger | Row |
| --- | --- | --- |
| Whole node | the owning node, or an ancestor it inherits from, was wholly added / removed | green / red, one side |
| Uniform children | every visible child was added, or every child was removed ([shared rule](../../shared/features/section-header-colorizing.md)) | green / red, one side |
| `type` crosses the childless boundary | `type` changes between a childless type and `object` / `array` | green when the `object` / `array` side is after, red when it is before |
| Other `type` change | `object` ↔ `array`, primitive ↔ primitive, title or format change | yellow replace |

A **childless** type is a primitive (`string`, `number`, `integer`, `boolean`) or one of the
special pseudo-types `any` and `nothing` produced by merging.

## Rendering

- The row's severity badge uses `NodeDiffsSeverityPlacemennt.NestingIndicatorRow` and is built
  from the same diff object that colors the row.
- On the side where the row has no content, the element stays mounted and only its content is
  hidden, so both columns keep their height.
- The row's type-value text is rendered by the same type-value stack as the title row
  (`SchemaNodeViewer/TypeValue/`).
- Inside `CombinerNodeViewer`, the selector row and the active leaf's children share one nesting
  level per side (`JsonSchemaNestingLevel.resolveNextLevelPair`).

## Fixtures

| Case | Fixtures |
| --- | --- |
| Uniform children | `type-changes/object-properties/003`–`008` |
| Whole node | `hiding-unchanged-rows/complex-object/2.6`, `2.7` |
| `type` crossing | `type-changes/type-value-changes/` (for example `004-string-to-array`, `021-array-to-string`); `030-object-to-array` stays yellow |
| `any` / `nothing` crossing | `allOf` combiner diffs `041`, `042`, `053`, `054` |
