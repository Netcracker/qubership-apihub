# OpenAPI — display coverage

Baseline for the OpenAPI stack (`OpenApiOperationViewer` / `OpenApiOperationDiffsViewer` +
`OpenApiTreeBuilder` / `OpenApiTreeWithDiffsBuilder`). Status: **implemented** (first iteration) —
every `viewer` tag below is implemented; deviations from the original design are recorded in
[notes/2026-10-implementation-decisions.md](notes/2026-10-implementation-decisions.md). Screenshot
baselines are not committed yet (T4 there).

Last reviewed against the code: 2026-10-08.

## Sources

Keep in sync with the code.

| Layer | Location |
| --- | --- |
| Dialects | `packages/next-data-model/src/building-service/openapi/shared/dialects/` |
| Operation → operation-oriented spec | `packages/next-data-model/src/building-service/openapi/shared/openapi-spec-transformer.ts` |
| Merged diffs → operation-oriented spec | `packages/next-data-model/src/building-service/openapi/shared/openapi-spec-with-diffs-transformer.ts` |
| Schema synthesizer | `packages/next-data-model/src/building-service/openapi/shared/object-schema-*synthesizer.ts` |
| Crawl rules | `packages/next-data-model/src/building-service/openapi/json-crawl-entities/` |
| Builders, aggregators | `packages/next-data-model/src/building-service/openapi/{tree,tree-with-diffs}/` |
| Tree model, accessors (`OpenApiRowDiffs`), visibility (`OpenApiNodeVisibility`), labels | `packages/next-data-model/src/model/openapi/` |
| Shared types | `packages/next-data-model/src/shared/openapi/` |
| Viewers | `packages/api-doc-viewer/src/components/OpenApiOperationViewer/` |
| Fixture catalogues | `packages/samples/openapi/README.md`, `packages/samples/openapi-diffs/README.md` |

## Scope

One OpenAPI 3.0.x / 3.1.x **operation** (`path` + `method`) of a normalized document, or of a merged
`apiDiff` document. Not a path, tag, or document browser.

| Viewer | Props |
| --- | --- |
| `OpenApiOperationViewer` | `source`, `operationKeys`, `displayMode`, `devMode`, `noHeading`, `expandedDepth` |
| `OpenApiOperationDiffsViewer` | `mergedSource` instead of `source`, plus `diffMetaKeys`, `diffTypes`, `hideUnchangedNodes` |

## Pipeline

```text
OpenAPI document | merged diff document
  → OpenApiSpecTransformer | OpenApiSpecWithDiffsTransformer   (operation-oriented spec, dialect)
  → OpenApiTreeBuilder | OpenApiTreeWithDiffsBuilder
  → OpenApiOperationViewer | OpenApiOperationDiffsViewer
  → OperationNodeViewer → Security | Extensions | Request | Responses containers
```

Schemas (parameters, headers, bodies) are rendered by the JSON Schema viewers, extensions by the
JSO viewers. Diagrams: [architecture/](architecture/).

## Classification tags

| Tag | Meaning |
| --- | --- |
| **`viewer`** | Shown (target of the first implementation). |
| **`ndm-reserved`** | Kept on the tree node value but not painted. |
| **`intentional-gap`** | Product decision — absence is **not** a regression. |
| **`planned`** | Accepted follow-up; not part of the first implementation. |

## Displayed (plain)

