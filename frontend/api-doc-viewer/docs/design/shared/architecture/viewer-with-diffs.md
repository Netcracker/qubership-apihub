# Viewer — with diffs (abstract)

The API-type-agnostic shape of a with-diffs viewer. Diffs viewers consume precomputed node diff
fields; they never compute diffs.

```mermaid
flowchart TB
  subgraph ROOT["API type root diffs viewer"]
    Root["&lt;Spec&gt;DiffsViewer<br/>ErrorBoundary · &lt;Spec&gt;TreeWithDiffsBuilder in useMemo"]
    Providers["DiffMetaKeysContext · DiffTypesContext<br/>LayoutModeContext (SIDE_BY_SIDE_DIFFS) · DisplayModeContext · LevelContext"]
  end

  subgraph SPEC["API type components (containers)"]
    Dispatch["node dispatch by kind"]
    Containers["&lt;Kind&gt;NodeViewerWithDiffs<br/>(or one shared viewer + useNodeDiffState, AsyncAPI)"]
  end

  subgraph SHARED["components/shared-components (presentational)"]
    DiffProps["diffs/node-diff-props.ts<br/>useNodeDiffState · toNodeDiffState · buildRowDiffProps"]
    Rows["TitleRow · TextRow · AdditionalInfoRow · NestingIndicatorTitleRow<br/>(diff · colorizingDiff · diffsSeverities · diffsSeverityPlacement)"]
    Badge["DiffFloatingBadgeWrapper (severity badge per row)"]
    SideBySide["Layout/SideBySideLayout (origin | changed)"]
    Tags["diffs/TagsWithDiffs · diffs/BadgeWithDiffs"]
    Unchanged["ShowUnchangedRow"]
    Markers["kit/ux/UxMarkerPanel (changes summary)"]
  end

  NDM["next-data-model<br/>node diff fields · &lt;Spec&gt;RowDiffs accessors · resolvers"]

  Root --> Providers
  Root --> Dispatch
  Dispatch --> Containers
  Containers -->|recurse| Dispatch
  Containers --> DiffProps
  Containers --> Rows
  Containers --> Tags
  Containers --> Unchanged
  Containers --> Markers
  Rows --> Badge
  Badge --> SideBySide
  DiffProps --> NDM
  Containers --> NDM
```

## Notes

- Every row renders twice (origin and changed side) inside one `SideBySideLayout`; hiding always
  applies to the whole row.
- Each row reads its own severity placement; sibling rows never share one.
- `DiffTags` / `DiffBadge` under `components/common/diffs/` are legacy GraphQL-only; next viewers use
  `TagsWithDiffs` / `BadgeWithDiffs`.
