# JSON Schema — viewer, plain

Paths are relative to `packages/api-doc-viewer/src/components/JsonSchemaViewer/`. Abstract
layer: [../../shared/architecture/viewer-plain.md](../../shared/architecture/viewer-plain.md).

```mermaid
flowchart TB
  Root["JsonSchemaViewer.tsx<br/>JsonSchemaTreeBuilder (lazy) · JsonSchemaViewerContext<br/>(expandedDepth · materializeChildren · treeRevision)"]
  Embedding["embedding/JsonSchemaEmbeddingContext<br/>(JSO component for extensions)"]
  Dispatch["JsonSchemaNodeViewer.tsx<br/>Strategy: JsonSchemaCombiner.isOwnerNode(node)"]
  SchemaNode["SchemaNodeViewer/SchemaNodeViewer.tsx"]
  CombinerNode["CombinerNodeViewer/CombinerNodeViewer.tsx"]
  TitleRow["SchemaNodeTitleRow.tsx → SchemaNodeTitleRowBase<br/>+ schema-node-title-row-shared.tsx"]
  Subheader["JsonSchemaTitleSubheader.tsx → TagsWithDiffs (plain tags)"]
  TypeValue["TypeValue/<br/>JsonSchemaTitleRowTypeValue · JsonSchemaNestingIndicatorTypeValue ·<br/>JsonSchemaCombinerOptionTypeValue → JsonSchemaTypeValueText"]
  Content["SchemaNodePlainContent.tsx<br/>description · Allowed values · Default · Examples ·<br/>validation rows · custom annotations · extensions"]
  Extensions["JsonSchemaExtensionsSection.tsx<br/>embedding ExtensionsJsoComponent (default JsoViewer)"]
  SelectorRow["CombinerSelectorRow.tsx → shared Selector"]
  Nesting["shared NestingIndicatorTitleRow"]
  Utils["utils/<br/>JsonSchemaCombiner · JsonSchemaNodeTitle · JsonSchemaNestingLevel ·<br/>JsonSchemaValidationRows · JsonSchemaNodeTypeCheckers"]
  NDM["next-data-model<br/>resolvePlainProperty* · resolvePlainCombinerNodeVisibility ·<br/>resolveJsonSchemaTypeLabel · resolveValidationKeysForType"]

  Root --> Embedding
  Root --> Dispatch
  Dispatch -->|not a combiner owner| SchemaNode
  Dispatch -->|combiner owner| CombinerNode
  SchemaNode --> TitleRow
  SchemaNode --> Content
  SchemaNode --> Nesting
  SchemaNode -->|children| Dispatch
  CombinerNode --> TitleRow
  CombinerNode --> Content
  CombinerNode --> SelectorRow
  CombinerNode --> Nesting
  CombinerNode -->|active leaf children| Dispatch
  TitleRow --> Subheader
  TitleRow --> TypeValue
  Nesting --> TypeValue
  Content --> Extensions
  SchemaNode --> Utils
  CombinerNode --> Utils
  SchemaNode --> NDM
  CombinerNode --> NDM
  Content --> NDM
```
