# DDL API — viewer, plain

Paths are relative to `packages/api-doc-viewer/src/components/DdlTableViewer/`. Abstract layer:
[../../shared/architecture/viewer-plain.md](../../shared/architecture/viewer-plain.md).

```mermaid
flowchart TB
  Root["DdlTableViewer.tsx<br/>DdlApiTreeBuilder · DdlTableViewerContext (navigation link builder/component) ·<br/>DisplayModeContext · LayoutModeContext (DOCUMENT) · LevelContext"]
  Table["TableNodeViewer.tsx<br/>table name · DdlSchemaNameBlock · description"]
  Columns["ColumnsNodeViewer.tsx<br/>'Columns' section title"]
  Column["ColumnNodeViewer.tsx<br/>name · type label · badges · description · Values · Default · As"]
  Badges["ColumnRowBadges/ColumnRowBadgesContent.tsx<br/>PK · unique · not null · generated · FK"]
  FK["ForeignKey/ForeignKey.tsx + DefaultNavigationLink.tsx"]
  Indexes["IndexesNodeViewer.tsx<br/>'Indexes' section title"]
  Index["IndexNodeViewer.tsx<br/>title · (parts) · unique · description"]
  Formatters["formatters.ts<br/>formatForeignKeyTarget · formatIndexPartNames"]
  Shared["shared-components<br/>TitleRow · TextRow · AdditionalInfoRow · AdditionalInfoPiece · SubheaderValue"]
  NDM["next-data-model<br/>resolvePlainColumnNodeVisibility · list-last-row flags ·<br/>resolvePlainIndexNodeVisibility"]

  Root --> Table
  Table --> Columns
  Table --> Indexes
  Columns --> Column
  Indexes --> Index
  Column --> Badges
  Index --> Badges
  Badges --> FK
  FK --> Formatters
  Index --> Formatters
  Column --> Shared
  Index --> Shared
  Table --> Shared
  Column --> NDM
  Index --> NDM
```
