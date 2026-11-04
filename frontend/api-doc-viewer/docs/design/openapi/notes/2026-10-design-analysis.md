# 2026-10 — OpenAPI design analysis

Evidence behind the OpenAPI operation viewer design: how `api-unifier` and `apiDiff` shape OpenAPI
documents. Measured on 2026-10-07 with `@netcracker/qubership-apihub-api-diff`
`4.0.1-dev.20261005155833` and `@netcracker/qubership-apihub-api-unifier`
`2.9.3-dev.20261005154101`, using the fixtures in `packages/samples/openapi/` and
`packages/samples/openapi-diffs/`. Merge options were those of `mergeOpenApiDocuments` in
`packages/api-doc-viewer/src/stories/preprocess.ts` (whole documents, `unify`, `validate`,
`liftCombiners`, `allowNotValidSyntheticChanges`).

Re-run the probes when either library is upgraded; a changed finding means a design document must
change too. `M` = `diffsMetaKey`; `op` = `paths[path][method]`.

## Findings


> The plain fixtures named in the evidence column below (`oas30/01-…`, `oas31/01-…` and similar)
> were replaced on 2026-10-12 by the generated suite ([../features/plain-case-matrix.md](../features/plain-case-matrix.md)).
> The behaviour they measured is covered there: E10 by `oas31/fields/schemas/01`–`02`, E11 by
> `oas30/structure/01`, E12 by `oas31/structure/01`–`02`, E15 by `oas31/fields/schemas/08`.