| Area | UI element | Condition | Design |
| --- | --- | --- | --- |
| Header | Title (h1) | `summary` exists and not `noHeading`; no fallback | [entities/operation.md](entities/operation.md#title-row) |
| Header | **deprecated** tag | `deprecated: true`; in the title subheader; without a title on the operation ID row, else on the address row | [entities/operation.md](entities/operation.md#deprecated-tag) |
| Header | `<operationId>` (secondary text, no label) | `operationId` | [entities/operation.md](entities/operation.md#operation-id-row) |
| Header | Address row: method badge + path | always | [entities/operation.md](entities/operation.md#address-row) |
| Header | External docs link: static `View external documentation ↗`; `externalDocs.description` in a hover `UxTooltip` | `externalDocs.url` | [entities/operation.md](entities/operation.md#external-docs-row) |
| Header | Description (markdown) | `description`; `detailed` mode only | [entities/operation.md](entities/operation.md#description-row) |
| Security | Section (h2) | ≥1 effective list item (`[{}]` included) | [entities/security.md](entities/security.md) |
| Security | Security toolbar: `‹` options strip `›` (scrolls one option per arrow click, cropped titles) | ≥1 non-anonymous alternative | [entities/security.md](entities/security.md#security-toolbar), [shared/features/arrow-scroll-strip.md](../shared/features/arrow-scroll-strip.md) |
| Security | Framed scheme card: title (h4) + gray type text, description, security props (`<Place> parameter name`, `HTTP Authorization Scheme`, `Bearer Format`, `OpenID Connect URL`, `Required scopes` / `Required roles`) | per scheme of the selected alternative; description and scope descriptions in `detailed` mode only | [entities/security.md](entities/security.md#scheme-card) |
| Security | OAuth flow parts: `Flow type **…**` header, `Authorization URL` / `Token URL` / `Refresh URL` links, expandable `Scopes` with scope rows (required `*`) | oauth2 | [entities/security.md](entities/security.md#oauth-flow-parts) |
| Security | `Optional` badge in the section title row | `{}` requirement | [entities/security.md](entities/security.md#optional-badge-anonymous-access) |
| Extensions | Section (h2) + JSO tree | `x-*` keys on the operation | [entities/operation.md](entities/operation.md#extensions-section) |
| Request | Section (h2) | parameters or body | [entities/parameters.md](entities/parameters.md) |
| Request | Path / Query Parameters, Headers, Cookies (h3) + synthesized schema | parameters of that `in` | [entities/parameters.md](entities/parameters.md#groups) |
| Request | `Media type` custom annotation on a parameter | `content`-described parameter | [entities/parameters.md](entities/parameters.md#property-schema-of-one-entry) |
| Request, Responses | Parameter / response-header `x-*` in the property's **Extensions** sub-tree (both display modes) | entry-level `x-*` keys | [entities/parameters.md](entities/parameters.md#entry-extensions) |
| Request, Responses | Request Body and Media Type `x-*` cloned into the body schema root's **Extensions** sub-tree | `x-*` on those objects and a schema to attach to | [entities/request-body.md](entities/request-body.md#extensions) |
| Responses | **Extensions** (h3) of the selected response, after Headers and before Body | Response Object `x-*` | [entities/responses.md](entities/responses.md#response-extensions) |
| Responses | **Extensions** (h3) of the Responses Object, after the selected response | Responses Object `x-*` | [entities/responses.md](entities/responses.md#responses-extensions) |
| All | Section order from one config map | — | [features/operation-viewer.md](features/operation-viewer.md#section-order) |
| Request | Body (h3) + media-type selector | Body present: `description` or ≥1 media type with `schema` | [entities/request-body.md](entities/request-body.md) |
| Request | Required `*` on the Body title | `requestBody.required: true` | [entities/request-body.md](entities/request-body.md#required-marker) |
| Request | Body description (markdown) | `requestBody.description`; `detailed` mode only | [entities/request-body.md](entities/request-body.md#description-row) |
| Request | Body schema (wrapped root `Type`) | selected media type has `schema` | [entities/request-body.md](entities/request-body.md#schema) |
| Responses | Section (h2) + toned code selector: `‹` codes strip `›` in the subheader (one line, scrolls one code per arrow click) | `responses` | [entities/responses.md](entities/responses.md), [features/response-code-selector.md](features/response-code-selector.md), [shared/features/arrow-scroll-strip.md](../shared/features/arrow-scroll-strip.md) |
| Responses | Response description (markdown) | `description`; `detailed` mode only | [entities/responses.md](entities/responses.md#description-row) |
| Responses | Headers (h3) + synthesized schema | ≥1 header | [entities/responses.md](entities/responses.md#headers) |
| Responses | Body (h3) + media-type selector in the subheader + schema | the selected response has ≥1 media type with `schema` | [entities/responses.md](entities/responses.md#body) |

## Displayed (with diffs)

`OpenApiOperationDiffsViewer` renders the same rows in `SIDE_BY_SIDE_DIFFS_LAYOUT_MODE`; a row
shows when it has content on either side or a diff of its own.

| Area | Diff | Severity placement |
| --- | --- | --- |
| Title | `title` (summary), whole operation, `deprecated` change (synthetic replace) | `title-row` |
| Deprecated tag | its own `deprecated` diff | — (tag chrome) |
| Operation ID | `operationId` | `operation-id-row` |
| Request Body title | `required` change: side-exclusive `*`, diff-colored `required` tag, synthetic replace | `title-row` |
| Address | path rename → partial replace | `address-row` |
| External docs | whole add / remove, `url` or `description` replace (yellow row + highlighted link text, per-side `href` / tooltip; Q16 option A) | `external-docs-row` |
| Descriptions (operation, body, response, scheme) | `description` | `description-row` |
| Section and subsection headers | [section presence rule](features/diffs.md#section-presence-and-whole-section-changes) | `title-row` |
| Security alternatives | add / remove (index-mapped), override switch (synthetic) | selector markers, `selector-row` |
| Scheme card | whole add / remove, field diffs, scope list diffs | `security-scheme-*-row`, `security-required-scopes-row` |
| OAuth flow | URL fields, available scopes | `oauth-flow-*-row` |
| Code / media-type selectors | option add / remove / rename, change markers incl. nested schemas | selector markers, `selector-row` |
| Parameters, headers, bodies | continue in `JsonSchemaDiffsViewer` (rename, required, add / remove from the synthesizer) | JSON Schema placements |
| Extensions | continue in `JsoDiffsViewer` | JSO placements |

## Not displayed

| Item | Tag | Notes |
| --- | --- | --- |
| `servers` (document, path item, operation) | `planned` | The address row shows the path only. |
| Parameter / header `style`, `explode`, `allowEmptyValue`, `allowReserved` | `intentional-gap` | `api-unifier` injects defaults; showing them would add noise to every parameter. |
| Parameter / header / media type `example`, `examples` | `planned` | Schema-level examples are shown by the JSON Schema stack. |
| Media type `encoding` | `planned` | multipart details. |
| `x-*` keys inside a `content` map | `intentional-gap` | `content` is a map of media types, not an extensible object; such a key is not an extension (dropped by the unifier when its value is not an object). |
| `tags` | `intentional-gap` | Not part of the operation view. |
| `callbacks`, `links`, `webhooks` | `intentional-gap` | Out of the operation-viewer scope. |
| Security requirement inherited from the document (hint) | `ndm-reserved` | `isInheritedFromDocument` on the `security` node. |
| Schema keywords `const`, `contentMediaType`, `contentEncoding` | — | JSON Schema stack topic; triage against [../json-schema/display-coverage.md](../json-schema/display-coverage.md). |
| Hiding unchanged OpenAPI rows | `implemented` (security scheme cards) | Nested JSON Schema trees hide unchanged nodes; a security scheme card without content changes keeps its title row and hides the rest behind one three-dots row ([features/hiding-unchanged-nodes.md](features/hiding-unchanged-nodes.md)). Other OpenAPI rows are never hidden. |
| Diff-type filters on OpenAPI rows | `planned` | `diffTypes` is forwarded; floating badges keep `hidden={false}` (as AsyncAPI). |
| Layout modes other than document / side-by-side | `intentional-gap` | As AsyncAPI. |

## Triage rules

1. Check a fixture against **Displayed** before filing a bug.
2. A missing or wrong row **inside** a parameter group, header list, or body is triaged against the
   JSON Schema coverage; inside extensions, against JSO.
3. Diff semantics are fixed in next-data-model (transformer, synthesizer, aggregators), never in
   containers.
4. A behaviour that differs between OAS 3.0 and 3.1 belongs to a dialect class
   ([features/oas-versions.md](features/oas-versions.md)) or upstream; never branch on the version
   in a container.

## Regression coverage

Suites (stories under `packages/api-doc-viewer/src/stories/openapi-suite/` and
`…/openapi-diffs-suite/`, ITs `src/it/openapi-suite/*.it-test.ts` and
`src/it/openapi-diffs-suite/*.it-test.ts`; unit tests in
`packages/next-data-model/tests/unit-tests/openapi-*.test.ts` and
`packages/api-doc-viewer/tests/openapi-viewer-config.test.ts`):

| Suite | Fixtures |
| --- | --- |
| `OpenAPI Operation Suite/OAS 3.0/{E2E,Minimal,HTTP Methods,Fields,Document Structure}`, `…/OAS 3.1/{Fields,Document Structure}` (matrix: [features/plain-case-matrix.md](features/plain-case-matrix.md)) | `packages/samples/openapi/` |
| `OpenAPI Operation Diffs Suite/<Category>` (matrix: [features/diffs-case-matrix.md](features/diffs-case-matrix.md)) | `packages/samples/openapi-diffs/` |

## Related documents

- [README.md](README.md) — decisions, open questions, plan
- [../async-api/display-coverage.md](../async-api/display-coverage.md) — closest stack
- [../json-schema/display-coverage.md](../json-schema/display-coverage.md) — nested schemas
- [../jso/features/diffs.md](../jso/features/diffs.md) — extensions
