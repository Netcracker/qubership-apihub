# JSON Schema — data model, plain

Paths are relative to `packages/next-data-model/src/`. Abstract layer:
[../../shared/architecture/data-model-plain.md](../../shared/architecture/data-model-plain.md).

```mermaid
flowchart TB
  subgraph ABS["Abstract (shared)"]
    TreeBuilderAbs["TreeBuilder"]
    NodeDataBuilderAbs["AbstractNodeDataBuilder"]
    LazyAbs["LazyMaterializationState · AncestorsRegistry"]
    NodesAbs["SimpleTreeNode · ComplexTreeNode"]
  end

  subgraph SHARED["shared/json-schema"]
    Guards["guards/schema-value.ts · guards/tree-node.ts<br/>primitive / special (any, nothing) types, required property"]
    HasOwnChildren["has-own-children.ts<br/>jsonSchemaHasOwnChildren()"]
    AddProps["additional-properties-node-value.ts"]
    Keys["types/extension-key.ts · node-value-property-key.ts · tree-builder-params.ts"]
  end

  subgraph MODEL["model/json-schema"]
    Kinds["types/node-kind.ts<br/>root · definition · property · additionalProperties · patternProperty ·<br/>items · item · additionalItems · allOf · anyOf · oneOf"]
    Values["types/node-value.ts · node-value-type.ts · node-meta.ts · validation-key.ts"]
    TypeLabel["type-label.ts<br/>resolveJsonSchemaTypeLabel"]
    Ranges["bound-range.ts · value-range.ts · json-schema-bound-range-dialect.ts"]
    ValidationKeys["validation-keys.ts<br/>resolveValidationKeysForType · resolveJsonSchemaValidationFieldsView"]
    TreeImpl["tree/tree.impl.ts · JsonSchemaTree"]
  end

  subgraph BS["building-service/json-schema"]
    Builder["tree/builder.ts<br/>JsonSchemaTreeBuilder<br/>build() · materializeChildren()"]
    Hooks["tree/building-hooks.ts<br/>createJsonSchemaTreeBuildingHooks"]
    Rules["json-crawl-entities/rules/rules.ts<br/>getJsonSchemaCrawlRules(kind)"]
    Transformers["json-crawl-entities/transformers/<br/>transform-example · transform-extensions"]
    NodeData["tree/node-data/builder.ts<br/>JsonSchemaNodeDataBuilder"]
    VisProperty["tree/node-visibility-data/kind-property.ts<br/>PlainPropertyNodeVisibilityManager<br/>(visibility · expandability · initial expansion · list-last-row flags)"]
    VisCombiner["tree/node-visibility-data/kind-combiner.ts<br/>PlainCombinerNodeVisibilityManager"]
  end

  TreeBuilderAbs -->|extends| Builder
  NodeDataBuilderAbs -->|extends| NodeData
  Builder --> LazyAbs
  Builder --> Hooks
  Builder --> Rules
  Rules --> Transformers
  Rules --> Kinds
  Builder --> NodeData
  Builder --> TreeImpl
  Builder --> HasOwnChildren
  TreeImpl --> NodesAbs
  NodeData --> Values
  NodeData --> AddProps
  VisProperty --> ValidationKeys
  VisProperty --> Guards
  VisCombiner --> Guards
  ValidationKeys --> Values
  TypeLabel --> Values
  Ranges --> Values
  Values --> Keys
```
