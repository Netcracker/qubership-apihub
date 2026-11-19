# Test fixtures

Fixtures for Storybook stories and screenshot ITs in `packages/api-doc-viewer`, plus inline cases
for next-data-model unit tests (`src/`, published to tests as `@netcracker/qubership-apihub-samples`).

## Catalogue layout

Every fixture catalogue is a `README.md` next to its fixtures:

| Level | File | Required sections |
| --- | --- | --- |
| Sample root | `<root>/README.md` | `Categories` (`Cases` for a root without categories), `Storybook and screenshot tests`, `Regenerate` |
| Category (when it needs detail) | `<root>/<category>/README.md` | `Cases`, `Storybook and screenshot tests`, `Regenerate` |

Titles read `<API type> fixtures`, `<API type> diff fixtures`, or `… fixtures — <category>`.
A catalogue written by a generator is changed through the generator. A generator that recreates
its output folder must not share it with hand-written files.

## Sample roots

| Root | API type | Mode | Catalogue |
| --- | --- | --- | --- |
| `json-schema/` | JSON Schema | plain | [json-schema/README.md](json-schema/README.md) |
| `json-schema-diffs/` | JSON Schema | with diffs | [json-schema-diffs/README.md](json-schema-diffs/README.md) |
| `async-api/` | AsyncAPI (Security only) | plain | [async-api/security/README.md](async-api/security/README.md) |
| `async-api-diffs/` | AsyncAPI | with diffs | [async-api-diffs/README.md](async-api-diffs/README.md) |
| `openapi/` | OpenAPI (3.0, 3.1) | plain | [openapi/README.md](openapi/README.md) |
| `openapi-diffs/` | OpenAPI (3.0, 3.1) | with diffs | [openapi-diffs/README.md](openapi-diffs/README.md) |
| `ddlapi/` | DDL API | plain | [ddlapi/README.md](ddlapi/README.md) |
| `ddlapi-diffs/` | DDL API | with diffs | [ddlapi-diffs/README.md](ddlapi-diffs/README.md) |
| `jso-diffs/` | JSO | with diffs | [jso-diffs/README.md](jso-diffs/README.md) |
| `json-schema-display-mode-simple/` | JSON Schema | plain, display modes | [json-schema-display-mode-simple/README.md](json-schema-display-mode-simple/README.md) |
| `json-schema-diffs-display-mode-simple/` | JSON Schema | with diffs, display modes | [json-schema-diffs-display-mode-simple/README.md](json-schema-diffs-display-mode-simple/README.md) |
| `async-api-display-mode-simple/` | AsyncAPI | plain, display modes | [async-api-display-mode-simple/README.md](async-api-display-mode-simple/README.md) |
| `async-api-diffs-display-mode-simple/` | AsyncAPI | with diffs, display modes | [async-api-diffs-display-mode-simple/README.md](async-api-diffs-display-mode-simple/README.md) |
| `openapi-display-mode-simple/` | OpenAPI (3.0) | plain, display modes | [openapi-display-mode-simple/README.md](openapi-display-mode-simple/README.md) |
| `openapi-diffs-display-mode-simple/` | OpenAPI (3.0) | with diffs, display modes | [openapi-diffs-display-mode-simple/README.md](openapi-diffs-display-mode-simple/README.md) |
| `ddlapi-display-mode-simple/` | DDL API | plain, display modes | [ddlapi-display-mode-simple/README.md](ddlapi-display-mode-simple/README.md) |
| `ddlapi-diffs-display-mode-simple/` | DDL API | with diffs, display modes | [ddlapi-diffs-display-mode-simple/README.md](ddlapi-diffs-display-mode-simple/README.md) |

The `*-display-mode-simple/` roots (one minimal document per element display mode `simple` hides;
written by `packages/api-doc-viewer/bin/generate-display-mode-simple-suites.mjs`) feed the only
suites that capture `simple`: `* Suite (Display Mode = simple)` and
`* Diffs Suite (Display Mode = simple)`, every case in `detailed` and `simple`. All other suites
capture `detailed` only. Screenshot baselines live next to the ITs, one folder per test run:
`packages/api-doc-viewer/src/it/<root>-suite/__image_snapshots__/`.

Plain AsyncAPI stories (except Security) and plain JSO stories use inline data under
`packages/api-doc-viewer/src/stories/`. The AsyncAPI Security fixtures (`async-api/security/`,
`async-api-diffs/security/`) are written by `packages/api-doc-viewer/bin/generate-async-api-security-suite.mjs`.
`*.generated.*` compatibility-suite artifacts come from the external
`qubership-apihub-compatibility-suites` repository and are not stored here.

## Programmatic cases (`src/`)

