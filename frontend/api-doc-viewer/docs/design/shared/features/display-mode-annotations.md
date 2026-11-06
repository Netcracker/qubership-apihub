# Display mode `simple` hides annotations

**Status:** implemented (2026-10-31), variant A. Applies to OpenAPI, AsyncAPI, and JSON Schema
(embedded in both, and standalone).

## Rule

Every viewer of these API types takes `displayMode: 'simple' | 'detailed'` (default `detailed`).

> In `simple` mode **every annotation is hidden**, and nothing else. In `detailed` mode annotations
> show as before.

An **annotation** is human-readable text that explains an element without changing its structure or
contract:

| API type | Annotation | Where it renders |
| --- | --- | --- |
| OpenAPI | operation `description` | operation header row (`OperationNodeViewer`, header row `description`) |
| OpenAPI | operation `externalDocs` (the link and its `description` tooltip) | operation header row (`OperationNodeViewer`, header row `externalDocs`, `ExternalDocsRow`) |
| OpenAPI | request body `description` | Body description row (`request-blocks.tsx`) |
| OpenAPI | response `description` | response description row (`response-blocks.tsx`) |
| OpenAPI, AsyncAPI | security scheme `description` | security card description row (`SecuritySchemeCardBase`) |
| OpenAPI, AsyncAPI | scope / role description (the subheader text next to a scope / role name) | `SecurityScopeContent` description cell |
| AsyncAPI | `summary` and `description` of operation, message, channel, server | `MessageOperationNodeViewer`, `MessageNodeViewer`, `MessageChannelNodeViewer`, `MessageChannelServerNodeViewer` |
| JSON Schema | property / schema `description`, deprecation reason (`x-deprecated-reason`) | description and deprecation-reason rows (`SchemaNodePlainContent`) |
| JSON Schema | validation rows: allowed values (`enum`), default, examples, `Value range`, `Value length`, `Value pattern`, `Value multipleOf`, `Properties count`, `Items count`, `Unique items`, allowed additional property names, custom annotations (AsyncAPI `Location`, OpenAPI `Media type`) | [../../json-schema/features/validation-rows.md](../../json-schema/features/validation-rows.md) and [../../json-schema/display-coverage.md](../../json-schema/display-coverage.md) → Content rows |

Parameter, header, and schema descriptions inside OpenAPI / AsyncAPI are JSON Schema descriptions:
they follow the JSON Schema rule through the forwarded display mode.

**Not annotations** (shown in both modes): titles and section headers, operation ID, address, type texts, `deprecated` tags, required marks,
selectors and toolbars, security card titles with the scheme type, security props (parameter name,
API key location, HTTP scheme, bearer format, OpenID Connect URL), OAuth flow headers and URLs, the
`Scopes ▾` / `Roles ▾` lists with scope / role **names**, JSON Schema **Extensions**.

### What changed for `simple`

| Element | `simple` before | `simple` now |
| --- | --- | --- |
| OpenAPI operation / request body / response description | shown | **hidden** |
| OpenAPI operation external docs link (2026-11-05) | shown | **hidden** |
| AsyncAPI summary / description (operation, message, channel, server) | shown | **hidden** |
| Security scheme description | hidden | hidden |
| Security props, OAuth flow parts, scope / role names | hidden | **shown** |
| Scope / role descriptions | hidden (with the whole lists) | hidden (names shown) |
| JSON Schema description, deprecation reason, validation rows | hidden | hidden |
| JSON Schema extensions | hidden | **shown** |

## Implementation (variant A: category tables)

One shared rule, one category table per row family, mode-agnostic presence in the resolvers:

| Part | Where |
| --- | --- |
| The rule: `DisplayModeRows.apply(presence, categories, displayMode)`, `DisplayModeRows.isShown(category, displayMode)`; categories `'structure'` / `'annotation'` | `next-data-model/src/model/abstract/display-mode-rows.ts` |
| OpenAPI: `OPENAPI_OPERATION_HEADER_ROW_CATEGORIES`, `OPENAPI_DESCRIPTION_ROW_CATEGORIES`; `OpenApiNodeVisibility.resolveOperation(value, noHeading, displayMode)`, `showRequestBodyDescription(value, displayMode)`, `showResponseDescription(value, displayMode)` | `model/openapi/node-visibility.ts` |
| Security: `SECURITY_SCHEME_ROW_CATEGORIES`, `SECURITY_OAUTH_FLOW_ROW_CATEGORIES`; `SecuritySchemeRowVisibility.showScopeDescriptions` | `model/security/node-visibility.ts` |
| AsyncAPI: `ASYNC_API_TEXT_ROW_CATEGORIES`, `AsyncApiNodeVisibility.resolveTextRows(presence, displayMode)`; presence stays diff-aware (`shouldBeDisplayed`) in `resolveAsyncApiTextRowVisibility` | `model/async-api/node-visibility.ts`, `api-doc-viewer/src/utils/async-api/visibility-checkers.ts` |
| JSON Schema: `JSON_SCHEMA_PROPERTY_CONTENT_ROW_CATEGORIES`; `PlainPropertyNodeVisibilityManager.resolveRowPresence` → `resolveVisibilityFromPresence` (the with-diffs manager adds diff-only presence and reuses it); `resolveAllowedAdditionalPropertyNamesRowVisibility` | `building-service/json-schema/tree[-with-diffs]/node-visibility-data/kind-property.ts` |

