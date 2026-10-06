# GraphQL (legacy) — viewer, with diffs

Paths are relative to `packages/api-doc-viewer/src/components/`. **Legacy** — change only with
explicit approval. The same node components as [viewer-plain.md](viewer-plain.md) render diffs
through legacy change props.

```mermaid
flowchart TB
  RootD["GraphQLOperationViewer/GraphQLOperationDiffViewer.tsx<br/>aggregateDiffsWithRollup · createGraphApiDiffTree · GraphApiState<br/>ChangeSeverityFiltersContext · LayoutModeContext · DisplayModeContext"]
  Prop["GraphPropNodeViewer (shared with plain)"]
  Combiner["GraphCombinerNodeViewer (shared with plain)"]
  Header["internal/layout/HeaderRow/HeaderRow.tsx"]
  LegacyDiffs["common/diffs/<br/>DiffTags · DiffBadge · EmptyContent · UnsupportedContent"]
  Badges["kit/ux/UxFloatingBadge/UxDiffFloatingBadge · kit/ux/UxMarkerPanel"]
  Filters["contexts/ChangeSeverityFiltersContext"]

  RootD --> Filters
  RootD --> Prop
  RootD --> Combiner
  Prop --> Header
  Header --> LegacyDiffs
  Header --> Badges
  Header --> Filters
```

`DiffTags` and `DiffBadge` are legacy-only; next viewers use `TagsWithDiffs` / `BadgeWithDiffs`.
