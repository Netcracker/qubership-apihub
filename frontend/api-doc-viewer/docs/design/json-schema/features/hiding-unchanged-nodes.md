# Hiding unchanged nodes

JSON Schema application of the shared mechanism in
[../../shared/features/hiding-unchanged-nodes.md](../../shared/features/hiding-unchanged-nodes.md).
Applies only to the with-diffs data model and `JsonSchemaDiffsViewer`
(`hideUnchangedNodes`, default `true`).

| Piece | Location |
| --- | --- |
| Own change signals | `next-data-model/src/building-service/json-schema/tree-with-diffs/changed-only/has-own-change-signals.ts` |
| "Is changed" predicate | `.../changed-only/is-node-changed.ts` (`isJsonSchemaNodeChanged`) |
| Grouping wrapper | `.../changed-only/resolve-json-schema-unchanged-blocks.ts` |
| Initial expansion | `.../node-visibility-data/kind-property-expand.ts` |
| Viewer | `SchemaNodeChildrenListWithDiffs`, `UnchangedBlocksContext`, `JsonSchemaDiffsNodesVisibilityMode` |
| Fixtures | `packages/samples/json-schema-diffs/hiding-unchanged-rows/` |

## When a node is changed

**Simple node** — changed when any of these is non-empty:

1. `diffs`
2. `descendantDiffs`
3. `diffsSummary` or `descendantDiffsSummary`
4. `diffsSeverities`

**Complex node** (combiner owner) — changed when any nested branch is changed, applying the rules
recursively through nested `oneOf` / `anyOf` / `allOf` until simple nodes are reached.

**Recursion** walks `childrenNodes()` of simple nodes and `nestedNodes()` of complex nodes. A cycle
node (`isCycle`) is judged by its own signals only; a node already on the current walk counts as
unchanged.

## Unchanged blocks

A block is a maximal run of consecutive siblings in one `childrenNodes()` list for which the node is
**not** changed.

Example — before: `prop1`, `prop2`, `prop3`, `prop5`; after: `prop1`, `prop2`, `prop4`, `prop5`.
`prop3` (removed) and `prop4` (added) are changed. There are two blocks: `prop1` + `prop2`, and
`prop5`.

## Parent, changed child, unchanged child

Let **A** be a node with descendants **B** (changed) and **C** (unchanged), where B and C are
siblings under A.

- A is changed, because its walk reaches B.
- A and B are visible; C is hidden behind `Show 1 unchanged node` in A's child list.
- B's diff signals never mark C as changed, and never hide A.

Fixture 2.8 maps this to A = `prop2`, B = a changed nested property, C = an unchanged nested sibling.

## Target behaviour

- Each block is replaced by one `Show N unchanged node(s)` row that reveals the block.
- A revealed block stays visible until the page reloads; manual collapse and expand of its
  ancestors does not hide it again.
- With `hideUnchangedNodes`, a node is initially expanded when it is the root or is changed —
  regardless of `expandedDepth` — so paths to changes open automatically. Cycle nodes stay
  collapsed.
- Combiners: grouping runs over the selected branch's children; the selector row is always
  visible and branches are never hidden.

## Constraints

- View state (revealed blocks, expansion) lives in React state only.
- The predicate must not rely on children that are not materialized; descendant information comes
  from `aggregatedDiffsMetaKey` (see
  [../../shared/features/lazy-materialization.md](../../shared/features/lazy-materialization.md)).
- A node's own follow-on rows (description, validation rows) are never hidden — hiding is per node.
