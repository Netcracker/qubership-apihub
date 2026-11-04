# Request body

The request **Body** subsection: header with the media-type selector, the request body
description, and the schema of the selected media type. Status: **implemented** (first iteration; deviations in [../notes/2026-10-implementation-decisions.md](../notes/2026-10-implementation-decisions.md)).

## Nodes

| Kind | Complexity | Key | Value | Children / nested |
| --- | --- | --- | --- | --- |
| `requestBody` | simple | `requestBody` | `{ description?: string; required?: boolean }` | child: `content` |
| `content` | **complex** | `content` | none (delegates to the selected media type) | nested: `mediaType` per media type, document order ([selector options](../../shared/features/selector-options.md)) |
| `mediaType` | simple | the media type (`application/json`) | `{ mediaType: string; schema?: object \| boolean }` | — |

`required` is displayed in v1 ([Required marker](#required-marker), Q11). `content` and `mediaType`
are shared with responses.
Media type `examples` / `example` / `encoding` are not copied (Q11). Request Body and Media Type
`x-*` are cloned into the body schemas ([Extensions](#extensions)).

## Header row (h3) with the media-type selector

| Item | Rule |
| --- | --- |
| Component | `TitleRow` "Body" (+ required `*`, [below](#required-marker)), **h3**, collapsible (expander column, expanded by default — [collapsible-sections.md](../features/collapsible-sections.md)), `subheader={(side) => <><Selector …/>{requiredTag}</>}` — the `BindingsNodeViewer` pattern |
| Selector | options = nested `mediaType` nodes of `content` that **have a `schema`** (a media type without `schema` is not content — [presence](../features/diffs.md#section-presence-and-whole-section-changes)); title = media type text; `SelectorVariant.Secondary`; default tone; `layoutSide` forwarded |
| No options | the subheader is empty; the header is still shown when the Body is present through its `description` alone |
| Option test id | `request-media-type-<index>` |
| Initial selection | first option (document order) |
| Diff | header `diff` = `OpenApiRowDiffs.RequestBody.takeHeaderRowDiff`: a raw whole-body add / remove, or the synthetic one written when the Body's presence flips; else a yellow row for a `required` change; else a yellow row when a media-type option was wholly added / removed / renamed (below). Options carry the `mediaType` node diffs (add / remove / rename, incl. synthetic add / remove when only the `schema` appeared / disappeared): a wholly added / removed option shows its green / red **border shadow only**; the round **change marker** counts inner changes only (`OpenApiRowDiffs.MediaType.takeChangesMarkerSummary` — the schema and cloned extensions; never the option's own add / remove / rename, same rule as the [response-code markers](responses.md#change-markers-on-response-code-options)) |

A renamed media type (`apiDiff` maps `application/json` ↔ `application/json; charset=utf-8` and
wildcard-compatible keys, E6) has one option whose title differs per side: the option `title` is a
`(layoutSide) => ReactNode` returning `OpenApiRowDiffs.MediaType.resolveSideTitle(node, side)` —
`beforeKey` on the origin side, `afterKey` on the changed side, yellow text highlighter on both
(`OpenApiRowDiffs.MediaType.resolveSideTitleHighlight`, rendered by `OptionKeyText` inside the button —
the JSON Schema combiner-option pattern); the Body header row is yellow.

**Option-change row.** A media-type option wholly added / removed / renamed paints the whole Body header row yellow
(synthetic `replace`, background only, no text highlighter — the security toolbar / AsyncAPI bindings pattern) unless
the header has its own whole add / remove; floating badge: `TitleRow` placement, the strongest of those option changes.
Data: the with-diffs transformer writes the synthetic `mediaTypes` field diff (`OPENAPI_MEDIA_TYPE_OPTIONS_DIFF_KEY`) on
the node that owns the header row — `requestBody` for the request Body, `content` for a response Body.

## Required marker

Mirrors JSON Schema's `required` rendering ([meta flags and required](../../json-schema/features/meta-flags-and-required.md)).

| Element | Plain | With diffs |
| --- | --- | --- |
| Red `*` after "Body" (`RequiredMark`, via `TitleRow` `titleContent` per side) | shown when `required === true` | **side-exclusive**: shown only on the side where the body is required (`OpenApiRowDiffs.RequestBody.isRequiredStarVisibleOnSide(node, side)`); unchanged required → both sides |
| **required** tag in the subheader, after the media-type selector (`TagsWithDiffs`) | never | shown only when the required status changed **and** the body was not wholly added / removed; colored by its own diff (`OpenApiRowDiffs.RequestBody.takeRequiredTagDiff(node)`) — green when it became required, red when it became optional |
| Title row background | — | yellow synthetic replace when the required status changed (JSON Schema title-row priority: whole add / remove wins) |

Diff shape: `requestBody[M].required`. A missing `required` is `false` (`api-unifier` default, E5),
so "became optional" can arrive as `true → false` replace **or** as a `remove` of `required: true`;
normalize both to boolean semantics in the with-diffs transformer (`buildRequestBody` →
`SideReader.normalizeFlagDiff`: `add` → became required, `remove` → became optional) and drop diffs
whose effective value did not change. Severity: `TitleRow` (`OPENAPI_FIELD_PLACEMENTS`).

## Description row

`MarkdownTextRow`, body2, `description` of the request body (**not** the schema description).
Diff key `description`, severity `DescriptionRow`. An annotation: `detailed` display mode only
([../../shared/features/display-mode-annotations.md](../../shared/features/display-mode-annotations.md)).
Without it a Body is its title row and media types.

## Schema

`OpenApiSchemaViewer` inside `MediaTypeContentSection` (shared with responses):

| Item | Rule |
| --- | --- |
| Shown when | an option is selected — every option has a `schema` on at least one side by definition |
| Wrapping | next-data-model `OpenApiMediaTypeSchema.wrap(mediaType, diffsMetaKey?)` (`model/openapi/media-type-schema.ts`): the schema under one property `OpenApiDisplayLabels.WRAPPED_BODY_SCHEMA_TITLE` (`'Type'`), `SUPPRESS_ROOT_NESTING_INDICATOR_CUSTOMIZATION_OPTIONS` — the AsyncAPI payload rendering (Q4; AsyncAPI still wraps with its viewer helper). The viewer only memoises the call per selected media type (architecture review 2026-10, F5). |
| Diffs | with the diffs key, the wrapper carries the record `{ Type: <the media type's whole add / remove> }` (`SectionRowDiffs.takeHeaderRowDiff(mediaType)`, inherited from a wholly added / removed owner included) so the root property is painted; diffs inside the schema are already on the merged schema |
| Elements | which Body elements exist (title, description, schema) is decided once by the block builder with `OpenApiBlockEdges.bodyElements` and passed to `MediaTypeContentSection`, which renders them (F6) |
## Extensions

Approved split (2026-10-08). The request side has **no separate Extensions subsection**: every
request-level extension describes the body or one of its media types, so it is cloned into the body
schemas and shown in the JSON Schema **Extensions** sub-tree of the body's root (`Type`) row —
the same mechanism as parameter extensions ([parameters.md](parameters.md#entry-extensions)).

| Level | Extensible? | Meaning of its `x-*` | Placement |
| --- | --- | --- | --- |
| `requestBody` — Request Body Object | yes | the whole body: holds equally for every media type | **cloned into every** media type's schema root |
| `requestBody.content` — map | **no** (a map of media types) | — | ignored: an `x-*` key there is a media type name, not an extension; the unifier's validation drops it when its value is not an object (E22); with an object value it is a (strange) media type and follows the media-type rules |
| `requestBody.content[mt]` — Media Type Object | yes | this media type only | **cloned into this** media type's schema root |

Rules (shared with response media types, [responses.md](responses.md#body)):

1. **Flat keys on the schema root.** The `x-*` keys are written as flat keys on a shallow copy of the
   media type's schema (never mutate the resolved source schema — it may be shared through
   `$ref`). `transformJsonSchemaExtensions` gathers them into the root node's `extensions`.
2. **Precedence on a name collision** (same `x-k` on several levels): Media Type Object > Request Body
   Object > schema root — OpenAPI objects beat the schema root (as a parameter entry does), and the
   more specific object wins. Shadowed values are not shown.
3. **Diffs**, per key, from the value **shown** on each side (per-side reconstruction as in
   [parameters.md, step 1](parameters.md#step-1--reconstruct-each-side-from-the-merged-entry)):
   equal → no diff (a key moved between levels with the same value), absent → value `add`, value →
   absent `remove`, otherwise `replace`; written to the schema root's diff record under the key.
   Keys that exist on one level only keep their raw diff as is; diffs nested inside a value pass
   through. Raw diffs arrive per level (E22): `requestBody[M]['x-…']`, `content[mt][M]['x-…']`.
4. **One raw change, several schemas.** A Request Body `x-*` change is written to every media type's
   schema. Only one media type is visible at a time; change markers count diff **types**, so the
   repetition never shows.
5. **No schema, no extensions.** A media type without `schema` is not content
   ([Presence](#presence)), so its extensions — and Request Body extensions, when no media type has
   a schema — are not shown. An OAS 3.1 `schema: true` becomes `{}` to hold the keys; on
   `schema: false` the extensions are not shown.
6. **Not counted for presence.** Extensions never make the Body present on their own: they only
   decorate a schema that is already shown.

| Fixture | Change | Shown |
| --- | --- | --- |
| `request-body/24-extensions-changed` | Request Body `x-max-size` replaced; media type `x-codec` added; an `x-not-a-media-type` string key added to `content` | root row Extensions: `x-max-size` replace, `x-codec` add; the `content` key is dropped by the unifier |
| `request-body/25-media-type-extension-shadows-schema-root` | schema root `x-codec: none` on both sides; media type `x-codec: gzip` added | `x-codec` replace `none` → `gzip` (the shown value changed) |

## Presence

The Body is **present on a side** when it has, on that side, a non-empty `description` **or** at
least one media type with a `schema`. `required` alone does not make it present, and neither do
media types without `schema`. Shared rule and resolver:
[../features/diffs.md](../features/diffs.md#section-presence-and-whole-section-changes).

| Before | After | Body |
| --- | --- | --- |
| media type with schema | `requestBody` removed | wholly removed (raw diff) — `request-body/02-body-removed` |
| one media type with schema, no description | `content: {}` (media type removed) | wholly removed (synthetic) — `request-body/12-only-media-type-removed` |
| one media type with schema, no description | the same media type without `schema` | wholly removed (synthetic); the option is removed too — `request-body/16-schema-removed` |
| media type without schema, no description | the same media type with `schema` | wholly added (synthetic) — `request-body/15-schema-added` |
| media type with schema + description | `content: {}`, description kept | present on both sides: description unchanged, option removed, header uncolored — `request-body/14-media-type-removed-description-kept` |
| `required: true` + schema-less media type | anything that is still not present | Body not rendered on either side |

A wholly added / removed Body paints every row through the record-driven node-diffs inheritance: header, required
marker, description, options, and the schema (wrapped root painted by the passed node-level diff)
are green / red on the side that has them and hidden on the other.

## Visibility

Value rules: `OpenApiNodeVisibility.showRequestBodyDescription` (the description row); the Body
header and the schema follow the Body's presence and the selected option. With diffs, what each
side shows comes from the diffs (the whole-section diff of `requestBody` / `content` written by
`OpenApiSectionPresence`, the option's own diff) — there is no separate with-diffs visibility code
([../features/diffs.md](../features/diffs.md#row-visibility)):

| Row | Plain | With diffs: row rendered | With diffs: per side |
| --- | --- | --- | --- |
| `showHeader` | Body present | present on either side | hidden on the side where the Body is not present (whole-section diff styles) |
| `showDescription` | `description` non-empty | `description` on either side, or a `description` diff | per its own diff, or inherited from a whole-section diff |
| `showSchema` | an option is selected | same | per the option's diff (option add / remove hides the schema on the other side) |

A row is never rendered on a side just because `requestBody` exists there as an object.

## Related documents

- [responses.md](responses.md) — the same `content` / `mediaType` nodes
- [../features/diffs.md](../features/diffs.md#request-body-and-responses)
- Fixtures: `packages/samples/openapi-diffs/request-body/` and `response-body/` ([diffs-case-matrix.md](../features/diffs-case-matrix.md#bodies))
