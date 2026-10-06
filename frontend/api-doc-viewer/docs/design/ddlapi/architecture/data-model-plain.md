# DDL API — data model, plain

Paths are relative to `packages/next-data-model/src/`. Abstract layer:
[../../shared/architecture/data-model-plain.md](../../shared/architecture/data-model-plain.md).

```mermaid
flowchart TB
  subgraph EXT["qubership-apihub-ddlapi"]
    Realm["Realm → Schema → Table<br/>Column · Index · ForeignKey · SchemaType · Attr · Expr"]
  end

  subgraph ABS["Abstract (shared)"]
    TreeBuilderAbs["TreeBuilder"]
    NodeDataBuilderAbs["AbstractNodeDataBuilder"]
    NodesAbs["SimpleTreeNode · ComplexTreeNode"]
    Modes["DisplayMode"]
  end

  subgraph SHARED["shared/ddlapi"]
    Guards["guards/<br/>schema-type · column-type-name · expr · tree-node"]
    FormatExpr["format-ddl-expr.ts"]
    IndexTitle["index-title.ts<br/>resolveIndexTitle (&lt;unnamed&gt;)"]
    TableKey["types/table-key.ts · navigation-link-builder.ts · tree-builder-params.ts"]
  end

  subgraph MODEL["model/ddlapi"]
    Kinds["types/node-kind.ts<br/>table · columns · column · indexes · index"]
    Values["tree/node-value.ts<br/>DdlApiTableRowValue · DdlApiColumnRowValue ·<br/>DdlApiIndexRowValue · DdlApiColumnTypeValue"]
    TreeImpl["tree/{tree,simple-node,complex-node}.impl.ts · DdlApiTree"]
    VisPublic["tree/node-visibility/kind-{column,index}.ts (public accessors)"]
  end

  subgraph BS["building-service/ddlapi"]
    Transformer["shared/ddlapi-spec-transformer.ts<br/>DdlApiSpecTransformer<br/>Realm + TableKey → table-oriented spec"]
    Builder["tree/builder.ts · DdlApiTreeBuilder"]
    Hooks["tree/building-hooks.ts"]
    Rules["json-crawl-entities/rules/rules.ts · getDdlApiCrawlRules(kind)"]
    NodeData["tree/node-data/builder.ts · DdlApiNodeDataBuilder"]
    Vis["tree/node-visibility-data/<br/>DdlApiNodeVisibilityManagerKindColumn · KindIndex"]
    VisTypes["node-visibility-data/types.ts<br/>row visibility · list-last-row flags"]
  end

  Realm --> Transformer
  TreeBuilderAbs -->|extends| Builder
  NodeDataBuilderAbs -->|extends| NodeData
  Builder --> TableKey
  Builder --> Transformer
  Transformer --> FormatExpr
  Transformer --> IndexTitle
  Transformer --> Guards
  Transformer --> Values
  Builder --> Hooks
  Builder --> Rules
  Rules --> Kinds
  Builder --> NodeData
  Builder --> TreeImpl
  TreeImpl --> NodesAbs
  VisPublic --> Vis
  Vis --> VisTypes
  Vis --> Modes
  Vis --> Values
```

## Notes

- The transformer does all ddlapi interpretation (badges, FK targets, type labels, formatted
  expressions); the tree only reshapes the table-oriented spec into nodes.
- Row visibility and list-last-row flags come from the visibility managers, not from JSX.
