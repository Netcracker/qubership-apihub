# GraphQL (legacy) — data model, with diffs

**Legacy.** Diffs are rolled up by `api-diff` and attached to an external diff tree; the viewer
passes the result to the state model with a type assertion.

```mermaid
flowchart TB
  subgraph EXT_DIFF["@netcracker/qubership-apihub-api-diff (external)"]
    Rollup["aggregateDiffsWithRollup(source, diffsMetaKey, aggregatedDiffsMetaKey)"]
  end

  subgraph EXT_DM["@netcracker/qubership-apihub-api-data-model (external)"]
    CreateDiffTree["createGraphApiDiffTree(…)"]
    DiffMeta["DiffNodeMeta · DiffMetaKeys"]
  end

  subgraph EXT_SM["@netcracker/qubership-apihub-api-state-model (external)"]
    State["GraphApiState(tree, expandedDepth)"]
  end

  Viewer["GraphQLOperationDiffViewer"]

  Viewer --> Rollup
  Viewer --> CreateDiffTree
  CreateDiffTree --> DiffMeta
  Viewer --> State
```

Node-level changes travel as `$`-prefixed legacy change objects (`$nodeChange`, `$metaChanges`,
`$valueChanges`). This convention must not be copied into the next stack.
