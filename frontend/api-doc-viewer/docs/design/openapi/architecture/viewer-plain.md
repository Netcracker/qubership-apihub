# OpenAPI — viewer, plain

Status: **implemented**; diagram refreshed to the code on 2026-10-29
([../notes/2026-10-architecture-review.md](../notes/2026-10-architecture-review.md), D1). Decisions
behind this shape: V1–V11 in [../notes/2026-10-implementation-decisions.md](../notes/2026-10-implementation-decisions.md).
Paths are relative to `packages/api-doc-viewer/src/components/OpenApiOperationViewer/`. Abstract
layer: [../../shared/architecture/viewer-plain.md](../../shared/architecture/viewer-plain.md). Row
stack: [../features/operation-viewer.md](../features/operation-viewer.md#row-stack).

```mermaid
flowchart TB
  Root["OpenApiOperationViewer.tsx → OpenApiViewerRoot.tsx<br/>OpenApiTreeBuilder · OpenApiViewerContext (spacing) · LayoutSpacingContext ·<br/>DisplayModeContext · LayoutModeContext (DOCUMENT) · LevelContext · CSS variables"]
  Operation["OperationNodeViewer.tsx<br/>owns OpenApiViewStateContext (selection · collapsed) ·<br/>header rows: title (h1) + deprecated tag · Operation ID · AddressRow · description · ExternalDocsRow ·<br/>sections in OPENAPI_SECTION_ORDER (config/section-order.ts)"]
  Security["SecurityNodeViewer.tsx · security-blocks.tsx<br/>Security (h2) + Optional badge · SecurityToolbarRow"]
  SecBase["shared-components/Security/<br/>SecuritySectionBase · security-section-blocks · SecurityToolbar (ArrowScrollStrip)"]
  Card["OpenApiSecuritySchemeCard.tsx → SecuritySchemeCardBase<br/>frame rows · title (h4) + type text · description · label / value props"]
  SecRows["shared-components/Security/SecurityRows.tsx<br/>SecurityRow · flow header · Scopes toggle · scope rows · SecurityFrameRow"]
  Extensions["OpenApiExtensionsNodeViewer.tsx · extensions-blocks.tsx<br/>shared ExtensionsSection (h2 operation · h3 collapsible response / Responses Object)"]
  Request["RequestNodeViewer.tsx · request-blocks.tsx<br/>Request (h2) · request body block"]
  Params["ParametersNodeViewer.tsx · parameters-blocks.tsx<br/>Path Parameters · Query Parameters · Headers · Cookies · response Headers (h3, collapsible)"]
  Body["MediaTypeContentSection.tsx<br/>Body (h3, collapsible) + required * · media-type Selector (+ required tag) · description · schema"]
  Responses["ResponsesNodeViewer.tsx · responses-blocks.tsx<br/>Responses (h2) + toned code Selector in ArrowScrollStrip"]
  Response["response-blocks.tsx · ResponseBodyViewer.tsx<br/>description · Headers · Extensions · Body (OPENAPI_SECTION_ORDER.response) ·<br/>Body elements from OpenApiBlockEdges.bodyElements"]
  Collapsible["CollapsibleSection.tsx<br/>useOpenApiSectionTitleRowProps · buildCollapsibleSectionElements · indentSectionContent"]
  SchemaViewer["OpenApiSchemaViewer.tsx<br/>JsonSchemaViewer (SUPPRESS_ROOT_NESTING_INDICATOR) ·<br/>Body schema from next-data-model OpenApiMediaTypeSchema.wrap"]
  Layout["shared-components/Layout/StackLayout.tsx · shared-components/Separator<br/>one container level: blocks + separator rows (LayoutSpacingContext)"]
  ViewUtils["utils/openapi/<br/>node-type-checkers · view-selection · http-method-badge-config · response-code-tone"]
  NdmModel["next-data-model model/openapi<br/>OpenApiNodeVisibility · OpenApiDisplayLabels · OPENAPI_SECURITY_PRESENTATION ·<br/>layout/ (OpenApiBlockEdges · OpenApiSpacingConfig) · abstract/layout (LayoutPlanner · BlockEdges)"]
  Jso["JsoViewer (extensions)"]
  SharedRows["shared-components<br/>TitleRow · TextRow · MarkdownTextRow · AddressRow · ExternalDocsRow · Selector (tone)"]

  Root --> Operation
  Operation --> Security
  Operation --> Extensions
  Operation --> Request
  Operation --> Responses
  Security --> SecBase
  Security --> Card
  Card --> SecRows
  Request --> Params
  Request --> Body
  Responses --> Response
  Responses --> Extensions
  Response --> Params
  Response --> Extensions
  Response --> Body
  Params --> Collapsible
  Body --> Collapsible
  Extensions --> Collapsible
  Params --> SchemaViewer
  Body --> SchemaViewer
  Extensions --> Jso
  Operation --> Layout
  Security --> Layout
  Request --> Layout
  Responses --> Layout
  Card --> Layout
  Layout --> NdmModel
  Operation --> NdmModel
  Card --> NdmModel
  Operation --> ViewUtils
  Responses --> ViewUtils
  Operation --> SharedRows
  Card --> SharedRows
  Response --> SharedRows
```

## Notes

- Containers are `build*Block` functions (in `*-blocks.tsx` modules) plus row components (in the
  component files): a block carries its edges (from
  `OpenApiBlockEdges`) and a `payload` render function; `StackLayout` plans the separators of one
  level and renders the payloads.
- Containers read node values, visibility flags, and display labels from next-data-model; they
  compute neither visibility nor labels.
- Child lists go through guard helpers (`utils/openapi/node-type-checkers.ts`), never
  `childrenNodes() as …`.
- All hooks run before any early `return` (outer component returns `null` for a missing source,
  inner component checks the root kind after its hooks).
- The security card, toolbar, rows and `StackLayout` are also used by the AsyncAPI security
  sections (review finding F1: still under OpenAPI names).
