# OpenAPI architecture review (2026-10)

Review of the OpenAPI operation stack against the shared rules of the `api-doc-viewer-reviewing`
skill and its brief `review/openapi.md` (first run of that brief). Date: 2026-10-29, branch
`feature/openapi-rework` at `e3e5401b0` plus the uncommitted working tree.
Plain-language companion (background, problem, fix, visible change per batch):
[2026-10-architecture-review-explained.md](2026-10-architecture-review-explained.md).

Status values: **Open** (proposed, awaiting approval), **Accepted** (documented decision, no
change), **Fixed** (changed in this review). Severity: **High** (breaks a layering rule or makes
another API type depend on OpenAPI internals), **Medium** (duplication or misplaced logic with a
real divergence risk), **Low** (local hygiene).

## Scope

| Layer | Reviewed |
| --- | --- |
| Data model | `next-data-model/src/{model,building-service,shared}/openapi/`, spec-neutral `{model,building-service}/security/` |
| Viewers | `api-doc-viewer/src/components/OpenApiOperationViewer/`, `utils/openapi/` |
| Shared UI introduced for OpenAPI | `shared-components/Security/`, `Separator/`, `TitleRowUsage.OpenApiSection`, `PrecededBy.OPENAPI_*`, `CollapsibleSection.css` |

Out of scope (skill constraints): stories, ITs, samples, `bin/`, nested JSON Schema / JSO viewers.
`buildOpenApiDiffCause` (`utils/common/changes.ts`) was listed in the brief but is a legacy helper
of the GraphQL / common-annotation rows, not used by the OpenAPI stack; the brief is corrected.

## Summary

The stack follows its decisions well: no `any`, no inline diff re-derivation in most containers,
visibility and row diffs in next-data-model classes, and a record-driven aggregation that is
genuinely simple. The weak points are at the **boundaries**:

1. The vertical layout engine became a cross-API contract (AsyncAPI security uses it) while it is
   still named, located and configured as OpenAPI — shared components import from the OpenAPI
   container folder (F1, F2).
2. The shared security card computes severities and owns a field → placement → label table that
   duplicates the data layer's aggregation table (F3, F4).
3. The with-diffs transformer carries per-call mutable state shared with the security builder
   through callbacks, and the side-context algebra is re-implemented in several places (F7, F8).

## Findings

