# Section header colorizing

Rule for the header row above a list of children — `Properties` / `Items` / `Extensions` in
JSON Schema, `Columns` / `Indexes` in DDL API, `Address Parameters` / `Bindings` / `Servers` /
`Extensions` in AsyncAPI.

## Rule

A section header may be painted **wholly added** or **wholly removed** only when:

- **(a)** the owning node itself, or an ancestor it inherits from, was wholly added or removed; or
- **(b)** the owning node was not wholly added or removed, but **every** child is uniformly added,
  or **every** child is uniformly removed.

Any partial or mixed set — including one unchanged child next to otherwise uniform changes — leaves
the header uncolored (or yellow, where an API type uses yellow for partial changes).

**Full coverage** means comparing the number of children that carry a diff with the **total**
number of children on the merged node. An unchanged child has no diff record, so a check that only
inspects diff records cannot see it.

The header's severity badge is built from the **same** diff object that colors the row.

## Implementations

| API type | Section | Aggregator | Status |
| --- | --- | --- | --- |
| JSON Schema | Properties / Items | `node-diffs/kind-any.ts` → `aggregateNestingIndicatorRowColorizingDiff` | implemented |
| JSON Schema | Extensions | `node-diffs/kind-any.ts` → `aggregateExtensionsUniformRowColorizingDiff` | implemented |
| JSON Schema | enum / examples / allowed additional property names rows | `node-diffs/kind-property.ts` → `aggregateListRowColorizingDiff` | implemented |
| DDL API | Columns / Indexes | `shared/property-list-section-diff-utils.ts` → `aggregateUniformWholeNodeDescendantDiff` | implemented |
| AsyncAPI | Address Parameters | `node-diffs/kind-parameters.ts` | implemented |
| AsyncAPI | Bindings | `node-diffs/kind-bindings.ts` (partial set → yellow replace) | implemented |
| AsyncAPI | Servers | `node-diffs/kind-servers.ts` | implemented |
| AsyncAPI | Extensions | `node-diffs/kind-extensions.ts` | implemented |
| JSO | property children | — | rule (a) only; rule (b) is not implemented |
