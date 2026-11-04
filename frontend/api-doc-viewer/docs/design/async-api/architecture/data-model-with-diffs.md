# AsyncAPI — data model, with diffs

Paths are relative to `packages/next-data-model/src/`. Abstract layer:
[../../shared/architecture/data-model-with-diffs.md](../../shared/architecture/data-model-with-diffs.md).

```mermaid
flowchart TB
  subgraph ABS["Abstract (shared)"]
    AggAbs["Abstract*Aggregator (5 families)"]
    Aggregated["aggregatedDiffsMetaKey rollup<br/>(merged document)"]
    NodesDAbs["SimpleTreeNodeWithDiffs · ComplexTreeNodeWithDiffs"]
  end

  subgraph PLAIN["Plain stack (data-model-plain.md)"]
    Builder["AsyncApiTreeBuilder"]
    NodeData["AsyncApiNodeDataBuilder"]
    Transformer["AsyncApiSpecTransformer"]
  end

  subgraph BSD["building-service/async-api"]
    TransformerD["shared/async-api-spec-with-diffs-transformer.ts<br/>AsyncApiSpecWithDiffsTransformer"]
    BuilderD["tree-with-diffs/builder.ts<br/>AsyncApiTreeWithDiffsBuilder · assignNodeDiffs"]
    NodeDataD["tree-with-diffs/node-data/builder.ts<br/>AsyncApiNodeDataWithDiffsBuilder"]
    subgraph AGG["tree-with-diffs/node-diffs-data — Factory + Strategy"]
      Diffs["node-diffs/<br/>KindAny · KindMessage · KindServer · KindServers ·<br/>KindBinding · KindBindings · KindParameters · KindExtensions"]
      DescDiffs["node-descendant-diffs/<br/>KindAny · KindBindings · KindMessageContent · KindServers"]
      DescSummary["node-descendant-diffs-summary/<br/>KindAny · KindBinding · KindChannel · KindMessageContent · KindOperation<br/>(forward aggregators across tree boundaries)"]
      Summary["node-diffs-summary/KindAny"]
      Severities["node-diffs-severities/KindAny<br/>title · description · summary · address ·<br/>server-address · binding-version rows"]
      SecurityAgg["security kinds (each factory: isSecurityTreeNodeKind)<br/>→ ASYNC_API_SECURITY_NODE_AGGREGATORS (typed RecordDrivenAggregatorRegistry from SECURITY_AGGREGATION_TABLES, record-driven, shared with OpenAPI)"]
    end
    SecurityBuilderD["shared/async-api-security-spec-with-diffs-builder.ts<br/>AsyncApiSecuritySpecWithDiffsBuilder + SecuritySpecDiffsDecorator"]
  end

  subgraph MODELD["model/async-api/tree-with-diffs"]
    TreeD["tree.impl.ts · AsyncApiTreeWithDiffs"]
  end

  Builder -->|extends| BuilderD
  NodeData -->|extends| NodeDataD
  Transformer -->|extends| TransformerD
  BuilderD --> TransformerD
  BuilderD --> NodeDataD
  BuilderD --> Diffs
  BuilderD --> DescDiffs
  BuilderD --> DescSummary
  BuilderD --> Summary
  BuilderD --> Severities
  Diffs -->|extend| AggAbs
  DescSummary --> Aggregated
  BuilderD --> TreeD
  BuilderD --> SecurityAgg
  TransformerD --> SecurityBuilderD
  TreeD --> NodesDAbs
```

## Notes

- Bindings, extensions, headers, payload, and parameters are separate trees in the viewer. The
  forward descendant-summary aggregators read `aggregatedDiffsMetaKey` from the merged document so
  that changes inside those trees still mark their AsyncAPI ancestors.
- Security sections: the with-diffs builder prepares diff records (list items by index, the
  section's own whole add / remove under `''`); record-driven aggregators map them to rows.
  Design: [../features/security.md](../features/security.md).
- Section headers (`Address Parameters`, `Bindings`, `Servers`, `Extensions`) follow
  [../../shared/features/section-header-colorizing.md](../../shared/features/section-header-colorizing.md).
