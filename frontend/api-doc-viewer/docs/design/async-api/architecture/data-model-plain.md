# AsyncAPI — data model, plain

Paths are relative to `packages/next-data-model/src/`. Abstract layer:
[../../shared/architecture/data-model-plain.md](../../shared/architecture/data-model-plain.md).

```mermaid
flowchart TB
  subgraph ABS["Abstract (shared)"]
    TreeBuilderAbs["TreeBuilder"]
    NodeDataBuilderAbs["AbstractNodeDataBuilder"]
    HooksAbs["createTreeBuildingHooks · CommonState"]
    NodesAbs["SimpleTreeNode · ComplexTreeNode"]
  end

  subgraph SHARED["shared/async-api"]
    OperationKeys["types/operation-keys.ts · OperationKeys"]
    Params["types/tree-builder-params.ts"]
    Guards["guards/tree-node.ts"]
  end

  subgraph MODEL["model/async-api"]
    Kinds["types/node-kind.ts<br/>message · messageSectionSelector · messageContent · messageHeaders · messagePayload ·<br/>channel · channelParameters · servers · server · operation · bindings · binding · extensions"]
    Values["types/node-value.ts · node-meta.ts · node-value-type.ts"]
    TreeImpl["tree/{tree,simple-node,complex-node}.impl.ts · AsyncApiTree"]
  end

  subgraph BS["building-service/async-api"]
    Transformer["shared/async-api-spec-transformer.ts<br/>AsyncApiSpecTransformer<br/>operation-oriented document → message-oriented spec<br/>(operationKeysOrDefaults · parameters → JSON Schema)"]
    Builder["tree/builder.ts · AsyncApiTreeBuilder"]
    Hooks["tree/building-hooks.ts · createAsyncApiTreeBuildingHooks"]
    Rules["json-crawl-entities/rules/rules.ts · getAsyncApiCrawlRules(kind)"]
    Transformers["json-crawl-entities/transformers/<br/>lift-address · default-channel-address · rename-message-params ·<br/>unify-params-with-schema · inline-binding-params · collect-raw-values"]
    NodeData["tree/node-data/builder.ts · AsyncApiNodeDataBuilder"]
  end

  TreeBuilderAbs -->|extends| Builder
  NodeDataBuilderAbs -->|extends| NodeData
  Builder --> Params
  Params --> OperationKeys
  Builder --> Transformer
  Builder --> Hooks
  Hooks --> HooksAbs
  Builder --> Rules
  Rules --> Transformers
  Rules --> Kinds
  Builder --> NodeData
  NodeData --> Values
  Builder --> TreeImpl
  TreeImpl --> NodesAbs
  Guards --> Kinds
```

## Notes

- The tree root is the **message**; the section selector groups `messageContent`, `channel`, and
  `operation`.
- Headers, payload, and channel parameters keep raw schemas; bindings and extensions keep raw
  values. Nested trees for them are built by the JSON Schema and JSO builders inside the viewer.
- Row visibility is not in the data model yet (`shouldBeDisplayed` lives in the viewer).