| ID | Status | Severity | Where | What | Broken rule(s) | Suggested fix |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | Fixed | High | ndm `model/openapi/layout/*`; viewer `OpenApiOperationViewer/OpenApiLayout.tsx`, `OpenApiViewerContext.ts`; consumers `shared-components/Security/*`, `Separator/*`, `AsyncApiOperationViewer/AsyncApiSecuritySection.tsx` | The vertical spacing engine (separator rows, card frame rows, the planner) is used by AsyncAPI's security sections too, but it is named and filed as OpenAPI: AsyncAPI and the shared security components import files from the OpenAPI viewer folder, and AsyncAPI gets its spacing numbers only because a React context it never provides falls back to OpenAPI's defaults. Works today; a change made for OpenAPI silently changes AsyncAPI. [Details](#f1-cross-api-layout-engine-under-openapi-names) | Container / presentational split; API-type context in a shared component; fewer, general types | Move the generic part to `model/abstract/layout/` and `shared-components/Layout/`, provide spacing through a spec-neutral context from each root viewer, keep only OpenAPI edges in `OpenApiBlockEdges` |
| F2 | Fixed | Medium | `TitleRow/types.ts` (`TitleRowUsage.OpenApiSection`), `WithPrecededByProps.ts` (`OPENAPI_ROW`, `OPENAPI_NESTED_VIEWER_START`), `preceded-by.css`, `CollapsibleSection.css`; `tailwind-classnames.ts` (`X_AXIS_PADDING_ROWS_ASYNC_API`, used by 14 files) | Shared rows carry API-type names for things that are not API-type specific: the "rows planned by the separator engine" marker is called `openapi-row` (AsyncAPI security rows carry it too); the "collapsible section title with a fixed expander column" usage is called `OpenApiSection`, and OpenAPI CSS reaches into `TitleRow` internals for it; the generic row padding `px-4` is called `X_AXIS_PADDING_ROWS_ASYNC_API` although `TitleRow`, `TextRow` and DDL use it. Names only — no behaviour problem. [Details](#f2-api-type-names-on-shared-rows) | API-type logic leaking into shared rows; clean reusable CSS | Name them by what they do (`SEPARATOR_LAYOUT_ROW`, `TitleRowUsage.CollapsibleSection` styled by `TitleRow` itself, one generic row-padding constant); same values, no visible change |
| F3 | Fixed | High | `shared-components/Security/SecuritySchemeCardBase.tsx` (`severityOf`, `strongestDiff`, `addScopeRows`); `SecurityToolbar.tsx` (`isAbsentSide`) | The security card **computes** the floating diff badge of every scope row in React instead of reading it from the data layer: it picks the stronger of two diffs and builds the badge with an empty cause, so these badges never show the `caused by …` tooltip text every data-layer badge has. The toolbar also works out "this side has no toolbar" from the raw diff. [Details](#f3-the-security-card-computes-badges-itself) | No diff aggregation in components; viewer consumes | Compute each scope row's badge where the row itself is derived (`SecurityRowDiffs`), with the same cause rule as the aggregators; make the diff-type ordering available to model code (it exists twice already); toolbar side from the existing `NodeLevelRowDiffs.isPresentOnSide` |
| F4 | Fixed | Medium | `SecuritySchemeCardBase.tsx` (`schemeFields`, `urlFields` tuples) vs ndm `building-service/security/tree-with-diffs/aggregation-tables.ts` (`SECURITY_FIELD_PLACEMENTS`) | Which field goes in which card row, and which badge slot ("placement") that row reads, is written twice: once in the data layer (to compute the badges) and once in the card (to render the rows). If they disagree, a row shows another row's badge or none, with no error. [Details](#f4-the-card-rows-are-described-twice) | Literal / logical duplication; inline types; model-driven row sequence | One table: move the placement table to `model/security/`, and let the data layer return the card's row list (field, label, placement, link) from it; the card only renders that list |
| F5 | Fixed | Medium | `MediaTypeContentSection.tsx` (`schema` memo) → `utils/jso/prepare-json-schema-to-jso-viewers.ts` `wrapJsonSchemaForViewer` / `wrapJsonSchemaForDiffsViewer`; AsyncAPI `MessageContentNodeViewer` | The Body schema is shown under a synthetic `Type` property. The viewer builds that wrapper object itself and, in diffs mode, writes a diff record into it (`{ [diffsMetaKey]: { Type: <media type's whole diff> } }`) so the `Type` row turns green / red when the media type was added / removed. That is diff data composed in React; parameter and header schemas are already synthesized in next-data-model. [Details](#f5-the-body-schema-wrapper-is-built-in-react) | No diff composition in viewer helpers | The OpenAPI transformers store the wrapped schema (plain: wrapper; with diffs: wrapper + record) as the media type's `schema`, like the parameter groups; `MediaTypeContentSection` passes it on. AsyncAPI keeps its call until its own review |
| F6 | Fixed | Medium | `request-blocks.tsx` `buildRequestBodyBlock` + `RequestNodeViewer.tsx` `RequestBodyNodeViewer`; `response-blocks.tsx` body block + `ResponseBodyViewer.tsx`; `MediaTypeContentSection.tsx`; ndm `OpenApiBlockEdges.body` / `hasSchema` | A Body is a small layout of its own (title row, optional description row, schema viewer). Which of these exist is decided twice: once by the block builder (for the Body's outer edges: `OpenApiBlockEdges.body`, schema check via `Reflect.get`) and again by the component (description visibility, title / description edges, selected media type, its own schema check). Two copies of one rule can drift: the separator around the Body would then continue a row that is not there. `ResponseBodyViewer` also keeps fallbacks that can never run (`OpenApiBlockEdges.row({})`, `` `${node.id}:body` ``). [Details](#f6-the-body-elements-are-decided-twice) | Logical duplication; viewer re-derives a layout decision | One data-layer list of the Body's elements (`OpenApiBlockEdges.bodyElements`: title, description?, schema?; collapsed = title), from which `body` takes its outer edges; the builder computes it once and hands it to the component, which only renders it; fallbacks removed |
| F7 | Fixed | Medium | `building-service/openapi/shared/openapi-spec-with-diffs-transformer.ts` (544 lines), `openapi-security-spec-with-diffs-builder.ts` (`OpenApiSecurityDiffsHost`) | Two problems in one class: (1) facts about the selected operation (on which sides it exists, its whole add / remove, its path rename) are stored in instance fields and read by 32 places, so every method silently depends on `buildSpec` having set them first; the security builder reaches the same fields through callbacks; (2) the class does about ten unrelated jobs and repeats its own lookups (`readField(operation, 'responses')` 4×). No bug today. [Details](#f7-with-diffs-transformer-hidden-state-and-size) | SOLID (SRP); duplication | Carry the operation facts in the context object every method already receives (no instance state, no callbacks); move two self-contained jobs into their own classes |
| F8 | Fixed | Medium | `openapi-spec-with-diffs-transformer.ts`, `openapi-security-spec-with-diffs-builder.ts`, `security/security-spec-diffs-decorator.ts`, `object-schema-with-diffs-synthesizer.ts`, `model/openapi/layout/planner.ts` | The same four tiny operations on a "which sides" pair `{ before, after }` (empty pair, "exists on both", "exists on either", "accumulate over a list") are hand-written about 25 times in four styles, plus two hand-written copies of "replace one entry of a diff record". [Details](#f8-the-before--after-pair-helpers) | Literal / logical duplication; free domain functions; inline types | One small `SideContexts` class next to `SideContext`, one `DiffSide` type, one `SideReader.replaceRecordEntry`; pure refactor |
| F9 | Fixed | Medium | transformer L295, L367, L494 vs `isKeyedOptionChange`; `RESPONSE_CODE_RANGE` vs `OpenApiResponseCode.isRange`; `isNonEmptyString` / `hasText` / inline length checks (4 copies); `CUSTOM_ANNOTATIONS_KEY` ×2; `'[OpenAPI]'` literal ×6 in the transformer | Repeated predicates and constants next to the existing named ones | Literal duplication; inline literal constants | Reuse `isKeyedOptionChange`, `OpenApiResponseCode.isRange`, one `TextValues.isNonEmpty`, export the annotation key, use `OPENAPI_LOG_PREFIX` |
| F10 | Fixed | Medium | ndm `model/openapi/tree-with-diffs/row-diffs.ts` (`isDeprecatedOnSide`, `isRequiredStarVisibleOnSide`, two `takeChangesMarkerSummary`); `SecuritySectionBase.tsx` (`SecurityToolbarRow` options) | Two small algorithms are copy-pasted in the OpenAPI row accessors ("is this boolean flag true on this side", "which changes does a selector option's marker show"), and the security toolbar decides its option markers with a third, inline rule that differs from the OpenAPI one. [Details](#f10-copy-pasted-row-accessors-and-a-third-marker-rule) | Logical duplication; viewer consumes | One flag-on-side accessor and one marker accessor on the shared row-diffs base; the toolbar uses an accessor too, keeping today's look (or aligning it — your decision) |
| F11 | Fixed | Medium | `OpenApiOperationViewer.tsx` / `OpenApiOperationDiffsViewer.tsx`; `CollapsibleSection.css`, `TitleRow/TitleRow.css`, `preceded-by.css` | The two root viewers repeat the same body: logger memo, viewer-context memo, the provider stack and an identical inline style object writing three CSS custom properties from the spacing config. The CSS reads those properties with numeric fallbacks (`16px`, `24px`, `4px`) that repeat the config defaults, so the numbers have a second, silent home. [Details](#f11-two-root-viewers-with-the-same-body) | Literal duplication; inline literals | A presentational `OpenApiViewerRoot` (providers + root `div`) used by both roots, one viewer-side `toOpenApiCssVariables(spacing)`; no numeric fallbacks in CSS |
| F12 | Fixed | Low | `OpenApiExtensionsNodeViewer.tsx` L287 | `node.diffs[NODE_LEVEL_DIFF_KEY]?.highlightingMode` read in a container, bypassing the accessors the row-diffs header asks containers to use | Viewer consumes accessors | `OpenApiRowDiffs.Section.takeHeaderRowHighlightingMode(node)` |
| F13 | Fixed | Low | `openapi-spec-transformer.ts` L268, L378, L380 (`eslint-disable`), L401 (`{} as …`); `tree/node-data/builder.ts` L300; `security/tree-with-diffs/aggregators.ts` L364 | Three `eslint-disable no-unused-vars` comments suppress nothing (ESLint with `--no-inline-config` reports no error: default `args: after-used`); `{} as OpenApiExtensionsSpec` is avoidable; `as readonly (keyof OpenApiAnyTreeNodeValue)[]` casts to the keys common to a union (effectively none), so `pick` is unchecked; `existing as T` in a heterogeneous `Map<string, unknown>` | No assertions without justification; no error suppression | Delete the comments; build a typed object; per-kind typed pick; one typed map per aggregator family |
| F14 | Fixed | Low | `tree-with-diffs/node-diffs-data/factories.ts`, the five empty `*KindAny` subclasses, tables in `node-diffs-severities/kind-any.ts` and `node-diffs/kind-any.ts`; `SecurityNodeAggregators` | Two copies of the lazy per-kind cache in OpenAPI plus a third in security; OpenAPI tables hide inside aggregator files while security has `aggregation-tables.ts`. The `KindAny` approach itself is accepted (A1) | Literal duplication | One `RecordDrivenAggregatorRegistry<K>` for both stacks; `building-service/openapi/tree-with-diffs/aggregation-tables.ts` |
| F15 | Fixed | Low | `tree/builder.ts` complex branch, `createStateForComplexNode`, `sortResponseCodes`; `openapi-spec-transformer.ts` L339 | After I1 no OpenAPI node is complex, but the builder keeps the complex path; the transformer sorts codes into an object that cannot keep the order (the builder re-sorts); `sortResponseCodes` sorts the array returned by `childrenNodes()` in place, relying on it being the internal storage | Dead code; minimal blind spots | Drop the complex path and the transformer sort; reorder children through an explicit tree method |
| F16 | Fixed | Low | `utils/openapi/view-selection.ts`, `http-method-badge-config.ts` | The default response rule (first `2XX`, Q13) and the media-type defaults are free functions in the viewer; `resolveHttpMethodBadge` has an inline return type | Domain logic encapsulated by convention; inline types | `OpenApiResponseCode.pickDefault(codes)` in ndm; an `OpenApiViewSelection` static class; an `HttpMethodBadge` type |
| F17 | Fixed | Low | `RequestNodeViewer.tsx`, `ResponsesNodeViewer.tsx`, `response-blocks.tsx`, `MediaTypeContentSection.tsx`, `OperationNodeViewer.tsx`, `SecuritySectionBase.tsx`, `SecuritySchemeCardBase.tsx` L271 | `OpenApiDisplayLabels` states labels are resolved in the data layer, yet seven section / row titles and the card's `Show N unchanged rows` text live in the viewer; the plural rule duplicates `ShowUnchangedRowContent` | Literal constants; minimal blind spots | Move titles to `OpenApiDisplayLabels` / `SecurityDisplayLabels`; one `ShowUnchangedLabels.rows(n)` / `.nodes(n)` |
| F18 | Fixed | Low | `OperationNodeViewer.tsx` `SECONDARY_TEXT_COLOR '#626D82'`; `SecuritySchemeCardBase.tsx` `MUTED_TEXT_COLOR '#8F9EB4'`; `MediaTypeContentSection.tsx` `text-red-500` star | Hard-coded colors in components | Clean reusable CSS | Color tokens in `shared-styles/colors/` |
| F19 | Fixed | Low | 11 inline prop types (`FC<{ node: … }>`) in OpenAPI and security components; `keys: { path; method }` ×2, `owners: ReadonlyArray<{ owner; context }>` ×2, `state: { readonly expanded }`, `displayMode: ReturnType<typeof useDisplayMode>`; `node-visibility.ts` L1 (import and JSDoc on one line) | Inline types | No inline types | Named prop / param types; `OpenApiOperationKeysResolved`, `ExtensionOwnerSides`; `DisplayMode` |
| F20 | Fixed | Low | `config/section-order.ts`, `OperationNodeViewer.tsx` / `response-blocks.tsx` / `ResponsesNodeViewer.tsx` switches, `PARAMETER_SECTION_LOCATIONS` | `OPENAPI_SECTION_ORDER` and every switch use string literals while `OpenApiSectionIds` exists; `OPENAPI_SECTION_IDS_BY_LEVEL` repeats the lists with constants | Literal duplication | Use `OpenApiSectionIds` everywhere; derive `…_IDS_BY_LEVEL` from one definition |
| F21 | Fixed | Low | `OperationNodeViewer.tsx` L66–69 | View state is reset in `useEffect` after the node changes, so the first render of a new operation uses the previous selection / collapsed sets | React state hygiene | Reset the view state during render when the operation node object changes (React "adjust state when a prop changes"), drop the effect. *Revised 2026-10-30: `key={node.id}` would never reset — a rebuilt tree has the same path-based ids* |
| F22 | Fixed | Low | ndm `layout/planner.ts` `SEPARATOR_CACHE`; viewer `Separator/render-separator-row.tsx` `ELEMENT_CACHE` | Two module-level caches (clear-all at 1000) for one memoization concern; the planner documents itself as pure | Minimal blind spots | Delete both caches: `SeparatorRow`'s `memo` already compares by `signature` and the frame positions, so neither interning nor element reuse is needed; the planner becomes pure. *Revised 2026-10-30* |
| F23 | Fixed | Low | 7 files: `OpenApiExtensionsNodeViewer.tsx` (3), `response-blocks.tsx` (2), `SecuritySectionBase.tsx` (2), `ParametersNodeViewer.tsx`, `RequestNodeViewer.tsx`, `ResponsesNodeViewer.tsx`, `SecurityNodeViewer.tsx` | 11 `react-refresh/only-export-components` warnings: component files also export block builders and constants | Lint hygiene | Block builders into `*-blocks.ts` modules next to the components (as `response-blocks.tsx` started) |
| F24 | Fixed | Low | `tree/node-data/builder.ts` L280–287 | `unresolvedSecurityScheme` meta is set by duck typing any node value (`isResolved === false && name`), regardless of kind | Type guards over structural guesses | Delete the field and the duck-typed check: nothing reads `meta.unresolvedSecurityScheme` (the unresolved row comes from `value.isResolved` via `SecurityNodeVisibility`). *Revised 2026-10-30* |
| F25 | Fixed | High | ndm crawl rules (`responses`, `content`, shared Security), `SecuritySpecDiffsDecorator`, security kinds / tables, `SecurityRowDiffs`; viewer option helpers, `SecuritySectionBase`, `security-blocks`, `AsyncApiSecuritySection` | Found while explaining F15: OpenAPI built every selector's options (response codes, media types, security alternatives) as ordinary children (decision I1), unlike AsyncAPI, where a selector's options are nested nodes of a complex container. The developer set the common rule: options of a selector are nested nodes of the container they belong to. [Details](#f25-selector-options-are-not-nested-nodes) | Design is the source of truth (the entity docs said complex); one rule across API types | `responses` and `content` complex; a new complex `securityAlternatives` container under the simple `security` (shared, so AsyncAPI too); option helpers over `nestedNodes()` |
| D1 | Fixed | Medium | `docs/design/openapi/architecture/*.md` | All four diagrams described the pre-implementation structure: complex nodes, per-kind aggregators, `OpenApiSectionPresenceResolver`, per-kind visibility managers, `AdditionalInfoRow` cards, `node-diff-props`, `tree-node-guards` | Design is the source of truth | Rewritten to the implemented structure (I1–I3, I5, V1–V11, security module, layout module) |
| D2 | Fixed | Medium | `entities/request-body.md`, `entities/responses.md`, `entities/security.md`, `features/diffs.md` | Still describe complex `content` / `responses` / `security`, `KindRequestBody`, `OPENAPI_COMPLEX_KINDS_WITH_VALUE`, `OpenApiSectionPresenceResolver`, with-diffs visibility managers, a non-existent `openapi-section-presence.test.ts` | Design is the source of truth | Rewrite the "where it lives" of the entity / feature pages, keep the rules (batch 9, scope extended by the developer) |
| D3 | Fixed | Low | `api-doc-viewer-reviewing/SKILL.md` | The skill says to run `node_modules/.bin/tsc` / `jest`; in this monorepo the binaries are hoisted to the repository root (the package-local path does not exist) | Minimal blind spots | Skill names the root `node_modules/.bin/` and the per-package working directory |
| D4 | Fixed | Low | `api-doc-viewer-reviewing/review/openapi.md` | Brief listed `buildOpenApiDiffCause` (legacy) in scope and focused on moving the layout out of next-data-model, which is an approved convention | Minimal blind spots | Brief corrected: legacy helper dropped; layout focus is its cross-API placement |
| A1 | Accepted | — | `KindAny` aggregators (I2) | One table-driven aggregator per family is a data-driven strategy, not a catch-all: per-kind behaviour is in the field / node placement tables and the transformer's records | — | Keep; only the factory duplication (F14) |
| A2 | Accepted | — | `model/openapi/layout/` in next-data-model | Approved convention (`next-data-model-authoring` → layout data; `features/block-separators.md`): edges are derived from the same row diffs that paint the rows | — | Keep in next-data-model; generalize its placement (F1) |
| A3 | Accepted | — | One container set for plain and with diffs (D5) | Verified: containers branch only through accessors and `isOpenApiTreeNodeWithDiffs` in option building; no per-container duplication | — | Keep |
| A4 | Accepted | — | `OpenApiNodeVisibility`, `SecurityNodeVisibility` (I5) | Classes with static / instance methods, no visibility checks left in containers; the brief's "free functions" concern does not apply | — | Keep |

## F1. Cross-API layout engine under OpenAPI names

What is generic and what is OpenAPI-specific today:

| Piece | Generic (used by AsyncAPI security) | OpenAPI-only |
| --- | --- | --- |
| ndm `layout/types.ts`, `planner.ts`, `spacing-config.ts` | all of it (`OpenApiSeparatorRow`, `OpenApiFrameRow`, `OpenApiLayoutPlanner`, `OpenApiSpacingConfig`) | `OpenApiLayoutLevel` values `operation`, `operationHeader`, `request`, `responses` |
| ndm `layout/block-edges.ts` | `tones`, `severityOf`, `row`, `nested`, `card`, `single`, `container`, `sectionTitleRow`, `securityToolbarRow`, `securityTitleRow`, `wholeBlock` | `operationHeaderRow`, `responsesTitleRow`, `requestBodyTitleRow`, `responseBodyTitleRow`, `body`, `hasSchema`, `descriptionRow` |
| viewer `OpenApiLayout.tsx` | all of it | — |
| viewer `OpenApiViewerContext.ts` | `spacing` | `expandedDepth`, `hideUnchangedNodes`, `devMode` |

Consequences: `shared-components/Security/SecuritySchemeCardBase.tsx` imports
`../../OpenApiOperationViewer/OpenApiLayout` and `../../OpenApiOperationViewer/OpenApiViewerContext`;
`AsyncApiSecuritySection.tsx` imports `../OpenApiOperationViewer/OpenApiLayout`. The AsyncAPI viewer
never provides `OpenApiViewerContext`, so its cards read `DEFAULT_OPENAPI_SPACING_CONFIG` through the
context's default value — a host that customised OpenAPI spacing would not see it in AsyncAPI, and
a change of the default silently changes AsyncAPI.

Proposed shape:

- ndm `model/abstract/layout/`: `LayoutPlanner`, `LayoutSeparatorRow`, `LayoutFrameRow`,
  `LayoutSpacingConfig<TLevel extends string>`, `BlockEdges` (the generic edges, over `RowDiffsNode`).
- ndm `model/openapi/layout/`: `OpenApiBlockEdges extends BlockEdges` (OpenAPI-only edges),
  `OpenApiLayoutLevel`, `DEFAULT_OPENAPI_SPACING_CONFIG`.
- viewer `shared-components/Layout/StackLayout.tsx` (today's `OpenApiLayout`) reading a spec-neutral
  `LayoutSpacingContext`; both OpenAPI roots and the AsyncAPI root provide it.
- AsyncAPI screenshot ITs must stay unchanged (same numbers, same DOM).

## F2. API-type names on shared rows

| Name today | What it really means | Who uses it | Proposed name |
| --- | --- | --- | --- |
| `PrecededBy.OPENAPI_ROW` (`data-precededby="openapi-row"`) | "this row has no vertical padding: the separator engine plans its gaps" (`preceded-by.css`) | OpenAPI rows **and** the shared security rows / toolbar / card that AsyncAPI renders | `SEPARATOR_LAYOUT_ROW` (`separator-layout-row`) |
| `PrecededBy.OPENAPI_NESTED_VIEWER_START` | "first row of a nested JSON Schema / JSO viewer under such a row: keep its own inset" | OpenAPI schema and extensions viewers | `SEPARATOR_LAYOUT_NESTED_VIEWER_START` |
| `TitleRowUsage.OpenApiSection` (`data-usage="openapi-section"`) | "collapsible section title with a fixed-width expander column"; highlighting is the same as `Default`; the fixed width is set by OpenAPI CSS that targets `TitleRow`'s internal `.level-indicator-column` | OpenAPI collapsible sections | `TitleRowUsage.CollapsibleSection`, its CSS moved next to `TitleRow` |
| `X_AXIS_PADDING_ROWS_ASYNC_API` (`'px-4'`) | the horizontal padding of every standard row | 14 files: `TitleRow`, `TextRow`, `MarkdownTextRow`, `AddressRow`, `ExternalDocsRow`, security rows, AsyncAPI viewers, two DDL components | `X_AXIS_PADDING_ROWS` |

Precedent: `TitleRowUsage` already has API-type-named members (`DdlApiSection`, `DdlApiProperty`,
`AsyncApiJsoSection`, `JsoProperty`, `JsonSchemaProperty`); they are out of this review's scope and
listed as a follow-up for their own reviews. `X_AXIS_PADDING_ROWS_DDL_API` (also `'px-4'`) stays: DDL
chose its own constant.

## F3. The security card computes badges itself

**Background.** In diffs mode every row has two separate diff decorations: the **background**
(green / red / yellow, from the row's `diff`) and the **floating badge** at the left edge (diff
type, from a *severity* `{ type, causedAt }`; hovering it shows `caused by <path> change` when
`causedAt` is set). By the project rule both are computed in next-data-model; React only passes
them on. For ordinary rows the aggregators compute severities and take `causedAt` from the diff's
declaration path (`RecordDrivenNodeDiffsSeveritiesAggregator.toSeverity`).

**Problem.** OAuth scope rows are not tree nodes: one OAuth flow's `scopes` map becomes several
rows, derived by `SecurityRowDiffs.OAuthFlow.resolveScopeRows`, which returns per row its
background diff and its `required` diff, but **no severity**. So `SecuritySchemeCardBase` makes one:

```ts
const severityOf = (diff) => diff ? { type: diff.data.type, causedAt: [] } : undefined   // cause dropped
const ownRowDiff = scope.rowDiff !== blockDiff ? scope.rowDiff : undefined               // "is it inherited?" by identity
const rowSeverity = ownRowDiff || scope.requiredDiff
  ? severityOf(strongestDiff(ownRowDiff, scope.requiredDiff))                            // max of diff types, in React
  : scope.rowDiff ? blockSeverity : undefined
```

That is aggregation in a component (choosing the strongest diff type, inheriting the block's
badge), and because of `causedAt: []` **these badges never show the `caused by …` text** — every
other row's badge does. Why it ended up in React: the `next-data-model-authoring` skill forbids
merging severities in model code (`row-diffs.ts`) because the diff-type ordering lives in
building-service, and the scope rows are derived in model code. Smaller, same family: `SecurityToolbar` decides "no toolbar on this side" from
`isDiffAdd` / `isDiffRemove` of the raw diff.

**Fix.**

1. The diff-type ordering is a pure function of the diff type and already exists **twice**
   (`AbstractNodeDiffsSeveritiesAggregator.compareDiffTypes` in next-data-model, `compareDiffTypes`
   / `maxDiffType` in `api-doc-viewer/src/utils/common/changes.ts`). Move it to one model-level
   module (e.g. `model/abstract/tree-with-diffs/diff-type-order.ts`) with the severity-from-diff
   rule (`toSeverity`); the aggregators and the viewer utility use it. That lifts the reason for
   the skill rule, which is updated accordingly.
2. `SecurityScopeRow` gets a `severity`, computed in `resolveScopeRows` /
   `resolveUndeclaredRequiredScopeRows` with the same rule the card uses today, but with the cause.
3. The card renders `scope.severity`; `severityOf`, `strongestDiff` and the identity check go.
4. `SecurityToolbar` uses the existing `NodeLevelRowDiffs.isPresentOnSide` (same answer: the
   toolbar row's add / remove is the section's own node-level diff).

**Visible change:** scope-row badges gain the `caused by …` hover text. Badge type and colours stay
the same, so screenshots do not change (tooltips are not captured).

## F4. The card rows are described twice

**Background.** The badge of a card row comes from a *placement*: a named slot in the node's
severities (`SecuritySchemeHttpSchemeRow`, `OAuthFlowTokenUrlRow`, …). Two places must agree on
which field belongs to which slot: the aggregator (to fill the slot) and the row (to read it).

**Problem.** That mapping is written twice. The data layer has it in
`SECURITY_FIELD_PLACEMENTS` (`building-service/security/tree-with-diffs/aggregation-tables.ts`):

```ts
scheme: Placement.SecuritySchemeHttpSchemeRow,
bearerFormat: Placement.SecuritySchemeBearerFormatRow,
tokenUrl: Placement.OAuthFlowTokenUrlRow, …
```

and the card has its own copy as anonymous tuples, plus the label and the "is a link" flag:

```ts
[visibility.showHttpScheme, 'scheme', SECURITY_PROP_LABELS.httpAuthorizationScheme, Placement.SecuritySchemeHttpSchemeRow, false],
[visibility.showTokenUrl, 'tokenUrl', Placement.OAuthFlowTokenUrlRow], …
```

Adding or renaming a card row means editing both packages in step; a mismatch compiles fine and
shows the wrong badge (or none) on that row.

**Fix.** One description of the card rows in the data layer:

1. Move the security placement tables from `building-service/security/tree-with-diffs/` to
   `model/security/` (building-service may import model; model may not import building-service).
2. Add `SecuritySchemeCardRows` next to `SecurityNodeVisibility`: for a scheme (and its flows) it
   returns the ordered list of prop rows — `{ key, node, field, label, placement, link }` — using
   the presentation's visibility and labels and the placement table.
3. The card maps that list to `fieldPropRow(...)`; the tuples go. The title, description,
   parameter-name label (with its highlighted place word), flow header and scope rows stay as they
   are — they are not table-shaped.

**Visible change:** none (same rows, same order, same badges).

## F10. Copy-pasted row accessors and a third marker rule

**Problem 1 — the same algorithm twice.** In `OpenApiRowDiffs`:

- `Operation.isDeprecatedOnSide` and `RequestBody.isRequiredStarVisibleOnSide` both answer "is
  this boolean flag true on this side": read the flag's diff → if it is not a rename, take the
  side's value; else take the merged value, if the node exists on that side. Only the field name
  differs (`deprecated` / `required`).
- `MediaType.takeChangesMarkerSummary` and `Response.takeChangesMarkerSummary` are identical
  (`hasNodeDiffs(node) ? node.descendantDiffsSummary : new Set()`).

**Problem 2 — a third rule in the viewer.** A selector option (media type, response code,
security alternative) shows a small round *marker* when something inside it changed. For media
types and response codes the rule lives in the accessors above: pass the option's `diffs` and its
descendant summary only (V9: a wholly added / removed option is shown by its border, not the
marker). The security toolbar applies its own rule inline in `SecurityToolbarRow`: a wholly
changed alternative gets only `diffs`; any other gets `diffs` **and its own** `diffsSummary` plus
the descendant summary. So the same visual element follows two rules, one of them in React.

**Fix.**

1. `NodeLevelRowDiffs.isFlagOnSide(node, field, side)` and `NodeLevelRowDiffs.takeChangesMarkerSummary(node)`
   on the shared base (`model/abstract/tree-with-diffs/row-diffs-base.ts`); the OpenAPI accessors
   call them (their public names stay, so no viewer change).
2. `SecurityRowDiffs.Alternative.takeOptionMarkers(alternative)` returns what the toolbar passes
   today, so the toolbar reads an accessor instead of deciding.
3. **Your decision:** keep the alternatives' current marker rule (no visible change), or make
   alternatives follow V9 like the other selectors. The second could change a marker on screen
   where an alternative's only change is its own field diff; it would need a screenshot run.

## F7. With-diffs transformer: hidden state and size

**Background.** The with-diffs transformer reads a *merged* document: one object that holds both
the before and the after version. For every value it must know on which sides it exists. The
answer for the selected operation (does it exist before, after, or both; was it wholly added /
removed; was its path renamed) is needed by almost every step below it.

**Problem 1 — the operation facts are hidden instance state.** `buildSpec` computes them once and
stores them in fields; every other method reads the fields instead of receiving them:

```ts
protected override buildSpec(context) {
  this.resolveOperationSides(context)   // writes this.operationSides, this.wholeOperationDiff, this.addressDiff
  const spec = super.buildSpec(context) // ...which calls buildRequest, buildResponses, buildSecurity...
}
protected override buildRequestBody(context) {
  const field = this.reader.readField(context.operation, 'requestBody', this.operationSides) // reads the field
}
```

The plain base class decides the call order, the with-diffs subclass relies on it, and nothing in
the method signatures shows the dependency (32 reads). The security builder is a separate class, so
it gets the same fields through callbacks the transformer hands it (`OpenApiSecurityDiffsHost`:
`operationSides: () => this.operationSides`, `setPresence: …`). Today this works because the tree
builder creates a new transformer per build and `buildSpec` always runs first — **there is no bug**;
the risk is the next change (a new override, a reuse of the instance, a step moved before
`buildSpec`) reading a stale or unset value without any compiler help.

**Fix 1.** Put the facts into the context object that every method already receives. The plain
transformer becomes generic over its context type; the with-diffs transformer builds the richer
context once and the compiler then guarantees every method has it:

```ts
class OpenApiSpecTransformer<C extends OpenApiOperationContext = OpenApiOperationContext> { … }

type OpenApiDiffsOperationContext = OpenApiOperationContext & {
  readonly sides: SideContext          // where the operation exists
  readonly wholeDiff?: Diff            // operation (or path item) wholly added / removed
  readonly addressDiff?: Diff          // path rename as a replace
  readonly fields: { responses, parameters, requestBody }  // looked up once, not 4× / 2× / 2×
}

class OpenApiSpecWithDiffsTransformer extends OpenApiSpecTransformer<OpenApiDiffsOperationContext> {
  protected override resolveOperation(…) { return { ...super.resolveOperation(…), sides, wholeDiff, … } }
  protected override buildRequestBody(context) { /* context.sides, context.fields.requestBody */ }
}
```

The security builder already receives the context in `build(context)`, so `operationSides` no
longer needs a callback. Fields removed: `operationSides`, `wholeOperationDiff`, `addressDiff`.

**Problem 2 — one class, many jobs.** Besides mapping OpenAPI fields to diff records, the class
also owns: section presence bookkeeping (a `WeakMap` + `writeSectionDiff` + merging), the body
content decoration (`decorateContent` + `decorateClonedExtensions`, ~90 lines with their own
precedence rules), boolean flag normalization (`deprecated`, `required`), the `externalDocs`
nested diff, the path-rename diff and the `5xx` / `5XX` range-code fallback. Each is correct, but
reading or changing one means reading 544 lines.

**Fix 2.** Move the two self-contained jobs into classes of their own, used by the transformer:

| New class | Takes over | Why it is separable |
| --- | --- | --- |
| `OpenApiSectionPresence` | the `WeakMap`, `presenceOf`, `mergePresence`, `writeSectionDiff` | pure bookkeeping "which sides does this section show anything on"; also replaces the `setPresence` callback of the security builder |
| `OpenApiContentWithDiffsDecorator` | `decorateContent`, `decorateClonedExtensions` | works on one `content` map and its owners only; used by request and response bodies alike |

Flag normalization moves next to the other side helpers (F8). The transformer keeps the
OpenAPI-specific overrides and lands at roughly the size of the plain transformer.

**Behaviour.** None changes. Coverage: the next-data-model unit tests (transformer, security,
presence cases) and, because this output drives every diff colour, the OpenAPI diffs screenshot
suites (`openapi-diffs-*`) should be run once after the change.

## F8. The before / after pair helpers

**Background.** `SideContext = { before: boolean, after: boolean }` answers "on which sides does
this exist". Building the diff records needs four operations on it, over and over:

| Operation | Meaning | Example |
| --- | --- | --- |
| empty | exists nowhere (start of an accumulation) | `{ before: false, after: false }` |
| intersect | exists on a side only if both inputs do | a flow exists where its card **and** its definition exist |
| union | exists on a side if either input does | Responses exist where any code **or** the extensions exist |
| accumulate | union over a list | a parameter group exists where any of its parameters exists |

**Problem.** There is no shared implementation, so each file writes its own, in four styles:

- **empty**: the literal `{ before: false, after: false }` 7× (transformer 5×, security builder 2×),
  next to an unused-for-this `NO_SIDES` constant (it is read-only, so it cannot be accumulated into);
- **intersect**: a private `intersect()` in the transformer **and** an exported free function
  `intersectSides()` in the security decorator — the same three lines twice;
- **union / accumulate**: a private `mergePresence()` used 7×, plus hand-written
  `presence.before ||= …; presence.after ||= …` 3×, plus one inline
  `{ before: a.before || b.before, after: a.after || b.after }`;
- **the side name** `'before' | 'after'` is written inline 4× in the synthesizer and once more as a
  private `type Side` in the layout planner;
- **replacing one entry of a diff record** (copy the record, delete the key, set the new diff,
  write it back with `Reflect.set`) is written twice — `decorateClonedExtensions` and the
  synthesizer's `replaceRecordEntry` — and both bypass `SideReader.writeRecord`, the method that
  owns writing records.

**Fix.** One small helper set next to `SideContext` in `building-service/shared/side-reader.ts`,
then replace the copies:

```ts
export type DiffSide = 'before' | 'after'

export class SideContexts {
  public static readonly NONE: SideContext = { before: false, after: false }
  public static readonly BOTH: SideContext = { before: true, after: true }
  public static intersect(a: SideContext, b: SideContext): SideContext { … }
  public static union(...contexts: readonly SideContext[]): SideContext { … }
}
// SideReader.replaceRecordEntry(owner, key, diff | undefined)
```

Accumulation becomes `presence = SideContexts.union(presence, next)` (or `union(...list)`), so no
mutable `{ before, after }` objects remain. Pure refactor: same values, no behaviour change; unit
tests are enough. F8 goes first because F7's new classes use these helpers.

## F5. The Body schema wrapper is built in React

**Background.** A Body's schema is not shown as the schema root itself: like AsyncAPI, the JSON
Schema viewer gets a synthetic object with one property `Type` holding the schema, so the schema's
type appears as the first row (`Type  object`).

**Problem.** `MediaTypeContentSection` builds that object on every selection change:

```ts
// MediaTypeContentSection.tsx
return layoutMode === SIDE_BY_SIDE_DIFFS_LAYOUT_MODE
  ? wrapJsonSchemaForDiffsViewer('Type', value.schema, OpenApiRowDiffs.Section.takeHeaderRowDiff(selected), diffMetaKeys)
  : wrapJsonSchemaForViewer('Type', value.schema)
// prepare-json-schema-to-jso-viewers.ts
{ type: 'object', properties: { Type: schema, [diffsMetaKey]: { Type: diff } } }   // a diff record written in React
```

The second line is diff composition in the view layer; the project rule says the data layer
prepares every diff. The parameter groups and response headers do the same kind of thing (a
synthetic object schema with records) in next-data-model (`OpenApiObjectSchemaSynthesizer` /
`OpenApiObjectSchemaWithDiffsSynthesizer`); the Body is the only OpenAPI schema prepared in React.

**Fix.** `OpenApiSpecTransformer.buildContent` stores the wrapped schema as the media type's
`schema` (the label `Type` from `OpenApiDisplayLabels`); `OpenApiContentWithDiffsDecorator`, which
already computes each option's presence diff, writes the `Type` record from that same diff. The
media-type `schema` is read only by `MediaTypeContentSection` and `OpenApiBlockEdges.hasSchema`, so
nothing else sees the change. The viewer passes `value.schema` to `OpenApiSchemaViewer` as the
parameter groups do. AsyncAPI's `MessageContentNodeViewer` uses the same helpers; it stays as it is
until the AsyncAPI review (the helpers stay for it). **Visible change:** none.

## F6. The Body elements are decided twice

**Problem.** The parent level must know a Body's first and last element before rendering it (to
plan the separators around it), and the Body plans its own elements inside:

```
request-blocks.tsx buildRequestBodyBlock          RequestBodyNodeViewer -> MediaTypeContentSection
  description shown?  showRequestBodyDescription     description shown?  showRequestBodyDescription  (again)
  title edge          requestBodyTitleRow            title edge          requestBodyTitleRow         (again, as a prop)
  description edge    descriptionRow                 description edge    descriptionRow              (again)
  selected media type resolveSelectedMediaType       selected media type resolveSelectedMediaType    (again)
  has a schema?       hasSchema (Reflect.get)        has a schema?       typeof value.schema check   (own copy)
  expanded?           isOpenApiSectionExpanded       expanded?           buildCollapsibleSectionElements (again)
  -> OpenApiBlockEdges.body -> head / tail           -> its own element list -> StackLayout
```

Today both sides agree, so nothing is wrong on screen. A change to one side only (say, a Body
description becomes hidden in simple mode) would leave the outer separator continuing the colour
of a row that is no longer drawn. The response side has the same pair, plus two fallbacks in
`ResponseBodyViewer` for "no `content` node" that cannot run: the block is only built when the
`content` node exists.

**Fix.** next-data-model `OpenApiBlockEdges.bodyElements(title, description, selectedMediaType,
state)` returns the ordered element list `[{ id: 'title', edge }, { id: 'description', edge }?,
{ id: 'schema', edge }?]` (collapsed: the title only); `body(...)` becomes the container of that list.
The block builder computes the list once and passes it to `MediaTypeContentSection`, which maps each
id to its row and renders, with no visibility, edge or schema decision of its own. The fallbacks are
removed. With F5 the schema check is "the media type has a (wrapped) schema", in one place.
**Visible change:** none.

## F11. Two root viewers with the same body

**Problem.** `OpenApiOperationViewer` and `OpenApiOperationDiffsViewer` differ in the tree builder,
three diff providers and the layout mode; the rest is a copy:

```tsx
<OpenApiViewerContext.Provider value={viewerContext}>
  <DisplayModeContext.Provider value={displayMode}>
    <LayoutModeContext.Provider value={DOCUMENT_LAYOUT_MODE /* or SIDE_BY_SIDE_DIFFS */}>
      <LevelContext.Provider value={0}>
        <LayoutSpacingContext.Provider value={viewerContext.spacing}>
          <div data-testid="openapi-operation-viewer" style={{
            '--separator-layout-nested-viewer-inset': `${viewerContext.spacing.nestedViewerInset}px`,
            '--collapsible-section-expander-width': `${viewerContext.spacing.sectionExpander.width}px`,
            '--openapi-section-content-indent': `${OpenApiSpacing.sectionContentIndent(viewerContext.spacing)}px`,
          }}>
```

A new root-level setting has to be added twice (batch 4 did exactly that for
`LayoutSpacingContext`). The CSS then reads the properties as `var(--..., 16px)`, `var(--..., 24px)`,
`var(--..., 4px)`: the fallbacks are the config defaults written a second time. They never apply
inside an OpenAPI root (the root always writes the properties), so they only mislead whoever
changes the config.

**Fix.** A presentational `OpenApiViewerRoot` (viewer folder) renders the common providers and the
root `div` from `viewerContext`, `layoutMode`, `testId` and children; the diffs root wraps it in its
three diff providers. One viewer-side helper `toOpenApiCssVariables(spacing)` builds the style
object: in the viewer, not as `OpenApiSpacing.toCssVariables` in next-data-model as first
suggested, because CSS property names are a view concern. The CSS rules drop their numeric
fallbacks (a missing property makes the declaration invalid, so the browser default applies; that
only happens outside a root that writes them, and `TitleRow.css` documents that a
`CollapsibleSection` usage needs the property). **Visible change:** none.

## F12, F14–F18. Smaller cleanups (batch 7: F12, F15–F18 done; F14 done in batch 8)

Checked against the code after batches 1–5; all six are still present.

**F12 — a container reads a diff field directly.** `ExtensionsTitleRow` passes
`diff: OpenApiRowDiffs.Section.takeHeaderRowDiff(node)` and, next to it,
`highlightingMode: node.diffs[NODE_LEVEL_DIFF_KEY]?.highlightingMode`. The two come from different
reads: the first is "whole add / remove only", the second takes the node-level diff of any action
(a rename too). Fix: read `highlightingMode` from the same diff that paints the row
(`diff?.highlightingMode`); no new accessor is needed, and the `NODE_LEVEL_DIFF_KEY` import goes.

**F14 — three copies of one aggregator cache.** `OpenApiNodeDiffsAggregatorFactory` and
`OpenApiNodeDiffsSeveritiesAggregatorFactory` each keep a lazy per-kind `Map`; the three other
OpenAPI factories hold a singleton; `SecurityNodeAggregators` (used by AsyncAPI) is a third copy of
the same thing. Three of the five `OpenApi*KindAny` classes are empty subclasses; the other two only
pass tables to the base constructor. The OpenAPI tables (`FIELD_PLACEMENTS`, `NODE_PLACEMENTS`,
`SYNTHETIC_FIELD_DIFF_KEYS`) sit inside aggregator files, while Security's moved to
`model/security/tree-with-diffs/placements.ts` (F4). Fix: one `RecordDrivenAggregatorRegistry<K>`
(building-service abstract) built from three table lookups (field keys, field placements, node
placements); OpenAPI and Security (so AsyncAPI) each get one instance; the `KindAny` classes and the
five factories go; the OpenAPI placement tables move to `model/openapi/tree-with-diffs/placements.ts`,
the synthetic keys to `building-service/openapi/tree-with-diffs/aggregation-tables.ts`. Touches the
shared Security module: AsyncAPI verified too.

**F15 — dead "complex node" path and a fragile sort.** *Update after F25: the complex path is used now (that part is cancelled) and the sort uses the new `sortNestedNodes`. Left: the transformer's sort; with it gone, `OpenApiResponseCode.sort` has no production caller (only its unit test), so it goes too and the test checks `compare` directly.* Every OpenAPI node is simple (I1) and no
OpenAPI crawl rule sets `complex`, yet the builder keeps a complex branch (`createNodeFromRaw`,
`takeComplexNode`, `isComplexTreeNode`) and the rule type still allows `complex?`. The transformer
sorts response codes into an object, which cannot keep that order (integer-like keys enumerate
first), and the builder then re-sorts by calling `.sort()` on the array `childrenNodes()` returns —
it works only because that getter happens to return the node's internal array. Fix: drop the
OpenAPI complex branch and `complex?` from the OpenAPI rule type (the shared hook factory still
requires its complex callbacks; they stay as the contract's minimal implementation); drop the
transformer sort; add an explicit `sortChildrenNodes(compare)` to the tree node contract (simple
node: its own list; complex node: its nested node) and use it. The contract change is shared by
every API type but adds a method only.

**F16 — selection defaults as free functions.** *Scope after F25: the resolvers now read options through `getOpenApiOptions` / `getSecurityAlternatives`; the rule becomes `OpenApiResponseCode.pickDefault(options, codeOf)` (generic over the option, so the viewer passes nodes and `option => String(option.key)`).* `utils/openapi/view-selection.ts` exports four free
functions; one of them holds a domain rule — the default response is the first `2XX`, else the
first (Q13). `resolveHttpMethodBadge` returns an inline `{ text, colorClass }` type. Fix: the rule
becomes `OpenApiResponseCode.pickDefault(...)` in next-data-model (next to `compare` / `sort`); the
view-selection functions become one `OpenApiViewSelection` static class; the badge result gets a
named `HttpMethodBadge` type. `tests/openapi-view-selection.test.ts` follows the rename.

**F17 — titles written in components.** `OpenApiDisplayLabels` says labels are resolved in the data
layer, yet `Request`, `Responses`, `Body`, `Headers` (response), `Operation ID` and `Security`
(`SECURITY_SECTION_TITLE`, also used by AsyncAPI) are constants in viewer files, and the card writes
`Show N unchanged row(s)` with its own copy of the plural rule that `ShowUnchangedRowContent` has
for nodes. Fix: the OpenAPI titles move to `OpenApiDisplayLabels`, the Security title to the shared
security labels (AsyncAPI reads it there too); one viewer helper `ShowUnchangedLabels.rows(n)` /
`.nodes(n)` for both texts (UI wording of a shared viewer control, so it stays in the viewer).

**F18 — colours in components.** `OperationNodeViewer` has `SECONDARY_TEXT_COLOR = '#626D82'`,
`SecuritySchemeCardBase` `MUTED_TEXT_COLOR = '#8F9EB4'`, `AddressRow` the same `#626D82` inline;
the Body and the security parameter rows repeat `<sup className="ml-0.5 text-red-500">*</sup>`.
Fix: one `TextColors` module in `shared-styles/colors/` (TypeScript, because `TextRow` takes a colour
string that ends up in an inline style; a CSS variable would change the markup) used by those three
files; a presentational `RequiredMark` component for the two OpenAPI / Security stars. The other
copies (JSON Schema title, legacy `RequiredStar` / `NullableAsterisk`, DDL / icon CSS) are left for
their own reviews.

**Visible change for all six:** none.

## F14, F21, F22, F24. Last cleanups (batch 8, done 2026-10-30)

Re-checked against the code after batch 7; three suggested fixes were revised (the table shows the
revised ones). Order: F24 → F22 → F21 → F14.

**F24 — dead meta set by a shape guess.** `OpenApiNodeDataBuilder.createNodeMeta(value)` writes
`unresolvedSecurityScheme` for any value that looks like an unresolved scheme (it gets no kind).
Nothing reads the field: the "unresolved" row comes from `value.isResolved`
(`SecurityNodeVisibility.resolveScheme` → `showUnresolved`). Fix: remove the field from
`OpenApiTreeNodeMeta` and the check; the meta is `{ _fragment }`. The suggested "set it from the kind"
would keep dead code and widen a method shared by every API type.

**F22 — two global caches that do nothing.** `LayoutPlanner` interns separators in a module-level
`SEPARATOR_CACHE`, `renderSeparatorRow` reuses elements from `ELEMENT_CACHE`; both are shared by every
viewer on the page and cleared at 1000 entries, and the planner calls itself pure. `SeparatorRow`'s
`memo` already compares `separator.signature` and the two frame positions, so re-render skipping does
not depend on either cache. Fix: delete both; `StackLayout` renders `SeparatorRow` directly;
`render-separator-row.tsx` (one caller) goes. Shared with AsyncAPI.

**F21 — the previous selection for one render.** `OperationNodeViewer` resets `selection` /
`collapsed` in a `useEffect` on `node`: the first render of a rebuilt tree uses the old state, React
commits it (node ids are path-based, so old selections match the new tree), then the effect resets
it and the whole operation renders again. `key={node.id}` would not reset at all for the same
reason. Fix: remember the node the state belongs to and reset during render
(`if (stateOwner !== node) { … }`) — React re-runs the component before its children render, so the
stale state is never committed. Unit test: rebuild the tree after a selection change; the first
committed output shows the default.

**F14** — as described in "F12, F14–F18" above (one `RecordDrivenAggregatorRegistry`, tables in
`placements.ts` / `aggregation-tables.ts`), now including the `securityAlternatives` kind.

**Visible change for all four:** none.

## F25. Selector options are not nested nodes

**Found** while answering a question about F15 (2026-10-30). The shared tree model has complex nodes
for exactly this case — a node whose content is one of several options — and AsyncAPI uses them
(message section selector, bindings). OpenAPI decided the opposite (I1: "all OpenAPI nodes are
simple"), so response codes, media types and security alternatives were ordinary children, while the
entity docs still described the complex shape (D2). **Rule (developer, 2026-10-30):** the options of a
selector are nested nodes of the complex container they belong to —
[../../shared/features/selector-options.md](../../shared/features/selector-options.md). I1 is superseded.

**Decisions (developer):** Security keeps `security` simple (it has its own value and the title row)
and gets a dedicated complex `securityAlternatives` container for the toolbar (option A, no change to
the tree contract); the media-type container is `content`; this refactor goes before batch 7.

## Fix log

### Batch 1 — mechanical cleanups (2026-10-29)

Approved: F13, F9, F19, F20, F23. One fix at a time; after each, `tsc --noEmit` and Jest in both
packages (all green, numbers below). No markup change by construction, so screenshot ITs were not
run.

| ID | Change | Deviation from the suggested fix |
| --- | --- | --- |
| F13 | Removed the three redundant `eslint-disable` comments. `copyExtensions` types its accumulator through `reduce<OpenApiExtensionsSpec>`. `OPENAPI_NODE_VALUE_PROPS` and `SECURITY_NODE_VALUE_PROPS` are per-kind mapped types (`OpenApiNodeValueProps`, `SecurityNodeValueProps`), and `OpenApiNodeDataBuilder.pickValue<K>` picks `OpenApiTreeNodeValue<K>` without a cast. `SecurityNodeAggregators` is a generic instance class with typed per-kind maps; AsyncAPI's five factories share `ASYNC_API_SECURITY_NODE_AGGREGATORS` (`async-api/tree-with-diffs/node-diffs-data/security-node-aggregators.ts`). | The AsyncAPI node-data builder keeps its own `as AnyAsyncApiNodeValueKey[]` cast (AsyncAPI scope). |
| F9 | `isKeyedOptionChange` (now a `diff is Diff` guard) replaces three inline add / remove / rename checks; `OpenApiResponseCode.isRange` replaces `RESPONSE_CODE_RANGE`; one `isNonEmptyString` guard in `utilities.ts` replaces four copies; `CUSTOM_ANNOTATIONS_KEY` is exported once; `OPENAPI_LOG_PREFIX` (`building-service/openapi/shared/log-prefix.ts`) is used by the builder, both transformers' messages and the security builder. | — |
| F19 | Named types: `OpenApiResolvedOperationKeys`, `ExtensionOwnerSides`, `OpenApiSectionViewState`, `MediaTypeContentDescription`, `Pick<OpenApiOperationOrientedSpec, 'externalDocs'>`, `OpenApiMediaTypeSpec` for the cloned-extensions parameter, `DisplayMode` instead of `ReturnType<typeof useDisplayMode>`; 14 component prop types named `…Props`. `node-visibility.ts` line 1 split. | The mutable presence accumulators (`{ before: boolean, after: boolean }`) and the `'before' \| 'after'` unions are left for F8 (`SideContexts`, `DiffSide`). |
| F20 | `OPENAPI_SECTION_ORDER`, every section switch and `PARAMETER_SECTION_LOCATIONS` use `OpenApiSectionIds`. | `OPENAPI_SECTION_IDS_BY_LEVEL` is **kept** as a second definition: it is the unit test's reference set (each order list must be a permutation of it), so deriving it from the order would make the test pass trivially. The operation header-row cases (`'title'`, …) stay literals of the typed union `OpenApiOperationHeaderRow` (exhaustive switch). The spec keys passed to `findOpenApiChild` (`'extensions'`, `'responsesExtensions'`) stay: no constant names the spec fields yet. |
| F23 | Builders moved out of component files into `extensions-blocks.tsx`, `parameters-blocks.tsx`, `request-blocks.tsx`, `responses-blocks.tsx`, `security-blocks.tsx` and the shared `Security/security-section-blocks.ts`; the response rows moved from `response-blocks.tsx` to `ResponseBodyViewer.tsx`. Component files export their components. Callers updated (`OperationNodeViewer`, `AsyncApiSecuritySection`). ESLint over the scope: 0 problems. | — |

Docs updated with the batch: `api-doc-viewer-authoring` (block modules, security pieces),
`next-data-model-authoring` (security aggregators instance), `docs/design/async-api/features/security.md`,
`docs/design/async-api/architecture/data-model-with-diffs.md`, `architecture/viewer-plain.md`.

After batch 1: next-data-model 44 suites / 778 tests, api-doc-viewer 12 suites / 117 tests, both
`tsc` clean.

### Batch 2 — side helpers and the with-diffs transformer (2026-10-29)

Approved: F8, then F7.

| ID | Change | Deviation from the suggested fix |
| --- | --- | --- |
| F8 | `building-service/shared/side-reader.ts`: `SideContexts` (`NONE`, `BOTH`, `intersect`, `union`) replaces `BOTH_SIDES`, the transformer's `NO_SIDES` / `intersect` / `mergePresence`, the decorator's free `intersectSides`, and every hand-written `{ before: false, after: false }` / `||=` accumulator (OpenAPI transformer and security builder, AsyncAPI security builder); accumulators are `presence = SideContexts.union(presence, next)`. `SideReader.replaceRecordEntry` replaces the two hand-written record replacements. `DiffSide` (`model/abstract/diff-side.ts`) replaces the inline `'before' \| 'after'` unions and the planner's `type Side`. | `DiffSide` lives in `model/abstract/`, not next to `SideContext`: the layout planner is model code and OpenAPI model files do not import building-service. |
| F7 | `OpenApiSpecWithDiffsTransformer` has no per-operation fields any more (`operationSides`, `wholeOperationDiff`, `addressDiff` removed): every step asks `OpenApiDiffsOperationFactsResolver.resolve(context)` (new, `openapi-diffs-operation-facts.ts`) for the facts of the context it is given — sides, whole diff, address diff, and the `responses` / `parameters` / `requestBody` fields read once. Section presence moved to `OpenApiSectionPresence` (`openapi-section-presence.ts`: the `WeakMap`, `of`, `set`, `writeSectionDiff`), body content to `OpenApiContentWithDiffsDecorator` (`openapi-content-with-diffs-decorator.ts`: `decorate`, cloned extensions). Flag normalization is `SideReader.normalizeFlagDiff`; the option-change predicate is `SideReader.isWholeChangeOrRename`. The security builder's host is now objects (`reader`, `operationFacts`, `presence`) instead of closures over transformer fields. Transformer: 544 → 367 lines. | **Facts resolver instead of a generic context type.** Making `OpenApiSpecTransformer` generic over its context has no type-safe default for the plain transformer: it needs an abstract base class, so the with-diffs transformer would stop extending the plain one (against D2 and `next-data-model-authoring`), and the generic would spread into the security spec builders. The resolver is a pure function of its context argument (cached per context object), which removes the same problems — no ordering dependency, no instance state, no callbacks, lookups done once — without touching any class hierarchy. |

**Equivalence check (no Docker needed).** The pre-review code (`dc56f8448`) was extracted with
`git archive` into a temporary folder next to `src/`, and a temporary Jest test built every fixture
with both versions and deep-compared the trees (node ids, kinds, keys, values, diffs, summaries,
descendant diffs, severities, children, symbol-keyed diff records, and the logged messages): all
254 `openapi-diffs` pairs and all 281 plain `openapi` samples, for every operation of each document
plus the no-operation-keys fallback — **536 / 536 equal**. This covers batches 1 and 2 together. To
prove the check can fail, `SideContexts.union` was broken on purpose: 254 / 254 diff cases failed;
restored byte-identical. The temporary test and the extracted copy were deleted. AsyncAPI is not
covered by this check (its pre-review factories import the security aggregators through the
`@apihub/` alias, which resolves to the current code); its unit tests pass.

After batch 2: next-data-model 44 suites / 778 tests, api-doc-viewer 12 suites / 117 tests, both
`tsc` clean, ESLint clean over the changed areas (two unrelated pre-existing errors in DDL / JSON
Schema files).

### Batch 3 — security card badges, card rows, marker rule (2026-10-30)

Approved: F3, F4, F10 as proposed; F10 marker rule aligned with V9 after measuring no difference.
All three are in the shared security module, so every change applies to AsyncAPI as well.

| ID | Change | Deviation from the suggested fix |
| --- | --- | --- |
| F3 | `DiffTypeOrder` (`model/abstract/tree-with-diffs/diff-type-order.ts`: `RANKS`, `compare`, `strongestType`, `strongestDiff`, `strongestChangedPropertyMetaData`, `toSeverity`) replaces `AbstractNodeDiffsSeveritiesAggregator`'s `DIFF_TYPE_SEVERITIES` / `compareDiffTypes` / `maxDiffByDiffType` / `maxChangedPropertyMetaDataByDiffType` and the record-driven `toSeverity` at every call site (15 files: abstract, OpenAPI, AsyncAPI, DDL, JSON Schema, side reader, JSON Schema combiner row diffs — which no longer imports building-service — and the AsyncAPI `MessageChannelServerNodeViewer`); the viewer's `compareDiffTypes` uses it and `CHANGE_SEVERITIES` is removed. `SecurityScopeRow` gains `severity` (strongest of own / required diff via `toSeverity`, else the inherited block badge) and `ownRowDiff`; the card renders them (`severityOf`, `strongestDiff` and the identity check removed). `SecurityToolbar` takes `isShownOnSide` from the new `SecurityRowDiffs.Security.isToolbarShownOnSide`. | The move covers **all** ndm users, not only "the aggregators", because leaving delegating statics would be the alias the repo rules forbid; the JSO builder's private ordering copy is left (JSO scope, follow-up). The inherited badge keeps today's exact rule: a wholly added / removed flow → the flow's title-row badge; a wholly replaced flow → its own replace (the card's former identity check only differed there); required-only scopes → the scheme's title-row badge. |
| F4 | Placement type `FieldPlacements` + `FieldPlacementsTable.primary` (`model/abstract/tree-with-diffs/field-placements.ts`) replaces `RecordDrivenFieldPlacements`. `SECURITY_FIELD_PLACEMENTS` / `SECURITY_NODE_PLACEMENTS` moved to `model/security/tree-with-diffs/placements.ts` (synthetic keys stay in building-service). `SecuritySchemeCardRows` (`model/security/card-rows.ts`: `schemeProps`, `flowProps`, `parameterNamePlacement`) returns the card's `label  value` rows — including AsyncAPI's `API key location` — with placements read from the table; the card renders the lists, tuple tables and placement literals removed. | The parameter-name row stays hand-written (its label highlights the place word) but reads its placement from the table too. Also fixed: `SecurityNodeVisibility` had a fifth private `hasText` copy missed by F9 — now `isNonEmptyString`. |
| F10 | `NodeLevelRowDiffs.isFlagOnSide` and `NodeLevelRowDiffs.takeChangesMarkerSummary` on the shared base; `OpenApiRowDiffs.Operation.isDeprecatedOnSide`, `RequestBody.isRequiredStarVisibleOnSide`, `MediaType` / `Response.takeChangesMarkerSummary` delegate (names kept). The security toolbar options use `takeChangesMarkerSummary` — the V9 rule of every selector. | No `SecurityRowDiffs.Alternative.takeOptionMarkers`: the toolbar follows the existing response-code pattern (`diffs` + the accessor's marker summary), which keeps `Selector`'s `NodeDiffs<V>` typing; the rule lives in the one base accessor. **V9 decision:** today's inline rule and V9 were computed for all 571 alternatives of both API types on both sides — 0 differences — so the toolbar aligned with V9, no visible change. |

**Verification.** Baseline = the pre-batch-3 `src` copied with its 689 `@apihub/` alias imports
(162 files) rewritten to relative paths, so the old AsyncAPI code really ran. A temporary Jest
test compared, for every fixture:

| Check | Scope | Result |
| --- | --- | --- |
| Trees (as in batch 2) | 254 OpenAPI diff + 281 plain, 202 AsyncAPI diff + 26 plain fixtures | 764 / 764 equal |
| Scope rows: badge type, block badge identity, description highlighter, all other row fields | 1026 rows of both API types | equal; 57 of 57 badges now carry `causedAt` (before: none) |
| Toolbar sides | 1098 sides | equal |
| Card rows (key, field, label, placement, link, formatter output) | 1826 scheme + 1300 flow evaluations, both display modes, 721 rows | equal |
| Toolbar markers as `Selector` draws them (today / V9 / new code) | 571 alternatives × 2 sides | equal |
| OpenAPI flags and marker summaries vs baseline accessors | 5044 checks | equal |

Each check was proven able to fail by a deliberate break, then restored byte-identical: inherited
badge rule off → 14 failing fixtures; one placement swapped in the shared table → 328 (the trees
change too, since the aggregators read the same table); `isFlagOnSide` inverted → 456. Temporary
test and baseline copy deleted. New permanent tests: `tests/unit-tests/security-card-rows.test.ts`
(8: card rows and placements, AsyncAPI formatter, scope-row badge cause for OpenAPI and AsyncAPI,
toolbar side, V9 markers).

**Visible change:** scope-row badges show `caused by …` on hover; nothing else.

After batch 3 (temporary checks removed): next-data-model 45 suites / 786 tests (778 + 8 new),
api-doc-viewer 12 suites / 117 tests, both
`tsc` clean, ESLint clean over the changed areas (the same two pre-existing DDL / JSON Schema
errors in files this batch did not touch).

### Batch 4 — the shared spacing engine and shared row names (2026-10-30)

Approved: F1, F2 as proposed. Both touch shared modules, so every change applies to AsyncAPI as well.

| ID | Change | Deviation from the suggested fix |
| --- | --- | --- |
| F1 | ndm `model/abstract/layout/` (new): `types.ts` (`LayoutSideTone`, `LayoutEdgeTones`, `LayoutElementKind`, `LayoutBlockEdge(Pair)`, `LayoutBlock`, `SharedLayoutLevel` = `security` / `section` / `card`, `LayoutBand`, `LayoutBadgeSegment`, `LayoutSeparatorRow`, `LayoutFrameRow`, `LayoutPlanOptions`, `LayoutItem`), `planner.ts` (`LayoutPlanner`, generic over the level), `spacing-config.ts` (`LayoutSpacingConfig<TLevel>`, `DEFAULT_LAYOUT_SPACING_CONFIG`), `block-edges.ts` (`BlockEdges`: `tones`, `severityOf`, `row`, `nested`, `card`, `single`, `container`, `sectionTitleRow`; `LayoutPaintedRow`). `model/security/block-edges.ts` (new): `SecurityBlockEdges extends BlockEdges` (`toolbarRow`, `titleRow`). `model/openapi/layout/` keeps `OpenApiLayoutLevel` (shared + `operation` / `operationHeader` / `request` / `responses`), `OpenApiSectionViewState`, `OpenApiSpacingConfig` (= `LayoutSpacingConfig<OpenApiLayoutLevel>` + `nestedViewerInset` / `viewerEdges` / `sectionExpander`; the default spreads the shared one), `OpenApiSpacing`, `OpenApiBlockEdges extends BlockEdges` (operation header, Responses, Body, description edges). Viewer: `OpenApiOperationViewer/OpenApiLayout.tsx` → `shared-components/Layout/StackLayout.tsx` (`StackLayout`, `StackBlock`); `contexts/LayoutSpacingContext.ts` (`useLayoutSpacing` throws without a provider); the OpenAPI roots provide `viewerContext.spacing`, both AsyncAPI roots `DEFAULT_LAYOUT_SPACING_CONFIG`; `SecuritySchemeCardBase` reads `useLayoutSpacing()` instead of `useOpenApiViewerContext()`; `Separator/*` and `SecurityRows` use the `Layout*` types. | `StackLayout.level` is a `string`: the context holds a config of any API type, so the level literal is no longer checked against one API type's levels at the call site (the planner itself stays generic over `TLevel`; a wrong level would give a `NaN` gap, caught by the render check). OpenAPI containers keep calling the inherited generic edges as `OpenApiBlockEdges.single(…)` etc.; shared code calls `BlockEdges` / `SecurityBlockEdges`. The security edges are named `toolbarRow` / `titleRow` (the class already says "security"). |
| F2 | `PrecededBy.OPENAPI_ROW` / `OPENAPI_NESTED_VIEWER_START` → `SEPARATOR_LAYOUT_ROW` (`separator-layout-row`) / `SEPARATOR_LAYOUT_NESTED_VIEWER_START`, with the `preceded-by.css` selectors (incl. the `^="separator-layout-"` prefix rule, which matches the same two members as before). `TitleRowUsage.OpenApiSection` → `CollapsibleSection` (`collapsible-section`); the fixed expander-column rule moved from `CollapsibleSection.css` to the new `TitleRow/TitleRow.css` (imported by `TitleRowContent`). `X_AXIS_PADDING_ROWS_ASYNC_API` → `X_AXIS_PADDING_ROWS` (15 files: the definition, 14 users incl. two DDL components; plus a `frame.css` comment). | Two CSS custom properties renamed with them, because their rules moved into shared CSS: `--openapi-section-expander-width` → `--collapsible-section-expander-width`, `--openapi-nested-viewer-inset` → `--separator-layout-nested-viewer-inset` (both still written by the OpenAPI roots from `OpenApiSpacingConfig`). `--openapi-section-content-indent` stays (OpenAPI CSS only). |

**Verification.** Baseline = the pre-batch-4 `src` of both packages, with their 1637 alias imports
(401 files) rewritten to relative paths. A temporary Jest test rendered the OpenAPI and AsyncAPI
viewers (plain and diffs, every fixture, every operation, both display modes) to HTML with
`react-dom/server`, for the current and the baseline code, and compared the strings. The five
renamed attribute values (`data-precededby` ×2, `data-usage`, the two custom properties) were mapped
on the baseline side; nothing else was.

| Check | Scope | Result |
| --- | --- | --- |
| Rendered HTML | 764 fixture cases, 1530 renders (48 M characters); 670 OpenAPI and 104 AsyncAPI renders with security cards, 1178 with separator rows | 764 / 764 equal |
| The check can fail | AsyncAPI diffs root given `cardInnerInset: 9` | AsyncAPI security fixtures differ; restored byte-identical |

The harness was first run on two identical copies (764 / 764) before the change. Not covered by the
HTML comparison: the CSS files themselves. The selectors were renamed one-to-one with the attribute
values above, and the moved expander rule is unchanged apart from its selector value and custom
property. Temporary test, stubs, config and baseline copy deleted.

**Visible change:** none. The screenshot suites of both API types (Docker, on the developer's side)
are the final check of the CSS part.

After batch 4: next-data-model 45 suites / 786 tests, api-doc-viewer 12 suites / 117 tests, both `tsc`
clean, ESLint clean over the changed areas (the remaining errors and warnings are in files this
batch did not touch).

### Batch 5 — Body schema, Body elements, root viewers (2026-10-30)

Approved: F5, F6, F11 as proposed. OpenAPI only; AsyncAPI is unaffected (its payload keeps the
viewer-side wrapper until its own review).

| ID | Change | Deviation from the suggested fix |
| --- | --- | --- |
| F5 | `OpenApiMediaTypeSchema` (`model/openapi/media-type-schema.ts`: `take`, `has`, `wrap(mediaType, diffsMetaKey?)`) builds the `Type` wrapper and, with the diffs key, its record `{ Type: SectionRowDiffs.takeHeaderRowDiff(mediaType).data }`; the label is `OpenApiDisplayLabels.WRAPPED_BODY_SCHEMA_TITLE`. `MediaTypeContentSection` only memoises the call; it no longer imports `wrapJsonSchemaForViewer` / `wrapJsonSchemaForDiffsViewer`. | **Model accessor instead of the transformer.** The `Type` row is painted with the media type's *aggregated* whole diff, which is inherited from a wholly added / removed owner (operation, response, request body) by the record-driven aggregator. The transformer only knows the option's own presence diff (`OpenApiContentWithDiffsDecorator`), whose diff type can differ; writing the record there would change badges or copy the inheritance chain into the transformer. The accessor reads the same diff the option and the Body edges use, from the built tree, so the record is still prepared in next-data-model and is identical to before. |
| F6 | `OpenApiBlockEdges.bodyElements(title, description, selectedMediaType, state)` returns the ordered `OpenApiBodyElements` (`title`, `description?`, `schema?` carrying its media type; collapsed: `title`); `body(elements)` takes the outer edges from it; `hasSchema` removed (`OpenApiMediaTypeSchema.has`). `buildRequestBodyBlock` and the new `buildResponseBodyBlock` compute the list once and pass it to `RequestBodyNodeViewer` / `ResponseBodyViewer` → `MediaTypeContentSection` (props `elements`, `renderDescription`; `titleEdge`, `description` and `MediaTypeContentDescription` removed), which maps each element to its row and indents content with the newly exported `indentSectionContent` (no expansion re-check). `ResponseBodyViewer` takes `content` as a prop; its two unreachable fallbacks are removed. | A `description` element always renders its block (empty if no renderer was passed) rather than being dropped, so the element list and the rendered blocks cannot disagree. |
| F11 | `OpenApiViewerRoot.tsx` (presentational): `OpenApiViewerContext`, `DisplayModeContext`, `LayoutModeContext`, `LevelContext`, `LayoutSpacingContext` and the root `div` with `toOpenApiCssVariables(spacing)`; both roots render it, the diffs root inside `DiffMetaKeysContext` / `DiffTypesContext` / `UnchangedBlocksContext`. `OperationNode` exported from `OperationNodeViewer`. The `16px` / `24px` / `4px` fallbacks removed from `TitleRow.css`, `CollapsibleSection.css`, `preceded-by.css`. | The CSS-variable helper is a private function of `OpenApiViewerRoot` (viewer), not `OpenApiSpacing.toCssVariables` in next-data-model: CSS property names are a view concern. `UnchangedBlocksContext` now sits outside `OpenApiViewerContext` (context order has no effect on rendering; it was inside before). |

**Verification.** The batch 4 render harness, rebuilt on the pre-batch-5 code (1648 alias imports in
402 files rewritten), first run on identical copies (764 / 764). After each finding:

| Check | Scope | Result |
| --- | --- | --- |
| Rendered HTML, old vs new, no renames | 764 cases, 1530 renders (298 with a Body schema; 670 OpenAPI + 104 AsyncAPI with security cards) | 764 / 764 equal after F5, after F6, after F11 |
| F5 can fail | `Type` record dropped | 16 OpenAPI diff cases differ |
| F6 can fail | `bodyElements` drops the description element (parent edges and render together) | 302 OpenAPI cases differ |
| F11 can fail | root writes expander width + 1 | 535 cases differ (every OpenAPI case, no AsyncAPI case) |

Each break restored byte-identical; harness and baseline copy deleted. Not covered by the HTML
comparison: the removed CSS fallbacks (unused inside a root by construction) — the screenshot suites
are the final check. New unit tests: `openapi-media-type-schema.test.ts` (4: wrapper, own add,
inherited add of a wholly added Body, no record for an inner change); `openapi-layout.test.ts` Body
test rewritten for `bodyElements` / `body(elements)`.

**Visible change:** none.

After batch 5: next-data-model 46 suites / 790 tests, api-doc-viewer 12 suites / 117 tests, both
`tsc` clean, ESLint clean over the changed files (one pre-existing warning in `TitleRowContent.tsx`).

### Batch 6 — selector options are nested nodes (F25, 2026-10-30)

Approved: option A (container node for Security), `content` as the media-type container, refactor
before the other cleanups. The Security part is in the shared module, so AsyncAPI changed too.

| Area | Change |
| --- | --- |
| Design (first) | New shared rule `docs/design/shared/features/selector-options.md` (+ index); I1 marked superseded; entity tables (`security`, `responses`, `request-body`), `data-model-plain.md` (diagram, crawl rules, options note), `data-model-with-diffs.md`, AsyncAPI `features/security.md`; `AGENTS.md` always-on convention |
| Crawl rules | `responses` and `content` `complex: true`; shared `getSecurityCrawlRules`: `/alternatives` becomes the `securityAlternatives` node, `complex: true` |
| Kinds / values | `SecurityTreeNodeKinds.SECURITY_ALTERNATIVES`, `SecurityTreeNodeValueTypeAlternatives` (no value), value props `[]` (OpenAPI table entry) |
| Records | `SecuritySpecDiffsDecorator.writeAlternativesRecord(alternatives, record)` replaces `writeAlternativesDiff`: the per-alternative entries and the toolbar's `SECURITY_ALTERNATIVES_DIFF_KEY` go on the `alternatives` list (the container's crawl value); `security` keeps `allowsAnonymous` / its whole diff. Both builders (OpenAPI, AsyncAPI) use it; AsyncAPI's section-presence causes read the alternatives record as before |
| Tables | toolbar field key and `SelectorRow` placement moved to the container kind (`SECURITY_SYNTHETIC_FIELD_DIFF_KEYS`, `SECURITY_FIELD_PLACEMENTS`, `SECURITY_NODE_PLACEMENTS`); `security` keeps `TitleRow` |
| Tree contract | `ITreeNode.sortNestedNodes(compare)` (simple and with-diffs nodes); `sortResponseCodes` uses it — the old `.childrenNodes().sort()` would now have sorted the first response's children |
| Accessors / edges | `SecurityRowDiffs.Alternatives` (`takeToolbarRowDiff`, `isToolbarShownOnSide`) on the container, replacing the two `Security.*` methods; `SecurityBlockEdges.toolbarRow(alternatives)` |
| Viewer | `getOpenApiOptions(container, guard)`; `findSecurityAlternatives`, `getSecurityToolbarOptions`, `getSecurityAlternatives`, `isSecurityAlternativesNode`; `view-selection`, `ResponsesNodeViewer`, `security-blocks`, `SecurityToolbarRow` / `buildSecurityToolbarBlock` (take the container), `OpenApiSecurityToolbarRow`, `AsyncApiSecuritySection` |
| Tests | 9 unit-test files follow the new shape (option reads through `nestedNodes()`, toolbar accessors on the container); new `selector-options.test.ts` (5: shape, parent / container links, order, records on the container, inheritance, AsyncAPI) |

**Verification.** Baselines of both packages taken before any change.

| Check | Scope | Result |
| --- | --- | --- |
| Tree structure, old vs new (nested nodes as children, `securityAlternatives` folded into `security`, parent entries first; container values excluded) | 763 OpenAPI + AsyncAPI fixture cases, plain and diffs; 10311 nodes, 2129 complex (270 before, all AsyncAPI), 402 Security containers | 763 / 763 equal: ids, order, values, diffs, descendant diffs, severities, both summaries |
| Rendered HTML, old vs new, no renames | 1530 renders; 670 OpenAPI + 104 AsyncAPI with security alternatives, 1072 with response codes, 738 with media types | 763 / 763 byte-identical |
| The render check can fail | `responses` not complex / the alternatives record not written | 534 OpenAPI cases differ / 14 diffs cases (4 AsyncAPI) differ |

Both harnesses validated on identical copies first (763 / 763), then deleted with their baselines.
Audit: no remaining `childrenNodes()` / `value()` read on a container in the OpenAPI, Security or
AsyncAPI viewer code or the OpenAPI / Security model.

**Visible change:** none. **Tree shape:** the AsyncAPI Security section gains one level
(`security → securityAlternatives → securityRequirement`) — a host walking AsyncAPI security nodes
directly must follow it (changelog). OpenAPI trees are new on this branch.

**Effect on the open findings:** F15's "dead complex path" is cancelled (the path is used now) and its
sort part is done (`sortNestedNodes`); left: the transformer's useless sort. F14's tables gained the
container kind. D2: the complex `content` / `responses` descriptions are now correct and the
`OPENAPI_COMPLEX_KINDS_WITH_VALUE` paragraph is replaced; the rest of D2 stays open.

After batch 6: next-data-model 47 suites / 795 tests, api-doc-viewer 12 suites / 117 tests, both
`tsc` clean, ESLint clean over the changed files (the 3 errors left are in untouched DDL / JSON
Schema test files).

### Batch 7 — smaller cleanups F12, F15–F18 (2026-10-30)

Approved: F12, F15–F18 as proposed (F14 follows separately).

| ID | Change | Deviation from the suggested fix |
| --- | --- | --- |
| F12 | `ExtensionsTitleRow` reads `highlightingMode` from the diff that paints the row (`OpenApiRowDiffs.Section.takeHeaderRowDiff(node)?.highlightingMode`); the raw `node.diffs[NODE_LEVEL_DIFF_KEY]` read and its imports removed | No new accessor: the mode comes from the same diff object |
| F15 | The transformer keeps response codes in document order (its `OpenApiResponseCode.sort` had no effect on an object); `OpenApiResponseCode.sort` removed (no production caller); its test sorts with `compare`. The tree order comes from `sortNestedNodes` (batch 6) | The "dead complex path" part was cancelled by F25 |
| F16 | `OpenApiResponseCode.pickDefault(options, codeOf)` (next-data-model, Q13: first `2XX`, else the first); `OpenApiViewSelection` static class (`alternative`, `response`, `mediaTypes`, `mediaType`) replaces the four free functions at every call site (9 files + the view-selection test); `HttpMethodBadge` type for `resolveHttpMethodBadge`; unit test for `pickDefault` | `pickDefault` reads the class from the option's code (`resolveClass`), the same function the transformer uses for `codeClass` |
| F17 | `OpenApiDisplayLabels.REQUEST_TITLE`, `RESPONSES_TITLE`, `BODY_TITLE`, `RESPONSE_HEADERS_TITLE`, `OPERATION_ID_LABEL` replace five viewer constants; `SECURITY_SECTION_TITLE` moved to `model/security/display/labels.ts` (OpenAPI and AsyncAPI read it there); `ShowUnchangedLabels.nodes(n)` / `.rows(n)` (`shared-components/ShowUnchangedRow/show-unchanged-labels.ts`) replace the two plural rules | — |
| F18 | `TextColors.SECONDARY` / `.MUTED` (`shared-styles/colors/text-colors.ts`) in `OperationNodeViewer`, `SecuritySchemeCardBase` and `AddressRow` (three places, shared with AsyncAPI); `RequiredMark` (`shared-components/RequiredMark/`) for the Body and security scope stars | `TextColors` is a static class like the label classes. The other copies (JSON Schema title, legacy `RequiredStar` / `NullableAsterisk`, DDL / icon CSS) are left for their own reviews |

**Verification.** Baselines of both packages taken before the batch; both harnesses validated on
identical copies first (763 / 763 each).

| Step | Tree comparison (763 cases, plain + diffs, OpenAPI + AsyncAPI) | Render-HTML comparison (1530 renders) | Deliberate break |
| --- | --- | --- | --- |
| F12 + F15 | 763 / 763 equal | 763 / 763 byte-identical | tree sort skipped → 1 case differs (the code-order fixture). F12: dropping the mode changes **no** HTML in any fixture — the mode has no static effect on this row; F12 is equal by construction (same diff object when the row is painted, no painting otherwise) |
| F16 | 763 / 763 | 763 / 763 | `pickDefault` returns the first code → 3 cases differ |
| F17 + F18 | 763 / 763 | 763 / 763 | colour token changed → 763 differ; rows wording changed → 228 differ |

Temporary harnesses and baselines deleted. **Visible change:** none.

After batch 7: next-data-model 47 suites / 796 tests, api-doc-viewer 12 suites / 117 tests, both `tsc`
clean, ESLint clean over the changed files (the 3 errors left are in untouched DDL / JSON Schema
test files).

### Batch 8 — last cleanups F24, F22, F21, F14 (2026-10-30)

Approved: F24 → F22 → F21 → F14 with the revised fixes ("F14, F21, F22, F24" above).

| ID | Change | Deviation from the suggested fix |
| --- | --- | --- |
| F24 | `OpenApiTreeNodeMeta.unresolvedSecurityScheme` and the shape check in `OpenApiNodeDataBuilder.createNodeMeta` removed; the meta is `{ _fragment }` | Deleted rather than "set from the kind" (no reader) |
| F22 | `SEPARATOR_CACHE` (planner) and `ELEMENT_CACHE` (`render-separator-row.tsx`, deleted) removed; `StackLayout` renders `SeparatorRow` directly; the planner builds a plain separator with its `signature`; the layout unit test checks equal signatures instead of one object | Both caches deleted (the memo already compares the signature) |
| F21 | `OperationNodeViewer` resets `selection` / `collapsed` during render when the operation node object changes (`stateOwner !== node`); the `useEffect` is gone | Not `key={node.id}` (would never reset) |
| F14 | `RecordDrivenAggregatorRegistry<V, K, M, T>` + `RecordDrivenAggregationTables<T>` next to the record-driven aggregators; OpenAPI: `OPENAPI_AGGREGATION_TABLES` (`building-service/openapi/tree-with-diffs/aggregation-tables.ts`), `OPENAPI_FIELD_PLACEMENTS` / `OPENAPI_NODE_PLACEMENTS` (`model/openapi/tree-with-diffs/placements.ts`), one registry in the with-diffs builder; Security: `SECURITY_AGGREGATION_TABLES`, AsyncAPI's `ASYNC_API_SECURITY_NODE_AGGREGATORS` is a registry. Deleted: `factories.ts`, the five OpenAPI `KindAny` files, `SecurityNodeAggregators`. New unit test `record-driven-aggregator-registry.test.ts` | The registry has a fourth type parameter `T` (the tables' kind): AsyncAPI's tree kind is not the Security kind |

**Verification.** Baselines of both packages taken before the batch; both harnesses validated on
identical copies first (763 / 763 each).

| Step | Tree comparison (763 cases) | Render-HTML comparison (1530 renders) | Deliberate break |
| --- | --- | --- | --- |
| F24 | 763 / 763 equal | 763 / 763 byte-identical | No fixture references a missing scheme (counted: 0 unresolved values), so a synthetic operation with `security: [{ missing: [] }]` was added to the harness: equal trees; with the meta compared too it differs (the removed field) |
| F22 | — (data unchanged) | 763 / 763 | HTML cannot see re-render skipping; equal by construction (`SeparatorRow`'s memo compares the signature, which encodes every band and badge segment) |
| F21 | — | 763 / 763 | Client render in jsdom (temporary; jsdom borrowed from a sibling workspace repository, the scroll strip stubbed — its own layout effect adds a pre-paint commit): select `404`, rebuild the tree. Old code: 2 commits, 1 showing `404`. New: 1 commit, 0 |
| F14 | 763 / 763 | 763 / 763 | `RESPONSE` field placement removed → 4 cases differ; Security node placements emptied in `SECURITY_AGGREGATION_TABLES` → 14 AsyncAPI security cases differ; the new unit test fails when OpenAPI drops the Security synthetic keys |

Temporary harnesses and baselines deleted. **Visible change:** none (F21 removes a one-frame flash
after a rebuild; no fixture or screenshot shows it).

After batch 8: next-data-model 48 suites / 799 tests, api-doc-viewer 12 suites / 117 tests, both `tsc`
clean, ESLint clean over the changed files.

**Not covered by a committed test: F21.** The viewer package has no DOM test environment (Jest
`testEnvironment: 'node'`, no jsdom / react-test-renderer); a regression test needs a dev dependency
(`jest-environment-jsdom`) — see Configuration proposals.

### Batch 9 — design pages match the code (D2, 2026-10-30)

Approved: D2 as proposed — the review scope extended from the diagrams to the entity and feature
pages. Only "where it lives" changed; every rule, table, fixture list and example was kept.

| Page | Change |
| --- | --- |
| `features/diffs.md` | Pipeline: per-section steps with the real collaborators (`OpenApiDiffsOperationFactsResolver`, `OpenApiObjectSchemaWithDiffsSynthesizer`, `OpenApiContentWithDiffsDecorator`, `OpenApiSecuritySpecWithDiffsBuilder`, `OpenApiSectionPresence`), then the rollup. Address key `path` (I4). "Node diff aggregation" rewritten for the record-driven design (registry, tables, families; a table of where each formerly planned `Kind*` semantic lives). Inheritance named after `RecordDrivenNodeDiffsAggregator`. Accessor table: Security accessors under `SecurityRowDiffs`, the current operation-row signatures, missing accessors added. Row visibility: no with-diffs visibility managers. Unit tests: only existing files, plus a "not covered by a dedicated unit test" list. Inline sample files |
| `entities/request-body.md` | `required` normalization in `buildRequestBody` (`SideReader.normalizeFlagDiff`); `RequiredMark`; visibility from `OpenApiNodeVisibility` + diffs |
| `entities/responses.md` | change-marker pseudocode names `RecordDrivenNodeDescendantDiffsSummaryAggregator`; headers via `buildParametersBlock`; presence via `OpenApiSectionPresence`; visibility as for the request body |
| `entities/parameters.md` | `buildParametersBlock`; the group's whole add / remove from `OpenApiSectionPresence.writeSectionDiff` |
| `entities/security.md` | effective security in `OpenApiSecuritySpecBuilder.build`; `SecurityOAuthFlowSpec`; `SecuritySectionBase.tsx` / `security-section-blocks.ts`; **card frame and spacing rows rewritten** (frame rows `first` / `last`, every content row and separator `middle`; 8px between rows and flow parts) |
| `entities/operation.md` | header-row spacing: one element per row at the `operationHeader` level, no row padding |
| `features/operation-viewer.md` | `OPEN_API_HTTP_METHODS_ORDER`; value rules instead of "visibility manager"; `buildResponseBlocks`; the Security files; the current node-type-checker helpers |

**One rule disagreement found and resolved by the newer approved design.** `entities/security.md` said
flow parts are 20px apart (10 + 10) and card rows carry row padding; `features/vertical-gaps.md`
(approved and implemented 2026-10-16, D3) set 8px and separator rows, and the code follows it. The
entity page now points to vertical-gaps §6. No code changed.

**Verification.** A temporary name check (every backticked code name on the pages — classes,
constants, `A.b` members, calls, `.ts` / `.tsx` files — must exist in the two packages or the samples'
`src`; UI labels such as `Optional` / `Header` excluded): the committed `features/diffs.md` reports 18
missing names, the six D2 pages 41 in total before the batch; after it, every OpenAPI entity page,
`features/diffs.md` and `features/operation-viewer.md` report 0. Prose names (outside backticks)
checked by a word search (`resolver`, `visibility manager`, `KindAny`, `row padding`, `step 4 / 5`). No
code, so no tree / render comparison.

Left: a code comment in `shared/openapi/types/http-method.ts` names `OPEN_API_HTTP_METHODS` (the
constant is `OPEN_API_HTTP_METHODS_ORDER`) — a one-word code fix outside this docs-only batch.

## Configuration proposals (for approval; not changed)

| Proposal | Why |
| --- | --- |
| Set `@typescript-eslint/no-explicit-any` to `error` in `.eslintrc.json` (it is `off`). | The shared rules forbid `any`; the OpenAPI scope has none and the repository has 8 occurrences, so enforcing it is cheap and keeps new stacks clean. |
| Add `jest-environment-jsdom` (dev) to api-doc-viewer and allow `@jest-environment jsdom` per test file. | Viewer state behaviour (F21: no stale selection after a rebuild) can only be tested with a client render; today it was checked with a temporary harness only. |

## Proposed fix order

1. F13, F9, F19, F20, F23 — mechanical, no behaviour change, low risk.
2. F8 → F7 — side-context helpers first, then the transformer split (unit tests + diff suite).
3. F3 → F4 → F10 — security severities and row descriptors (AsyncAPI security ITs must stay unchanged).
4. F1 → F2 — layout generalization and shared-row names (both API types' ITs).
5. F5, F6, F11, F12, F14–F18, F21, F22, F24.

Each fix: type-check and both packages' Jest suites; screenshot ITs where markup can change (F1–F6, F11, F18).

## Verification (baseline, before any fix)

Run from each package directory with the root binaries (`node_modules/.bin/` of the repository):

| Package | `tsc --noEmit` | Jest |
| --- | --- | --- |
| next-data-model | clean | 44 suites, 778 tests passed |
| api-doc-viewer | clean | 12 suites, 117 tests passed |

ESLint over the scope: 0 errors, 11 `react-refresh` warnings (F23). With `--no-inline-config`, the
plain transformer reports no error, confirming F13.

## Lessons

- A layout engine first written for one API type became shared through one import from a shared
  component; check imports into `shared-components/` from API-type folders as part of every review.
- "Viewer consumes" was held well for row diffs but not for severities; severities are where the
  rule erodes first, because a component that composes rows also wants their badges.
- Design step 9 (rewrite after implementation) still pending made the diagrams the least reliable
  source; the review fixed them, and batch 9 the entity and feature pages (D2). Two approved designs
  can disagree (an entity page and a later feature redesign): the later approved one wins, and the
  older page must be updated in the same change.
