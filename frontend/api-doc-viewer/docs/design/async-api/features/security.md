# AsyncAPI Security

Status: **implemented (2026-10-20).** Feature design: §4 is the implemented structure, §6 the
layout, §7 the deviations from the Stage 1 plan.

Two **Security** sections in the AsyncAPI operation viewer, built like the OpenAPI one
([../../openapi/entities/security.md](../../openapi/entities/security.md)): the **operation**'s
security in `MessageNodeViewer`, and each **server**'s security in `MessageChannelServerNodeViewer`.
Both reuse the OpenAPI security card, toolbar, rows and data-layer semantics through a spec-neutral
security module with an OpenAPI and an AsyncAPI specialisation.

## 1. AsyncAPI 3.0 security schemes

Where security is declared (AsyncAPI 3.0.0):

| Object | Field | Meaning |
| --- | --- | --- |
| Operation | `security: [Security Scheme \| Reference]` | how the operation's messages are secured |
| Server | `security: [Security Scheme \| Reference]` | how a client connects to the server |
| Operation Trait | `security` | merged into the operation by the parser / unifier (not a separate section) |

There is **no** document-level security and **no** requirement object: the list holds the schemes
themselves (usually `$ref`s to `components.securitySchemes`). The list is a set of **alternatives**:
"only one of the security schemes MUST be satisfied" — one scheme per alternative. An empty list
means no security.

Security Scheme Object types and fields:

| `type` | Meaning | Fields besides `type` / `description` |
| --- | --- | --- |
| `userPassword` | user / password | — |
| `apiKey` | API key in the user or password part of the connection | `in`: `user` \| `password` |
| `X509` | X.509 client certificate | — |
| `symmetricEncryption` | symmetric message encryption | — |
| `asymmetricEncryption` | asymmetric message encryption | — |
| `httpApiKey` | API key in an HTTP parameter | `name`, `in`: `query` \| `header` \| `cookie` |
| `http` | HTTP authentication (RFC 7235) | `scheme`, `bearerFormat` |
| `oauth2` | OAuth 2.0 | `flows` (`implicit`, `password`, `clientCredentials`, `authorizationCode`: `authorizationUrl`, `tokenUrl`, `refreshUrl`, `availableScopes`), `scopes` (required scope names) |
| `openIdConnect` | OpenID Connect | `openIdConnectUrl`, `scopes` |
| `plain` | SASL PLAIN | — |
| `scramSha256` | SASL SCRAM-SHA-256 | — |
| `scramSha512` | SASL SCRAM-SHA-512 | — |
| `gssapi` | SASL GSSAPI (Kerberos) | — |

Merged (`apiDiff`) documents (verified): both lists are compared **by index**; an added / removed
item is an `add` / `remove` in the list's own record; field changes of a scheme, its flows and
`availableScopes` are recorded on those objects. With the `firstReferenceKeyProperty` hosts use, the
reference-name symbol is **not** set on security items (it is on messages, channels, servers), and a
merged item is not the `components` object itself.

## 2. Fields: AsyncAPI vs OpenAPI

| AsyncAPI | OpenAPI | Rendering |
| --- | --- | --- |
| list item (one scheme) | Security Requirement (map of schemes → scopes) | toolbar option = one scheme; its content = one card |
| scheme name: the `components.securitySchemes` key | requirement key | resolved: reference-name symbol, else the `components.securitySchemes` entry with the same content, else `Security scheme <n>` |
| `type` (13 values) | `type` (5 values) | gray type text after the name; own label set per spec |
| `description` | `description` | same (Markdown row) |
| `httpApiKey` `name` + `in` (`query` / `header` / `cookie`) | `apiKey` `name` + `in` | **1:1**: `<Place> parameter name  <name>` |
| `apiKey` `in` (`user` / `password`) | — | new prop row `API key location  User / Password` |
| `http` `scheme`, `bearerFormat` | same | **1:1** |
| `openIdConnectUrl` | same | **1:1** (link) |
| `flows.<type>.{authorizationUrl, tokenUrl, refreshUrl}` | same | **1:1** (flow parts, links) |
| `flows.<type>.availableScopes` | `flows.<type>.scopes` | same meaning, other name: scope rows of a flow |
| scheme `scopes` (oauth2, openIdConnect) | requirement scopes array | same meaning, other place: required `*` on flow scopes + the `Scopes` list of undeclared required scopes |
| `userPassword`, `X509`, `symmetricEncryption`, `asymmetricEncryption`, `plain`, `scramSha256`, `scramSha512`, `gssapi` | — | title, type and description only |
| unresolved `$ref` | name missing in components | the "not defined" text row |
| — | `{}` (anonymous alternative) | n/a |
| — | document security inherited by the operation | n/a (no inheritance) |
| server-level security | — | a second section, inside each server block |

