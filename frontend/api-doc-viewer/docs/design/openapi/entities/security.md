# Security

The **Security** section: effective security requirements, the alternatives selector (logical
**OR**), and one card per security scheme of the selected alternative (logical **AND**). Status: **implemented** (first iteration; deviations in [../notes/2026-10-implementation-decisions.md](../notes/2026-10-implementation-decisions.md)).

The section is the OpenAPI specialisation of a **spec-neutral security module** that the AsyncAPI
Security sections share: node kinds / values (`model/security/`), spec builders and diff decorator
(`building-service/security/`), `SecurityRowDiffs`, `SecurityDisplayLabels` /
`SecurityNodeVisibility` (OpenAPI instances in `model/openapi/security-presentation.ts`), and the
presenters `SecuritySchemeCardBase` / `SecuritySectionBase.tsx` (`SecurityToolbarRow`, with `security-section-blocks.ts`). Structure and the AsyncAPI mapping:
[../../async-api/features/security.md](../../async-api/features/security.md).

## OpenAPI semantics

| Concept | Specification | Viewer |
| --- | --- | --- |
| `security` (list of Security Requirement Objects) | Any **one** requirement satisfies the request. | Security toolbar (OR). |
| Security Requirement Object (`{ schemeName: [scopes] }`) | **All** schemes of one object must be satisfied. | One card per scheme (AND). |
| Empty requirement `{}` | Anonymous access is allowed. | **Not an alternative**: an `Optional` badge on the Security title row ([Optional badge](#optional-badge-anonymous-access), D17; supersedes Q7). |
| Operation `security` absent | The document-level `security` applies. | Effective security = document `security`. |
| Operation `security: []` | Overrides the document: no security. | No Security section. |
| Scheme reference | By **name**, into `components.securitySchemes`; not a `$ref`. | The transformer resolves names (D11). |
| Scopes list | OAuth2 / OpenID Connect: required scopes. OAS 3.1 also: role names for every other type. OAS 3.0: must be empty for other types. | `Required scopes` / `Required roles` row — [../features/oas-versions.md](../features/oas-versions.md#security). |

## Effective security (`OpenApiSecuritySpecBuilder.build`)

```text
operation.security !== undefined  →  operation.security     (isInheritedFromDocument = false)
otherwise                         →  document.security ?? []  (isInheritedFromDocument = true)
```

`isInheritedFromDocument` is kept on the `security` node value (`ndm-reserved`; a hint row is a
possible follow-up). The with-diffs variant is below ([With diffs](#with-diffs)).

## Transformed shape

```typescript
// data.security in the operation-oriented spec
type OpenApiSecuritySpec = {
  isInheritedFromDocument: boolean
  alternatives: OpenApiSecurityAlternativeSpec[]          // index = node key
}
type OpenApiSecurityAlternativeSpec = {
  schemes: Record<string, OpenApiSecuritySchemeSpec>     // key = scheme name, requirement order
}
type OpenApiSecuritySchemeSpec = {
  name: string
  isResolved: boolean                                     // false: name not in components.securitySchemes
  type?: string                                           // apiKey | http | oauth2 | openIdConnect | mutualTLS (3.1) | unknown string
  description?: string
  in?: string                                             // apiKey
  parameterName?: string                                  // apiKey `name` (renamed: `name` is the scheme key)
  scheme?: string                                         // http
  bearerFormat?: string                                   // http bearer
  openIdConnectUrl?: string                               // openIdConnect
  requiredScopes: string[]                                // from the requirement
  requiredScopesKind: 'scopes' | 'roles' | 'ignored'      // dialect decision
  flows?: Record<OpenApiOAuthFlowType, OpenApiOAuthFlowSpec> // oauth2
}
type OpenApiOAuthFlowSpec = {
  flowType: 'implicit' | 'password' | 'clientCredentials' | 'authorizationCode'
  authorizationUrl?: string
  tokenUrl?: string
  refreshUrl?: string
  scopes: Record<string, string>                          // available scopes: name → description
}
```

The scheme spec is a **merge** of the requirement entry (name, scopes) and the scheme definition
(everything else). Unknown scheme fields (including `x-*`) are not copied.

## Nodes

| Kind | Complexity | Key | Value | Children / nested |
| --- | --- | --- | --- | --- |
| `security` | simple | `security` | `{ isInheritedFromDocument; allowsAnonymous }` | child: `securityAlternatives` (when the section has alternatives) |
| `securityAlternatives` | **complex** | `alternatives` | none (delegates to the selected alternative) | nested: `securityRequirement` per alternative (never `{}`) |
| `securityRequirement` | simple | alternative index | `{ schemeNames: string[] }` | children: `securityScheme` per scheme |
| `securityScheme` | simple | scheme name | the scheme spec without `flows` | children: `oauthFlow` per flow |
| `oauthFlow` | simple | flow type | `SecurityOAuthFlowSpec` (`building-service/security/security-spec.ts`) | — |

The alternatives are nested nodes of the complex `securityAlternatives` container (shared rule
[../../shared/features/selector-options.md](../../shared/features/selector-options.md)); `security`
stays simple because it has its own value and the title row. The container owns the toolbar: its
record holds the per-alternative add / remove / rename entries and the toolbar's synthetic
`SECURITY_ALTERNATIVES_DIFF_KEY` replace (severity placement `SelectorRow`). Same shape in AsyncAPI
(shared Security module).

An unresolved scheme is recognised from its value (`isResolved: false`); the card's "unresolved" row reads it through `SecurityNodeVisibility` (no node meta).

## Section header

`TitleRow` "Security", **h2**, `expandable={false}`. **Present** on a side when the effective list
has at least one item there; an anonymous-only list (`[{}]`) is present: the title row with the
`Optional` badge only — no toolbar, no cards. With diffs the section is rendered when present on either side and,
per side, follows the [presence rule](../features/diffs.md#section-presence-and-whole-section-changes):

| Before | After | Section |
| --- | --- | --- |
| ≥1 alternative | `security: []` (one `remove` per alternative, E7) | wholly removed — `security/02-security-removed` |
| no operation `security`, document list empty | operation `security` with alternatives | wholly added |
| document list inherited | operation override with other alternatives | present on both sides; synthetic alternative diffs ([below](#synthetic-alternative-diffs-on-override-changes-q15)); header uncolored |

A **card** is present on a side when its scheme is in the selected alternative there; a scheme
added to / removed from an alternative makes the card wholly added / removed. A scheme whose
definition is missing from `components.securitySchemes` is still present (it renders the
`unresolved` row).

## Security toolbar

Sketches: [../features/security-redesign.md](../features/security-redesign.md) §1 (approved 2026-10-13).

| Item | Rule |
| --- | --- |
| Shown when | ≥1 alternative (on either side with diffs) — always, also for a single alternative (Q6); `{}` is never an option, so an anonymous-only list has no toolbar |
| Row | shared `SecurityToolbar` (`shared-components/Security/`): `‹ [option] [option] … ›` — the options are one non-wrapping line (`Selector` `noWrap`) in the shared `ArrowScrollStrip` ([../../shared/features/arrow-scroll-strip.md](../../shared/features/arrow-scroll-strip.md)). Vertical padding: the in-block half-gap under the title (4px) and the block half-gap above the cards (10px), [Spacing](../features/operation-viewer.md#spacing-data-precededby). The strip keeps a 6px inset around the options so diff round markers and border shadows (they overhang the option box) are never clipped. |
| Arrows | `‹` / `›` scroll the strip by exactly one option; at the left / right edge the arrow is disabled, otherwise enabled; both are always shown (disabled when everything fits) so the row never jumps (Q-S5). Behaviour, styles (shared icon-button config), and tests: [../../shared/features/arrow-scroll-strip.md](../../shared/features/arrow-scroll-strip.md). |
| Long titles | an option never grows wider than the strip; its label (inner span, not the button, so markers stay visible) is cropped with an ellipsis; `min-width` keeps one character + `…` visible |
| Option title | scheme names joined with ` + ` (`api_key + request_signature`) (`SecurityDisplayLabels.securityRequirementTitle`) |
| Option test id | `security-alternative-<index>`; strip `security-toolbar-strip`, arrows `security-toolbar-arrow-{left,right}` |
| Diffs | a wholly added / removed option: green / red border shadow only (`diffs`); any other changed option: the **round marker** of its strongest change (`diffsSummary` ∪ `descendantDiffsSummary`), as in the AsyncAPI section selectors. Row background: `SecurityRowDiffs.Alternatives.takeToolbarRowDiff(securityAlternatives)` — the section's whole add / remove (inherited by the container), else a yellow `replace` row from the synthetic `alternatives` field diff that the with-diffs transformer writes when any alternative was wholly added / removed. Floating badge: `SelectorRow` placement (the strongest of those option changes). |
| Reuse | the same toolbar, cards, and rows serve AsyncAPI server security later (smaller section header there); the AsyncAPI data layer does not exist yet |

## Scheme card

One card per `securityScheme` child of the selected alternative, in requirement order: a
**framed box** (Q8, [Card frame](#card-frame)). Card width (`shared-styles/frame.css`): **full width** of the side minus
the 16px insets on both sides, in plain and diffs mode alike (2026-11-05; the earlier plain `min(40%, 500px)` / diffs
`80%` rule was dropped). The rows themselves stay full width; see [Card frame](#card-frame). The frame
starts 16px in (= `px-4`), its border under the `Security` title text. The card starts and ends with content-less
**frame rows** (`SecurityFrameRow`, 24px): the horizontal border runs through the middle of each (12px outside, 12px
inside), so the content starts 16px below the border (12 + the title row's 4px), as horizontally. Frame rows are painted
with the **whole-card diff only** and carry the space around the card: no separator rows next to a card
([block-separators.md](../features/block-separators.md)). The closing row is always the last row, so toggling `Scopes` —
which changes which content row comes last — never changes a row's height. Component `SecuritySchemeCardBase` (OpenAPI:
`OpenApiSecuritySchemeCard`), test id
`security-scheme-<name>`; its rows are the shared blocks of `shared-components/Security/SecurityRows.tsx`.
Sketches: [../features/security-redesign.md](../features/security-redesign.md) §2–§4.

| Row | Shown when (`detailed`) | Content | Severity placement |
| --- | --- | --- | --- |
| Title (h4) | always | scheme name; subheader: **gray type text** (JSON Schema / DDL type-label look), not a badge | `TitleRow` |
| Unresolved | `!isResolved` | muted `Security scheme is not defined in components.` | — |
| Description | `description` | markdown, right after the title | `DescriptionRow` |
| `<Place> parameter name` | apiKey, `name` | value `name`; the label prefix comes from `in` per side: `Header` / `Query` / `Cookie` / `Path` (`OpenApiDisplayLabels.apiKeyParameterNameLabel`) — the former `In` and `Name` rows merged. An `in` replace paints the row yellow and puts the yellow text highlighter on the place word only (`Header` / `Query` …), never on the `parameter name` part | `SecuritySchemeParameterNameRow` (an `in` change counts here) |
| `HTTP Authorization Scheme` | http, `scheme` | `basic`, `bearer`, … from the scheme, never hard-coded | `SecuritySchemeHttpSchemeRow` |
| `Bearer Format` | http, `bearerFormat` | `JWT`, `PAT`, … | `SecuritySchemeBearerFormatRow` |
| `OpenID Connect URL` | openIdConnect | link | `SecuritySchemeOpenIdConnectUrlRow` |
| `Scopes ▾` / `Roles ▾` (own list) | required scopes no flow declares — all of them for openIdConnect and OAS 3.1 roles; kind not `ignored` | 2nd-level scope rows, each with `*` (same rows as in flow parts) | the scope row's own diff |
| Flow parts | oauth2 | [OAuth flow parts](#oauth-flow-parts) | per flow node |

`mutualTLS` cards have title, type, and description only.

**Security props** (label / value rows, 1st and 2nd level) share one grid: `grid-template-columns:
30% minmax(0, 1fr)` with a 20px column gap, cells aligned to the top (`items-start`). The label column
is therefore 30% of the card plus 20px before the value, the same in every prop of every card; a
longer label wraps inside its column. 2nd-level scope rows keep their 20px left offset as padding in
the first cell, so the scope name gets 30% of the card minus the offset and the description starts
where 1st-level values start. Labels, the `Scopes` text, and scope names use exactly the JSON Schema
property-title text, `NODE_TITLE_TEXT_CLASSES` (`text-xs text-black font-inter-medium`: the medium
look comes from the static "Inter Medium" family at weight 400, not from `font-weight`); values are
12px secondary gray (the subheader / type-label gray), URLs stay link-blue; scope descriptions gray.

Type labels (`OpenApiSecurityDisplayLabels.securitySchemeType`): `apiKey` → `API key`, `http` → `HTTP`,
`oauth2` → `OAuth 2.0`, `openIdConnect` → `OpenID Connect`, `mutualTLS` → `Mutual TLS`; any
other string is shown as is.

### OAuth flow parts

Flows in fixed order: `implicit`, `password`, `clientCredentials`, `authorizationCode`. Every card
row, the flow headers included, is one element of the card's `StackLayout` (level `card`, level gap
0): flow parts are **8px** apart like any two rows ([../features/vertical-gaps.md](../features/vertical-gaps.md)
§6, decision D3 of 2026-10-16; it replaced the earlier 20px between flow parts).

| Row | Shown when | Content | Severity placement |
| --- | --- | --- | --- |
| Flow header | always (`detailed`) | `Flow type **Authorization Code**` on a `#EDF1F5` plate: plain prefix `Flow type`, flow name (`SecurityDisplayLabels.oauthFlowName`) at `font-weight: 500` | `TitleRow` of the flow (not when the whole diff is inherited from the card) |
| `Authorization URL` / `Token URL` / `Refresh URL` | the field exists | link | `OAuthFlow*UrlRow` |
| `Scopes ▾` | non-empty `scopes` | JSON Schema title pattern: clickable text + clickable `Expander` **after** the text, no value; expanded by default; collapsing hides the scope rows | the block's severity when the flow / card is wholly added / removed |
| Scope (2nd level) | expanded | `<20px offset> name <* if required> <20px> <gray description> [required badge in diffs]`, same 30% grid as 1st-level props | strongest of the scope's own diffs (added / removed / description, required); the block's severity when painted by a whole block |

A scope is **required** when the selected requirement lists it (Q-S2). Required scopes are shown
**only** as `*` on scope rows — there is no `Required scopes` / `Required roles` prop row for any
scheme type (decided 2026-10-14):

- oauth2: `*` on the scope rows of every flow that declares the scope; required scopes no flow
  declares are listed in the scheme's own `Scopes ▾` list after the flow parts;
- openIdConnect and OAS 3.1 roles on other types (no flows): every requirement scope is a row with
  `*` in the scheme's own `Scopes ▾` (openIdConnect) / `Roles ▾` (roles) list
  (`SecurityRowDiffs.Scheme.resolveUndeclaredRequiredScopeRows`,
  `SecurityDisplayLabels.requiredScopeListLabel`, `SecurityNodeVisibility` `showRequiredScopeList`). Scope rows come from
`SecurityRowDiffs.OAuthFlow.resolveScopeRows(flow, scheme)`: the union of both sides' scopes, each
with per-side description and required status, a row diff (scope added / removed / description
replaced — derived from the flow's `scopes` map diff), and a required diff (status changed on a
scope present on both sides — derived from the scheme's `requiredScopes` diff).

### Card frame

Every shared row renders its own origin and changed halves (`SideBySideLayout`), so no single DOM
element wraps "the card" on one side. The frame is therefore drawn **per row and per side** (D12):

```text
 origin side                         changed side
┌───────────────────────────┐       ┌───────────────────────────┐   ← opening SecurityFrameRow, 'first' (top + sides, top radius)
│ petstore_auth  [OAuth 2.0]│       │ petstore_auth  [OAuth 2.0]│
│ Required scopes  write:…  │       │ Required scopes  write:…  │   ← every content row and separator: 'middle' (sides only)
│   Token URL  https://…    │       │   Token URL  https://…    │
└───────────────────────────┘       └───────────────────────────┘   ← closing SecurityFrameRow, 'last' (bottom + sides, bottom radius)
```

| Piece | Rule |
| --- | --- |
| Row API | `TitleRow`, `TextRow`, `MarkdownTextRow`, `AdditionalInfoRow` get an optional prop `framePosition?: (layoutSide: LayoutSide) => FramePosition \| undefined`, `FramePosition = 'single' \| 'first' \| 'middle' \| 'last'` (type in `shared-components/Frame/types.ts`). Undefined = no frame; existing callers are unaffected. |
| DOM | the row's per-side content div gets `data-frame-position="<position>"`. That div stays **full side width**: the card is not a block but a stack of full-width rows, and the frame is an illusion drawn by each row (2026-10-14). |
| CSS | `shared-styles/frame.css`: each framed row draws its frame segment as an absolutely positioned `::before` box — 16px from the left (under the section title text), width `--frame-width` (the side minus 32px: 16px insets on both sides, in plain and diffs mode) — with left / right borders (`1px solid #D5DCE3`); `first` adds the top border and radius (6px, `--frame-radius`), `last` the bottom, `single` both. The row pads its content into that box (16px inner padding on every side of the card). |
| Positions | fixed by role, not by row order: the opening / closing `SecurityFrameRow` (`SecurityRows.tsx`, height `cardInnerInset`, `LayoutPlanner.frameRow`) are `first` / `last`; every content row and every separator inside the card is `middle` (`SecuritySchemeCardBase` passes one resolver and `separatorFramePositions` to `StackLayout`) |
| Per side | a card absent on one side (scheme wholly added / removed) gets **no** frame on that side: `SecurityRowDiffs.Scheme.isCardPresentOnSide(node, side)`; rows there keep their whole-node diff styles (grey, hidden content). |
| Diff backgrounds | the row diff background is on the full-width row div, so a highlighted row — and a wholly added / removed card — is colored across the **whole side** up to the separator, inside and outside the frame; the space between two cards is the closing row of one and the opening row of the next, each painted with its own whole-card diff. |
| Floating badges | `DiffFloatingBadgeWrapper` sits outside `SideBySideLayout` and is unaffected. |
| Spacing | rows have no vertical padding; every gap is a separator row ([vertical-gaps.md](../features/vertical-gaps.md) §6): 8px between rows and flow parts (level `card`, gap 0), border → content 12px (`cardInnerInset` 8 + the row's 4px half). Separators inside the frame are `middle` (side borders continue) and coloured by the rows around them; never a margin (it would break the side borders), no `min-height` |
| OAuth flows | flow rows stay inside the scheme's frame; the flow title (h5) is a `middle` row. |
| Tests | a story with two cards, one wholly added (frame on the changed side only); DOM check that each side's frame width equals the column width. |

### Hiding unchanged content (with diffs)

With `hideUnchangedNodes` (default), a card without changes below its title row keeps the title row and
hides every other row — all flow parts together — behind one three-dots row inside the frame:
[../features/hiding-unchanged-nodes.md](../features/hiding-unchanged-nodes.md#security-scheme-card).

### Optional badge (anonymous access)

Decided 2026-10-28 (D17), replacing the `No authentication` option and its `Authentication is not
required.` text (Q7).

```text
Security  [Optional]                  ← h2 title row; badge in the subheader
‹ [api_key] ›                         ← only the non-anonymous alternatives
┌──────────────────────┐
│ api_key   API key    │
└──────────────────────┘
```

| Rule | Detail |
| --- | --- |
| Source | `security.allowsAnonymous`: the effective list contains `{}` at any position. `{}` items are never alternatives (no option, no node). |
| Badge | text `Optional` in the title row subheader: background `#4C87EC`, white text, 15px (`shared-styles/colors/openapi.css`, `OPENAPI_SECURITY_OPTIONAL_BADGE_COLOR_SCHEMA`). |
| Anonymous-only list (`[{}]`) | the title row with the badge only: no toolbar, no cards. |
| `{}` added / removed (section present on both sides) | the badge is on one side only — added: changed side, removed: origin side — drawn by `BadgeWithDiffs` like the operation `deprecated` tag (default badge look with a green / red border, still 15px); the whole title row gets a synthetic yellow `replace` (`SecurityRowDiffs.Security.takeTitleRowDiff`) and the floating badge of the `allowsAnonymous` severity (`TitleRow` placement). The toolbar is **not** colored by it. |
| Section wholly added / removed | the section's green / red title row wins; the badge is plain on the present side (no border). |
| `{}` replaced by a scheme in the same slot (`[A, {}] ↔ [A, B]`) | `apiDiff` pairs alternatives by index, so the slot is `{}` on one side and `{ B }` on the other: the badge is removed / added and alternative `B` is wholly added / removed (green / red option, whole card) — `security/33`, `34`. |
| Known limitation | removing `{}` from the middle (`[A, {}, B] → [A, B]`) pairs `B` with the old `{}` slot: `B` shows as added at index 1 and removed at index 2. Alternatives are not re-matched by content. |
| Hiding unchanged nodes | a `{}` change reveals **no** card — [../features/hiding-unchanged-nodes.md](../features/hiding-unchanged-nodes.md#anonymous-access-changes). |

## Display modes

| Row | `simple` | `detailed` |
| --- | --- | --- |
| Section header, toolbar, card titles with type text | shown | shown |
| Security props, flow parts, scope / role names (`Scopes ▾` / `Roles ▾` lists) | shown | shown |
| Scheme description, scope / role descriptions (annotations) | hidden | shown |

Rules live in `SecurityNodeVisibility.resolveSecurityScheme` / `resolveOAuthFlow`
(`model/security/node-visibility.ts`, categories `SECURITY_SCHEME_ROW_CATEGORIES` /
`SECURITY_OAUTH_FLOW_ROW_CATEGORIES`), not in JSX (Q-S4). Rule:
[../../shared/features/display-mode-annotations.md](../../shared/features/display-mode-annotations.md).

## With diffs

### Where diffs come from

Measured on the fixtures (E7, E8, E9 in [../notes/2026-10-design-analysis.md](../notes/2026-10-design-analysis.md)):

| Change | Diff location in the merged document | Becomes |
| --- | --- | --- |
| Alternative added / removed | `operation.security[diffsMetaKey][index]` (`add` / `remove`); `apiDiff` maps alternatives **by index** | `securityRequirement` node-level diff (via `security` descendant diffs) |
| `{}` added / removed / replaced | the slot's own diff, or the scheme-key diffs inside a slot that is `{}` on one side only | synthetic `allowsAnonymous` add / remove on `security` (presence of `{}` per side, any position); a slot that is `{}` on one side only also becomes a synthetic whole add / remove of its alternative |
| `security` set to `[]` | one `remove` per alternative (not a whole-list diff) | same as above |
| Scheme added to / removed from an alternative | `operation.security[i][diffsMetaKey][name]` (`add` / `remove`, value `[]` or the scopes) | `securityScheme` node-level diff |
| Scope added / removed | `operation.security[i][name][diffsMetaKey][j]` | list-item diffs of `requiredScopes` |
| Scheme definition field changed | `components.securitySchemes[name][diffsMetaKey][field]` and deeper (`flows.<type>[diffsMetaKey].tokenUrl`, `flows.<type>.scopes[diffsMetaKey][scope]`) | field diffs on `securityScheme` / `oauthFlow` |
| Scheme definition added / removed | `components.securitySchemes[diffsMetaKey][name]` | the card's field rows are painted added / removed; title row unchanged unless the requirement entry changed too |
| Operation starts overriding the document (`security` absent → present) | `operation[diffsMetaKey].security` (`add`, `afterValue` = the operation list) | synthetic alternative diffs (below) |
| Operation stops overriding | `operation[diffsMetaKey].security` (`remove`) | synthetic alternative diffs (below) |
| No override on either side | the document-level `security[diffsMetaKey]…` records | same relocation as for the operation list |

The with-diffs transformer copies every relocated record onto the transformed spec under
`diffsMetaKey` (scheme definition diffs onto the scheme spec, flow diffs onto the flow spec,
scope list diffs onto `requiredScopes`) — the aggregators then read only the transformed spec.

### Synthetic alternative diffs on override changes (Q15)

When the effective list switches between the document list `D` and the operation list `O`:

1. `before = D`, `after = O` for an `add` of `operation.security` (reverse for `remove`). Both are
   read from the merged document: the operation list from the diff's `afterValue` / `beforeValue`,
   the document list from the merged root `security` (with its own diffs ignored for this step).
2. Match alternatives by **deep equality** of the requirement objects (scheme-name set and scope
   sets, order-insensitive).
3. Merged list = `after` in order; every `before` alternative without a match is appended.
4. Matched alternatives carry no diff; unmatched `after` ones get an `add`, appended `before` ones a
   `remove`. The synthetic diffs reuse `type`, `scope`, and declaration paths of the
   `operation.security` diff.

### Painting

| Element | Rule |
| --- | --- |
| Section header | presence rule over the alternatives and `{}` ([../features/diffs.md](../features/diffs.md#section-presence-and-whole-section-changes)); else a yellow `replace` row when `{}` was added / removed ([Optional badge](#optional-badge-anonymous-access)) |
| Toolbar | yellow (`replace`) row when an alternative was wholly added / removed; the option keeps its green / red border; selecting it shows its content on one side only (the other side empty and gray) |
| Whole card / whole flow part added or removed | every row of the block (title or flow header, props, scopes toggle, scope rows) is green / red on the present side and empty gray on the other; the colour reaches to the middle of the gaps around the block |
| Floating badges | **every** highlighted row carries a diffs floating badge with the strongest severity of that row's diffs; the content-less closing row is painted but has no badge |
| Prop rows | the row only: add green, remove red, replace yellow; a replaced **value** gets the `textHighlighterColor`, added / removed values do not |
| Type change | the title row gets a synthetic yellow `replace` background (`SecurityRowDiffs.Scheme.takeTitleRowDiff`, built from a value-less copy of the type diff, so the origin title still reads the scheme name) and the gray type text is highlighted on both sides (Q-S8). Type text marker (`resolveTypeTextHighlight`): yellow on both sides for a replaced type; green on the changed side when the type appears (scheme definition added to `components`), red on the origin side when it disappears (definition removed) |
| Scope rows | scope added / removed: green / red row on one side; description replaced: yellow row + highlighted description; required changed: the whole row gets a synthetic yellow `replace` background (no text highlighter), `*` on the origin side when removed, on the changed side when added, and the diff-colored `required` badge **after** the description |
| Spacing | every gap is a separator row coloured by its neighbours per side, so adjacent highlighted rows form one block without white seams ([Spacing](../features/operation-viewer.md#spacing-data-precededby), [vertical-gaps.md](../features/vertical-gaps.md)) |

## Related documents

- [../features/oas-versions.md](../features/oas-versions.md#security) — 3.0 vs 3.1 differences
- [../features/diffs.md](../features/diffs.md) — aggregators and severities
- Fixtures: `packages/samples/openapi/oas30/fields/security/*` (one per scheme type), `oas30/structure/05–07-security-*`, `oas31/fields/security/*`, `packages/samples/openapi-diffs/security/`
