# OpenAPI operation viewer — design

Technical design of `OpenApiOperationViewer` / `OpenApiOperationDiffsViewer` and their
next-data-model stack (`OpenApiTreeBuilder` / `OpenApiTreeWithDiffsBuilder`). Status:
**implemented** (first iteration, 2026-10-08) — decisions taken during implementation, rejected
alternatives, and the places where the code deviates from older statements here are in
[notes/2026-10-implementation-decisions.md](notes/2026-10-implementation-decisions.md), which wins
until step 9 below rewrites the affected documents. Skills (`next-data-model-authoring`,
`api-doc-viewer-authoring`, `api-doc-viewer-testing`) are not updated yet.

The viewer reuses what already exists: the JSON Schema viewers render every schema (parameters,
headers, bodies), the JSO viewers render extensions, and the shared rows (`TitleRow`,
`MarkdownTextRow`, `AdditionalInfoRow`, `Selector`, …) render everything else. The new code is an
**OpenAPI layer** that picks one operation out of a document, reshapes it into a viewer-oriented
tree, and lays the rows out.

## Terms

| Term | Meaning |
| --- | --- |
| Operation | One `path` + `method` pair of `paths` (an Operation Object). |
| Operation keys | `{ path, method }` — how the host selects the operation. |
| Section | A second-level block: **Security**, **Extensions**, **Request**, **Responses**. |
| Subsection | A third-level block: **Path Parameters**, **Query Parameters**, **Headers**, **Cookies**, **Body** (request), **Headers**, **Body** (response). |
| Alternative | One Security Requirement Object of the effective `security` list; alternatives are joined by **OR**. |
| Card | One security scheme of the selected alternative; cards of one alternative are joined by **AND**. |
| Dialect | OAS 3.0 or OAS 3.1 behaviour, chosen from the document's `openapi` field. |
| Synthesized schema | A JSON Schema object built by the data layer from parameters or response headers (one property per parameter / header). |

## Reading order

| # | Document | Read when |
| --- | --- | --- |
| 1 | [features/operation-viewer.md](features/operation-viewer.md) | Always — public API, the full row stack top to bottom, selection state. |
| 2 | [entities/](entities/) | Implementing one area: [operation](entities/operation.md), [security](entities/security.md), [parameters](entities/parameters.md), [request body](entities/request-body.md), [responses](entities/responses.md). |
| 3 | [features/oas-versions.md](features/oas-versions.md) | Anything that may differ between OAS 3.0 and OAS 3.1. |
| 4 | [features/diffs.md](features/diffs.md) | With-diffs data layer and viewer: where each diff comes from, how it is aggregated and painted. |
| 4a | [features/plain-case-matrix.md](features/plain-case-matrix.md) | Plain fixture case matrix: E2E section combinations, minimal operations, fields, document structure, OAS 3.1 differences. |
| 4b | [features/diffs-case-matrix.md](features/diffs-case-matrix.md) | Diff fixture case matrix: every covered change, its opposite, and the fragments it applies to. |
| 4c | [features/hiding-unchanged-nodes.md](features/hiding-unchanged-nodes.md) | `hideUnchangedNodes`: which OpenAPI rows collapse (security scheme cards) and when. |
| 4d | [features/compatibility-suite.md](features/compatibility-suite.md) | The external compatibility suites in Storybook and screenshot tests (version-pair groups, which operation a case shows); legacy workarounds in [notes/2026-10-compatibility-suite-port-todo.md](notes/2026-10-compatibility-suite-port-todo.md). |
| 5 | [features/response-code-selector.md](features/response-code-selector.md) | The multicolor response-code selector and the `Selector` tone extension. |
| 6 | [architecture/](architecture/) | Class and component diagrams (data model and viewer, plain and with diffs). |
| 7 | [display-coverage.md](display-coverage.md) | Display baseline; triage of what is shown, omitted, or planned. |
| 8 | [notes/2026-10-design-analysis.md](notes/2026-10-design-analysis.md) | Evidence: how `api-unifier` and `apiDiff` actually shape OpenAPI documents (measured on the fixtures). |
| 9 | [notes/2026-10-implementation-decisions.md](notes/2026-10-implementation-decisions.md) | Decisions taken during the first implementation, rejected alternatives, deviations from the documents above. |