## 3. Diffs (same rules as OpenAPI)

The OpenAPI diff semantics apply unchanged: a wholly added / removed list item is a green / red
toolbar option (border only) on a yellow toolbar row and a green / red card; scheme field changes
paint their rows; a type change paints the title row yellow and highlights the type text; scope
added / removed / description replaced, required changed; flow added / removed and its URLs. The
operation section inherits a wholly added / removed operation, the server section its server.

## 4. Implementation

### 4.1 Data layer (next-data-model)

A spec-neutral **security module**; OpenAPI and AsyncAPI are specialisations of it.

| Piece | Base (spec-neutral) | OpenAPI | AsyncAPI |
| --- | --- | --- | --- |
| Node kinds / values | `model/security/types/` — `SecurityTreeNodeKinds` (`security`, `securityAlternatives` — the complex toolbar container whose nested nodes are the alternatives, [selector options](../../shared/features/selector-options.md) —, `securityRequirement`, `securityScheme`, `oauthFlow`), value types, `SECURITY_NODE_VALUE_PROPS`; `SecurityTreeNode<K>` (`aliases.ts`) | `OpenApiTreeNodeKinds` spread them | `AsyncApiTreeNodeKinds` spread them |
| Security spec (crawl input) | `building-service/security/security-spec.ts` — `SecuritySpec` → alternatives → schemes → flows | built from requirement maps + `components` | built from scheme lists |
| Plain builder | `SecuritySpecBuilder<TInput>` (abstract): scheme spec from a definition, OAuth flows (`flowScopesKey` hook) | `OpenApiSecuritySpecBuilder` (`scopes`): requirements, components lookup, dialect warnings | `AsyncApiSecuritySpecBuilder` (`availableScopes`): list items, names, required `scopes` |
| With-diffs builder | `SecuritySpecDiffsDecorator` (composed): side reading of a scheme definition, flows, scope maps, required scopes, the toolbar's `alternatives` diff and the per-alternative records, both on the `alternatives` list (the `securityAlternatives` container's crawl value) | `OpenApiSecuritySpecWithDiffsBuilder` extends the plain builder: document / operation list switching, requirement-key scheme diffs | `AsyncApiSecuritySpecWithDiffsBuilder` extends the plain builder: list-index alternative diffs; definition = the list item; the section's own whole add / remove in its own record |
| Side reader | `building-service/shared/side-reader.ts` (`SideReader`, moved from OpenAPI) | uses it | uses it |
| Crawl rules | `getSecurityCrawlRules()` | `/data/security` | `/security` of the root (operation) and of each channel server |
| Aggregators | record-driven aggregators (`building-service/abstract/tree-with-diffs/node-diffs-data/record-driven-aggregators.ts`) + the security placement tables (`model/security/tree-with-diffs/placements.ts`, also read by the card rows `SecuritySchemeCardRows`) and synthetic keys (`building-service/security/tree-with-diffs/aggregation-tables.ts`) | `OPENAPI_AGGREGATION_TABLES` spreads the tables into its own; one `RecordDrivenAggregatorRegistry` for every OpenAPI kind | `ASYNC_API_SECURITY_NODE_AGGREGATORS`: a `RecordDrivenAggregatorRegistry` built from `SECURITY_AGGREGATION_TABLES`; the five AsyncAPI factories dispatch `isSecurityTreeNodeKind(kind)` to it |
| Row diffs | `SecurityRowDiffs` (`Security`, `Scheme`, `OAuthFlow`; moved from `OpenApiRowDiffs`) on `NodeLevelRowDiffs` / `SectionRowDiffs` (`model/abstract/tree-with-diffs/row-diffs-base.ts`) | `OpenApiRowDiffs` keeps the operation rows | — |
| Labels | `SecurityDisplayLabels` (abstract, `model/security/display/labels.ts`): flow names, prop labels, toolbar titles, parameter-name / API key location labels | `OpenApiSecurityDisplayLabels` (5 types) | `AsyncApiSecurityDisplayLabels` (13 types) |
| Visibility | `SecurityNodeVisibility` (abstract, `model/security/node-visibility.ts`): rows per scheme type | `apiKey` → parameter name | `httpApiKey` → parameter name, `apiKey` → API key location |
| Presentation | `SecurityPresentation` = labels + visibility (`model/security/presentation.ts`) | `OPENAPI_SECURITY_PRESENTATION` (`model/openapi/security-presentation.ts`) | `ASYNC_API_SECURITY_PRESENTATION` (`model/async-api/security-presentation.ts`) |

