# JSON Schema — viewer, with diffs

Paths are relative to `packages/api-doc-viewer/src/components/JsonSchemaViewer/`. Abstract
layer: [../../shared/architecture/viewer-with-diffs.md](../../shared/architecture/viewer-with-diffs.md).

```mermaid
flowchart TB
  RootD["JsonSchemaDiffsViewer.tsx<br/>JsonSchemaTreeWithDiffsBuilder · DiffMetaKeysContext · DiffTypesContext ·<br/>UnchangedBlocksContext · JsonSchemaDiffsNodesVisibilityMode"]
  DispatchD["JsonSchemaNodeViewerWithDiffs.tsx<br/>same Strategy as plain, typed to JsonSchemaTreeNodeWithDiffs"]
  SchemaNodeD["SchemaNodeViewer/SchemaNodeViewerWithDiffs.tsx"]
  CombinerNodeD["CombinerNodeViewer/CombinerNodeViewerWithDiffs.tsx"]
  TitleRowD["SchemaNodeTitleRowWithDiffs.tsx<br/>(shares SchemaNodeTitleRowBase with plain)<br/>+ UxMarkerPanel (node changes summary)"]
  Required["JsonSchemaRequiredDiffIndicator.tsx<br/>JsonSchemaRowDiffs.RequiredStar.isVisibleOnSide"]
  NodeTitleD["JsonSchemaNodeTitleWithDiffs (schema-node-title-row-shared.tsx)<br/>per-side key + textDiff highlight: JsonSchemaRowDiffs.PropertyName"]
  Tags["JsonSchemaTitleSubheaderWithDiffs → TagsWithDiffs<br/>JsonSchemaTitleRowViewProps.buildTagsProps"]
  TypeValueD["TypeValue/*WithDiffs → JsonSchemaTypeValueDiffSegment →<br/>JsonSchemaTypeValueSideDisplay"]
  ContentD["SchemaNodePlainContent.tsx (shared with plain)<br/>per-row diff · colorizingDiff · diffsSeverityPlacement"]
  ChildrenList["SchemaNodeChildrenListWithDiffs.tsx<br/>resolveJsonSchemaUnchangedBlocks → ShowUnchangedRow"]
  NestingD["NestingIndicatorTitleRow<br/>(diff + NestingIndicatorRow severity)"]
  ExtensionsD["JsonSchemaExtensionsSection.tsx<br/>embedding ExtensionsJsoDiffsComponent (default JsoDiffsViewer)"]
  CombinerResolver["next-data-model<br/>JsonSchemaCombinerSelectorRowResolver"]
  RowDiffs["next-data-model<br/>JsonSchemaRowDiffs · JsonSchemaTypeLabelResolver"]

  RootD --> DispatchD
  DispatchD --> SchemaNodeD
  DispatchD --> CombinerNodeD
  SchemaNodeD --> TitleRowD
  SchemaNodeD --> ContentD
  SchemaNodeD --> NestingD
  SchemaNodeD --> ChildrenList
  CombinerNodeD --> TitleRowD
  CombinerNodeD --> ContentD
  CombinerNodeD --> NestingD
  CombinerNodeD --> ChildrenList
  CombinerNodeD --> CombinerResolver
  ChildrenList -->|recurse| DispatchD
  TitleRowD --> NodeTitleD
  NodeTitleD --> Required
  TitleRowD --> Tags
  TitleRowD --> TypeValueD
  NestingD --> TypeValueD
  ContentD --> ExtensionsD
  ContentD --> RowDiffs
  TitleRowD --> RowDiffs
  NestingD --> RowDiffs
```
