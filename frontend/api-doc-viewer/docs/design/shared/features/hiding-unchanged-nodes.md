# Hiding unchanged nodes

In with-diffs viewers, consecutive siblings that carry no change are collapsed behind one
`Show N unchanged node(s)` row. This document holds the API-type-agnostic mechanism; each API type
defines its own "is changed" predicate.

| API type | Status | Design |
| --- | --- | --- |
| JSON Schema | implemented | [../../json-schema/features/hiding-unchanged-nodes.md](../../json-schema/features/hiding-unchanged-nodes.md) |
| AsyncAPI, DDL API, JSO | not implemented | — |

## Mechanism

| Piece | Location | Role |
| --- | --- | --- |
| `resolveUnchangedBlocks(children, isChanged, hideUnchangedNodes)` | `next-data-model/src/model/abstract/tree-with-diffs/changed-only/resolve-unchanged-blocks.ts` | Pure grouping over one sibling list |
| `UnchangedBlockMembership` | same | `visible`, or hidden with `unchangedBlockId`, `isBlockStart`, `blockSize` |
| `UnchangedVisibleItem` | same | The visible sequence: nodes plus one placeholder per block |
| `ShowUnchangedRow` | `api-doc-viewer/src/components/shared-components/ShowUnchangedRow/` | Placeholder row with the reveal control |

## Rules

1. **Grouping is a pure function of one sibling list.** Blocks form at the shallowest level: a wholly
   unchanged subtree is one member of its parent's block; its own children are never grouped.
   Therefore nested reveal buttons cannot appear.
2. **Block ids are derived, not stored.** `unchangedBlockId` is the id of the block's first node.
   Node ids are path-based, so the id is stable and globally unique. Nothing is baked into the tree
   at build time, because block boundaries depend on view state (mode, filters, selected combiner
   branch).
3. **Revealed blocks stay revealed.** The viewer keeps revealed ids in a flat `Set` above node
   collapse state, so collapsing and re-expanding a parent does not hide a block again.
4. **Position flags come from the visible sequence.** `isLastInList` and `precededBy` are computed
   from `visibleSequence`, where a trailing placeholder is the last item — never from the raw
   children list.
5. **Hiding is per whole row.** The placeholder is one row across both columns in side-by-side
   layout; hiding never applies to one side only.
6. **A fully unchanged document shows one button** under the root; the root's own rows stay
   visible.