- Viewers never compare display modes: they pass `displayMode` to a resolver and render `show*`
  flags. The OpenAPI block builders read it from the view state (`OpenApiViewState.displayMode`, set by
  `OperationNodeViewer` from `DisplayModeContext`).
- Adding an annotation = one table entry with category `'annotation'`; a new row family = a table
  next to its resolver. `tests/unit-tests/display-mode-annotations.test.ts` pins the annotations of
  every table.

## Forwarding to JSON Schema (and JSO)

Each viewer root provides its **own** `DisplayModeContext` from its own `displayMode` prop (default
`detailed`). A nested viewer that is not given the prop therefore resets the mode to `detailed`. Rule:
**every embedded viewer receives `displayMode` explicitly, read from the enclosing context.**

| Host | Embedded viewer | Forwards |
| --- | --- | --- |
| OpenAPI (parameters, headers, Body schemas) | `OpenApiSchemaViewer` → `JsonSchemaViewer` / `JsonSchemaDiffsViewer` | yes |
| AsyncAPI message payload / headers | `MessageContentNodeViewer` → `JsonSchema(Diffs)Viewer` | yes |
| AsyncAPI channel parameters | `MessageChannelParametersNodeViewer` → `JsonSchema(Diffs)Viewer` | yes |
| AsyncAPI bindings | `BindingsNodeViewer` → `Jso(Diffs)Viewer` → embedded JSON Schema | yes |
| JSON Schema extensions | `JsonSchemaExtensionsSection` → `Jso(Diffs)Viewer` | yes |
| OpenAPI / AsyncAPI `x-*` sections | `ExtensionsSectionContent` → `Jso(Diffs)Viewer` | yes (added 2026-10-31; no embedded JSON Schema there) |

## With diffs

- A hidden annotation row takes its diff presentation with it: no row, no row colour, no floating
  badge. Neighbouring rows are not repainted.
- Change markers on selector options (response codes, media types, security alternatives, AsyncAPI
  sections) and descendant-diff summaries are data-layer values and do **not** depend on the display
  mode (decided 2026-10-31): an annotation-only change still marks its option in `simple` mode, so
  the reader knows something changed and can switch to `detailed`.
- Hiding unchanged nodes is unaffected: it decides on diffs, not on display mode. Security cards now
  keep content in `simple`, so unchanged cards collapse behind the trigger in both modes.

## Spacing

Annotation rows are removed **before** spacing is planned, so separators and `data-precededby` follow
the remaining rows: OpenAPI block lists (`LayoutPlanner`), security `CardRows`, AsyncAPI header
chains (`headerPrecededBy` branches on the summary / description flags), JSON Schema
`resolveListLastRowFlags`. A Body or response whose only content was its description collapses to
its title row.

## Variants considered

| Variant | Why not chosen |
| --- | --- |
| **B.** Annotation-tagged blocks (`{ annotation: true }`) filtered by the planners | AsyncAPI header rows and JSON Schema content rows are not block-planned, and the scope description is a cell: two mechanisms. The rule would live in the view layer (against OpenAPI Q-S4). |
| **C.** Strip annotation fields from node values in `simple` mode | Switching modes rebuilds the tree (expansion / selection lost); diff records of stripped fields must be stripped too; the public builders would return mode-dependent trees for a view concern. |

## Tests

- Data layer: `next-data-model/tests/unit-tests/display-mode-annotations.test.ts` (the rule, every
  category table, each resolver in both modes), plus the existing JSON Schema / security visibility
  tests.
- Screenshot ITs: per API type (AsyncAPI, OpenAPI, JSON Schema, and DDL API) one
  `* Suite (Display Mode = simple)` and one `* Diffs Suite (Display Mode = simple)` capture every
  case in `detailed` and `simple` (story arg `displayMode`). One case per element `simple` hides (each
  row of the annotation table above, plus the forwarded JSON Schema hosts: OpenAPI parameter, `Media
  type` row, body schema, response header; AsyncAPI payload, headers, channel parameter description
  and `Location`, Kafka binding schema), on the API type's minimal document; the diffs pair replaces
  that element's value. Cases: `packages/api-doc-viewer/bin/display-mode-simple-case-definitions.mjs`
  (generator `bin/generate-display-mode-simple-suites.mjs`; catalogues
  `packages/samples/<api>[-diffs]-display-mode-simple/README.md`). Every other suite captures
  `detailed` only. Adding an annotation = a table entry here **and** a case there.
