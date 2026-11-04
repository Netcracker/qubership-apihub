# Responses

The **Responses** section: the toned response-code selector, then for the selected response its
description, headers, and body (whose header carries the media-type selector). Status: **implemented** (first iteration; deviations in [../notes/2026-10-implementation-decisions.md](../notes/2026-10-implementation-decisions.md)).

## Nodes

| Kind | Complexity | Key | Value | Children / nested |
| --- | --- | --- | --- | --- |
| `responses` | **complex** | `responses` | none (delegates to the selected code) | nested: `response` per code, **canonical order** ([selector options](../../shared/features/selector-options.md)) |
| `response` | simple | the code as in the document (`200`, `2XX`, `default`) | `{ code: string; codeClass: OpenApiResponseCodeClass; description?: string }` | children: `responseHeaders`?, `extensions`?, `content`? |
| `responseHeaders` | simple | `headers` | `{ schema: OpenApiSynthesizedObjectSchema }` | — |
| `extensions` (of a response) | simple | `extensions` | `{ rawValues }` — Response Object `x-*` | — |
| `content` / `mediaType` | as in [request-body.md](request-body.md#nodes) | | | |
| `extensions` (of the Responses Object) | simple, child of **`operation`** | `responsesExtensions` | `{ rawValues }` | — |

`responses` is absent when the operation has no `responses` (allowed in OAS 3.1; invalid but
tolerated in OAS 3.0 — [../features/oas-versions.md](../features/oas-versions.md#responses)).
`x-*` keys of the Responses Object are not response codes: they are moved to
`data.responsesExtensions`, **outside** the complex `responses` node (anything under it would become
a code option) — [Responses extensions](#responses-extensions).

## Response codes

Shared helpers in `packages/next-data-model/src/shared/openapi/types/response-code.ts`:

```typescript
export const OpenApiResponseCodeClasses = {
  INFORMATIONAL: '1XX',
  SUCCESS: '2XX',
  REDIRECTION: '3XX',
  CLIENT_ERROR: '4XX',
  SERVER_ERROR: '5XX',
  DEFAULT: 'default',
  UNKNOWN: 'unknown',
} as const
export type OpenApiResponseCodeClass = typeof OpenApiResponseCodeClasses[keyof typeof OpenApiResponseCodeClasses]
```

| Key | Class | Kind |
| --- | --- | --- |
| `100`–`199` | `1XX` | explicit |
| `1XX`, `1xx` | `1XX` | range |
| … same for 2–5 … | | |
| `default` | `default` | — |
| anything else | `unknown` | — |

`OpenApiResponseCode.resolveClass(key)` and `OpenApiResponseCode.compare(a, b)` live in
next-data-model (the transformer orders the nested nodes); the viewer only maps a class to a tone class.

**Canonical order** (`compare`): by class `1XX` → `5XX`; inside a class explicit codes ascending,
then the range; then `unknown` keys in document order; `default` last. Document order is ignored on
purpose — fixture `oas30/structure/04-response-code-order` declares `500` first.

## Section header with the code selector

| Item | Rule |
| --- | --- |
| Component | `TitleRow` "Responses", **h2**, `subheader={(side) => <Selector …/>}` |
| Options | one per `response` node; title = the code text (`OpenApiRowDiffs.Response.resolveSideCode(node, side)` for a renamed code, e.g. `4xx` → `4XX`, E6) |
| Tone | `resolveResponseCodeToneClass(codeClass)` — [../features/response-code-selector.md](../features/response-code-selector.md); a code wholly added / removed **on its own** (not inherited) has no tone — default background and text, green / red border shadow only (`OpenApiRowDiffs.Response.keepsCodeTone`) |
| Option test id | `response-code-<code>` |
| Initial selection | first `2XX` option, else the first option (Q13) |
| Diff | header = `OpenApiRowDiffs.Responses.takeTitleRowDiff`: wholly added / removed when its presence (≥1 code) flips ([presence](../features/diffs.md#section-presence-and-whole-section-changes)); else the whole title row is yellow (synthetic `replace`, background only) when any code option was wholly added / removed / renamed — the with-diffs transformer writes the synthetic `codes` field diff (`OPENAPI_RESPONSE_OPTIONS_DIFF_KEY`) on the `responses` node; floating badge `TitleRow`, the strongest of those option changes. A renamed code's text is highlighted yellow inside the button on both sides (`OpenApiRowDiffs.Response.resolveSideCodeHighlight`, `OptionKeyText`). Options carry the `response` node-level diff (per-side visibility, border shadow, per-side title of a renamed code) and the **change marker** below. A response option stays present as long as its code exists — losing its body or headers changes the option's marker, not its visibility. |

### Change markers on response-code options

Each response-code option shows a colored round marker in its top-right corner (the same
`DiffsClassesBuilder.roundMarker(diffType)` marker as the AsyncAPI section selector and bindings
selector) when the response changed **inside**.

| Rule | Detail |
| --- | --- |
| Counted | every **displayed** change inside the response: description, headers (added / removed / changed, incl. inside header schemas), media types (added / removed / renamed), body schemas and everything nested in them, synthetic whole-section diffs of its Headers / Body ([presence](../features/diffs.md#section-presence-and-whole-section-changes)) |
| Not counted | the response code itself: wholly added, wholly removed, renamed (`4xx` → `4XX`), and anything **inferred** from a whole change — inherited from an ancestor (whole operation, whole `responses`) or stamped by the synthesizer onto header properties of a wholly added / removed response ([parameters.md](parameters.md#with-diffs), rule 4). Those are shown by the option's visibility / border shadow / per-side title, never by the marker. |
| Not displayed → not counted | changes the viewer does not show (header `style` / `explode`, media type `examples` / `encoding`, shadowed `x-*` values (header, Response Object, and media-type `x-*` **are** displayed and counted — [parameters.md](parameters.md#entry-extensions), [Extensions](#extensions)), a shadowed schema-root description of a header) are absent from the transformed spec, so they never reach the marker |
| Several changes | the **strongest** diff type wins: `maxDiffType` (`utils/common/changes.ts`) over the set — breaking > … > non-breaking > annotation > unclassified |
| Same on both sides | the marker is a property of the option, drawn identically in the origin and the changed column |

**Source — aggregated diff sets.** The data layer does not walk the response; it reads the
document rollup that `aggregateDiffsWithRollup` writes under `aggregatedDiffsMetaKey` — a set of
`Diff` objects for everything below an object. Measured (E20): the rollup at a response object holds
only diffs **inside** it, because the response's own add / remove / rename sits in the parent
`responses` diff record and `apiDiff` emits no diffs inside a wholly added / removed object.

```text
RecordDrivenNodeDescendantDiffsSummaryAggregator.aggregate(nodeDiffs, …, crawlValue, diffsMetaKeys):   // every kind; the response option reads it via OpenApiRowDiffs.Response.takeChangesMarkerSummary
  wholeDiff = nodeDiffs[""]
  if wholeDiff is add or remove (own or inherited)      → return ∅          // rule "not counted", incl. stamped diffs
  diffs = takeAggregatedDiffs(crawlValue, diffsMetaKeys) // crawlValue = the TRANSFORMED response value
  return { d.type | d ∈ diffs, d !== wholeDiff?.data }   // a rename is never in the rollup; guard anyway
```

- The rollup must be the one computed on the **transformed** spec (the last pipeline step in
  [../features/diffs.md](../features/diffs.md#pipeline)), so relocated, synthesized (header
  properties, description precedence) and presence diffs are included and dropped / shadowed ones
  are not.
- The result is the node's `descendantDiffsSummary`. `OpenApiTreeWithDiffsBuilder.assignNodeDiffs`
  must **not** call `mergeAggregatedDiffTypesIntoDescendantSummary` afterwards for a node whose
  node-level diff is add / remove — it would re-add the stamped header diffs. (The response's own
  `description` diff is in the rollup, so it is counted although it is the node's own field diff.)
- Accessor: `OpenApiRowDiffs.Response.takeChangesMarkerSummary(node)` returns that set (empty for
  plain nodes).

**Viewer.** `ResponsesNodeViewer` builds each option with `descendantDiffsSummary:
OpenApiRowDiffs.Response.takeChangesMarkerSummary(node)` and **without** `diffsSummary` — the
node's `diffsSummary` contains the response's own whole add / remove, which `Selector` would turn
into a marker for a non-inherited whole change. `Selector` itself is unchanged: it already draws
`roundMarker(maxDiffType(diffsSummary ∪ descendantDiffsSummary))` and skips the marker for an
inherited whole-node diff.

| Fixture | Change | Marker on the code option |
| --- | --- | --- |
| `responses/07-response-4xx-added` | `404` added with headers and a body | none on `404` (border shadow + one-side visibility only; stamped header diffs ignored) |
| `responses/18-description-changed-non-initial-code` | `400` description replaced, `200` selected | `annotation` on `400` |
| `responses/15-code-case-renamed` | `4xx` → `4XX` only | none (per-side highlighted title + yellow Responses row only) |
| `responses/16-code-renamed-and-description-changed` | rename + description replaced | `annotation` |
| `responses/17-description-changed` | `200` description replaced | `annotation` |
| `response-body/17-schema-property-added` | property added to the `200` body | `non-breaking` |
| `response-body/02-body-removed` | `200` `content` removed | `breaking` |
| `response-headers/20-all-removed` | `200` headers deleted | `breaking` |
| `responses/25-changes-of-different-severity` | header added (non-breaking), body property removed (non-breaking), media type removed (breaking), description replaced (annotation) | `breaking` (strongest) |
| `operation/23-operation-added` | whole operation added | none on every code (inherited) |

## Description row

Directly under the section header. `MarkdownTextRow`, body2, `response.description` (required by
the specification; may still be missing). It belongs to the **response**, not to the media type:
the Media Type Object has no description (Q3), so the row does not change with the media-type
selection. Diff key `description`, severity `DescriptionRow`. Not the schema description.

## Headers

| Item | Rule |
| --- | --- |
| Source | `response.headers` (map name → Header Object); synthesized by the same `OpenApiObjectSchemaSynthesizer` as parameters ([parameters.md](parameters.md#schema-synthesizer)) — entry name = map key, no `in` |
| Header row | `TitleRow` "Headers", **h3**, test id `openapi-response-headers`; collapsible, expanded by default ([collapsible-sections.md](../features/collapsible-sections.md)) — as the response Body and both Extensions subsections |
| Content | `buildParametersBlock` (`parameters-blocks.tsx`, the same block as request parameter groups) |
| Shown when | ≥1 header (in diffs: on either side); an explicit empty map counts as no headers. Per side, the section follows its presence (≥1 header): deleting the `headers` map arrives as one `remove` **per header** (the unifier default `headers: {}` exists on the after side, E19), and `OpenApiSectionPresence.writeSectionDiff` turns it into a wholly removed Headers section (`response-headers/20-all-removed`) |
| `Content-Type` header | shown (Q5) |
| Header `x-*` | moved flat into the header's synthetic property schema and shown in its **Extensions** sub-tree — same rules as parameters ([parameters.md](parameters.md#entry-extensions)) |

## Extensions

Approved split (2026-10-08):

| Level | Extensible? | Meaning of its `x-*` | Placement |
| --- | --- | --- | --- |
| `responses` — Responses Object | yes | all responses | **separate section** [Responses extensions](#responses-extensions) |
| `responses[code]` — Response Object | yes | the whole response, **including its headers** — not only the media types | **separate section** [Response extensions](#response-extensions) |
| `responses[code].content` — map | **no** (map of media types) | — | ignored, as for the request ([request-body.md](request-body.md#extensions)) |
| `responses[code].content[mt]` — Media Type Object | yes | this media type only | **cloned into this** media type's schema root — same rules as the request ([request-body.md](request-body.md#extensions), rules 1–6; precedence: Media Type Object > schema root) |

Unlike the Request Body Object, the Response Object is **not** cloned into the body schemas: a
response also has headers (and links), so its extensions are not "about every media type".

### Response extensions

| Item | Rule |
| --- | --- |
| Component | shared `ExtensionsSection`, title **Extensions**, **h3**, test id `openapi-response-extensions`, then `JsoViewer` / `JsoDiffsViewer` over the Response Object's `x-*` (`rawValues`) |
| Position | inside the selected response, **after Headers and before Body** — from the config `OPENAPI_SECTION_ORDER.response` ([../features/operation-viewer.md](../features/operation-viewer.md#section-order)) |
| Diffs | raw `responses[code][M]['x-…']` (E22) relocated to the `extensions` node; the subsection follows the presence rule (present = ≥1 `x-*` on that side) |
| Change markers | **counted** in the response-code marker: they are changes inside the response ([Change markers](#change-markers-on-response-code-options)) |

### Responses extensions

| Item | Rule |
| --- | --- |
| Component | shared `ExtensionsSection`, title **Extensions**, **h3**, test id `openapi-responses-extensions` |
| Position | inside the **Responses** section, after the selected response's rows — config `OPENAPI_SECTION_ORDER.responses`; independent of the selected code |
| Node | `extensions` with key `responsesExtensions`, a child of `operation` (see [Nodes](#nodes)); `ResponsesNodeViewer` renders it in the configured position |
| Diffs | raw `responses[M]['x-…']` (E22); presence rule as above |
| Change markers | **not** counted in any response-code marker (not inside a code) |
| Responses presence | counts: the Responses section is present on a side with ≥1 code **or** ≥1 Responses-level `x-*`; a Responses Object with only `x-*` keys renders the section header (empty code selector) and this subsection |

## Body

| Item | Rule |
| --- | --- |
| Header row | `TitleRow` "Body", **h3**, test id `openapi-response-body`, media-type `Selector` in the subheader (Q2) — identical to the request Body header ([request-body.md](request-body.md#header-row-h3-with-the-media-type-selector)) except that responses have no `required` marker |
| Selector options | nested `mediaType` nodes of the response's `content` that **have a `schema`**, document order; renamed media types show a per-side highlighted title; border shadow / marker rules as the request Body ([request-body.md](request-body.md#header-row-h3-with-the-media-type-selector)); default tone, `SelectorVariant.Secondary`; option test id `response-media-type-<index>` |
| Selection | per response, kept when switching codes ([../features/operation-viewer.md](../features/operation-viewer.md#view-state)) |
| Presence | the response Body is present on a side when it has ≥1 option there (the response description belongs to the response, not to the Body) |
| Shown when | present on either side |
| Diff | header = `OpenApiRowDiffs.ResponseBody.takeHeaderRowDiff(content)`: the `content` node's whole-section diff — raw (`content` removed as a whole, `response-body/02-body-removed`) or synthetic (the only media type removed, or the only schema removed, `response-body/16-schema-removed`); else a yellow row when a media-type option was wholly added / removed / renamed (synthetic `mediaTypes` diff on `content`); options carry `mediaType` node diffs and `MediaType.takeChangesMarkerSummary` |
| Schema | `OpenApiSchemaViewer` (inside `MediaTypeContentSection`) for the selected media type — same wrapping and diff rules as the request body ([request-body.md](request-body.md#schema)) |

The request and response Body are one component, `MediaTypeContentSection`
(`OpenApiOperationViewer/MediaTypeContentSection.tsx`): title, optional required marker, media-type
selector, description, schema. The selection lives in the operation's view-state store
([operation-viewer.md](../features/operation-viewer.md#view-state)); the request body viewer and the
response Body read and write it.

## Response without content

`204`-style responses, and responses whose media types all lack `schema`: no Body subsection; the
description and headers still render.

## Visibility

Value rules: `OpenApiNodeVisibility.showResponseDescription` (the description row); Headers and Body
render when their node exists (the transformer builds them only when present on some side), the
Responses section when it has a code or extensions. There is no separate with-diffs visibility code:
what each side shows comes from the whole-section diff of `responseHeaders` / `content` / `responses`
(`OpenApiSectionPresence`) — a section is hidden on the side where it is not present, never shown
there just because its raw object exists
([../features/diffs.md](../features/diffs.md#row-visibility)).

## Related documents

- [../features/response-code-selector.md](../features/response-code-selector.md)
- [../features/diffs.md](../features/diffs.md#request-body-and-responses)
- Fixtures: `packages/samples/openapi/oas30/fields/responses/{2xx,3xx,4xx,5xx}/*` (per code kind), `oas30/structure/04-response-code-order/`, `packages/samples/openapi-diffs/responses/`
