# DDL API — viewer, with diffs

Paths are relative to `packages/api-doc-viewer/src/components/DdlTableViewer/`. Abstract layer:
[../../shared/architecture/viewer-with-diffs.md](../../shared/architecture/viewer-with-diffs.md).

```mermaid
flowchart TB
  RootD["DdlTableDiffsViewer.tsx<br/>DdlApiTreeWithDiffsBuilder · DiffMetaKeysContext · DiffTypesContext ·<br/>LayoutModeContext (SIDE_BY_SIDE_DIFFS)"]
  TableD["TableNodeViewerWithDiffs.tsx<br/>whole table · schema name · description"]
  SchemaD["DdlSchemaNameBlock/DdlSchemaNameBlockWithDiffs.tsx"]
  Columns["ColumnsNodeViewer.tsx (with-diffs branch)<br/>uniform section colorizing"]
  ColumnD["ColumnNodeViewerWithDiffs.tsx<br/>title row · description · Values · Default · As"]
  TypeLabelD["ColumnTypeLabelWithDiffs/ColumnTypeLabelWithDiffs.tsx"]
  Badges["ColumnRowBadges/ColumnRowBadgesContent.tsx<br/>BadgeWithDiffs per flag and FK target"]
  Indexes["IndexesNodeViewer.tsx (with-diffs branch)"]
  IndexD["IndexNodeViewerWithDiffs.tsx<br/>title · part names · unique · description"]
  Utils["utils/ddlapi/<br/>node-level-diff.ts (buildDdlPropertyTitleRowDiffProps · buildDdlTableTitleRowDiffProps) ·<br/>column-row-badges.ts (takeColumnFlagDiffs · takeColumnForeignKeyTargetDiffs · takeIndexFlagDiffs)"]
  RowDiffs["next-data-model<br/>DdlApiRowDiffs · DdlColumnTypeLabelResolver · DdlIndexPartNamesResolver ·<br/>resolveColumnNodeVisibility (with diffs)"]
  Shared["shared-components<br/>TitleRow · TextRow · AdditionalInfoRow (colorizingDiff) ·<br/>AdditionalInfoPiece · DiffFloatingBadgeWrapper · SideBySideLayout"]

  RootD --> TableD
  TableD --> SchemaD
  TableD --> Columns
  TableD --> Indexes
  Columns --> ColumnD
  Indexes --> IndexD
  ColumnD --> TypeLabelD
  ColumnD --> Badges
  IndexD --> Badges
  ColumnD --> Utils
  IndexD --> Utils
  TableD --> Utils
  Utils --> RowDiffs
  ColumnD --> RowDiffs
  ColumnD --> Shared
  IndexD --> Shared
  TableD --> Shared
```