| Id | Finding | Fixture | Design consequence |
| --- | --- | --- | --- |
| E1 | A renamed path (`/orders/{orderId}` → `/orders/{id}`) is one `rename` in `paths[M]['/orders/{id}']` (`beforeKey`, `afterKey`); the merged document keys the path item by the **after** path. The renamed path parameter is a separate `name` `replace` on the parameter. | `path-parameters/03-entry-renamed` | Diffs viewer `operationKeys.path` is the merged key (Q14); the transformer turns the rename into an `address` replace. |
| E2 | A new method on an existing path: `pathItem[M][method]` `add`. A removed **whole path**: `paths[M][path]` `remove` and nothing per method — unless `openApiPathItemPerOperationDiffs: true`, which yields one diff per method instead. | `operation/23-operation-added`, probe | Whole-operation diff = `pathItem[M][method]` ?? `paths[M][path]` (add / remove only). |
| E3 | Parameters are mapped by `in` + `name` (path parameters by template position). Removed parameters stay in the merged array at their **before** index; added ones are appended; diffs are keyed by the merged index. | `query-parameters/01-entry-added`, `request-headers/20-all-removed`, `request-headers/03-entry-renamed` | The synthesizer iterates the merged array. |
| E4 | A parameter whose `in` changed is a `remove` plus an `add` (never a replace of `in`). | `query-parameters/27-moved-query-to-header` | No cross-group logic. |
| E5 | `required: false → true` arrives as a `replace` with `beforeValue: false` although the before document omits `required` (compared against the unifier default). | `query-parameters/04-required-added` | Treat missing as `false`; drop no-op required diffs. |
| E6 | Media types are mapped by `contentMediaTypeMappingResolver` (exact, then base type, then one wildcard-compatible pair): `application/json` → `application/json; charset=utf-8` is a `rename` keyed by the after key. Response codes are mapped case-insensitively: `4xx` → `4XX` is a `rename`. | `request-body/10-media-type-renamed`, `responses/15-code-case-renamed` | Selector option titles are side-dependent; rename is not a whole-node change. |
| E7 | Security alternatives are mapped **by index**: an added alternative is `security[M][index]` `add`; `security: []` yields one `remove` per alternative; a scheme added to an alternative is `security[i][M][name]` `add`; a scope is `security[i][name][M][j]`. | `security/05-alternative-added`, `02`, `03`, `06` | Alternatives = selector options keyed by index; scopes via list-side display. |
| E8 | An operation starting to override the document-level `security` is one `op[M].security` `add` with the whole list as `afterValue`. | `security/03-document-security-overridden` | Synthetic alternative diffs by deep equality (Q15). |
| E9 | Scheme definition changes live in `components.securitySchemes[…]`. A merge in operation mode **with `components` stripped** (as `prepareJsonDiffSchemaFromOAS` does) produces no scheme diffs and no scheme definitions; operation mode with `components` kept produces both. | `security/27-token-url-changed`, probe | Hosts must keep `components` (D11, public API). |
| E10 | OAS 3.1 `type: [string, 'null']` is unified into `anyOf: [{type: string}, {type: null}]` (also in diffs: adding `null` is `anyOf[1]` `add`). An `enum` without `type` gets `type: any`. OAS 3.0 `nullable: true` stays as is. | `oas31/01-nullable-via-type-array`, `oas31/01-full-operation` | Schema display is a JSON Schema topic; the OpenAPI stack never rewrites schemas. |
| E11 | Path-item `parameters` are merged into each operation after the operation's own parameters; an operation parameter with the same `name` + `in` wins. Afterwards the path item contains only methods. Path-item `x-*` keys are copied into operations only when the path item also has `parameters` / `servers` / `summary` / `description`. | `oas30/04-parameters-sources`, `oas30/01-full-operation` | The transformer reads only the operation; tests must not assume path-item extension copying. |
| E12 | OAS 3.1 Reference Object `description` siblings override the target's description (parameter, response); `components.pathItems` and path-item `$ref` are resolved. | `oas31/04-reference-overrides-and-path-items` | No OpenAPI-stack code; fixture only. |
| E13 | Denormalized and merged documents carry no unifier defaults: no `parameters: []`, no `headers: {}`, no `required: false`, no `style`. | probe on `security/27-token-url-changed` | Presence checks are reliable; still treat explicit empty containers as absent. |
| E16 | Operation `deprecated` added is a `replace` `false → true` (unifier default, like E5); `requestBody.required` `true → false` is a `replace`; `operationId` change is a `replace`. | `operation/06-operation-id-changed`, `09`, `10`, `request-body/04-required-removed` | Boolean flags are normalized to add / remove semantics in the aggregators (JSON Schema required rule). |
| E17 | Inside a **parameter**, `content` media types are **not** mapped (`parametersRules` has no `/content` mapping; only request / response bodies use `contentMediaTypeMappingResolver`): `application/json` → `application/json; charset=utf-8` is `content[M]['application/json']` `remove` + `content[M]['application/json; charset=utf-8']` `add`. Switching `schema` → `content` is `schema` `remove` + `content` `add`. | `query-parameters/11-schema-to-content`, `17`, `18` | Schema-source switch handled by the synthesizer ([parameters.md](../entities/parameters.md#description-and-schema-sources)). |
| E18 | Removed object keys stay in the merged object with their **before** value (the removed `schema`, the old media-type key, a removed entry `description`). A description moved between the entry and the schema root is a `remove` in one place and an `add` in the other, never one diff. | `query-parameters/21-description-moved-entry-to-schema` – `16` | Per-side values are reconstructed from merged value + diffs on the key and its ancestors; description diffs are computed from the shown values. |
| E19 | One intent, different diff depths: removing a request body's only media type is `content[M][mt]` `remove` (`requestBody` untouched); removing its only schema is `content[mt][M].schema` `remove`; deleting a response's `content` is one `response[M].content` `remove`; deleting a response's `headers` map is one `headers[M][name]` `remove` **per header** (the unifier default `headers: {}` exists on the after side). | `request-body/12-only-media-type-removed` – `23`, `response-body/02-body-removed` – `09` | Whole-section changes are computed from presence per side, not from diff location (D14). |
| E20 | After `aggregateDiffsWithRollup`, the rollup at a response object contains only diffs **inside** it: empty for a response added / removed (`responses/07-response-4xx-added`, `10`) or renamed (`02`), empty for every code of a wholly added operation (`operation/23-operation-added`); the inner diffs otherwise (`03`, `06`, `07`, `09`, `11`, `12` — `12` holds `breaking`, `non-breaking`, `annotation`). The whole / rename diff sits in the parent `responses` record. | `responses/*`, `operation/23-operation-added` | Change markers read the rollup directly; the only extra guard is for diffs our synthesizer stamps ([responses.md](../entities/responses.md#change-markers-on-response-code-options)). |
| E21 | Parameter-level `x-*` diffs sit in the parameter's own record keyed by name (`parameters[i][M]['x-owner']` replace, `['x-internal']` add); moving a key from the entry to `schema` is an entry `remove` + `schema[M]['x-owner']` `add`; a change inside a value stays nested (`x-audience.owners[M][1]` add). | `query-parameters/16-extension-changed`, `25`, `26` | Entry extensions move flat into the synthetic property schema; per-key precedence like description ([parameters.md](../entities/parameters.md#entry-extensions)). |
| E22 | Request Body, Media Type, Responses, and Response `x-*` diffs sit in their own object's record keyed by name (`requestBody[M]['x-max-size']`, `content[mt][M]['x-codec']`, `responses[M]['x-rate-limited']`, `responses['200'][M]['x-cache']`). An `x-*` key with a string value inside a `content` map is dropped by the unifier's validation (`Value under 'x-not-a-media-type' excluded …`) and produces no diff. | `request-body/24-extensions-changed`, `28`, `responses/24-responses-and-response-extensions-changed` | D15 placement; `content`-map keys are not extensions. |
| E23 | A **removed** range response code is recorded under its normalized lowercase spelling (`responses[M]['5xx']` `remove`) while the merged document keeps the original key (`5XX`); an added one keeps the original spelling in both. | `responses/12-response-range-removed` | The with-diffs transformer reads a range code's diff case-insensitively (falling back only when that spelling is not a response of its own); report upstream. |
| E14 | `normalize` reports `Invalid property 'components.pathItems' for OpenAPI 3.0` through `onValidateError` for **every** OAS 3.0 document that has `components`, even without `pathItems` (`Reflect.deleteProperty` returns `true` for a missing key). Upstream bug; harmless. | every OAS 3.0 fixture with `components` | Stories and tests must not fail on validation callbacks; report upstream. |
| E15 | The OAS 3.1 schema rules report `Key 'contentEncoding' unexpected here` (a valid JSON Schema 2020-12 keyword); the key is kept. | `oas31/01-full-operation` | Harmless; report upstream. |

## Lessons carried over from the AsyncAPI stack

| Observation in AsyncAPI | OpenAPI decision |
| --- | --- |
| `kind-parameters.ts` / `kind-extensions.ts` color the section header from the **first** child diff after checking only the count | Check the direction of **every** child diff (D8, [../features/diffs.md](../features/diffs.md#section-presence-and-whole-section-changes)). |
| `MessageChannelParametersNodeViewer` stamps a whole-node diff onto the top-level keys of the parameters schema and needs `hasNestedPropertiesDiffs` to avoid hijacking JSON Schema nesting detection | Stamp per **property** in the synthesizer; the viewer never stamps (D3). |
| Row visibility lives in the viewer (`shouldBeDisplayed`), listed as `planned` to move | Visibility managers in next-data-model from the start (D6). |
| `node-diffs-severities/kind-any.ts` maps a whole-node replace to `TitleRow` and `BindingVersionRow` only ("TODO: Extract more layers") | One placement per row; whole-node add / remove fills all of the node's placements (D7). |
| `AddressRow` is AsyncAPI-only | Shared, with a badge descriptor (D9). |

## How to re-run

The probes are throw-away scripts; their essence:

```javascript
const { apiDiff, DIFF_META_KEY } = require('@netcracker/qubership-apihub-api-diff')
const merged = apiDiff(before, after, {
  syntheticTitleFlag: Symbol('t'), unify: true, validate: true, liftCombiners: true,
  allowNotValidSyntheticChanges: true, beforeSource: before, afterSource: after, metaKey: DIFF_META_KEY,
}).merged
// walk `merged`, print every `node[DIFF_META_KEY]` record with its path, action, and values
```

For plain documents: `denormalize(normalize(doc, opts), opts)` with the same options plus
`source: doc`.
