# GraphQL (legacy) — data model, plain

**Legacy.** GraphQL does not use `next-data-model`. Its tree comes from the external
`@netcracker/qubership-apihub-api-data-model` package and its expansion state from
`@netcracker/qubership-apihub-api-state-model`. Do not change without explicit approval; do not use
as a pattern for new API types.

```mermaid
flowchart TB
  subgraph EXT_DM["@netcracker/qubership-apihub-api-data-model (external)"]
    CreateTree["createGraphApiTree(source, …, operationType, operationName)"]
    ModelTree["ModelTree&lt;GraphApiNodeData, GraphApiNodeKind, GraphApiNodeMeta&gt;"]
    Kinds["graphApiNodeKind"]
  end

  subgraph EXT_SM["@netcracker/qubership-apihub-api-state-model (external)"]
    State["GraphApiState(tree, expandedDepth)<br/>prop / combiner node states · expansion"]
  end

  subgraph VIEWER["api-doc-viewer"]
    Viewer["GraphQLOperationViewer"]
    Guards["GraphQLOperationViewer/types/nodes.guards.ts<br/>isPropNodeState · isCombinerNodeState"]
  end

  Viewer --> CreateTree
  CreateTree --> ModelTree
  ModelTree --> Kinds
  Viewer --> State
  State --> ModelTree
  Viewer --> Guards
```

Compare with the next stack: [../../shared/architecture/data-model-plain.md](../../shared/architecture/data-model-plain.md).