## Decisions

| Id | Decision | Why |
| --- | --- | --- |
| D1 | Follow the AsyncAPI pipeline: spec transformer → operation-oriented spec → json-crawl → tree → viewer. | Same shape as the closest existing stack; reviewers and agents already know it. |
| D2 | `OpenApiTreeWithDiffsBuilder` **extends** `OpenApiTreeBuilder`; `OpenApiSpecWithDiffsTransformer` extends `OpenApiSpecTransformer`. | Default non-JSO layout (`next-data-model-authoring`). |
| D3 | Parameters and response headers are **synthesized into JSON Schema objects in next-data-model** (one property per parameter / header) and rendered by the JSON Schema viewers. | The viewer must not compute diffs; a story helper already proves the approach (`parameters-schema-synthesis.ts`) and is replaced by the data-layer class. |
| D4 | Version differences go through one **dialect strategy** (`OpenApi30Dialect`, `OpenApi31Dialect`); everything else is shared. | Most differences are absorbed by `api-unifier` and the JSON Schema stack; the rest is small and must stay in one place. See [features/oas-versions.md](features/oas-versions.md). |
| D5 | One set of OpenAPI container components serves plain and with-diffs rendering (AsyncAPI pattern); containers never compute diffs — they read `OpenApiRowDiffs` accessors and visibility managers. | The OpenAPI layer mostly composes rows and nested viewers; duplicating ~12 containers adds no value. Diff and visibility logic still lives in next-data-model. |
| D6 | Row visibility lives in next-data-model `node-visibility-data/` from day one. | AsyncAPI still keeps it in the viewer and lists the move as `planned`; do not repeat that. |
| D7 | Every row instance that can carry its own diff gets its **own** `NodeDiffsSeverityPlacemennt`. | Shared placements collapse badges (JSON Schema validation-rows lesson). |
| D8 | Section headers follow [section header colorizing](../shared/features/section-header-colorizing.md) with **full coverage and uniform direction**. | AsyncAPI `kind-parameters` / `kind-extensions` read only the first child diff; a mixed add/remove set is painted wrongly there. |
| D9 | `AddressRow` moves to `shared-components/` and takes a badge descriptor; AsyncAPI passes its action badge, OpenAPI its HTTP method badge. | One partial-replace implementation for both stacks. |
| D10 | `Selector` gains an optional per-option **tone**; the default tone keeps today's grey look. | The response-code selector is the same control with colors ([features/response-code-selector.md](features/response-code-selector.md)). |
| D11 | Security schemes are resolved from `components.securitySchemes` of the **same** document the viewer receives. | Security requirements reference schemes by name, not by `$ref`; nothing else carries the scheme definition. |
| D12 | Shared rows (`TitleRow`, `TextRow`, `MarkdownTextRow`, `AdditionalInfoRow`) gain an optional per-side `framePosition`; a framed card is a run of rows whose positions the card container precomputes. | Each row renders its own two halves in side-by-side layout, so a frame must be drawn per row and per side (Q8). |
| D13 | HTTP method badge colors are one exported config map, not a `switch` in a component. | Easy to adjust later (Q9). |
| D14 | Whole-section add / remove is decided by **presence per side** (does the section display anything there), computed by `OpenApiSectionPresenceResolver` and written as a synthetic node-level diff; a media type without `schema` is not content. | `apiDiff` attaches the same intent at different depths (E19); the raw object of a section can exist while showing nothing ([features/diffs.md](features/diffs.md#section-presence-and-whole-section-changes)). |
| D15 | Extensions placement (approved 2026-10-08): parameter, header, Media Type, and Request Body `x-*` are cloned flat into the related JSON Schema root(s) and shown by the JSON Schema Extensions sub-tree; Response and Responses Object `x-*` get their own **Extensions** (h3) subsections; `x-*` keys inside `content` maps are not extensions. | `x-*` that describe one schema (or every media type of the body) belong to that schema; a response also has headers and the Responses Object spans all codes ([entities/request-body.md](entities/request-body.md#extensions), [entities/responses.md](entities/responses.md#extensions)). |
| D16 | Section order of the OpenAPI layer comes from one config map `OPENAPI_SECTION_ORDER`; spacing is derived from it. | Easy to reorder later ([features/operation-viewer.md](features/operation-viewer.md#section-order)). |
| D17 | Anonymous access (`{}`) is an `Optional` badge on the Security title row, not an alternative (2026-10-28, supersedes Q7); its change never reveals a scheme card. | `{}` names no scheme: an option whose content is one text row added a click for nothing ([entities/security.md](entities/security.md#optional-badge-anonymous-access), [features/hiding-unchanged-nodes.md](features/hiding-unchanged-nodes.md#anonymous-access-changes)). |

## Open questions

| Id | Question | Working default (until decided) |
| --- | --- | --- |
| Q12 | Media type of a `content`-described parameter: `customAnnotations` row `Media type` (works with diffs) or the plain-only `topLevelPropsMediaTypes` badge next to the name? | `customAnnotations` row, in both modes — the only option that works in the diffs viewer. Revisit before step 3. |
| Q16 | How to show diffs of `externalDocs.description`, which is visible only in a hover tooltip? Options A–D in [entities/operation.md](entities/operation.md#q16--description-diffs-open). | **Decided 2026-10-15: option A** — yellow row and highlighted link text; each side's tooltip shows its own description. |

## Resolved questions

Answered by the product owner on 2026-10-07; the design documents already reflect the answers.

| Id | Question | Answer |
| --- | --- | --- |
| Q1 | Folder spelling: `openapi` or `open-api`? | `openapi` for folders and paths; `OpenApi` for identifiers. |
| Q2 | Response media-type selector: own row, or subheader of the response **Body** title? | **Subheader of the response Body title**, as in the request. No standalone selector row in Responses. |
| Q3 | A Media Type Object has no `description`; the response row shows `response.description`, independent of the selected media type. Accept? | Yes. |
| Q4 | Body schemas: wrap under a synthetic `Type` property or render the raw root? | Wrap, title `Type`, root nesting indicator suppressed (AsyncAPI payload parity). |
| Q5 | Header parameters ignored by the specification (`Accept`, `Content-Type`, `Authorization`; response `Content-Type`): hide? | Show them unchanged. |
| Q6 | Security alternatives selector with only one alternative? | **Always shown** (from one alternative), like the AsyncAPI bindings selector. |
| Q7 | Anonymous alternative (`{}`)? | ~~Option `No authentication`; content: muted row `Authentication is not required.`~~ Superseded by D17 (2026-10-28): `Optional` badge on the Security title row. |
| Q8 | Security card look in v1? | **Framed box in v1**, drawn by per-row frame segments ([entities/security.md](entities/security.md#card-frame)). |
| Q9 | HTTP method badge colors? | Proposed table with **GET and POST swapped**, kept as **one config map** ([entities/operation.md](entities/operation.md#http-method-badge-config)). |
| Q10 | Title when `summary` is absent? | **No title row.** New: a secondary **operation ID row** (`TextRow`, small grey text) under the title, shown whenever `operationId` exists ([entities/operation.md](entities/operation.md#operation-id-row)). |
| Q11 | Which out-of-scope items enter v1? | **Operation `deprecated`** (tag in the title subheader) and **`requestBody.required`** (asterisk on the request Body title; diff-colored `required` tag in diffs). Still out: `servers`, parameter / media type examples, `style` / `explode` / `allowReserved`, `encoding`, `callbacks`, `links`. |
| Q13 | Initially selected response code? | First `2XX` in canonical order, else the first code. |
| Q14 | Diffs viewer `operationKeys.path`? | The merged-document key (after path for mapped / renamed paths, before path for removed ones). |
| Q15 | Synthetic alternative diffs on security override changes: v1? | v1. |
| — | `operationId` row when there is no `operationId`? | Hidden (rendered only when present on either side). |

## Implementation plan

Test-first, per [../README.md](../README.md#workflow). Each step lists its exit criterion.

| Step | Work | Skill | Exit criterion |
| --- | --- | --- | --- |
| 1 | Fixtures and catalogues: `packages/samples/openapi/` (plain, OAS 3.0 + 3.1) and `packages/samples/openapi-diffs/` (pairs). A first set exists. | testing | Catalogues list every case; cases cover every row of [display-coverage.md](display-coverage.md). |
| 2 | Plain stories `OpenAPI Operation Suite/*`, screenshot ITs, `waitForOpenApiOperationViewer`. | testing | Stories build; ITs fail only because the viewer is missing. |
| 3 | next-data-model plain: model types, dialects, `OpenApiSpecTransformer`, schema synthesizer, crawl rules, `OpenApiTreeBuilder`, visibility managers, unit tests. | ndm-authoring | Unit tests green: lookup, effective security, synthesis, dialect, response-code order. |
| 4 | Shared UI: `Selector` tone, shared `AddressRow`, `ExternalDocsRow` + `ArrowUpRightIcon` + optional `UxTooltip` max width, shared extensions section, row `framePosition` + `shared-styles/frame.css`. | viewer-authoring | AsyncAPI, JSON Schema, and DDL screenshot ITs unchanged (frame is opt-in). |
| 5 | Plain viewer `OpenApiOperationViewer`. | viewer-authoring | Plain ITs green; snapshots reviewed. |
| 6 | Diff stories `OpenAPI Operation Diffs Suite/*` and ITs. | testing | Stories build. |
| 7 | next-data-model with diffs: with-diffs transformer, with-diffs synthesizer, five aggregator families, severities, `OpenApiRowDiffs`, unit tests. | ndm-authoring | Unit tests green for every row of the diff-source table in [features/diffs.md](features/diffs.md). |
| 8 | Diffs viewer `OpenApiOperationDiffsViewer`. | viewer-authoring | Diff ITs green; DOM width check for near-white row backgrounds (testing skill, pixel-diff blind spot). |
| 9 | Refresh [display-coverage.md](display-coverage.md) and diagrams to `implemented`; update skills and `AGENTS.md`; add an `api-doc-viewer-using` section. | review-session | Docs match code. |

Progress (2026-10-08): steps 1–8 are implemented. Exceptions: screenshot baselines for steps 2, 5,
6 and 8 are not generated yet (Docker was not available), and IT story ids were not checked against
a running Storybook. Step 9 is partly done: status lines and
[display-coverage.md](display-coverage.md) are refreshed, while entity / architecture rewrites,
skills, and `AGENTS.md` are pending
([notes/2026-10-implementation-decisions.md](notes/2026-10-implementation-decisions.md)).

## Related documents

- AsyncAPI stack (closest reference): [../async-api/display-coverage.md](../async-api/display-coverage.md), [../async-api/architecture/](../async-api/architecture/)
- JSON Schema stack (renders every schema): [../json-schema/display-coverage.md](../json-schema/display-coverage.md)
- Shared contracts: [../shared/](../shared/)
- Fixture catalogues: [../../../packages/samples/openapi/README.md](../../../packages/samples/openapi/README.md), [../../../packages/samples/openapi-diffs/README.md](../../../packages/samples/openapi-diffs/README.md)
