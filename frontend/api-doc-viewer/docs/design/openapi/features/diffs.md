# OpenAPI operation diffs

How `OpenApiOperationDiffsViewer` gets and paints diffs. Status: **implemented** (first iteration; deviations in [../notes/2026-10-implementation-decisions.md](../notes/2026-10-implementation-decisions.md)). Shared contracts:
[data model with diffs](../../shared/architecture/data-model-with-diffs.md),
[viewer with diffs](../../shared/architecture/viewer-with-diffs.md),
[section header colorizing](../../shared/features/section-header-colorizing.md). Measured diff
locations: [../notes/2026-10-design-analysis.md](../notes/2026-10-design-analysis.md).

## Pipeline

```text
merged apiDiff document (whole documents, components kept)
  → OpenApiSpecWithDiffsTransformer (the plain transformer's build hooks, overridden per section)
      per section, bottom-up (options → Body → group → Request; codes → Responses):
        a. relocate the section's diff records onto the spec   (tables below) under diffsMetaKey
           facts read once per operation: OpenApiDiffsOperationFactsResolver (sides, whole diff,
           address diff, the responses / parameters / requestBody fields)
        b. synthesize parameter / header schemas with diffs     (OpenApiObjectSchemaWithDiffsSynthesizer)
        c. body content: media-type options, cloned extensions  (OpenApiContentWithDiffsDecorator)
        d. security: alternatives and their records             (OpenApiSecuritySpecWithDiffsBuilder → SecuritySpecDiffsDecorator)
        e. presence per side → synthetic section add / remove   (OpenApiSectionPresence: set / of / writeSectionDiff)
      then aggregateDiffsWithRollup(spec, diffsMetaKey, aggregatedDiffsMetaKey)   ← on the TRANSFORMED spec
  → OpenApiTreeWithDiffsBuilder (assignNodeDiffs per node: one RecordDrivenAggregatorRegistry)
  → OpenApiOperationDiffsViewer → containers read OpenApiRowDiffs accessors
  → nested JsonSchemaDiffsViewer / JsoDiffsViewer continue inside schemas and extensions
```

