# OpenAPI diffs — case matrix

What the `OpenAPI Operation Diffs Suite` covers, and why. Fixtures:
[packages/samples/openapi-diffs/](../../../../packages/samples/openapi-diffs/README.md); stories and
ITs: `packages/api-doc-viewer/src/{stories/openapi-diffs-suite,it/openapi-diffs-suite/*}`. Diff
rules the cases exercise: [diffs.md](diffs.md).

## Rules

| Rule | Detail |
| --- | --- |
| Every displayed OpenAPI fragment | operation summary, operation ID, description, external docs, deprecated, extensions, the whole operation; every parameter location and response headers; request and response bodies, their media types and schemas; responses as a whole, each response code kind, response description and extensions; security sections, alternatives, schemes, scheme fields per type, OAuth flows and scopes. |
| Minimal operation | A case holds only the content it covers, so a change to an unrelated fragment never affects it. Each category has its own minimal base: `POST /orders` (`POST /orders/{orderId}` for path parameters) with only that category's fragment — the cookies base has cookie parameters only, the request body base the request body only, the security base one OAuth requirement and its scheme. Anything else a case needs (a summary next to `deprecated`, a second scheme, document-level security) is added by its setup. OAS 3.0 requires `responses`, so categories outside responses / response headers / response body keep a status-only `200` (`description: ''`, the text is hidden). The OAS 3.1 base has no `responses`. |
| Opposites next to each other | Every add has its remove, every on (`deprecated`, `required`) its off, every move A → B its B → A, with consecutive case ids. A value replace (A → B) has no reverse case: B → A shows the same rows with swapped texts. |
| Same change, same id | Parameter-like fragments (path / query / header / cookie parameters, response headers) share one case list, and so do the two bodies: `query-parameters/11-schema-to-content` and `cookies/11-schema-to-content` are the same change. A change a fragment cannot express is skipped, and its id stays unused there (`—` below). |
| Path parameters | Cannot be added, removed, made optional, or removed as a group without changing the path template, which makes `apiDiff` pair different paths (a different operation). Covered: rename (renames the template: address row replace + property rename), description, deprecated, `schema` ↔ `content`, extensions. |
| Response codes | Whole add / remove per code kind (`1XX`–`5XX`, a range, `default`); the IT selects the changed code. All other response cases change the initially selected `200`, except `description-changed-non-initial-code` (change marker on a code that is not selected). |
| JSON Schemas inside | Not fanned out (that is the JSON Schema suites' job): each body has one property add / remove pair and one schema replace; the `schema` ↔ `content` and description-precedence cases cover the parameter synthesis. |
| Display modes | One story per case; `displayMode` is a story control (default `detailed`). ITs capture every case in `detailed` only. `simple` is covered once per hidden annotation by `OpenAPI Operation Diffs Suite (Display Mode = simple)` ([../../shared/features/display-mode-annotations.md](../../shared/features/display-mode-annotations.md#tests)) — never a duplicated story, fixture, or IT branch here. |
| Hiding unchanged nodes | Off: the story control `hideUnchangedNodes` defaults to `false`, so every row of the OpenAPI layer and of every embedded JSON Schema / JSO viewer is shown. Hiding is covered by `OpenAPI Operation Diffs Suite (Hiding Unchanged Nodes)` ([hiding-unchanged-nodes.md](hiding-unchanged-nodes.md)). |
| Generated | Fixtures, catalogues, stories, ITs, and the matrix below come from `packages/api-doc-viewer/bin/openapi-diffs-case-definitions.mjs` via `node bin/generate-openapi-diffs-suite.mjs`. Change cases there, not in the output. |

## Matrix

<!-- BEGIN generated: node packages/api-doc-viewer/bin/generate-openapi-diffs-suite.mjs -->

256 cases; ITs capture each in `detailed` (256 screenshots). Display mode `simple` is covered by `OpenAPI Operation Diffs Suite (Display Mode = simple)`.

### Parameters and headers

One case list for every parameter-like fragment; the same id is the same change in each folder.
`—` = the fragment cannot express the change.

| Case | Change | Opposite | Path Parameters | Query Parameters | Request Headers | Cookies | Response Headers |
| --- | --- | --- | :---: | :---: | :---: | :---: | :---: |
| `01-entry-added` | one more entry added | `02-entry-removed` | — | ✓ | ✓ | ✓ | ✓ |
| `02-entry-removed` | one of several entries removed | `01-entry-added` | — | ✓ | ✓ | ✓ | ✓ |
| `03-entry-renamed` | entry renamed (path: the path template is renamed too) | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| `04-required-added` | entry became required | `05-required-removed` | — | ✓ | ✓ | ✓ | ✓ |
| `05-required-removed` | entry became optional | `04-required-added` | — | ✓ | ✓ | ✓ | ✓ |
| `06-description-added` | entry description added | `07-description-removed` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `07-description-removed` | entry description removed | `06-description-added` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `08-description-changed` | entry description replaced | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| `09-deprecated-added` | entry became deprecated | `10-deprecated-removed` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `10-deprecated-removed` | entry is no longer deprecated | `09-deprecated-added` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `11-schema-to-content` | `schema` replaced by `content` (media type annotation added) | `12-content-to-schema` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `12-content-to-schema` | `content` replaced by `schema` | `11-schema-to-content` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `13-content-media-type-renamed` | `content` media type renamed, same schema | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| `14-extension-added` | entry `x-*` added | `15-extension-removed` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `15-extension-removed` | entry `x-*` removed | `14-extension-added` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `16-extension-changed` | entry `x-*` replaced and another one added | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| `17-extension-moved-to-schema` | `x-*` moved from the entry to its schema (no diff) | `18-extension-moved-to-entry` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `18-extension-moved-to-entry` | `x-*` moved from the schema to the entry (no diff) | `17-extension-moved-to-schema` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `19-all-added` | the whole group appears | `20-all-removed` | — | ✓ | ✓ | ✓ | ✓ |
| `20-all-removed` | the whole group disappears | `19-all-added` | — | ✓ | ✓ | ✓ | ✓ |
| `21-description-moved-entry-to-schema` | same text moved from the entry to the schema root (no diff) | `22-description-moved-schema-to-entry` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `22-description-moved-schema-to-entry` | same text moved from the schema root to the entry (no diff) | `21-description-moved-entry-to-schema` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `23-description-entry-removed-schema-added` | entry text removed, other text added to the schema root | `24-description-schema-removed-entry-added` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `24-description-schema-removed-entry-added` | schema-root text removed, other text added to the entry | `23-description-entry-removed-schema-added` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `25-description-both-places-changed` | entry and schema-root texts both replaced (the entry text wins) | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| `26-description-schema-changed-under-entry` | only the shadowed schema-root text replaced (no diff) | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| `27-moved-query-to-header` | `dryRun` moved from query to header (Query Parameters only) | `28-moved-header-to-query` | — | ✓ | — | — | — |
| `28-moved-header-to-query` | `dryRun` moved from header to query (Query Parameters only) | `27-moved-query-to-header` | — | ✓ | — | — | — |

### Bodies

One case list for the request body and the body of the initially selected response (`200`).

| Case | Change | Opposite | Request Body | Response Body |
| --- | --- | --- | :---: | :---: |
| `01-body-added` | the whole Body appears | `02-body-removed` | ✓ | ✓ |
| `02-body-removed` | the whole Body disappears | `01-body-added` | ✓ | ✓ |
| `03-required-added` | Body became required | `04-required-removed` | ✓ | — |
| `04-required-removed` | Body became optional | `03-required-added` | ✓ | — |
| `05-description-added` | Body description added | `06-description-removed` | ✓ | — |
| `06-description-removed` | Body description removed | `05-description-added` | ✓ | — |
| `07-description-changed` | Body description replaced | — | ✓ | — |
| `08-media-type-added` | second media type added | `09-media-type-removed` | ✓ | ✓ |
| `09-media-type-removed` | one of two media types removed | `08-media-type-added` | ✓ | ✓ |
| `10-media-type-renamed` | the only media type renamed, same schema | — | ✓ | ✓ |
| `11-only-media-type-added` | the only media type appears, no description (Body appears) | `12-only-media-type-removed` | ✓ | — |
| `12-only-media-type-removed` | the only media type disappears, no description (Body disappears) | `11-only-media-type-added` | ✓ | — |
| `13-media-type-added-description-kept` | the only media type appears next to a description (Body stays) | `14-media-type-removed-description-kept` | ✓ | — |
| `14-media-type-removed-description-kept` | the only media type disappears, the description stays (Body stays) | `13-media-type-added-description-kept` | ✓ | — |
| `15-schema-added` | the only media type gets a schema (Body appears) | `16-schema-removed` | ✓ | ✓ |
| `16-schema-removed` | the only media type loses its schema (Body disappears) | `15-schema-added` | ✓ | ✓ |
| `17-schema-property-added` | schema property added (one representative JSON Schema change) | `18-schema-property-removed` | ✓ | ✓ |
| `18-schema-property-removed` | schema property removed | `17-schema-property-added` | ✓ | ✓ |
| `19-schema-type-changed` | schema replaced: object -> array of objects | — | ✓ | ✓ |
| `20-body-extension-added` | Request Body `x-*` added (cloned into every schema) | `21-body-extension-removed` | ✓ | — |
| `21-body-extension-removed` | Request Body `x-*` removed | `20-body-extension-added` | ✓ | — |
| `22-media-type-extension-added` | media type `x-*` added (cloned into its schema) | `23-media-type-extension-removed` | ✓ | ✓ |
| `23-media-type-extension-removed` | media type `x-*` removed | `22-media-type-extension-added` | ✓ | ✓ |
| `24-extensions-changed` | Request Body `x-*` replaced, media type `x-*` added; an `x-*` key in `content` is ignored | — | ✓ | — |
| `25-media-type-extension-shadows-schema-root` | media type `x-*` added over a schema-root `x-*` of the same key (replace) | — | ✓ | ✓ |

### Operation (`operation/`)

| Case | Change | Opposite |
| --- | --- | --- |
| `01-summary-added` | summary added (title row appears) | `02-summary-removed` |
| `02-summary-removed` | summary removed | `01-summary-added` |
| `03-summary-changed` | summary replaced | — |
| `04-operation-id-added` | operation ID added | `05-operation-id-removed` |
| `05-operation-id-removed` | operation ID removed | `04-operation-id-added` |
| `06-operation-id-changed` | operation ID replaced | — |
| `07-description-added` | description added | `08-description-removed` |
| `08-description-removed` | description removed | `07-description-added` |
| `09-description-changed` | description replaced | — |
| `10-external-docs-added` | external docs added | `11-external-docs-removed` |
| `11-external-docs-removed` | external docs removed | `10-external-docs-added` |
| `12-external-docs-url-changed` | external docs URL replaced (row painted) | — |
| `13-external-docs-description-changed` | external docs description replaced (yellow row, highlighted link; each tooltip shows its own side) | — |
| `14-deprecated-added` | operation became deprecated (tag on the title row) | `15-deprecated-removed` |
| `15-deprecated-removed` | operation is no longer deprecated | `14-deprecated-added` |
| `16-deprecated-added-without-summary` | became deprecated, no summary (tag and yellow row on the operation ID row) | `17-deprecated-removed-without-summary` |
| `17-deprecated-removed-without-summary` | no longer deprecated, no summary (tag and yellow row on the operation ID row) | `16-deprecated-added-without-summary` |
| `18-extension-added` | one more `x-*` added | `19-extension-removed` |
| `19-extension-removed` | one of several `x-*` removed | `18-extension-added` |
| `20-extension-changed` | `x-*` replaced | — |
| `21-extensions-added` | Extensions section appears | `22-extensions-removed` |
| `22-extensions-removed` | Extensions section disappears | `21-extensions-added` |
| `23-operation-added` | whole operation added next to an existing GET | `24-operation-removed` |
| `24-operation-removed` | whole operation removed, GET stays | `23-operation-added` |
| `25-long-path-summary-changed` | summary replaced, long path: the address value font shrinks to fit each side (same size on both sides) | — |
| `26-very-long-path-summary-changed` | summary replaced, very long path: the address value wraps at the minimum font size | — |

### Responses (`responses/`)

| Case | Change | Opposite |
| --- | --- | --- |
| `01-response-1xx-added` | `101` response added (headers + body) | `02-response-1xx-removed` |
| `02-response-1xx-removed` | `101` response removed | `01-response-1xx-added` |
| `03-response-2xx-added` | `201` response added (headers + body) | `04-response-2xx-removed` |
| `04-response-2xx-removed` | `201` response removed | `03-response-2xx-added` |
| `05-response-3xx-added` | `303` response added (headers + body) | `06-response-3xx-removed` |
| `06-response-3xx-removed` | `303` response removed | `05-response-3xx-added` |
| `07-response-4xx-added` | `404` response added (headers + body) | `08-response-4xx-removed` |
| `08-response-4xx-removed` | `404` response removed | `07-response-4xx-added` |
| `09-response-5xx-added` | `500` response added (headers + body) | `10-response-5xx-removed` |
| `10-response-5xx-removed` | `500` response removed | `09-response-5xx-added` |
| `11-response-range-added` | `5XX` response added (headers + body) | `12-response-range-removed` |
| `12-response-range-removed` | `5XX` response removed | `11-response-range-added` |
| `13-response-default-added` | `default` response added (headers + body) | `14-response-default-removed` |
| `14-response-default-removed` | `default` response removed | `13-response-default-added` |
| `15-code-case-renamed` | `4xx` renamed to `4XX` | — |
| `16-code-renamed-and-description-changed` | `4xx` renamed to `4XX` and its description replaced | — |
| `17-description-changed` | response description replaced | — |
| `18-description-changed-non-initial-code` | description of `400` replaced (marker on `400`, `200` selected) | — |
| `19-response-extension-added` | Response `x-*` added (Extensions subsection appears) | `20-response-extension-removed` |
| `20-response-extension-removed` | Response `x-*` removed | `19-response-extension-added` |
| `21-response-extension-changed` | Response `x-*` replaced | — |
| `22-responses-extension-added` | Responses Object `x-*` added | `23-responses-extension-removed` |
| `23-responses-extension-removed` | Responses Object `x-*` removed | `22-responses-extension-added` |
| `24-responses-and-response-extensions-changed` | Responses Object `x-*` added, Response `x-*` replaced, media type `x-*` added | — |
| `25-changes-of-different-severity` | description replaced, header added, property and media type removed (strongest marker wins) | — |

### Security (`security/`)

| Case | Change | Opposite |
| --- | --- | --- |
| `01-security-added` | `security: []` replaced by a requirement (section appears) | `02-security-removed` |
| `02-security-removed` | requirement replaced by `security: []` (section disappears) | `01-security-added` |
| `03-document-security-overridden` | inherited document security replaced by an operation override | `04-document-security-override-removed` |
| `04-document-security-override-removed` | operation override removed, document security inherited | `03-document-security-overridden` |
| `05-alternative-added` | second alternative added | `06-alternative-removed` |
| `06-alternative-removed` | one of two alternatives removed | `05-alternative-added` |
| `07-anonymous-alternative-added` | `{}` added: `Optional` badge appears (yellow title row, toolbar uncolored) | `08-anonymous-alternative-removed` |
| `08-anonymous-alternative-removed` | `{}` removed: `Optional` badge disappears | `07-anonymous-alternative-added` |
| `09-scheme-added-to-alternative` | second scheme added to the alternative (AND) | `10-scheme-removed-from-alternative` |
| `10-scheme-removed-from-alternative` | one of two schemes removed from the alternative | `09-scheme-added-to-alternative` |
| `11-required-scope-added` | required scope added | `12-required-scope-removed` |
| `12-required-scope-removed` | required scope removed | `11-required-scope-added` |
| `13-scheme-description-added` | scheme description added | `14-scheme-description-removed` |
| `14-scheme-description-removed` | scheme description removed | `13-scheme-description-added` |
| `15-scheme-description-changed` | scheme description replaced | — |
| `16-scheme-type-changed` | scheme type replaced: apiKey -> HTTP bearer (type badge only) | — |
| `17-scheme-definition-added` | missing scheme definition added to components | `18-scheme-definition-removed` |
| `18-scheme-definition-removed` | scheme definition removed (unresolved card) | `17-scheme-definition-added` |
| `19-api-key-location-changed` | apiKey `in` replaced: header -> query | — |
| `20-api-key-name-changed` | apiKey `name` replaced | — |
| `21-http-scheme-changed` | HTTP `scheme` replaced: basic -> digest | — |
| `22-bearer-format-added` | HTTP `bearerFormat` added | `23-bearer-format-removed` |
| `23-bearer-format-removed` | HTTP `bearerFormat` removed | `22-bearer-format-added` |
| `24-openid-connect-url-changed` | `openIdConnectUrl` replaced | — |
| `25-oauth-flow-added` | OAuth flow added | `26-oauth-flow-removed` |
| `26-oauth-flow-removed` | one of two OAuth flows removed | `25-oauth-flow-added` |
| `27-token-url-changed` | flow `tokenUrl` replaced | — |
| `28-refresh-url-added` | flow `refreshUrl` added | `29-refresh-url-removed` |
| `29-refresh-url-removed` | flow `refreshUrl` removed | `28-refresh-url-added` |
| `30-flow-scope-added` | available scope added | `31-flow-scope-removed` |
| `31-flow-scope-removed` | available scope removed | `30-flow-scope-added` |
| `32-flow-scope-description-changed` | available scope description replaced (tooltip) | — |
| `33-anonymous-alternative-replaced-by-api-key` | `{}` replaced by an `api_key` alternative (badge removed, option added) | `34-api-key-alternative-replaced-by-anonymous` |
| `34-api-key-alternative-replaced-by-anonymous` | `api_key` alternative replaced by `{}` (option removed, badge added) | `33-anonymous-alternative-replaced-by-api-key` |

### OAS 3.1 (`oas31/`)

| Case | Change | Opposite |
| --- | --- | --- |
| `01-nullable-via-type-array` | request body property became nullable via a type array | — |
| `02-mutual-tls-alternative-added` | `mutualTLS` alternative added | `03-mutual-tls-alternative-removed` |
| `03-mutual-tls-alternative-removed` | `mutualTLS` alternative removed | `02-mutual-tls-alternative-added` |
| `04-role-scopes-added` | `Required roles` added on an apiKey scheme (known gap: apiDiff reports no diff, both sides show the after roles) | `05-role-scopes-removed` |
| `05-role-scopes-removed` | `Required roles` removed (known gap: apiDiff reports no diff) | `04-role-scopes-added` |
| `06-responses-added` | `responses` appears (section appears) | `07-responses-removed` |
| `07-responses-removed` | `responses` disappears (allowed in 3.1) | `06-responses-added` |

<!-- END generated -->
