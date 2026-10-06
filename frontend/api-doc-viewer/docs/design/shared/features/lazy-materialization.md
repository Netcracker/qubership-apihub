# Lazy materialization

Tree builders may stop crawling at a depth budget and build the rest of a subtree on demand.
Used by the JSON Schema and JSO builders; AsyncAPI and DDL build eagerly.

| Piece | Location |
| --- | --- |
| Deferred work, fragments, node ids, ancestor rebuild | `packages/next-data-model/src/building-service/abstract/tree/lazy-materialization.ts` |
| Path-local ancestor registry | `packages/next-data-model/src/building-service/abstract/json-crawl-entities/state/ancestors-registry.ts` |
| JSON Schema entry point | `JsonSchemaTreeBuilder.materializeChildren(node, depth)` |
| Viewer trigger | `JsonSchemaViewerContext.materializeChildren` (called on expand and on combiner branch change) |

## Principles

1. **Deferred work lives on the builder.** A deferred subtree is a flat record
   `PendingSubtree { nodeId, fragment, path, rules }` in `LazyMaterializationState.pending`; raw
   fragments are kept in `fragments`. Crawl hooks are created once per `build()` and reused.
2. **Ancestors are path-local.** The cycle guard stays. One `AncestorsRegistry` per crawl is entered
   on node creation and left in the crawl `exitHook`, so it always holds exactly the values on the
   current path. When a subtree is materialized later, the registry is rebuilt from the tree with
   `collectAncestorsFromTree`, walking `container ?? parent` from the node to the root.
3. **Expandability without building.** A simple node is expandable when its fragment has own
   children (`jsonSchemaHasOwnChildren`, `defaultObjectTreeHasOwnChildren`); combiner owners
   delegate to their branches.
4. **Materialization is monotonic.** `materializeChildren` removes the pending record before
   crawling, so a second call is a no-op. There is no destructive collapse: collapsed state is React
   state, the model never rolls back, and `tree.nodes` never holds two objects for one id.
5. **One node id derivation.** `buildNodeId(pathPrefix, path)` is the only id source. A full crawl
   uses an empty prefix; a resumed crawl passes the node's absolute path, so ids match an eager build.
6. **Stop only on simple nodes.** Depth grows only on nodes that open a new data level, so
   `materializeDepth` matches the public `expandedDepth` and the model's `depth` getter.

## Consequences for diffs

Summaries in a with-diffs tree must not depend on children that are not built yet. Descendant
diff information for unbuilt subtrees is read downward from `aggregatedDiffsMetaKey` in the merged
document, never bubbled up from children. Cycle clones receive no diffs of their own.