The rollup must run on the transformed spec (AsyncAPI comment: "It is IMPORTANT to aggregate diffs
on TRANSFORMED DOCUMENT"), otherwise rollups miss relocated and synthesized records.

## Diff sources

Paths are inside the merged document; `M` = `diffsMetaKey`, `op` = `paths[path][method]`.

### Operation

| UI | Merged-document source | Transformed-spec key |
| --- | --- | --- |
| Whole operation added / removed | `paths[path][M][method]` (`add` / `remove`); else `paths[M][path]` (`add` / `remove` of the whole path item — default `apiDiff`; with `openApiPathItemPerOperationDiffs: true` it is per method instead, E2) | root `M[""]` (node-level) |
| Address (path renamed) | `paths[M][path]` with `action: rename` (`beforeKey` → `afterKey`, E1) | root `M.path` as a **`replace`** with `beforeValue = beforeKey`, `afterValue = afterKey`, same `type` / declaration paths (`path` is a value prop of the operation, I4) |
| Title | `op[M].summary` | root `M.title` |
| Operation ID row | `op[M].operationId` | root `M.operationId` |
| Deprecated tag (title row; without a title the operation ID row, else the address row) | `op[M].deprecated` (a missing value is the unifier default `false`; normalize like `required`) | root `M.deprecated` → tag diff + synthetic yellow replace on the row that carries the tag; its severity merged into that row's placement (`TitleRow` / `OperationIdRowWithDeprecatedTag` / `AddressRowWithDeprecatedTag`) |
| Description | `op[M].description` | root `M.description` |
| External docs | `op[M].externalDocs` (whole), or `op.externalDocs[M].url` / `op.externalDocs[M].description` | root `M.externalDocs` (whole), or `externalDocs[M].url` / `externalDocs[M].description` |
| Extensions | `op[M]['x-…']` | `data.extensions[M]['x-…']` |

A path rename keeps the operation node itself unchanged (not a whole-node diff); only the address
row is painted. The renamed path parameter inside is a separate diff (parameters table).

### Security

Full table in [../entities/security.md](../entities/security.md#with-diffs).

### Parameters and response headers

Full table in [../entities/parameters.md](../entities/parameters.md#with-diffs). Group nodes get
no field diffs of their own; their header is colored by the section rule over the synthesized
properties.

### Request body and responses

| UI | Merged-document source | Transformed-spec key |
| --- | --- | --- |
| Request body added / removed | `op[M].requestBody` | `data.request[M].requestBody` → `requestBody` node-level |
| Request body description | `op.requestBody[M].description` | `requestBody[M].description` |
| Request body required | `op.requestBody[M].required` | `requestBody[M].required` → side-exclusive `*`, `required` tag, title-row synthetic replace ([request-body.md](../entities/request-body.md#required-marker)) |
| Media type added / removed / renamed | `….content[M][mediaType]` (`rename` keyed by the after key, E6) | `content[M][mediaType]` → `mediaType` node-level |
| Schema inside a media type | `….content[mt].schema` and deeper | untouched (merged schema object is passed on) |
| Response added / removed / renamed (case) | `op.responses[M][code]` (`rename` keyed by the after key, E6) | `responses[M][code]` → `response` node-level |
| Response description | `op.responses[code][M].description` | `response[M].description` |
| Response headers added as a whole | `op.responses[code][M].headers` | synthesizer stamps every header property |
| Response header added / removed | `op.responses[code].headers[M][name]` | synthesizer → `properties[M][name]` |
| Request Body Object `x-*` | `op.requestBody[M]['x-…']` | cloned into every request media type's schema root, per-key precedence ([request-body.md](../entities/request-body.md#extensions)) |
| Media Type Object `x-*` (request, response) | `….content[mt][M]['x-…']` | cloned into that schema root, per-key precedence |
| Response Object `x-*` | `op.responses[code][M]['x-…']` | `response.extensions[M]` → response **Extensions** subsection |
| Responses Object `x-*` | `op.responses[M]['x-…']` | `data.responsesExtensions[M]` → Responses **Extensions** subsection |

## Node diff aggregation

**Record-driven** (I2): every kind-specific diff semantic is prepared by the with-diffs transformer as
plain diff records on the spec; the aggregators only read the records and map them to rows. There are
no per-kind aggregator classes. One `RecordDrivenAggregatorRegistry`
(`building-service/abstract/tree-with-diffs/node-diffs-data/record-driven-aggregators.ts`) per API
type hands out the five aggregators per kind, built from `OPENAPI_AGGREGATION_TABLES`
(`building-service/openapi/tree-with-diffs/aggregation-tables.ts`):

| Table | Content |
| --- | --- |
| field diff keys | the kind's value props (`OPENAPI_NODE_VALUE_PROPS`) + its synthetic row keys (`OPENAPI_MEDIA_TYPE_OPTIONS_DIFF_KEY`, `OPENAPI_RESPONSE_OPTIONS_DIFF_KEY`, the Security `SECURITY_ALTERNATIVES_DIFF_KEY`) |
| field placements | `OPENAPI_FIELD_PLACEMENTS` (`model/openapi/tree-with-diffs/placements.ts`, the Security tables spread in) |
| node placements | `OPENAPI_NODE_PLACEMENTS` (the rows a wholly added / removed node badges; default the title row) |

| Family | Record-driven aggregator | What it reads |
| --- | --- | --- |
| `nodeDiffs` | `RecordDrivenNodeDiffsAggregator` | inheritance (below), then the node's own record: `""` and the table's field keys |
| `descendantDiffs` | `RecordDrivenNodeDescendantDiffsAggregator` | child key → diff from the node's own record (option / section / scheme add, remove, rename) |
| `diffsSummary` | `RecordDrivenNodeDiffsSummaryAggregator` | the node's own diff types |
| `descendantDiffsSummary` | `RecordDrivenNodeDescendantDiffsSummaryAggregator` | the rollup (`aggregatedDiffsMetaKey`) of the transformed value; ∅ for a wholly added / removed node (own or inherited) — the response-code / media-type change markers ([responses.md](../entities/responses.md#change-markers-on-response-code-options)) |
| `severities` | `RecordDrivenNodeDiffsSeveritiesAggregator` | one severity per placement (below) |

Where the per-kind semantics live instead (all in the with-diffs transformer and its collaborators):

| Kind semantics (formerly planned as `Kind*` classes) | Done by |
| --- | --- |
| Operation: address (`path`), `operationId`, `externalDocs`, `deprecated` flag | `OpenApiSpecWithDiffsTransformer.buildSpec` (address from `OpenApiDiffsOperationFactsResolver`, flags via `SideReader.normalizeFlagDiff`); the title-row / tag-row synthetic replace is a row accessor (`OpenApiRowDiffs.Operation`) |
| Request Body `required` (boolean semantics) | `buildRequestBody` (`SideReader.normalizeFlagDiff`) |
| Whole-section add / remove of every section | `OpenApiSectionPresence.writeSectionDiff` ([below](#section-presence-and-whole-section-changes)) |
| Option add / remove / rename (media types, response codes) and the selector's synthetic row diff | `OpenApiContentWithDiffsDecorator.decorate`, `buildResponses` — records on the complex container (`content`, `responses`) |
| Security alternatives, schemes, flows, scopes | `OpenApiSecuritySpecWithDiffsBuilder` + `SecuritySpecDiffsDecorator` (shared with AsyncAPI); scope rows: `SecurityRowDiffs` |
| Descendant summaries of nested-viewer content (parameters, headers, schemas, extensions) | the rollup on the transformed spec; `mergeAggregatedDiffTypesIntoDescendantSummary` is **not** called (I6: inferred and stamped diffs are not "changes inside") |

### Inheritance (`RecordDrivenNodeDiffsAggregator`)

The AsyncAPI `AsyncApiNodeDiffsAggregatorKindAny` rule; the owner is `container ?? parent` (a
selector option's container, else the parent):

1. A wholly **added / removed** owner → the child
   inherits that diff with `inherited: true` and aggregation stops.
2. Otherwise the child takes `owner.descendantDiffs[key]` as its node-level diff (an option added
   to a selector, a scheme added to an alternative, …).
3. A **rename** under the node-level key (media type, response code) is **not** a whole-node change:
   aggregation continues and the node's own field diffs are still collected (JSON Schema
   node-key-rename rule). Consumers that need "whole node changed" use
   `OpenApiRowDiffs.NodeLevel.takeWholeNodeDiff` (node-level diff except `rename`).

### Section presence and whole-section changes

In the diffs viewer every row exists in both columns. What a section shows on **one side** depends
on whether it has displayable content on that side — not on whether its raw OpenAPI object exists,
and not on where `apiDiff` attached a diff. The same intent lands at different depths (E19):
removing the only media type is a `content[M][mt]` remove, removing a response's whole `content` is
one `content` remove, deleting a `headers` map is one `remove` **per header** (the unifier default
`headers: {}` exists on the after side), and in none of these cases does the diff sit on the
section's own object.

**Presence.** Each section kind has a presence predicate `present(side)` over the reconstructed
side values (per-side reconstruction: [parameters.md, step 1](../entities/parameters.md#step-1--reconstruct-each-side-from-the-merged-entry)):

| Section (node) | `present(side)` — the section has on that side… | Not counted |
| --- | --- | --- |
| Security (`security`) | ≥1 effective alternative (operation list, or the document list when not overridden) | — |
| Security card (`securityScheme`) | the scheme in the selected alternative | — |
| Extensions (`extensions`) | ≥1 `x-*` key | — |
| Request (`request`) | a present parameter group **or** a present request Body | — |
| Parameter group (`parameters`), response Headers (`responseHeaders`) | ≥1 entry | — |
| Request Body (`requestBody`) | a non-empty `description` **or** ≥1 media type option (below) | `required` alone; media types without `schema` |
| Media type option (`mediaType`, request and response) | `schema` (any value, incl. `true` / `false` / `{}`) | the media-type key alone |
| Response Body (part of `response`) | ≥1 media type option | — |
| Responses (`responses`) | ≥1 response code **or** ≥1 Responses Object `x-*` | — |
| Response / Responses Extensions (`extensions` under `response` / `responsesExtensions`) | ≥1 `x-*` key | — |
| Response option (`response`) | the code exists | — |

A media type without `schema` is **not** content (product decision, 2026-10-08): it is not a
selector option in either mode, and a Body made only of such media types (and no description) is
not rendered.

**Whole-section diff.** `OpenApiSectionPresence` (`building-service/openapi/shared/openapi-section-presence.ts`,
called by the with-diffs transformer while it builds each section) evaluates every section bottom-up
(options → Body → group → Request; codes → Responses) — `set` / `of` keep each built section's
presence per side — and `writeSectionDiff` writes a **synthetic node-level diff** into the parent's
diff record under the section key — the place the node-diffs inheritance reads it from
(`parent.descendantDiffs[key]`):

| `present(before)` | `present(after)` | Section | Synthetic diff |
| :---: | :---: | --- | --- |
| ✓ | ✗ | wholly **removed** | `remove`; `beforeValue` = the section's before value |
| ✗ | ✓ | wholly **added** | `add`; `afterValue` = the section's after value |
| ✓ | ✓ | changed inside (or unchanged) | none — inner diffs paint their own rows; the header stays uncolored |
| ✗ | ✗ | not rendered at all | none — even if raw diffs exist inside (e.g. a schema-less media type added) |

- A raw add / remove already on the section object (`requestBody` removed, a response removed, the
  whole operation added) yields the same result; `writeSectionDiff` keeps the raw diff instead of a
  synthetic one.
- Synthetic diff metadata: `type` = the highest type among the raw diffs that caused the change;
  declaration paths from those diffs.
- Through the node-diffs inheritance every row of a wholly added / removed section takes the section
  diff: header and rows green / red on the side that has them, hidden (grey, no content) on the
  other. Inner raw diffs are not shown on top (aggregation stops on inherited add / remove).
- The header severity (`TitleRow` placement) is built from the **same** diff object.

**Relation to the shared rule.** This is the
[section header colorizing](../../shared/features/section-header-colorizing.md) rule with
"children" widened to **everything the section displays**: rule (a) = a raw add / remove on the
section or an ancestor; rule (b) "every child uniformly added / removed" = `present` flips. It is
stricter where it must be: a Body whose media types were all added while its description stayed is
**not** wholly added (`present` is true on both sides). Mixed sets never flip `present` in one
direction, so the AsyncAPI first-diff-only bug (`kind-parameters.ts` / `kind-extensions.ts`,
fixture `request-headers/03-entry-renamed`) cannot happen. Removed children are present in merged
values (E3), so counts use the merged set reconstructed per side.

Cases (fixtures in `packages/samples/openapi-diffs/`):

| Fixture | Change | Result |
| --- | --- | --- |
| `request-body/02-body-removed` | `requestBody` removed | Body wholly removed (raw diff) |
| `request-body/12-only-media-type-removed` | the only media type removed, no description | Body wholly removed (synthetic) |
| `request-body/16-schema-removed` | the only media type loses its `schema`, no description | option wholly removed → Body wholly removed (synthetic) |
| `request-body/15-schema-added` | symmetric | option and Body wholly added (synthetic) |
| `request-body/14-media-type-removed-description-kept` | the only media type removed, description stays | Body present on both sides; option removed; header uncolored |
| `response-body/02-body-removed` | response `content` removed | response Body wholly removed; the response option itself unchanged (code still exists) |
| `response-body/16-schema-removed` | the only media type loses its `schema` | response Body wholly removed |
| `response-headers/20-all-removed` | `headers` map deleted (arrives as per-header removes) | response Headers wholly removed |
| `request-headers/20-all-removed` | every header parameter removed | Headers group wholly removed |
| `request-headers/03-entry-renamed` | one header removed, one added | present on both sides → header uncolored |
| `security/02-security-removed` | `security: []` | Security wholly removed |

### Severity placements

New `NodeDiffsSeverityPlacemennt` members (`model/abstract/tree-with-diffs/tree-node.interface.ts`),
each with a doc comment naming its row:

| Member | Value | Row |
| --- | --- | --- |
| `ExternalDocsRow` | `external-docs-row` | external docs link |
| `OperationIdRow` | `operation-id-row` | operation ID row under the title |
| `SelectorRow` | `selector-row` | the security toolbar (media-type selectors sit in Body title subheaders and use `TitleRow`) |
| `SecuritySchemeParameterNameRow` | `security-scheme-parameter-name-row` | apiKey `<Place> parameter name` (`name` and `in` changes) |
| `SecuritySchemeHttpSchemeRow` | `security-scheme-http-scheme-row` | `HTTP Authorization Scheme` |
| `SecuritySchemeBearerFormatRow` | `security-scheme-bearer-format-row` | `Bearer Format` |
| `SecuritySchemeOpenIdConnectUrlRow` | `security-scheme-openid-connect-url-row` | `OpenID Connect URL` |
| `SecurityRequiredScopesRow` | `security-required-scopes-row` | `Required scopes` / `Required roles` |
| `OAuthFlowAuthorizationUrlRow` | `oauth-flow-authorization-url-row` | `Authorization URL` |
| `OAuthFlowTokenUrlRow` | `oauth-flow-token-url-row` | `Token URL` |
| `OAuthFlowRefreshUrlRow` | `oauth-flow-refresh-url-row` | `Refresh URL` |
| `OAuthFlowScopesRow` | `oauth-flow-scopes-row` | flow `scopes` map (scope rows carry their own derived diff types) |

Reused: `TitleRow` (every title / section header), `AddressRow`, `DescriptionRow` (operation,
request body, response, scheme descriptions — one per node, so no collision). A whole-node add /
remove fills **every** placement of the node (`OPENAPI_NODE_PLACEMENTS`, the AsyncAPI severities
pattern); a field diff fills only its own placement (`OPENAPI_FIELD_PLACEMENTS`).

## Row diff accessors

`packages/next-data-model/src/model/openapi/tree-with-diffs/row-diffs.ts`, namespace
`OpenApiRowDiffs` (mirrors `JsonSchemaRowDiffs` / `DdlApiRowDiffs`); the shared parts
(`NodeLevel`, `Section`) come from `model/abstract/tree-with-diffs/row-diffs-base.ts`, the Security
accessors are `SecurityRowDiffs` (`model/security/tree-with-diffs/row-diffs.ts`, shared with
AsyncAPI). Containers call these; they never read `node.diffs[...]` directly. `deprecatedTagRow` is the
row that carries the `deprecated` tag (`title`, else `operationId`, else `address`).

| Accessor | Returns |
| --- | --- |
| `NodeLevel.takeWholeNodeDiff(node)` | node-level diff unless it is a `rename` |
| `Operation.takeTitleRowDiff(node)` | whole-node diff, else `title` diff, else synthetic replace for a `deprecated` change |
| `Operation.takeOperationIdRowDiff(node, deprecatedTagRow)` | `operationId` diff (whole-node diff first), else the `deprecated` replace when this row carries the tag |
| `Operation.takeHeaderRowDiff(node, row, deprecatedTagRow)` / `resolveHeaderRowSeverityPlacement(row, deprecatedTagRow)` | the diff and the severity placement of one operation header row |
| `Operation.takeDeprecatedTagDiff(node)` | the tag's own `deprecated` diff (never a borrowed node-level diff) |
| `RequestBody.isRequiredStarVisibleOnSide(node, side)` | required on that side (side-exclusive) |
| `RequestBody.takeRequiredTagDiff(node)` | normalized `required` diff, `undefined` when the body is wholly added / removed |
| `SecurityRowDiffs.Scheme.isCardPresentOnSide(node, side)` | `false` on the side where the scheme does not exist (no frame there) |
| `Operation.takeAddressRowDiff(node, deprecatedTagRow)` | `path` diff (whole-node diff first), else the `deprecated` replace when this row carries the tag |
| `Operation.takeExternalDocsRowDiff(node)` / `resolveExternalDocsSide(node, side)` | row diff (whole object, `url`, or `description` — Q16 option A) / `{ url, description } \| null` per side — the link text is static |
| `Section.takeHeaderRowDiff(node)` | the section-rule diff on `""` |
| `SecurityRowDiffs.Scheme.takeFieldRowDiff(node, field)` / `SecurityRowDiffs.OAuthFlow.takeFieldRowDiff(node, field)` | field diff for one detail row |
| `SecurityRowDiffs.Scheme.resolveRequiredScopesSideItems(node, side)` | chips per side (`resolveListSideItems`) |
| `SecurityRowDiffs.OAuthFlow.resolveScopeRows(flow, scheme)` | the flow's scope rows with their own diffs and severities |
| `SecurityRowDiffs.Alternatives.takeToolbarRowDiff(container)` / `isToolbarShownOnSide(container, side)` | the security toolbar row (on the `securityAlternatives` container) |
| `MediaType.resolveSideTitle(node, side)` / `resolveSideTitleHighlight(node, side)` | media type text per side (rename aware) / yellow text highlighter of a renamed media type |
| `MediaType.takeChangesMarkerSummary(node)` | option change marker: inner changes only (∅ for its own add / remove / rename and inherited whole changes) |
| `RequestBody.takeHeaderRowDiff(node)` / `ResponseBody.takeHeaderRowDiff(content)` | Body header: whole add / remove, else (request) `required` yellow row, else yellow row from the synthetic `mediaTypes` option diff |
| `Responses.takeTitleRowDiff(node)` | Responses title: whole add / remove, else yellow row from the synthetic `codes` option diff |
| `Response.resolveSideCode(node, side)` / `resolveSideCodeHighlight(node, side)` | code text per side (rename aware) / yellow text highlighter of a renamed code |
| `Response.keepsCodeTone(node)` | `false` for a code wholly added / removed on its own: neutral option, border shadow only |
| `Response.takeChangesMarkerSummary(node)` | response-code option change marker: inner changes only |

## Row visibility

There are no with-diffs visibility managers. Which rows a node has comes from the plain value rules
(`OpenApiNodeVisibility`, `model/openapi/node-visibility.ts`, and `SecurityNodeVisibility`) applied to
the merged value; what each side shows comes from the diffs. Two separate questions, never mixed:

| Question | Rule |
| --- | --- |
| Is the row **rendered** (in both columns)? | `present(before) \|\| present(after)` for section headers ([presence](#section-presence-and-whole-section-changes)); for a single-field row: the field has content on either side **or** its own diff exists (a removed description has no merged value but must render on the origin side) |
| What does each **side** show? | the row's diff styles: a wholly added / removed section's synthetic or raw diff hides the header and content on the side where `present` is false (`isHeaderVisible` / `isContentVisible`), the other side is green / red |

So a header is never shown on a side merely because the section's raw object exists there (e.g.
`requestBody: {}` after its only media type was removed). Never derive any of this in JSX.

## Nested viewers

| Content | Viewer | What the OpenAPI layer passes |
| --- | --- | --- |
| Parameter groups, response headers | `JsonSchemaDiffsViewer` | the synthesized schema (diffs already attached) |
| Media-type schemas | `JsonSchemaDiffsViewer` | `OpenApiMediaTypeSchema.wrap(mediaType, diffsMetaKey)` (next-data-model; the `Type` record = the media type's whole add / remove) |
| Extensions | `JsoDiffsViewer` | `rawValues` with the relocated `M` record |

`hideUnchangedNodes` and `diffTypes` are forwarded from `OpenApiViewerContext`.

## Unit tests (`packages/next-data-model/tests/unit-tests/`)

| File | Covers |
| --- | --- |
| `openapi-spec-transformer.test.ts` | the full OAS 3.0 operation, external docs, effective security (document vs operation list), OAS 3.1 role scopes and `mutualTLS`, parameter synthesis (plain), OAS 3.1 without responses, the default response (`OpenApiResponseCode.pickDefault`), response-code order, response codes as nested nodes |
| `openapi-with-diffs.test.ts` | the with-diffs pipeline on `openapi-diffs/` fixtures, by area: operation (summary, address rename, whole add, deprecated / operation ID, the tag row, external docs), parameters (whole group removal, `required`, both places, schema ↔ content, entry extensions), request body (option removal / rename / highlight, `required`, extensions cloned), responses (option add / rename, the Responses row, Body / Headers presence, extensions), security (alternatives, scopes, schemes, the override switch, `security: []`), side accessors, security card accessors |
| `openapi-security-anonymous.test.ts` | anonymous access (`{}`): `allowsAnonymous`, the `Optional` badge diff, slots `{}` on one side only |
| `openapi-security-hiding-unchanged.test.ts` | `SecurityRowDiffs.Scheme.isContentChanged` (collapsed cards) |
| `openapi-media-type-schema.test.ts` | `OpenApiMediaTypeSchema.wrap` (the Body schema wrapper and its `Type` record) |
| `openapi-node-visibility.test.ts` | security scheme visibility: the required scope list (`SecurityNodeVisibility`) |
| `openapi-layout.test.ts` | the spacing config, edges and separators (`LayoutPlanner`) |
| `selector-options.test.ts` | options as nested nodes of complex containers (shared rule, OpenAPI and AsyncAPI) |
| `record-driven-aggregator-registry.test.ts` | the registry and the aggregation tables (the Security tables shared unchanged) |

**Not covered by a dedicated unit test** (the screenshot suites and `openapi-with-diffs.test.ts`
cover parts): every row of the [presence table](#section-presence-and-whole-section-changes) (raw vs
synthetic whole diffs, schema-less media types, mixed directions, neither side present);
`OpenApiObjectSchemaWithDiffsSynthesizer` scenario by scenario ([parameters.md](../entities/parameters.md)
→ "Description and schema sources"); the response-code change-marker table
([responses.md](../entities/responses.md#change-markers-on-response-code-options)); the severity
tables (one placement per row, a whole add / remove fills all of them).

Inline cases go to `packages/samples/src/` (published as `@netcracker/qubership-apihub-samples`), as
`async-api-diffs.ts` does (OpenAPI: `openapi-diffs-hiding-unchanged-nodes.ts`, `openapi-arrow-buttons.ts`).

## Related documents

- [../architecture/data-model-with-diffs.md](../architecture/data-model-with-diffs.md)
- [../architecture/viewer-with-diffs.md](../architecture/viewer-with-diffs.md)