AsyncAPI transformers: `AsyncApiSpecTransformer.buildSecurity(source, owner)` builds the operation
section (root `security`) and every channel server's section (`withServersSecurity` replaces the raw
`security` list of each server and **keeps the symbol-keyed records of the `servers` list** — the
diff record of a wholly added / removed server lives there). The with-diffs transformer only
overrides `createSecuritySpecBuilder()`.

### 4.2 Viewer (api-doc-viewer)

| Piece | Base | OpenAPI | AsyncAPI |
| --- | --- | --- | --- |
| Node guards | `utils/security/node-type-checkers.ts` — `isSecuritySectionNode`, `isSecurityRequirementNode`, `isSecuritySchemeNode`, `isSecurityOAuthFlowNode`, `getSecurityChildren`, `resolveSelectedSecurityAlternative`; `utils/security/diff-state.ts` — `takeSecuritySeverities` | `OpenApiViewSelection.alternative` delegates | — |
| Card | `shared-components/Security/SecuritySchemeCardBase.tsx` — the presenter: frame rows, rows, flows, scopes toggle; labels / visibility from a `SecurityPresentation` | `OpenApiOperationViewer/OpenApiSecuritySchemeCard.tsx` | `AsyncApiOperationViewer/AsyncApiSecuritySchemeCard.tsx` |
| Toolbar | `SecurityToolbar` + `SecurityToolbarRow` (options from the alternatives, titles from the API type's labels) | | |
| Section | `shared-components/Security/SecuritySectionBase.tsx` — `SecurityToolbarRow` (takes the `securityAlternatives` container); `security-section-blocks.ts` — `buildSecurityToolbarBlock(toolbar, render)`, `buildSecurityContentBlocks(selected, renderCard)` (layout elements) | `SecurityNodeViewer` / `buildSecurityBlock` (operation-level block, h2, selection in the view-state store) | `AsyncApiOperationViewer/AsyncApiSecuritySection.tsx` (h3 / h5 by `SizeVariant`, local selection), test id `async-api-security-section` |
| Placement | | operation level, after the header | `MessageNodeViewer` after the summary, before the section selector (`PRIMARY`, h3); `MessageChannelServerNodeViewer` after the summary, before the bindings (`SECONDARY`, h5) |

### 4.3 Samples, stories, tests

| Kind | Location |
| --- | --- |
| Case definitions + generator | `packages/api-doc-viewer/bin/async-api-security-case-definitions.mjs`, `bin/generate-async-api-security-suite.mjs` (run explicitly; not part of `generate-stories`) |
| Plain fixtures (one document per case) | `packages/samples/async-api/security/<nn-case>/document.yaml` + `README.md` (26 cases) |
| Diff fixtures | `packages/samples/async-api-diffs/security/<n.m-case>/{before,after}.yaml` + `README.md` (1.x operation, 2.x server; 33 cases) |
| Stories | `src/stories/async-api-suite/security.stories.tsx` (`Async API Suite/Security`), `src/stories/async-api-diffs-suite/security.stories.tsx` (`Async API Diffs Suite/Security Samples`) |
| Screenshot ITs | `src/it/async-api-suite/security.it-test.ts`, `src/it/async-api-diffs-suite/security.it-test.ts` (server cases open the `Channel` section first) |
| Unit tests | `packages/next-data-model/tests/unit-tests/async-api-security.test.ts` (plain + with diffs, labels, visibility); the OpenAPI suites cover the shared module |

## 5. Decisions

| Point | Decision |
| --- | --- |
| Section titles | `Security` — h3 at the message level (as `Bindings` / message sections), h5 in a server block (as server `Bindings`) |
| Scheme names (card titles) | always smaller than the `Security` title above them: h4 (18px) under the h3 operation section, h6 (13px) under the h5 server section (`AsyncApiSecuritySchemeCard` `variant` → `SecuritySchemeCardBase` `titleVariant`) |
| One alternative | the toolbar is still shown (OpenAPI rule: always) |
| Operation traits | not merged by the viewer (the unifier resolves `$ref`s only); a trait's `security` is not shown |
| Scheme name fallback | `Security scheme <n>` (1-based list position) |
| Unresolved `$ref` | the card is named by the `$ref`'s last segment and shows `Security scheme reference cannot be resolved.` |
| API key location severity | the `API key location` row shares the `SecuritySchemeParameterNameRow` placement (a scheme type has one of the two rows) |

## 6. Layout

```text
<summary row>                      AsyncAPI row (data-precededby padding)
Security                           TitleRow; data-precededby = what precedes it (summary / description / address row)
  ┄ 4px                            the toolbar's own upper half (outer halves of the layout)
‹ [scheme] [scheme] … ›            SecurityToolbarRow   ┐
  ┄ 4 + 4                          separator            │ StackLayout level="security"
┌ card ─────────────┐              scheme card          │ (same planner, separators and
└───────────────────┘                                   │  tones as the OpenAPI section)
  ┄ 4px                            last card's lower half ┘
[Message] [Channel] [Operation]    data-precededby="security-section" (+8px = 12px)
```

- The title row is an AsyncAPI row; the toolbar and the cards are the shared Security elements in
  their own vertical layout with outer halves, so the OpenAPI gap / colour rules hold inside the
  section ([../../openapi/features/vertical-gaps.md](../../openapi/features/vertical-gaps.md)).
- The element after a section gets `PrecededBy.SECURITY_SECTION` (`security-section`): 8px top
  padding on `.message-sections-selector` and on `.title-row-content` (server `Bindings`) — 12px in
  total with the last card's lower half, as after a summary row.

## 7. Deviations from the Stage 1 plan

| Plan | Implemented | Why |
| --- | --- | --- |
| Abstract `SecuritySpecWithDiffsBuilder` | `SecuritySpecDiffsDecorator`, composed by `<Spec>SecuritySpecWithDiffsBuilder extends <Spec>SecuritySpecBuilder` | keeps the repository's plain → with-diffs inheritance; one base class per stack |
| Security kinds use record-driven aggregators in the AsyncAPI factories | `ASYNC_API_SECURITY_NODE_AGGREGATORS` (a typed `RecordDrivenAggregatorRegistry` from `SECURITY_AGGREGATION_TABLES`, cached per kind) + an `isSecurityTreeNodeKind` guard at the top of each factory | one dispatch point; no per-kind classes in the AsyncAPI tree |
| Section whole add / remove from the owner's descendant diffs | written into the section's own record (`''`) by the AsyncAPI with-diffs builder; inherited whole changes come from the owner's whole diff | AsyncAPI owners (message root, server) carry no child-section descendant diffs |
| — | `withServersSecurity` copies the `servers` list's own symbol keys | mapping the list dropped its diff record, so a wholly added server lost its diff (found by test 2.7) |
| Labels `OPENAPI_SECURITY_LABELS` / `ASYNC_API_SECURITY_LABELS` | `*_SECURITY_DISPLAY_LABELS`, `*_SECURITY_NODE_VISIBILITY`, `*_SECURITY_PRESENTATION` | one `SecurityPresentation` object per API type for the presenters |
| `SecuritySectionBase` component + `buildSecurityToolbarOptions` | building blocks (`buildSecurityToolbarBlock`, `buildSecurityContentBlocks`, `SecurityToolbarRow`); options built inside `SecurityToolbarRow` | OpenAPI places the section as a block of its operation layout, AsyncAPI between rows of its own; title and selection differ |
| — | `SecurityTreeNode<K>` + `utils/security/` guards; the OpenAPI requirement / scheme / flow guards removed | the presenters take nodes of either tree without casts |
| — | The generic edges (`BlockEdges`: `row`, `card`, `nested`, `sectionTitleRow`, `severityOf`; `SecurityBlockEdges`: `toolbarRow`, `titleRow`) and `LayoutPlanner.frameRow` take any row node (`RowDiffsNode`) | the AsyncAPI section reuses the separator layout of the OpenAPI operation |
| `SecuritySchemeCard/SecuritySchemeCard.tsx` reused | its body moved to `SecuritySchemeCardBase`; `OpenApiSecuritySchemeCard` wraps it | base presenter + two specific extensions |

Known limitation (shared with OpenAPI): on the side where a section is absent (wholly added /
removed) the toolbar row still draws its disabled arrows on the gray band.

The separator layout is a spec-neutral module (architecture review 2026-10, F1): next-data-model
`model/abstract/layout/` (`LayoutPlanner`, `BlockEdges`, `LayoutSpacingConfig`,
`DEFAULT_LAYOUT_SPACING_CONFIG`), the security edges in `model/security/block-edges.ts`
(`SecurityBlockEdges`), the viewer `shared-components/Layout/StackLayout.tsx`. Its numbers come from
`LayoutSpacingContext`, which every root viewer provides: the AsyncAPI roots pass
`DEFAULT_LAYOUT_SPACING_CONFIG`, the OpenAPI roots their `OpenApiSpacingConfig` (same shared numbers).
The hook throws without a provider, so no API type gets another's numbers by default.
