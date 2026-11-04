# OpenAPI implementation decisions (2026-10)

The first implementation of the OpenAPI stack was done without follow-up questions: when the
design left a choice open or did not fit the code, the implementer chose. This note records each
choice, the alternatives it rejected, and where the code is. **Where it disagrees with an older
statement in this folder, this note wins** until the main documents are rewritten (step 9 of
the [implementation plan](../README.md#implementation-plan)).

Paths: `ndm/` = `packages/next-data-model/src/`, `viewer/` =
`packages/api-doc-viewer/src/components/OpenApiOperationViewer/`.

## Data layer (next-data-model)

| # | Decision | Rejected alternatives | Why |
| --- | --- | --- | --- |
| I1 | **Superseded 2026-10-30 (review F25):** selector options are nested nodes of a complex container — [../../shared/features/selector-options.md](../../shared/features/selector-options.md). Original decision: **All OpenAPI tree nodes are simple.** Options (alternatives, schemes, media types, responses) are ordinary children. | `security`, `content`, `responses` as complex nodes (the entity tables in [../entities/](../entities/) and [../architecture/data-model-plain.md](../architecture/data-model-plain.md)); an allow-list of complex kinds that keep a value (`OPENAPI_COMPLEX_KINDS_WITH_VALUE`). | A complex node carries `value: null` and makes everything under it a nested node. That breaks `security.isInheritedFromDocument` and forces the `responsesExtensions` workaround. The viewer picks options by kind guard (`getOpenApiChildren`), so it does not need complex semantics. |
| I2 | **One `KindAny` aggregator per family** (`node-diffs`, `node-descendant-diffs`, `node-diffs-summary`, `node-descendant-diffs-summary`, `node-diffs-severities`), with a per-kind instance. *Form updated by review F14 (2026-10-30): the per-family classes and factories became one `RecordDrivenAggregatorRegistry` built from `OPENAPI_AGGREGATION_TABLES`; the decision (one table-driven family, no per-kind classes) stands.* | One class per kind per family (`KindOperation`, `KindRequestBody`, …), as listed in [../features/diffs.md](../features/diffs.md). | The with-diffs transformer already writes every diff where its row reads it (synthetic whole-section diffs, normalized flags, field records). The remaining aggregation is the same for every kind. Per-kind data lives in two tables: the field allow-list `OPENAPI_NODE_VALUE_PROPS` and `FIELD_PLACEMENTS` / `NODE_PLACEMENTS` in the severities aggregator. |
| I3 | **Section presence is computed inside `OpenApiSpecWithDiffsTransformer`** (a `WeakMap` from each built section to its per-side presence, plus `writeSectionDiff`). | A separate `OpenApiSectionPresenceResolver` class run as pipeline step 4. | Presence is a by-product of the per-side reconstruction the transformer already does. A separate pass would rebuild the same side contexts. The rule set is the one in [../features/diffs.md](../features/diffs.md#section-presence-and-whole-section-changes). A raw whole-section diff from `apiDiff` wins over the synthetic one and is its cause (`responses/07` severity). |
| I4 | **The address diff is keyed `path`** (a value prop of the operation node). A `paths` rename becomes a `replace` of `path`. | A dedicated `address` field, or a viewer-side comparison of the two keys. | The generic field aggregation and the `AddressRow` severity placement cover it with no special case. |
| I5 | **Row visibility lives in one class**, `ndm/model/openapi/node-visibility.ts` (`OpenApiNodeVisibility`). It is a set of pure functions over a node value. | Per-kind visibility managers under `building-service/openapi/tree/node-visibility-data/` (D6 wording). | A merged value keeps removed content (E18), so the same function serves the plain and the merged tree. Nothing needs builder state. This still meets the goal of D6: no visibility logic in React. |
| I6 | **The changes markers of response codes read the rollup directly.** `OpenApiTreeWithDiffsBuilder` does not call `mergeAggregatedDiffTypesIntoDescendantSummary`. | Merging the aggregated types into the descendant summary, as JSON Schema does. | The merge would re-add the whole-response diff, which must be left out of the marker ([../entities/responses.md](../entities/responses.md)). `OpenApiRowDiffs.Response.takeChangesMarkerSummary` is the only reader. |
| I7 | **The title-row synthetic replace for `deprecated` / `requestBody.required` is built in the accessors** (`OpenApiChangedPropertyMetaData.buildRowReplace`). | Storing it as a node diff in the aggregator. | It is a presentation of the flag diff, not a separate diff. Storing it would double-count it in the summaries and severities. |
| I8 | **Extensions of an owner that exists on one side only get per-key presence diffs.** The diffs are written into the extensions object, so the JSO tree paints every key. | Only a whole-section diff on the Extensions header. | The nested `JsoDiffsViewer` reads per-key records; without them, a wholly added operation would show uncolored extension rows. |
| I9 | **`externalDocs` changes nested under a whole-object record become one synthetic `externalDocs` diff** (`resolveNestedExternalDocsDiff`). A description-only change does not paint the row (Q16 working default). **Superseded 2026-10-15:** Q16 decided as option A — any `externalDocs` replace paints the row yellow and highlights the link text. | Painting the row on any `externalDocs` change. | Q16 is still open; the working default from [../README.md](../README.md#open-questions) is implemented as written. |
| I10 | **New side accessors in `OpenApiRowDiffs`:** `NodeLevel.resolveSideField(node, field, side)` (string as shown on a side) and `SecurityScheme.takeTypeBadgeDiff(node)`. | Reading `diff.beforeValue` / `afterValue` in the card component. | Viewer-consumes rule: no diff re-derivation in React. |
| I11 | **Revised 2026-10-14:** a security scheme `type` change paints the card title row with a synthetic yellow `replace` and highlights the gray type text. The row diff is a value-less copy of the type diff (`takeTitleRowDiff`), so `TextValue` has no string `beforeValue` to substitute and the origin title keeps the scheme name. | Painting the title row with the raw `type` diff; painting nothing (the first implementation). | The raw diff would make the origin title read the before type; painting nothing hid the change from the row. |
| I12 | **Q12 (media type of a `content`-described parameter):** implemented with the working default, a `customAnnotations` row `Media type` in both modes. | `topLevelPropsMediaTypes` badge (plain only). | The only option that works in the diffs viewer; Q12 stays open for the product owner. |

## Viewer (api-doc-viewer)

| # | Decision | Rejected alternatives | Why |
| --- | --- | --- | --- |
| V1 | **`MediaTypeContentSection`** (`viewer/MediaTypeContentSection.tsx`) renders the whole Body block: `Body` h3 with the side-exclusive `*`, the `required` tag, and the media-type selector in the subheader, then an optional description slot and the wrapped `Type` schema. Request and response bodies share it. | A header-only `MediaTypeContentHeader` + a separate `MediaTypeSchemaViewer`, as named in [../features/operation-viewer.md](../features/operation-viewer.md). | The header and the schema share the selected option and the wrapping diff. One component keeps the selection and the schema together. |
| V2 | **The required `*` is a `<sup>` rendered next to a `TextValue` in `titleContent`**, driven by `OpenApiRowDiffs.RequestBody.isRequiredStarVisibleOnSide`. | Reusing `RequiredStar`. | `RequiredStar` takes api-data-model `DiffRecord` types and re-derives the side rule from a raw diff, which the new stack must not depend on. |
| V3 | **`OpenApiSchemaViewer`** (`viewer/OpenApiSchemaViewer.tsx`) is the single nested JSON Schema viewer. It picks plain or diffs by layout mode and forwards `expandedDepth` / `hideUnchangedNodes` from `OpenApiViewerContext`. | Choosing the viewer inside each section, as AsyncAPI `MessageContentNodeViewer` does. | Four sections (parameter groups, response headers, two bodies) would repeat the same branch. |
| V4 | **`ParametersNodeViewer` also renders response Headers** (title passed in). | A separate `ResponseHeadersNodeViewer`. | Both are an h3 title + a synthesized object schema with the same diff rules. |
| V5 | **Superseded 2026-10-13:** the alternatives selector is the shared `SecurityToolbar` (`shared-components/Security/`): a non-wrapping, scrolling options strip with one-option arrow steps and cropped titles ([../features/security-redesign.md](../features/security-redesign.md), [../entities/security.md](../entities/security.md#security-toolbar)). The former `StandaloneSelectorRow` was removed. | A selector in the Security title subheader. | The toolbar is a row of its own, always shown (Q6), and has its own `SelectorRow` severity placement. |
| V6 | **Card frame:** each card row gets `framePosition(side)`. Positions are computed in one pass over the rows the card renders (`SecuritySchemeCard`). `frame.css` is imported only by the card. **The gap between two cards is a spacer `div`**, not a `data-precededby` padding. **Superseded 2026-10-15:** the card begins and ends with content-less frame rows (border in the middle, whole-card colour) that hold the space around it; no separators next to a card ([../features/block-separators.md](../features/block-separators.md)). | Padding through a `SECURITY_SCHEME_CARD` preceded-by rule (it still exists for the title row's inner spacing). | Padding on the next card's title row would sit **inside** its top border; only a spacer separates two frames. |
| V7 | **Superseded 2026-10-13:** security values are label / value **security props** in one grid per card. OAuth scopes are 2nd-level rows under an expandable `Scopes` row in each flow part: required scopes get `*`, and in diffs a `required` badge after the description. Row and required diffs per scope are derived in the data layer (`OpenApiRowDiffs.OAuthFlow.resolveScopeRows`) from the `scopes` map and `requiredScopes` diffs, with no transformer change. | Chip lists with tooltips (the first implementation). | Approved redesign ([../features/security-redesign.md](../features/security-redesign.md)). |
| V8 | **Response media-type selection is kept per response** in `ResponsesNodeViewer` (a map from response node id to media-type node id). It resets when the operation node changes. | Resetting the media type on every code switch. | Switching between codes to compare should not lose the chosen media type. |
| V9 | **Response-code options pass `diffs` and the marker summary only** (no `diffsSummary`). | Passing the node's own summary as well. | Markers show inner changes only; a whole add / remove is shown by the option color (Selector diff classes). |
| V10 | **The Request Body section is rendered when the body node exists**, even with no media type (description only). The selector then renders nothing. | Hiding Body without media types. | The design shows Body when it has a description *or* a schema; the data layer already drops a body with neither. |
| V11 | **`ExtensionsSection` renders a fragment unless given a `testId`.** AsyncAPI keeps its exact DOM; OpenAPI passes test ids. | A wrapper `div` everywhere. | AsyncAPI screenshot ITs must stay unchanged (plan step 4 exit criterion). |

## Stories and tests

| # | Decision | Rejected alternatives | Why |
| --- | --- | --- | --- |
| T1 | **The plain suite is generated** (2026-10-12) by `bin/generate-openapi-suite.mjs` from `bin/openapi-plain-case-definitions.mjs`: E2E section combinations (all pairs + consecutive windows + all sections), minimal operations, one field per case, document structure, and OAS 3.1 differences ([../features/plain-case-matrix.md](../features/plain-case-matrix.md)). Each story names its operation (`path` + `method`). Display mode, auto-switch, and no-heading are story controls; ITs capture every case in `detailed` and `simple` and select the case's options with `switchOpenApiOptions` (the combiner auto-switch pattern). | Nine hand-written multi-concern fixtures; one export per display mode. | Mixed fixtures were hard to review and hid ordering bugs (see the response-code order below). |
| T2 | **The diffs suite is generated** (2026-10-10) by `bin/generate-openapi-diffs-suite.mjs` from `bin/openapi-diffs-case-definitions.mjs`: 251 cases in 11 folders, opposites adjacent, one shared case list per fragment family, the matrix in [../features/diffs-case-matrix.md](../features/diffs-case-matrix.md). Stories use `POST` and the first `paths` key of the after document. | Hand-written YAML pairs (the first 60 cases). | ~250 cases with shared ids across fragments cannot be kept consistent by hand. |
| T3 | **Diff stories use api-diff's `DIFF_META_KEY` / `DIFFS_AGGREGATED_META_KEY`**, because `mergeOpenApiDocuments` already writes `DIFF_META_KEY`. | `TEST_DIFF_META_KEYS`. | One merge helper, no second `apiDiff` call. |
| T4 | **IT story ids are derived from the Storybook title and export name** (`openapi-operation-suite-oas-3-0-e2e--case-168-all-sections`, …). They were not checked against a running `index.json`. **No baseline snapshots are committed**: Docker is not available in the implementing environment. | — | Run `pnpm run regenerate-screenshots` (or `regenerate-screenshots-single-suite`) and review the images before merging. |
| T5 | **The runtime check without a browser was a smoke render**: an `esbuild` bundle + `react-dom/server` over all 11 plain operations and 60 diff fixtures (2026-10-10: all 251 generated diff cases in both display modes) (no throw, no React error). It is not committed. | Adding jsdom to the repository. | No DOM test environment exists in the package; adding one is out of scope. |
| T6 | **Viewer unit tests** (`packages/api-doc-viewer/tests/openapi-viewer-config.test.ts`) cover the section-order permutations, the Headers → Extensions → Body order, the response-code tones, and the HTTP method badge config. Data-layer tests cover the new side accessors. | — | CSS-free, fast, per the testing skill. |

## Disagreements found (not changed)

- `AGENTS.md` says `generate-stories` / `generate-tests` must call only the compatibility-suite
  generators, but `packages/api-doc-viewer/package.json` also ran
  `bin/generate-ddl-suite-stories.mjs` / `bin/generate-ddl-suite-tests.mjs` (since `aed5117aa`).
  **Resolved 2026-10-09:** removed from the npm scripts. The generators stay and are run by hand
  after changing `packages/samples/ddlapi/` (as `AGENTS.md`, the testing skill, and the DDL
  catalogue already describe); regenerating showed no drift in the committed output.
- `JsoPropertyNodeViewer` logs React's "unique key" warning for array values (seen in the smoke
  render of `oas30/01-full-operation` extensions). This is an existing JSO component; it was not
  changed (legacy rule).
- `pnpm exec eslint src` in `packages/api-doc-viewer` reports errors in existing files (DDL, GraphQL,
  generated JSON Schema ITs); every OpenAPI file lints clean.
- Two generated cases, `oas31/04-role-scopes-added` / `05-role-scopes-removed`, produce no `apiDiff`
  diff: role scopes on a non-OAuth scheme are not compared in OAS 3.1, so both sides show the after
  roles. Recorded in the case titles; an api-diff issue, not a viewer one.
- `bin/storybook-story-id-utils.mjs` imported `sanitize` from `@storybook/csf`, which is not
  installed (Storybook 9 ships it as `storybook/internal/csf`); every generator importing the util
  failed. Fixed to `storybook/internal/csf`.

- **Response-code order bug (found by `oas30/structure/04-response-code-order`, fixed 2026-10-12).**
  The transformer sorted codes canonically into an object, but JS enumerates integer-like keys
  (`200`, `500`) before all other keys, so ranges (`2XX`) and `default` always came after every
  numeric code. `OpenApiTreeBuilder` now sorts the `responses` node children with
  `OpenApiResponseCode.compare` after the crawl (with-diffs inherits it); a unit test covers it.

## Still open

- Q12, Q16 (product decisions; working defaults implemented).
- Screenshot baselines (T4) and a visual review of the frame, tones, and spacing.
- Step 9 of the plan: rewrite the entity and architecture documents to match I1–I3, I5, and V1, and
  update the skills and `AGENTS.md`.
