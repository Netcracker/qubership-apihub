# OpenAPI plain viewer — case matrix

What the `OpenAPI Operation Suite` covers, and why. Fixtures:
[packages/samples/openapi/](../../../../packages/samples/openapi/README.md); stories and ITs:
`packages/api-doc-viewer/src/{stories/openapi-suite,it/openapi-suite/*}`. Diff cases:
[diffs-case-matrix.md](diffs-case-matrix.md).

## Groups

| Group | Purpose | Rules |
| --- | --- | --- |
| **E2E** (`oas30/e2e/`) | How sections look next to each other. | Sections, in display order: summary, operation ID, address, description, security, operation extensions, path / query parameters, headers, cookies, body, responses with 1 code (headers, body), responses with 2 codes (headers, body). Cases: **every pair** of sections (every possible "A directly above B" adjacency), **consecutive windows** of 3, 4, … sections in display order, and **one all-sections case** (also captured with `noHeading`). A 1-code and a 2-codes section are never combined. |
| **Minimal** (`oas30/minimal/`) | The smallest valid operations. | A `default`-only operation. |
| **HTTP Methods** (`oas30/http-methods/`) | Every HTTP method badge (text and color). | **One fixture**, `template/sample.yaml` (the smallest operation: one status-only `200`); one story per method (`get`, `put`, `post`, `delete`, `options`, `head`, `patch`, `trace`) serves the template's only operation as that method (`methodTemplate` + `method` story args; `method` is a Storybook control). A new method is a new story and IT row, never a new fixture. |
| **Fields** (`oas30/fields/<sub-group>/`) | Each displayed field alone, in semantic sub-groups: **Operation** (summary, operation ID, description, external docs, extensions), **Security**, **Parameters**, **Request Body**, **Request Combinations**, **Responses / 2XX, 3XX, 4XX, 5XX**. Case ids restart in every sub-group. | Required fields only + the covered field. Security: alternative 1 is a stub apiKey, alternative 2 the covered scheme type (auto-switched); every oauth2 flow and openIdConnect is a pair of adjacent cases — the requirement lists the scope (required, `*`) / lists no scopes (oauth2: the flow's scope row without `*`; openIdConnect declares no scopes in the document, so no `Scopes` list); one apiKey scheme with a Markdown `description` covers the scheme description row. Parameters / headers: four entries per location — required, optional (path parameters are always required: a second required one), deprecated, `content`-described; one case per location. **Request Combinations**: every pair among path, query, headers, cookies, and the request body (required, with a description) — two request sections next to each other. Request body: required / optional / deprecated schema root × 1 / 2 media types (the 2nd auto-switched), plus body + schema descriptions. Responses: one sub-group per code kind (`200`, `302`, `404`, `500`) next to a `default` stub, the target code auto-switched; status only, description only, headers only, body only (1 / 2 media types × plain / deprecated schema root), the pairwise combinations, and description + body schema description. |
| **Document Structure** (`oas30/structure/`) | Document features that change what is displayed. | Path-item parameters with an operation override, `$ref` parameter / body / response, ignored-by-spec headers (shown as is), canonical response-code order, inherited / disabled document security, `{}` alternative, deprecated operation with and without a summary. |
| **OAS 3.1** (`oas31/fields/{security,responses,schemas}/`, `oas31/structure/`) | Only what displays differently from 3.0 ([oas-versions.md](oas-versions.md)), in the sub-groups **Security**, **Responses**, **Schemas**. | `mutualTLS`, `Required roles`, no `responses`, type-array nullable, numeric exclusive bounds, `examples`, `const`, enum without `type`, boolean schema, `contentMediaType`; Reference Object description overrides, `components.pathItems`. |

## Conventions

| Rule | Detail |
| --- | --- |
| Always-present rows | The address row is always shown: when the address section is off the path is short (`/orders`, `/orders/{orderId}` with path parameters), when on it is long. OAS 3.0 requires `responses`, so every 3.0 case has at least a status-only `200`. |
| "No description" | A Response Object requires `description`; `''` stands for "none" (the viewer hides empty text). |
| Deprecated body | OpenAPI has no `deprecated` on a Request Body or Media Type: the deprecated variant marks the media type schema root `deprecated: true`. A response has no `required`, so response bodies vary by media types and the deprecated schema root only. |
| Auto-switch | `switchTo` (security alternative, response code, media type test ids) is selected by `switchOpenApiOptions` from the story `play` (control `autoSwitch`, default on) and from the ITs via `page.evaluate` — the JSON Schema combiner auto-switch pattern. Media-type test ids are `request-media-type-<key>` / `response-media-type-<key>`. |
| Display modes | One story per case; `displayMode` is a story control (default `detailed`). ITs capture every case in `detailed` only; `simple` is covered once per hidden annotation by `OpenAPI Operation Suite (Display Mode = simple)` ([../../shared/features/display-mode-annotations.md](../../shared/features/display-mode-annotations.md#tests)). |
| Generated | Fixtures, catalogues, stories, ITs, and the matrix below come from `packages/api-doc-viewer/bin/openapi-plain-case-definitions.mjs` via `node bin/generate-openapi-suite.mjs`. |

## E2E approach (decision, 2026-10-12 — keep)

E2E cases review **section adjacency**: spacing, preceded-by rules, heading levels, and selector
and frame rows meeting each other. All subsets of 15 sections would be 2¹⁵ cases, so the group is
built from three kinds of combinations over one section list in **display order**:

| Kind | Covers | Why it is enough |
| --- | --- | --- |
| **Pairs** (every 2 sections) | Every possible "A directly above B" adjacency. | With only two sections present, A is immediately followed by B whatever sits between them in display order. Any page is a chain of such adjacencies. |
| **Consecutive windows** (k ≥ 3 sections in display order) | How adjacencies compose: cumulative spacing, nested levels (Request h2 → parameter h3 → Body h3), a page growing one section at a time. | O(n²) cases. Reviewing windows top-down shows the page build up section by section. |
| **All sections** (+ `noHeading`) | The full page. | The only place where both response codes with headers and body meet every other section. |

Constraints:

- A 1-code and a 2-codes responses section are never combined. As a result, windows never reach
  the 2-codes sections; they appear only in pairs and in all-sections. This is intended.
- The section list must follow the viewer's display order (`OPENAPI_SECTION_ORDER` and the
  header rows). If sections are reordered or added, update the list and regenerate; pairs and
  windows are derived from it.

How to extend and maintain the suites:
`agent-packages/api-doc-viewer-testing/.apm/skills/api-doc-viewer-testing/openapi-suites.md`.

## Matrix

<!-- BEGIN generated: node packages/api-doc-viewer/bin/generate-openapi-suite.mjs -->

288 cases; ITs capture each in `detailed` (288 screenshots, plus the `noHeading` variant of the all-sections case). Display mode `simple` is covered by `OpenAPI Operation Suite (Display Mode = simple)`.

### OAS 3.0 — E2E (`oas30/e2e/`, 168)

101 pairs, 66 windows, 1 all-sections case. Columns: Sum = `summary`, ID = `operation-id`, Addr = `address`, Desc =
`description`, Sec = `security`, Ext = `operation-extensions`, Path = `path-parameters`, Query = `query-parameters`, Hdr
= `headers`, Cook = `cookies`, Body = `body`, R1 hdr = `responses-1-code-headers`, R1 body = `responses-1-code-body`, R2
hdr = `responses-2-codes-headers`, R2 body = `responses-2-codes-body`.

| Case | Sum | ID | Addr | Desc | Sec | Ext | Path | Query | Hdr | Cook | Body | R1 hdr | R1 body | R2 hdr | R2 body |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `001-pair--summary--operation-id` | ✓ | ✓ |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `002-pair--summary--address` | ✓ |  | ✓ |  |  |  |  |  |  |  |  |  |  |  |  |
| `003-pair--summary--description` | ✓ |  |  | ✓ |  |  |  |  |  |  |  |  |  |  |  |
| `004-pair--summary--security` | ✓ |  |  |  | ✓ |  |  |  |  |  |  |  |  |  |  |
| `005-pair--summary--operation-extensions` | ✓ |  |  |  |  | ✓ |  |  |  |  |  |  |  |  |  |
| `006-pair--summary--path-parameters` | ✓ |  |  |  |  |  | ✓ |  |  |  |  |  |  |  |  |
| `007-pair--summary--query-parameters` | ✓ |  |  |  |  |  |  | ✓ |  |  |  |  |  |  |  |
| `008-pair--summary--headers` | ✓ |  |  |  |  |  |  |  | ✓ |  |  |  |  |  |  |
| `009-pair--summary--cookies` | ✓ |  |  |  |  |  |  |  |  | ✓ |  |  |  |  |  |
| `010-pair--summary--body` | ✓ |  |  |  |  |  |  |  |  |  | ✓ |  |  |  |  |
| `011-pair--summary--responses-1-code-headers` | ✓ |  |  |  |  |  |  |  |  |  |  | ✓ |  |  |  |
| `012-pair--summary--responses-1-code-body` | ✓ |  |  |  |  |  |  |  |  |  |  |  | ✓ |  |  |
| `013-pair--summary--responses-2-codes-headers` | ✓ |  |  |  |  |  |  |  |  |  |  |  |  | ✓ |  |
| `014-pair--summary--responses-2-codes-body` | ✓ |  |  |  |  |  |  |  |  |  |  |  |  |  | ✓ |
| `015-pair--operation-id--address` |  | ✓ | ✓ |  |  |  |  |  |  |  |  |  |  |  |  |
| `016-pair--operation-id--description` |  | ✓ |  | ✓ |  |  |  |  |  |  |  |  |  |  |  |
| `017-pair--operation-id--security` |  | ✓ |  |  | ✓ |  |  |  |  |  |  |  |  |  |  |
| `018-pair--operation-id--operation-extensions` |  | ✓ |  |  |  | ✓ |  |  |  |  |  |  |  |  |  |
| `019-pair--operation-id--path-parameters` |  | ✓ |  |  |  |  | ✓ |  |  |  |  |  |  |  |  |
| `020-pair--operation-id--query-parameters` |  | ✓ |  |  |  |  |  | ✓ |  |  |  |  |  |  |  |
| `021-pair--operation-id--headers` |  | ✓ |  |  |  |  |  |  | ✓ |  |  |  |  |  |  |
| `022-pair--operation-id--cookies` |  | ✓ |  |  |  |  |  |  |  | ✓ |  |  |  |  |  |
| `023-pair--operation-id--body` |  | ✓ |  |  |  |  |  |  |  |  | ✓ |  |  |  |  |
| `024-pair--operation-id--responses-1-code-headers` |  | ✓ |  |  |  |  |  |  |  |  |  | ✓ |  |  |  |
| `025-pair--operation-id--responses-1-code-body` |  | ✓ |  |  |  |  |  |  |  |  |  |  | ✓ |  |  |
| `026-pair--operation-id--responses-2-codes-headers` |  | ✓ |  |  |  |  |  |  |  |  |  |  |  | ✓ |  |
| `027-pair--operation-id--responses-2-codes-body` |  | ✓ |  |  |  |  |  |  |  |  |  |  |  |  | ✓ |
| `028-pair--address--description` |  |  | ✓ | ✓ |  |  |  |  |  |  |  |  |  |  |  |
| `029-pair--address--security` |  |  | ✓ |  | ✓ |  |  |  |  |  |  |  |  |  |  |
| `030-pair--address--operation-extensions` |  |  | ✓ |  |  | ✓ |  |  |  |  |  |  |  |  |  |
| `031-pair--address--path-parameters` |  |  | ✓ |  |  |  | ✓ |  |  |  |  |  |  |  |  |
| `032-pair--address--query-parameters` |  |  | ✓ |  |  |  |  | ✓ |  |  |  |  |  |  |  |
| `033-pair--address--headers` |  |  | ✓ |  |  |  |  |  | ✓ |  |  |  |  |  |  |
| `034-pair--address--cookies` |  |  | ✓ |  |  |  |  |  |  | ✓ |  |  |  |  |  |
| `035-pair--address--body` |  |  | ✓ |  |  |  |  |  |  |  | ✓ |  |  |  |  |
| `036-pair--address--responses-1-code-headers` |  |  | ✓ |  |  |  |  |  |  |  |  | ✓ |  |  |  |
| `037-pair--address--responses-1-code-body` |  |  | ✓ |  |  |  |  |  |  |  |  |  | ✓ |  |  |
| `038-pair--address--responses-2-codes-headers` |  |  | ✓ |  |  |  |  |  |  |  |  |  |  | ✓ |  |
| `039-pair--address--responses-2-codes-body` |  |  | ✓ |  |  |  |  |  |  |  |  |  |  |  | ✓ |
| `040-pair--description--security` |  |  |  | ✓ | ✓ |  |  |  |  |  |  |  |  |  |  |
| `041-pair--description--operation-extensions` |  |  |  | ✓ |  | ✓ |  |  |  |  |  |  |  |  |  |
| `042-pair--description--path-parameters` |  |  |  | ✓ |  |  | ✓ |  |  |  |  |  |  |  |  |
| `043-pair--description--query-parameters` |  |  |  | ✓ |  |  |  | ✓ |  |  |  |  |  |  |  |
| `044-pair--description--headers` |  |  |  | ✓ |  |  |  |  | ✓ |  |  |  |  |  |  |
| `045-pair--description--cookies` |  |  |  | ✓ |  |  |  |  |  | ✓ |  |  |  |  |  |
| `046-pair--description--body` |  |  |  | ✓ |  |  |  |  |  |  | ✓ |  |  |  |  |
| `047-pair--description--responses-1-code-headers` |  |  |  | ✓ |  |  |  |  |  |  |  | ✓ |  |  |  |
| `048-pair--description--responses-1-code-body` |  |  |  | ✓ |  |  |  |  |  |  |  |  | ✓ |  |  |
| `049-pair--description--responses-2-codes-headers` |  |  |  | ✓ |  |  |  |  |  |  |  |  |  | ✓ |  |
| `050-pair--description--responses-2-codes-body` |  |  |  | ✓ |  |  |  |  |  |  |  |  |  |  | ✓ |
| `051-pair--security--operation-extensions` |  |  |  |  | ✓ | ✓ |  |  |  |  |  |  |  |  |  |
| `052-pair--security--path-parameters` |  |  |  |  | ✓ |  | ✓ |  |  |  |  |  |  |  |  |
| `053-pair--security--query-parameters` |  |  |  |  | ✓ |  |  | ✓ |  |  |  |  |  |  |  |
| `054-pair--security--headers` |  |  |  |  | ✓ |  |  |  | ✓ |  |  |  |  |  |  |
| `055-pair--security--cookies` |  |  |  |  | ✓ |  |  |  |  | ✓ |  |  |  |  |  |
| `056-pair--security--body` |  |  |  |  | ✓ |  |  |  |  |  | ✓ |  |  |  |  |
| `057-pair--security--responses-1-code-headers` |  |  |  |  | ✓ |  |  |  |  |  |  | ✓ |  |  |  |
| `058-pair--security--responses-1-code-body` |  |  |  |  | ✓ |  |  |  |  |  |  |  | ✓ |  |  |
| `059-pair--security--responses-2-codes-headers` |  |  |  |  | ✓ |  |  |  |  |  |  |  |  | ✓ |  |
| `060-pair--security--responses-2-codes-body` |  |  |  |  | ✓ |  |  |  |  |  |  |  |  |  | ✓ |
| `061-pair--operation-extensions--path-parameters` |  |  |  |  |  | ✓ | ✓ |  |  |  |  |  |  |  |  |
| `062-pair--operation-extensions--query-parameters` |  |  |  |  |  | ✓ |  | ✓ |  |  |  |  |  |  |  |
| `063-pair--operation-extensions--headers` |  |  |  |  |  | ✓ |  |  | ✓ |  |  |  |  |  |  |
| `064-pair--operation-extensions--cookies` |  |  |  |  |  | ✓ |  |  |  | ✓ |  |  |  |  |  |
| `065-pair--operation-extensions--body` |  |  |  |  |  | ✓ |  |  |  |  | ✓ |  |  |  |  |
| `066-pair--operation-extensions--responses-1-code-headers` |  |  |  |  |  | ✓ |  |  |  |  |  | ✓ |  |  |  |
| `067-pair--operation-extensions--responses-1-code-body` |  |  |  |  |  | ✓ |  |  |  |  |  |  | ✓ |  |  |
| `068-pair--operation-extensions--responses-2-codes-headers` |  |  |  |  |  | ✓ |  |  |  |  |  |  |  | ✓ |  |
| `069-pair--operation-extensions--responses-2-codes-body` |  |  |  |  |  | ✓ |  |  |  |  |  |  |  |  | ✓ |
| `070-pair--path-parameters--query-parameters` |  |  |  |  |  |  | ✓ | ✓ |  |  |  |  |  |  |  |
| `071-pair--path-parameters--headers` |  |  |  |  |  |  | ✓ |  | ✓ |  |  |  |  |  |  |
| `072-pair--path-parameters--cookies` |  |  |  |  |  |  | ✓ |  |  | ✓ |  |  |  |  |  |
| `073-pair--path-parameters--body` |  |  |  |  |  |  | ✓ |  |  |  | ✓ |  |  |  |  |
| `074-pair--path-parameters--responses-1-code-headers` |  |  |  |  |  |  | ✓ |  |  |  |  | ✓ |  |  |  |
| `075-pair--path-parameters--responses-1-code-body` |  |  |  |  |  |  | ✓ |  |  |  |  |  | ✓ |  |  |
| `076-pair--path-parameters--responses-2-codes-headers` |  |  |  |  |  |  | ✓ |  |  |  |  |  |  | ✓ |  |
| `077-pair--path-parameters--responses-2-codes-body` |  |  |  |  |  |  | ✓ |  |  |  |  |  |  |  | ✓ |
| `078-pair--query-parameters--headers` |  |  |  |  |  |  |  | ✓ | ✓ |  |  |  |  |  |  |
| `079-pair--query-parameters--cookies` |  |  |  |  |  |  |  | ✓ |  | ✓ |  |  |  |  |  |
| `080-pair--query-parameters--body` |  |  |  |  |  |  |  | ✓ |  |  | ✓ |  |  |  |  |
| `081-pair--query-parameters--responses-1-code-headers` |  |  |  |  |  |  |  | ✓ |  |  |  | ✓ |  |  |  |
| `082-pair--query-parameters--responses-1-code-body` |  |  |  |  |  |  |  | ✓ |  |  |  |  | ✓ |  |  |
| `083-pair--query-parameters--responses-2-codes-headers` |  |  |  |  |  |  |  | ✓ |  |  |  |  |  | ✓ |  |
| `084-pair--query-parameters--responses-2-codes-body` |  |  |  |  |  |  |  | ✓ |  |  |  |  |  |  | ✓ |
| `085-pair--headers--cookies` |  |  |  |  |  |  |  |  | ✓ | ✓ |  |  |  |  |  |
| `086-pair--headers--body` |  |  |  |  |  |  |  |  | ✓ |  | ✓ |  |  |  |  |
| `087-pair--headers--responses-1-code-headers` |  |  |  |  |  |  |  |  | ✓ |  |  | ✓ |  |  |  |
| `088-pair--headers--responses-1-code-body` |  |  |  |  |  |  |  |  | ✓ |  |  |  | ✓ |  |  |
| `089-pair--headers--responses-2-codes-headers` |  |  |  |  |  |  |  |  | ✓ |  |  |  |  | ✓ |  |
| `090-pair--headers--responses-2-codes-body` |  |  |  |  |  |  |  |  | ✓ |  |  |  |  |  | ✓ |
| `091-pair--cookies--body` |  |  |  |  |  |  |  |  |  | ✓ | ✓ |  |  |  |  |
| `092-pair--cookies--responses-1-code-headers` |  |  |  |  |  |  |  |  |  | ✓ |  | ✓ |  |  |  |
| `093-pair--cookies--responses-1-code-body` |  |  |  |  |  |  |  |  |  | ✓ |  |  | ✓ |  |  |
| `094-pair--cookies--responses-2-codes-headers` |  |  |  |  |  |  |  |  |  | ✓ |  |  |  | ✓ |  |
| `095-pair--cookies--responses-2-codes-body` |  |  |  |  |  |  |  |  |  | ✓ |  |  |  |  | ✓ |
| `096-pair--body--responses-1-code-headers` |  |  |  |  |  |  |  |  |  |  | ✓ | ✓ |  |  |  |
| `097-pair--body--responses-1-code-body` |  |  |  |  |  |  |  |  |  |  | ✓ |  | ✓ |  |  |
| `098-pair--body--responses-2-codes-headers` |  |  |  |  |  |  |  |  |  |  | ✓ |  |  | ✓ |  |
| `099-pair--body--responses-2-codes-body` |  |  |  |  |  |  |  |  |  |  | ✓ |  |  |  | ✓ |
| `100-pair--responses-1-code-headers--responses-1-code-body` |  |  |  |  |  |  |  |  |  |  |  | ✓ | ✓ |  |  |
| `101-pair--responses-2-codes-headers--responses-2-codes-body` |  |  |  |  |  |  |  |  |  |  |  |  |  | ✓ | ✓ |
| `102-window-3--summary--to--address` | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |  |  |  |  |  |
| `103-window-3--operation-id--to--description` |  | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |  |  |  |  |
| `104-window-3--address--to--security` |  |  | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |  |  |  |
| `105-window-3--description--to--operation-extensions` |  |  |  | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |  |  |
| `106-window-3--security--to--path-parameters` |  |  |  |  | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |  |
| `107-window-3--operation-extensions--to--query-parameters` |  |  |  |  |  | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |
| `108-window-3--path-parameters--to--headers` |  |  |  |  |  |  | ✓ | ✓ | ✓ |  |  |  |  |  |  |
| `109-window-3--query-parameters--to--cookies` |  |  |  |  |  |  |  | ✓ | ✓ | ✓ |  |  |  |  |  |
| `110-window-3--headers--to--body` |  |  |  |  |  |  |  |  | ✓ | ✓ | ✓ |  |  |  |  |
| `111-window-3--cookies--to--responses-1-code-headers` |  |  |  |  |  |  |  |  |  | ✓ | ✓ | ✓ |  |  |  |
| `112-window-3--body--to--responses-1-code-body` |  |  |  |  |  |  |  |  |  |  | ✓ | ✓ | ✓ |  |  |
| `113-window-4--summary--to--description` | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |  |  |  |  |
| `114-window-4--operation-id--to--security` |  | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |  |  |  |
| `115-window-4--address--to--operation-extensions` |  |  | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |  |  |
| `116-window-4--description--to--path-parameters` |  |  |  | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |  |
| `117-window-4--security--to--query-parameters` |  |  |  |  | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |
| `118-window-4--operation-extensions--to--headers` |  |  |  |  |  | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |  |
| `119-window-4--path-parameters--to--cookies` |  |  |  |  |  |  | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |
| `120-window-4--query-parameters--to--body` |  |  |  |  |  |  |  | ✓ | ✓ | ✓ | ✓ |  |  |  |  |
| `121-window-4--headers--to--responses-1-code-headers` |  |  |  |  |  |  |  |  | ✓ | ✓ | ✓ | ✓ |  |  |  |
| `122-window-4--cookies--to--responses-1-code-body` |  |  |  |  |  |  |  |  |  | ✓ | ✓ | ✓ | ✓ |  |  |
| `123-window-5--summary--to--security` | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |  |  |  |
| `124-window-5--operation-id--to--operation-extensions` |  | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |  |  |
| `125-window-5--address--to--path-parameters` |  |  | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |  |
| `126-window-5--description--to--query-parameters` |  |  |  | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |
| `127-window-5--security--to--headers` |  |  |  |  | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |  |
| `128-window-5--operation-extensions--to--cookies` |  |  |  |  |  | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |
| `129-window-5--path-parameters--to--body` |  |  |  |  |  |  | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |  |
| `130-window-5--query-parameters--to--responses-1-code-headers` |  |  |  |  |  |  |  | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |
| `131-window-5--headers--to--responses-1-code-body` |  |  |  |  |  |  |  |  | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |
| `132-window-6--summary--to--operation-extensions` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |  |  |
| `133-window-6--operation-id--to--path-parameters` |  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |  |
| `134-window-6--address--to--query-parameters` |  |  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |
| `135-window-6--description--to--headers` |  |  |  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |  |
| `136-window-6--security--to--cookies` |  |  |  |  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |
| `137-window-6--operation-extensions--to--body` |  |  |  |  |  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |  |
| `138-window-6--path-parameters--to--responses-1-code-headers` |  |  |  |  |  |  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |
| `139-window-6--query-parameters--to--responses-1-code-body` |  |  |  |  |  |  |  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |
| `140-window-7--summary--to--path-parameters` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |  |
| `141-window-7--operation-id--to--query-parameters` |  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |
| `142-window-7--address--to--headers` |  |  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |  |
| `143-window-7--description--to--cookies` |  |  |  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |
| `144-window-7--security--to--body` |  |  |  |  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |  |
| `145-window-7--operation-extensions--to--responses-1-code-headers` |  |  |  |  |  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |
| `146-window-7--path-parameters--to--responses-1-code-body` |  |  |  |  |  |  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |
| `147-window-8--summary--to--query-parameters` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |
| `148-window-8--operation-id--to--headers` |  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |  |
| `149-window-8--address--to--cookies` |  |  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |
| `150-window-8--description--to--body` |  |  |  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |  |
| `151-window-8--security--to--responses-1-code-headers` |  |  |  |  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |
| `152-window-8--operation-extensions--to--responses-1-code-body` |  |  |  |  |  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |
| `153-window-9--summary--to--headers` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |  |
| `154-window-9--operation-id--to--cookies` |  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |
| `155-window-9--address--to--body` |  |  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |  |
| `156-window-9--description--to--responses-1-code-headers` |  |  |  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |
| `157-window-9--security--to--responses-1-code-body` |  |  |  |  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |
| `158-window-10--summary--to--cookies` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |
| `159-window-10--operation-id--to--body` |  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |  |
| `160-window-10--address--to--responses-1-code-headers` |  |  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |
| `161-window-10--description--to--responses-1-code-body` |  |  |  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |
| `162-window-11--summary--to--body` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |  |
| `163-window-11--operation-id--to--responses-1-code-headers` |  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |
| `164-window-11--address--to--responses-1-code-body` |  |  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |
| `165-window-12--summary--to--responses-1-code-headers` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |  |
| `166-window-12--operation-id--to--responses-1-code-body` |  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |
| `167-window-13--summary--to--responses-1-code-body` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |
| `168-all-sections` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  | ✓ | ✓ |

### OAS 3.0 — Minimal (`oas30/minimal/`, 1)

| Case | Operation | Covers | Auto-switch |
| --- | --- | --- | --- |
| `01-default-response-only` | `GET /orders` | only a `default` response | — |

### OAS 3.0 — HTTP Methods (`oas30/http-methods/`, 8)

| Case | Operation | Covers | Auto-switch |
| --- | --- | --- | --- |
| `01-get` | `GET /orders` | `GET` badge (method template) | — |
| `02-put` | `PUT /orders` | `PUT` badge (method template) | — |
| `03-post` | `POST /orders` | `POST` badge (method template) | — |
| `04-delete` | `DELETE /orders` | `DELETE` badge (method template) | — |
| `05-options` | `OPTIONS /orders` | `OPTIONS` badge (method template) | — |
| `06-head` | `HEAD /orders` | `HEAD` badge (method template) | — |
| `07-patch` | `PATCH /orders` | `PATCH` badge (method template) | — |
| `08-trace` | `TRACE /orders` | `TRACE` badge (method template) | — |

### OAS 3.0 — Fields / Operation (`oas30/fields/operation/`, 5)

| Case | Operation | Covers | Auto-switch |
| --- | --- | --- | --- |
| `01-summary` | `POST /orders` | summary | — |
| `02-operation-id` | `POST /orders` | operation ID | — |
| `03-description` | `POST /orders` | Markdown description | — |
| `04-external-docs` | `POST /orders` | external docs (description in a tooltip) | — |
| `05-extensions` | `POST /orders` | operation `x-*` extensions | — |

### OAS 3.0 — Fields / Security (`oas30/fields/security/`, 17)

| Case | Operation | Covers | Auto-switch |
| --- | --- | --- | --- |
| `01-api-key-header` | `POST /orders` | apiKey in a header (2nd alternative, auto-switched) | `security-alternative-1` |
| `02-api-key-query` | `POST /orders` | apiKey in the query (2nd alternative, auto-switched) | `security-alternative-1` |
| `03-api-key-cookie` | `POST /orders` | apiKey in a cookie (2nd alternative, auto-switched) | `security-alternative-1` |
| `04-http-basic` | `POST /orders` | HTTP basic (2nd alternative, auto-switched) | `security-alternative-1` |
| `05-http-bearer` | `POST /orders` | HTTP bearer (2nd alternative, auto-switched) | `security-alternative-1` |
| `06-http-bearer-format` | `POST /orders` | HTTP bearer with `bearerFormat` (2nd alternative, auto-switched) | `security-alternative-1` |
| `07-oauth2-implicit-required-scope` | `POST /orders` | oauth2 implicit flow, required scope (2nd alternative, auto-switched) | `security-alternative-1` |
| `08-oauth2-implicit-optional-scope` | `POST /orders` | oauth2 implicit flow, optional scope: declared by the flow, not listed in the requirement (2nd alternative, auto-switched) | `security-alternative-1` |
| `09-oauth2-password-required-scope` | `POST /orders` | oauth2 password flow, required scope (2nd alternative, auto-switched) | `security-alternative-1` |
| `10-oauth2-password-optional-scope` | `POST /orders` | oauth2 password flow, optional scope: declared by the flow, not listed in the requirement (2nd alternative, auto-switched) | `security-alternative-1` |
| `11-oauth2-client-credentials-required-scope` | `POST /orders` | oauth2 client credentials flow, required scope (2nd alternative, auto-switched) | `security-alternative-1` |
| `12-oauth2-client-credentials-optional-scope` | `POST /orders` | oauth2 client credentials flow, optional scope: declared by the flow, not listed in the requirement (2nd alternative, auto-switched) | `security-alternative-1` |
| `13-oauth2-authorization-code-required-scope` | `POST /orders` | oauth2 authorization code flow, required scope (2nd alternative, auto-switched) | `security-alternative-1` |
| `14-oauth2-authorization-code-optional-scope` | `POST /orders` | oauth2 authorization code flow, optional scope: declared by the flow, not listed in the requirement (2nd alternative, auto-switched) | `security-alternative-1` |
| `15-openid-connect-required-scope` | `POST /orders` | openIdConnect, required scope (2nd alternative, auto-switched) | `security-alternative-1` |
| `16-openid-connect-no-required-scopes` | `POST /orders` | openIdConnect, no required scopes: the document declares no scopes, so no `Scopes` list (2nd alternative, auto-switched) | `security-alternative-1` |
| `17-scheme-description` | `POST /orders` | scheme with a Markdown `description` (2nd alternative, auto-switched) | `security-alternative-1` |

### OAS 3.0 — Fields / Parameters (`oas30/fields/parameters/`, 4)

| Case | Operation | Covers | Auto-switch |
| --- | --- | --- | --- |
| `01-path-parameters` | `POST /orders/{orderId}/lines/{lineId}/legacy/{legacyId}/filter/{filter}` | path parameters: required, optional, deprecated, `content` | — |
| `02-query-parameters` | `POST /orders` | query parameters: required, optional, deprecated, `content` | — |
| `03-request-headers` | `POST /orders` | request headers: required, optional, deprecated, `content` | — |
| `04-cookies` | `POST /orders` | cookies: required, optional, deprecated, `content` | — |

### OAS 3.0 — Fields / Request Body (`oas30/fields/request-body/`, 7)

| Case | Operation | Covers | Auto-switch |
| --- | --- | --- | --- |
| `01-required-1-media-type` | `POST /orders` | required, 1 media type | — |
| `02-optional-1-media-type` | `POST /orders` | optional, 1 media type | — |
| `03-deprecated-1-media-type` | `POST /orders` | deprecated schema root, 1 media type | — |
| `04-required-2-media-types` | `POST /orders` | required, 2 media types (2nd auto-switched) | `request-media-type-application/xml` |
| `05-optional-2-media-types` | `POST /orders` | optional, 2 media types (2nd auto-switched) | `request-media-type-application/xml` |
| `06-deprecated-2-media-types` | `POST /orders` | deprecated schema root, 2 media types (2nd auto-switched) | `request-media-type-application/xml` |
| `07-body-and-schema-descriptions` | `POST /orders` | body description + its schema description | — |

### OAS 3.0 — Fields / Request Combinations (`oas30/fields/request-combinations/`, 10)

| Case | Operation | Covers | Auto-switch |
| --- | --- | --- | --- |
| `01-path-parameters--query-parameters` | `POST /orders/{orderId}/lines/{lineId}/legacy/{legacyId}/filter/{filter}` | path parameters + query parameters | — |
| `02-path-parameters--request-headers` | `POST /orders/{orderId}/lines/{lineId}/legacy/{legacyId}/filter/{filter}` | path parameters + request headers | — |
| `03-path-parameters--cookies` | `POST /orders/{orderId}/lines/{lineId}/legacy/{legacyId}/filter/{filter}` | path parameters + cookies | — |
| `04-path-parameters--request-body` | `POST /orders/{orderId}/lines/{lineId}/legacy/{legacyId}/filter/{filter}` | path parameters + request body | — |
| `05-query-parameters--request-headers` | `POST /orders` | query parameters + request headers | — |
| `06-query-parameters--cookies` | `POST /orders` | query parameters + cookies | — |
| `07-query-parameters--request-body` | `POST /orders` | query parameters + request body | — |
| `08-request-headers--cookies` | `POST /orders` | request headers + cookies | — |
| `09-request-headers--request-body` | `POST /orders` | request headers + request body | — |
| `10-cookies--request-body` | `POST /orders` | cookies + request body | — |

### OAS 3.0 — Fields / Responses / 2XX (`oas30/fields/responses/2xx/`, 11)

| Case | Operation | Covers | Auto-switch |
| --- | --- | --- | --- |
| `01-status-only` | `POST /orders` | `200` response: status only | `response-code-200` |
| `02-description-only` | `POST /orders` | `200` response: description only | `response-code-200` |
| `03-headers-only` | `POST /orders` | `200` response: headers only: required, optional, deprecated, `content` | `response-code-200` |
| `04-body-1-media-type` | `POST /orders` | `200` response: body only, 1 media type | `response-code-200` |
| `05-body-2-media-types` | `POST /orders` | `200` response: body only, 2 media types (2nd auto-switched) | `response-code-200`, `response-media-type-application/xml` |
| `06-body-deprecated-1-media-type` | `POST /orders` | `200` response: body only, deprecated schema root, 1 media type | `response-code-200` |
| `07-body-deprecated-2-media-types` | `POST /orders` | `200` response: body only, deprecated schema root, 2 media types (2nd auto-switched) | `response-code-200`, `response-media-type-application/xml` |
| `08-description-and-headers` | `POST /orders` | `200` response: description + headers | `response-code-200` |
| `09-description-and-body` | `POST /orders` | `200` response: description + body | `response-code-200` |
| `10-headers-and-body` | `POST /orders` | `200` response: headers + body | `response-code-200` |
| `11-description-and-body-schema-description` | `POST /orders` | `200` response: description + body schema description | `response-code-200` |

### OAS 3.0 — Fields / Responses / 3XX (`oas30/fields/responses/3xx/`, 11)

| Case | Operation | Covers | Auto-switch |
| --- | --- | --- | --- |
| `01-status-only` | `POST /orders` | `302` response: status only | `response-code-302` |
| `02-description-only` | `POST /orders` | `302` response: description only | `response-code-302` |
| `03-headers-only` | `POST /orders` | `302` response: headers only: required, optional, deprecated, `content` | `response-code-302` |
| `04-body-1-media-type` | `POST /orders` | `302` response: body only, 1 media type | `response-code-302` |
| `05-body-2-media-types` | `POST /orders` | `302` response: body only, 2 media types (2nd auto-switched) | `response-code-302`, `response-media-type-application/xml` |
| `06-body-deprecated-1-media-type` | `POST /orders` | `302` response: body only, deprecated schema root, 1 media type | `response-code-302` |
| `07-body-deprecated-2-media-types` | `POST /orders` | `302` response: body only, deprecated schema root, 2 media types (2nd auto-switched) | `response-code-302`, `response-media-type-application/xml` |
| `08-description-and-headers` | `POST /orders` | `302` response: description + headers | `response-code-302` |
| `09-description-and-body` | `POST /orders` | `302` response: description + body | `response-code-302` |
| `10-headers-and-body` | `POST /orders` | `302` response: headers + body | `response-code-302` |
| `11-description-and-body-schema-description` | `POST /orders` | `302` response: description + body schema description | `response-code-302` |

### OAS 3.0 — Fields / Responses / 4XX (`oas30/fields/responses/4xx/`, 11)

| Case | Operation | Covers | Auto-switch |
| --- | --- | --- | --- |
| `01-status-only` | `POST /orders` | `404` response: status only | `response-code-404` |
| `02-description-only` | `POST /orders` | `404` response: description only | `response-code-404` |
| `03-headers-only` | `POST /orders` | `404` response: headers only: required, optional, deprecated, `content` | `response-code-404` |
| `04-body-1-media-type` | `POST /orders` | `404` response: body only, 1 media type | `response-code-404` |
| `05-body-2-media-types` | `POST /orders` | `404` response: body only, 2 media types (2nd auto-switched) | `response-code-404`, `response-media-type-application/xml` |
| `06-body-deprecated-1-media-type` | `POST /orders` | `404` response: body only, deprecated schema root, 1 media type | `response-code-404` |
| `07-body-deprecated-2-media-types` | `POST /orders` | `404` response: body only, deprecated schema root, 2 media types (2nd auto-switched) | `response-code-404`, `response-media-type-application/xml` |
| `08-description-and-headers` | `POST /orders` | `404` response: description + headers | `response-code-404` |
| `09-description-and-body` | `POST /orders` | `404` response: description + body | `response-code-404` |
| `10-headers-and-body` | `POST /orders` | `404` response: headers + body | `response-code-404` |
| `11-description-and-body-schema-description` | `POST /orders` | `404` response: description + body schema description | `response-code-404` |

### OAS 3.0 — Fields / Responses / 5XX (`oas30/fields/responses/5xx/`, 11)

| Case | Operation | Covers | Auto-switch |
| --- | --- | --- | --- |
| `01-status-only` | `POST /orders` | `500` response: status only | `response-code-500` |
| `02-description-only` | `POST /orders` | `500` response: description only | `response-code-500` |
| `03-headers-only` | `POST /orders` | `500` response: headers only: required, optional, deprecated, `content` | `response-code-500` |
| `04-body-1-media-type` | `POST /orders` | `500` response: body only, 1 media type | `response-code-500` |
| `05-body-2-media-types` | `POST /orders` | `500` response: body only, 2 media types (2nd auto-switched) | `response-code-500`, `response-media-type-application/xml` |
| `06-body-deprecated-1-media-type` | `POST /orders` | `500` response: body only, deprecated schema root, 1 media type | `response-code-500` |
| `07-body-deprecated-2-media-types` | `POST /orders` | `500` response: body only, deprecated schema root, 2 media types (2nd auto-switched) | `response-code-500`, `response-media-type-application/xml` |
| `08-description-and-headers` | `POST /orders` | `500` response: description + headers | `response-code-500` |
| `09-description-and-body` | `POST /orders` | `500` response: description + body | `response-code-500` |
| `10-headers-and-body` | `POST /orders` | `500` response: headers + body | `response-code-500` |
| `11-description-and-body-schema-description` | `POST /orders` | `500` response: description + body schema description | `response-code-500` |

### OAS 3.0 — Document Structure (`oas30/structure/`, 10)

| Case | Operation | Covers | Auto-switch |
| --- | --- | --- | --- |
| `01-path-item-parameters-with-override` | `GET /orders/{orderId}` | path-item parameters merged into the operation; the operation overrides one; a `content` parameter | — |
| `02-ref-parameter-body-response` | `POST /orders` | `$ref` parameter, request body, and response from `components` | `response-code-404` |
| `03-ignored-headers-shown` | `POST /orders` | `Accept`, `Content-Type`, `Authorization` request headers and a `Content-Type` response header (shown as is) | — |
| `04-response-code-order` | `POST /orders` | response codes declared out of order (canonical order, colors) | — |
| `05-security-inherited-from-document` | `POST /orders` | document `security` inherited by the operation | — |
| `06-security-disabled` | `POST /orders` | document `security` disabled by `security: []` (no section) | — |
| `07-security-anonymous-alternative` | `POST /orders` | `{}` alternative: `Optional` badge on the Security title, no option of its own | — |
| `08-deprecated-operation` | `POST /orders` | deprecated operation with a summary (tag in the title row) | — |
| `09-deprecated-operation-without-summary` | `POST /orders` | deprecated operation without a summary (tag on the address row) | — |
| `10-security-anonymous-only` | `POST /orders` | `security: [{}]`: Security title with the `Optional` badge only (no toolbar, no cards) | — |

### OAS 3.1 — Fields / Security (`oas31/fields/security/`, 3)

| Case | Operation | Covers | Auto-switch |
| --- | --- | --- | --- |
| `01-mutual-tls` | `POST /orders` | `mutualTLS` (2nd alternative, auto-switched) | `security-alternative-1` |
| `02-roles-on-api-key` | `POST /orders` | `Required roles` on an apiKey scheme | — |
| `03-roles-on-http-bearer` | `POST /orders` | `Required roles` on an HTTP bearer scheme | — |

### OAS 3.1 — Fields / Responses (`oas31/fields/responses/`, 1)

| Case | Operation | Covers | Auto-switch |
| --- | --- | --- | --- |
| `01-no-responses` | `POST /orders` | no `responses` (allowed in 3.1: no Responses section) | — |

### OAS 3.1 — Fields / Schemas (`oas31/fields/schemas/`, 8)

| Case | Operation | Covers | Auto-switch |
| --- | --- | --- | --- |
| `01-nullable-type-array-parameter` | `POST /orders` | query parameter `type: [string, "null"]` | — |
| `02-nullable-type-array-body` | `POST /orders` | body property `type: [integer, "null"]` | — |
| `03-numeric-exclusive-bounds` | `POST /orders` | numeric `exclusiveMinimum` / `exclusiveMaximum` | — |
| `04-examples-array` | `POST /orders` | schema `examples` array | — |
| `05-const` | `POST /orders` | `const` | — |
| `06-enum-without-type` | `POST /orders` | `enum` without `type` | — |
| `07-boolean-schema` | `POST /orders` | boolean schema `true` | — |
| `08-content-media-type-encoding` | `POST /orders` | `contentMediaType` / `contentEncoding` | — |

### OAS 3.1 — Document Structure (`oas31/structure/`, 2)

| Case | Operation | Covers | Auto-switch |
| --- | --- | --- | --- |
| `01-reference-description-overrides` | `POST /orders` | Reference Object `description` overrides on a parameter, a request body, and a response | — |
| `02-components-path-items` | `POST /orders` | path item referenced from `components.pathItems` | — |

<!-- END generated -->
