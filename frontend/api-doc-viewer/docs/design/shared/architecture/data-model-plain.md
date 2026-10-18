# Data model — plain (abstract)

The API-type-agnostic layer of `next-data-model` that every plain tree builder extends. API-type
diagrams attach their classes to the nodes in the **Abstract** subgraph.

```mermaid
flowchart TB
  subgraph ABS_BS["building-service/abstract"]
    TreeBuilder["tree/builder.ts<br/>TreeBuilder&lt;V, K, M&gt;<br/>build() · createTree() · createNodeFromRaw()"]
    NodeDataBuilder["tree/node-data/builder.ts<br/>AbstractNodeDataBuilder"]
    Hooks["json-crawl-entities/hooks/builder.ts<br/>createTreeBuildingHooks()"]
    State["json-crawl-entities/state/<br/>CommonState · AncestorsRegistry"]
    Lazy["tree/lazy-materialization.ts<br/>LazyMaterializationState · buildNodeId()"]
  end

  subgraph ABS_MODEL["model/abstract"]
    Tree["tree/tree.impl.ts<br/>Tree · ITree"]
    Nodes["tree/{simple,complex}-node.impl.ts<br/>SimpleTreeNode · ComplexTreeNode · ITreeNode"]
    Modes["display-mode.ts · layout-side.ts<br/>DisplayMode · LayoutSide"]
  end

  subgraph SPEC["API type (async-api · ddlapi · jso · json-schema)"]
    SpecTransformer["shared/&lt;spec&gt;-spec-transformer.ts<br/>&lt;Spec&gt;SpecTransformer<br/>(document → viewer-oriented spec)"]
    SpecBuilder["tree/builder.ts<br/>&lt;Spec&gt;TreeBuilder"]
    SpecNodeData["tree/node-data/builder.ts<br/>&lt;Spec&gt;NodeDataBuilder"]
    SpecRules["json-crawl-entities/rules/<br/>get&lt;Spec&gt;CrawlRules(kind)"]
    SpecTransformers["json-crawl-entities/transformers/<br/>(json-crawl hook functions)"]
    SpecVisibility["tree/node-visibility-data/<br/>&lt;Spec&gt;NodeVisibilityManagerKind*"]
    SpecModel["model/&lt;spec&gt;/types/<br/>node-kind · node-value · node-meta"]
  end

  TreeBuilder -->|extends| SpecBuilder
  NodeDataBuilder -->|extends| SpecNodeData
  SpecBuilder --> SpecTransformer
  SpecBuilder --> Hooks
  Hooks --> State
  SpecBuilder -.->|json-schema, jso| Lazy
  SpecBuilder --> SpecRules
  SpecRules --> SpecTransformers
  SpecBuilder --> SpecNodeData
  SpecBuilder --> Tree
  Tree --> Nodes
  SpecNodeData --> SpecModel
  SpecVisibility --> SpecModel
  SpecVisibility --> Modes
```

## Notes

- Node dispatch is driven by two brand fields: `type` (simple / complex) and `kind` (API-type
  specific). Kind-specific logic is a Strategy selected by kind.
- Row visibility for plain rendering belongs in `node-visibility-data/` managers; AsyncAPI still
  keeps it in the viewer (`shouldBeDisplayed`).
- Lazy materialization: [../features/lazy-materialization.md](../features/lazy-materialization.md).
