# Hiding unchanged nodes

JSO application of the shared mechanism in
[../../shared/features/hiding-unchanged-nodes.md](../../shared/features/hiding-unchanged-nodes.md),
following the JSON Schema rules
([../../json-schema/features/hiding-unchanged-nodes.md](../../json-schema/features/hiding-unchanged-nodes.md)).
Applies only to `JsoDiffsViewer`. The plain `JsoViewer` has no diffs, so nothing is hidden there.

| Piece | Location |
| --- | --- |
| Own change signals (shared with JSON Schema) | `next-data-model/src/model/abstract/tree-with-diffs/changed-only/has-own-change-signals.ts` |
| "Is changed" predicate | `next-data-model/src/building-service/jso/tree-with-diffs/changed-only/is-node-changed.ts` (`isJsoNodeChanged`) |
| Grouping wrapper | `.../changed-only/resolve-jso-unchanged-blocks.ts` (`resolveJsoUnchangedBlocks`) |
| Viewer | `JsoPropertyChildrenListWithDiffs` (top level and every property's children); shared `ShowUnchangedRow`, `UnchangedBlocksContext` |
| Fixtures | `packages/samples/jso-diffs/hiding-unchanged-nodes/` |

## When a node is changed

A JSO node is changed when any of its own diff fields is non-empty — `diffs`, `descendantDiffs`,
`diffsSummary`, `descendantDiffsSummary`, `diffsSeverities` — or when any node in
`childrenNodes()` is changed (recursively). A cycle clone is judged by its own signals only; a node
already on the current walk counts as unchanged.

Consequences of the JSO diff contract ([diffs.md](diffs.md)):

- Children of a wholly added / removed value, or of a primitive ↔ complex replace, inherit the
  parent's `diffs[""]`, so the whole subtree is changed and shown.
- Array items are compared by position: an insertion in the middle changes every following item.

## Behaviour

| Rule | Detail |
| --- | --- |
| Prop | `JsoDiffsViewer.hideUnchangedNodes`. Explicit value wins; omitted → the host diffs viewer's mode (`UnchangedBlocksContext` of `JsonSchemaDiffsViewer` / `OpenApiOperationDiffsViewer`); no host → `true`. |
| Blocks | Every sibling list — the top-level properties and each property's children — groups each run of unchanged properties into one `Show N unchanged nodes` row. |
| Changed nodes | Visible and expanded (JSO expands every node), so the path to each change is open. |
| Fully unchanged document | One `⋯` row: JSO renders no root row. |
| Revealed blocks | Shown expanded, with their whole subtrees; no nested `⋯` rows (rule 1 of the shared mechanism). Revealed ids live in the `JsoDiffsViewer`'s own `UnchangedBlocksContext` — only the mode follows the host, because JSO node ids repeat across embedded trees. |
| Embedded JSON Schema (`supportJsonSchema`) | The JSO mode is forwarded as the schema viewer's `hideUnchangedNodes`. |
| Collapsed changed node | Unchanged: the title row shows the diff markers (`UxMarkerPanel`). |

## Embedding

| Host | Mode |
| --- | --- |
| Standalone `JsoDiffsViewer` | `hideUnchangedNodes`, default `true` |
| JSON Schema `Extensions` section (`DefaultExtensionsJsoDiffsComponent`) | the `JsonSchemaDiffsViewer`'s mode |
| OpenAPI `Extensions` section (`ExtensionsSectionContent`) | the `OpenApiOperationDiffsViewer`'s mode |
| AsyncAPI bindings and `Extensions` sections | `false` — AsyncAPI does not hide unchanged nodes yet. A JSON Schema inside a binding gets `false` too; a JSON Schema in a message payload keeps its own viewer's mode, and its extensions follow it. |

## Fixtures and tests

Catalogue: [packages/samples/jso-diffs/hiding-unchanged-nodes/README.md](../../../../packages/samples/jso-diffs/hiding-unchanged-nodes/README.md).

| Layer | Location |
| --- | --- |
| Unit tests | `packages/next-data-model/tests/unit-tests/jso-changed-only.test.ts` |
| Stories | `JSO Diffs Suite (Hiding Unchanged Nodes)/{Root Level, Second Level, Nested}` — `src/stories/jso-diffs-hiding-unchanged-nodes-suite/` (control `hideUnchangedNodes`, default `true`) |
| Screenshot ITs | `src/it/jso-diffs-hiding-unchanged-nodes-suite/<group>.it-test.ts` — every case collapsed, plus a `revealed` capture of every case with a `⋯` row |

The property suites (`JSO Diffs Suite`) pin `hideUnchangedNodes: false` (story control), so they
keep showing every row.
