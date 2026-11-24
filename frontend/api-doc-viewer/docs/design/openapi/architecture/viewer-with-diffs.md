# OpenAPI — viewer, with diffs

Status: **implemented**; diagram refreshed to the code on 2026-10-29
([../notes/2026-10-architecture-review.md](../notes/2026-10-architecture-review.md), D1). Paths are
relative to `packages/api-doc-viewer/src/components/OpenApiOperationViewer/`. Abstract layer:
[../../shared/architecture/viewer-with-diffs.md](../../shared/architecture/viewer-with-diffs.md).
Rules: [../features/diffs.md](../features/diffs.md).

The OpenAPI layer has **no separate with-diffs containers** (D5): the plain containers
([viewer-plain.md](viewer-plain.md)) read diff props from `OpenApiRowDiffs` / `SecurityRowDiffs`
and severities through `takeOpenApiSeverities`, which are empty on a plain tree. Only the root,
the providers, and the nested viewers differ.

```mermaid
flowchart TB
  RootD["OpenApiOperationDiffsViewer.tsx → OpenApiViewerRoot.tsx<br/>OpenApiTreeWithDiffsBuilder · DiffMetaKeysContext · DiffTypesContext ·<br/>OpenApiViewerContext (hideUnchangedNodes) · LayoutSpacingContext · UnchangedBlocksContext ·<br/>LayoutModeContext (SIDE_BY_SIDE_DIFFS)"]
  Containers["Operation / Security / OpenApiSecuritySchemeCard (SecuritySchemeCardBase) / Request /<br/>Parameters / MediaTypeContentSection / Responses / response-blocks / Extensions /<br/>OpenApiSchemaViewer / StackLayout (shared with plain)"]
  DiffState["diff-state.ts · takeOpenApiSeverities<br/>next-data-model isOpenApiTreeNodeWithDiffs"]
  RowDiffs["next-data-model<br/>OpenApiRowDiffs · SecurityRowDiffs · OpenApiBlockEdges · SecurityBlockEdges"]
  Rows["TitleRow · TextRow · MarkdownTextRow · AddressRow · ExternalDocsRow · SecurityRow<br/>→ DiffFloatingBadgeWrapper → SideBySideLayout"]
  Separators["SeparatorRow · BadgeStub (bands and badge stubs from the plan)"]
  Selectors["Selector options with diffs · descendantDiffsSummary (marker) · tone"]
  Hiding["ShowUnchangedTrigger (security cards without content changes)"]
  JsonSchemaD["JsonSchemaDiffsViewer<br/>(parameters · headers · bodies)"]
  JsoD["JsoDiffsViewer (extensions)"]
  Wrap["next-data-model OpenApiMediaTypeSchema.wrap(mediaType, diffsMetaKey)<br/>media-type schemas: Type + whole add / remove record"]

  RootD --> Containers
  Containers --> DiffState
  Containers --> RowDiffs
  Containers --> Rows
  Containers --> Separators
  Containers --> Selectors
  Containers --> Hiding
  Containers --> Wrap
  Containers --> JsonSchemaD
  Wrap --> JsonSchemaD
  Containers --> JsoD
```

## Notes

- Parameter groups and response headers go to `JsonSchemaDiffsViewer` **unwrapped**: the
  synthesizer already attached property-level diffs. Media-type schemas are wrapped under `Type` in
  the viewer (review finding F5 proposes moving that wrapper into the transformer).
- Every row passes its own `diffsSeverityPlacement`; no two rows of one node share a placement.
- Rows whose content div plugs into `SideBySideLayout` carry `flex w-full` (width contract). Verify
  row-background width with `getBoundingClientRect()` in the IT or Storybook — pale diff
  backgrounds are invisible to pixelmatch (testing skill, pixel-diff blind spot).
- `JsoDiffsViewer` installs its own contexts; OpenAPI-level `diffTypes` do not reach extensions
  (same as AsyncAPI).