| Module | API type | Mode | Cases |
| --- | --- | --- | --- |
| `src/async-api-diffs.ts` | AsyncAPI | with diffs | Inline YAML pairs for next-data-model unit tests. |
| `src/openapi-diffs-hiding-unchanged-nodes.ts` | OpenAPI | with diffs | Security scheme cards with hidden unchanged rows ([design](../../docs/design/openapi/features/hiding-unchanged-nodes.md)). |
| `src/openapi-arrow-buttons.ts` | OpenAPI | plain and with diffs | Security toolbar and response-code strips that fit or overflow ([design](../../docs/design/shared/features/arrow-scroll-strip.md)). |

### OpenAPI hiding unchanged nodes

One operation template (`buildOpenApiHidingUnchangedDocument`) plus one fragment per scheme kind
(`OPENAPI_SECURITY_SCHEME_FRAGMENTS`); a fragment renders its scheme for `hasChanges: false` (before,
and after when unchanged) or `hasChanges: true` (after, one or two content rows changed, never the
title row). A case lists fragments with a flag each; all schemes of a case are cards of one security
alternative. A case may also add or remove the anonymous alternative `{}` (`anonymous`).

| Cases | Content |
| --- | --- |
| `01`–`18` | Each scheme kind unchanged, then changed: API key in header / query / cookie, HTTP basic, HTTP bearer, OpenID Connect, OAuth 2.0 with one flow, OAuth 2.0 with all four flows (one scope of one flow changed), Mutual TLS (OAS 3.1). |
| `19`, `20` | Two cards, one changed and one unchanged, in both orders. |
| `21` | Three cards, all unchanged. |
| `22`, `23` | The anonymous alternative `{}` added / removed next to two unchanged cards: only the `Optional` badge of the Security title row changes; both cards stay collapsed. |

**Storybook and screenshot tests:** `OpenAPI Operation Diffs Suite (Hiding Unchanged Nodes)/Security Schemes`
(`packages/api-doc-viewer/src/stories/openapi-diffs-hiding-unchanged-nodes-suite/security-schemes.stories.tsx`),
ITs `packages/api-doc-viewer/src/it/openapi-diffs-hiding-unchanged-nodes-suite/security-schemes.it-test.ts`;
unit tests `packages/next-data-model/tests/unit-tests/openapi-security-hiding-unchanged.test.ts`.

**Regenerate:** nothing is written to disk — edit the module. When the case list changes, update the
story exports and the IT `CASES` list (story ids via `bin/storybook-story-id-utils.mjs`), then
`node bin/run-screenshot-test-suite.mjs regenerate openapi-diffs-hiding-unchanged-nodes-suite`.

### OpenAPI arrow buttons

Toolbars whose options fit their strip (no arrows) or overflow it (arrows shown), for the
shared `ArrowScrollStrip` ([design](../../docs/design/shared/features/arrow-scroll-strip.md)). One
operation template (`buildOpenApiArrowButtonsDocument(toolbar, lineup)`); a lineup is `single` (one
option) or `every` (the strip overflows at the 1800px screenshot viewport, also on one diffs side).

| Toolbar | `single` | `every` |
| --- | --- | --- |
| `security-toolbar` (OAS 3.1) | one alternative (`api_key_header`) | one alternative per scheme kind (the 9 fragments of the hiding cases), then 8 `A + B` alternatives of neighbouring kinds: 17 options |
| `response-codes` (OAS 3.0, no security) | `200` | every IANA-registered status code except 305, 306, 418, 510 (59 codes), each class followed by its range key `1XX`–`5XX`, `default` last: 65 options |

| Cases (per toolbar) | Plain (`openApiArrowButtonsCases`) | With diffs (`openApiDiffsArrowButtonsCases`) |
| --- | --- | --- |
| `01` | `single` | `single` → `every` (the changed side overflows) |
| `02` | `every` | `every` → `single` (the origin side overflows) |

**Storybook and screenshot tests:** `OpenAPI Operation Suite (Arrow Buttons)/{Security Toolbar,Response Codes}`
and `OpenAPI Operation Diffs Suite (Arrow Buttons)/{Security Toolbar,Response Codes}`
(`packages/api-doc-viewer/src/stories/openapi-{,diffs-}arrow-buttons-suite/`), ITs
`packages/api-doc-viewer/src/it/openapi-{,diffs-}arrow-buttons-suite/*.it-test.ts`: an overflowing
strip is one test with three screenshots (left / middle / right).

**Regenerate:** nothing is written to disk — edit the module, then
`node bin/run-screenshot-test-suite.mjs regenerate openapi-arrow-buttons-suite` and
`… regenerate openapi-diffs-arrow-buttons-suite`.

## Workflow

Fixtures come first when building a feature (see `docs/design/README.md` → Workflow): add the
cases and update the catalogue, then stories and ITs, then the implementation.
