# OpenAPI architecture review (2026-10) — explained

Developer-friendly companion of [2026-10-architecture-review.md](2026-10-architecture-review.md)
(the notes: findings table, fix log, verification). This document explains each fix batch in plain
language: the concept you need, the problem with real code, the fix, and what changes on screen.

Legend for the sketches: `[x]` a selector option, `[x]°` an option with a round change marker,
`[[x]]` an option with a green / red border (wholly added / removed), `▌` a floating diff badge at
the left edge of a row.

## Concepts used throughout

| Term | Meaning |
| --- | --- |
| Merged document | `apiDiff` output: one object holding the before and the after version, with diff records under a symbol key on the changed objects. The with-diffs builders read only this. |
| `SideContext` | `{ before: boolean, after: boolean }`: on which sides something exists. |
| Row diff / background | The diff that paints a row green / red / yellow. |
| Severity / floating badge | `{ type, causedAt }` of a row, drawn as the badge `▌` at the left edge; hovering it shows `caused by <path> change` when `causedAt` is set. |
| Placement | A named slot in a node's severities (`TitleRow`, `SecuritySchemeHttpSchemeRow`, …): the aggregator fills it, the row reads it. |
| Marker | The round `°` on a selector option: something **inside** the option changed. A wholly added / removed option gets a border instead (design note V9). |
| Shared security module | `model/security/`, `building-service/security/`, `shared-components/Security/`: one implementation used by the OpenAPI operation and by AsyncAPI operations / servers. A change there changes both. |

## Batch 1 — mechanical cleanups (done)

No behaviour change; proven by the equivalence check of batch 2 (536 / 536 identical trees).

| ID | What was wrong | What changed |
| --- | --- | --- |
| F13 | Three `eslint-disable` comments that suppressed nothing; casts (`as`) that hid type errors — the value-prop pick list was cast to the keys common to a union of value types, which is effectively *no keys*, so the pick was unchecked; an untyped cache with `as T` in the security aggregators. | Comments removed; the pick lists are typed per node kind so `pick` is checked; the security aggregators are a typed instance (AsyncAPI's five factories share `ASYNC_API_SECURITY_NODE_AGGREGATORS`). |
| F9 | The same check written several times next to the named version (add / remove / rename ×3, the `1XX` range regex ×2, "non-empty string" ×4, the annotation key ×2, the `[OpenAPI]` log tag ×6). | One copy of each, used everywhere. |
| F19 | Inline object types (`FC<{ node: X }>`, `{ path, method }`, …). | Named types (`…Props`, `OpenApiResolvedOperationKeys`, …). |
| F20 | Section ids written as strings although `OpenApiSectionIds` exists. | Constants everywhere. `OPENAPI_SECTION_IDS_BY_LEVEL` stays a second list on purpose: the unit test checks the order config against it. |
| F23 | Component files also exported block builders, which disables React Fast Refresh (11 warnings). | Builders moved to `*-blocks.tsx` modules; component files export only components. |

## Batch 2 — side helpers and the with-diffs transformer (done)

### F8 — the before / after pair helpers

**Background.** Building diff records needs four operations on a `SideContext` all the time: the
empty pair (start of an accumulation), *intersect* (exists on a side only if both inputs do — a
flow exists where its card **and** its definition exist), *union* (exists if either does — Responses
exist where any code **or** the extensions exist), and *accumulate* (union over a list).

**Problem.** No shared implementation, so about 25 hand-written copies in four styles:

```ts
const presence = { before: false, after: false }          // ×7
presence.before ||= alternativeContext.before             // ×3, plus mergePresence() ×7
presence.after ||= alternativeContext.after
private intersect(a, b) { … }                             // transformer
export function intersectSides(a, b) { … }                // security decorator, same three lines
```

**Fix.** `SideContexts` (`NONE`, `BOTH`, `intersect`, `union`) and `SideReader.replaceRecordEntry`
in `building-service/shared/side-reader.ts`, `DiffSide` in `model/abstract/diff-side.ts`; every copy
replaced, including the AsyncAPI security builder. **Visible change:** none.

### F7 — the with-diffs transformer: hidden state and size

**Background.** Almost every step of the with-diffs transformer needs the same facts about the
selected operation: on which sides it exists, whether it was wholly added / removed, whether its
path was renamed.

**Problem.** `buildSpec` computed them first and stored them in fields; 32 places read the fields,
and the security builder reached them through callbacks. Correct only because `buildSpec` happened
to run first — nothing in the signatures showed the dependency. The class (544 lines) also did
about ten jobs and looked the same fields up several times.

**Fix.** `OpenApiDiffsOperationFactsResolver.resolve(context)` derives the facts from the context
argument (cached per context object); no per-operation fields remain. Section presence moved to
`OpenApiSectionPresence`, body content to `OpenApiContentWithDiffsDecorator`; the security builder
gets these objects instead of callbacks. Transformer: 544 → 367 lines. (A generic context type was
considered and rejected: it would break "with-diffs extends plain".) **Visible change:** none —
proven by building all 254 diff fixtures and 281 plain samples with the old and new code and
comparing the trees (536 / 536 identical; a deliberately broken helper made 254 fail).

## Batch 3 — security card badges, card rows, marker rules (done)

**Outcome in short.** Scope-row badges are computed in the data layer and now show `caused by …`
on hover (the only visible change). The card's label / value rows and the badge slot each reads are
described once, in the data layer. All selectors (response codes, media types, security
alternatives) follow one marker rule. OpenAPI and AsyncAPI both changed and were both verified.

All three findings are in the **shared security module**: the same card
(`SecuritySchemeCardBase`), toolbar (`SecurityToolbarRow`), accessors (`SecurityRowDiffs`) and
placement tables serve OpenAPI and AsyncAPI (`AsyncApiSecuritySchemeCard` = the base card with
AsyncAPI labels; `AsyncApiSecuritySection` uses the shared toolbar). AsyncAPI has no copies of this
logic, so every fix applies to both API types by construction, and both are verified (below).

### What are "scope rows"? (question asked before approval)

An OAuth scheme card lists the scopes of each flow under a `Scopes ▾` row. Those rows are **neither
tree nodes nor node meta**. The tree has two nodes involved:

| Tree node | Field the rows come from |
| --- | --- |
| `oauthFlow` (one per flow) | value field `scopes: Record<string, string>` (scope name → description) |
| `securityScheme` (its parent) | value field `requiredScopes: string[]` (the scopes this requirement asks for) |

In diffs mode the data layer records **one** diff per field, not one per scope: the security
decorator writes a single `replace` of the whole `scopes` map (with both sides' maps) and a single
`replace` of `requiredScopes`. The rows are produced at render time by the model accessor
`SecurityRowDiffs.OAuthFlow.resolveScopeRows(flow, scheme)`: it unions both sides' scope names and
returns plain objects:

```ts
type SecurityScopeRow = {
  name: string
  origin?: { description: string, required: boolean }   // before side; absent = scope did not exist
  changed?: { description: string, required: boolean }  // after side
  rowDiff?: ChangedPropertyMetaData        // background: derived from the `scopes` map diff
  requiredDiff?: ChangedPropertyMetaData   // `required` badge: derived from the `requiredScopes` diff
}
```

The derived diffs keep the parent diff's type and declaration paths (so a cause is available).
`resolveUndeclaredRequiredScopeRows(scheme)` does the same for required scopes no flow declares.
Because these rows are not nodes, the aggregators never compute a severity for them — which is how
F3 came about.

### F3 — the security card computes scope-row badges in React

**Problem.** `resolveScopeRows` returns backgrounds but no severity, so the card builds one:

```ts
const severityOf = (diff) => diff ? { type: diff.data.type, causedAt: [] } : undefined   // cause dropped
const rowSeverity = ownRowDiff || scope.requiredDiff
  ? severityOf(strongestDiff(ownRowDiff, scope.requiredDiff))   // "strongest diff type" chosen in React
  : scope.rowDiff ? blockSeverity : undefined
```

The `next-data-model-authoring` skill forbids severity math in model code because the diff-type
ordering lives in building-service — yet it also exists in `api-doc-viewer/src/utils/common/changes.ts`.

**Fix.** One diff-type ordering module at model level (used by the aggregators and the viewer
utility), a `severity` on every `SecurityScopeRow` computed in the accessor with its cause, the card
renders it; the toolbar's "no toolbar on this side" uses the existing `NodeLevelRowDiffs.isPresentOnSide`.

**Visible change** — only the hover text of scope-row badges (OpenAPI and AsyncAPI alike):

```
BEFORE                                       │ AFTER
 Scopes ▾                                    │  Scopes ▾
▌  read:pets   Read your pets                │    read:pets   Read all your pets     ← yellow row, risky badge
   write:pets  Modify pets                   │    write:pets  Modify pets

hover ▌ today:   diff type only
hover ▌ fixed:   diff type + "caused by components.securitySchemes.petstore_auth.flows.implicit.scopes change"
```

(The path is illustrative: it is the first declaration path of the derived diff, as for every other
row's badge.)

Badge position, type and colours are unchanged, so screenshots do not change.

### F4 — which field goes in which card row is written twice

**Problem.** The aggregator's table says which badge slot each field fills
(`SECURITY_FIELD_PLACEMENTS`: `scheme → SecuritySchemeHttpSchemeRow`, `tokenUrl →
OAuthFlowTokenUrlRow`, …); the card has its own tuples for the same rows
(`[visibility.showHttpScheme, 'scheme', label, Placement.SecuritySchemeHttpSchemeRow, false]`).
A mismatch compiles and shows the wrong badge or none.

**Fix.** Move the placement table to `model/security/`; a data-layer `SecuritySchemeCardRows`
returns the card's label / value rows (field, label, placement, link) from it — including the
AsyncAPI-only `API key location` row; the card renders the list.

**Visible change:** none:

```
▌ petstore_auth   OAuth 2.0          (same rows, same order, same badges —
  HTTP authorization scheme  bearer   now described once, in the data layer)
  Bearer format              JWT
```

### F10 — copy-pasted accessors and a third marker rule

**Problem.** `isDeprecatedOnSide` / `isRequiredStarVisibleOnSide` are the same flag-on-side
algorithm; the media-type and response `takeChangesMarkerSummary` are identical; and the security
toolbar decides its markers inline in React with a slightly different rule (it also passes the
alternative's own change summary).

**Fix.** One `isFlagOnSide` and one `takeChangesMarkerSummary` on the shared row-diffs base;
`SecurityRowDiffs.Alternative.takeOptionMarkers` for the toolbar.

**How markers look** — the marker colour is the strongest change type in *(own summary ∪
descendant summary)* of the option:

```
Response codes (OpenAPI, V9):      [200]°   [[201]]   [404]
                                     │         └ wholly added: green border, no marker
                                     └ something inside response 200 changed

Security toolbar, today:           ‹ [api_key]   [petstore_auth (read:pets)]°   [[basic]] ›
Security toolbar, kept rule:       ‹ [api_key]   [petstore_auth (read:pets)]°   [[basic]] ›   (identical)
Security toolbar, V9 rule:         ‹ [api_key]   [petstore_auth (read:pets)]°   [[basic]] ›   (identical in every expected case)
                                   differs only if an alternative's OWN summary had a change while its
                                   descendants had none:  today [x]°   V9 [x]
```

An alternative's own value is only its scheme-name list, and scheme additions / removals are
recorded as its children's changes, so that case is not expected to occur; it is checked on every
fixture before choosing (see Verification).

**Decision taken:** align with V9 if the two rules agree on every fixture. Measured on all 571
alternatives of both API types, both sides: **0 differences**, so the toolbar now uses the same
marker accessor as response codes and media types (`NodeLevelRowDiffs.takeChangesMarkerSummary`).

### What was done, in one place each

| Concern | Lives in (data layer) | The viewer |
| --- | --- | --- |
| Diff-type order (strongest first) | `DiffTypeOrder` (`model/abstract/tree-with-diffs/diff-type-order.ts`) — replaced three identical tables | `compareDiffTypes` delegates to it |
| Scope-row badge | `SecurityScopeRow.severity` (with cause) and `ownRowDiff` | renders `scope.severity`, highlights with `scope.ownRowDiff` |
| Which field in which card row, with which badge | `SECURITY_FIELD_PLACEMENTS` (`model/security/tree-with-diffs/placements.ts`) + `SecuritySchemeCardRows` (`model/security/card-rows.ts`) | loops over `schemeProps` / `flowProps` |
| "Flag true on this side" | `NodeLevelRowDiffs.isFlagOnSide` | — (accessors delegate) |
| Marker of a selector option | `NodeLevelRowDiffs.takeChangesMarkerSummary` | every selector passes it |
| Toolbar shown on a side | `SecurityRowDiffs.Security.isToolbarShownOnSide` | passes it to `SecurityToolbar` |

One subtle point kept exactly: a scope row painted only by its block (the flow or scheme was
wholly added / removed) shows the block's badge, as before; only a wholly *replaced* flow — the one
case where the old identity check differed — shows the replace itself. Measured: identical badge
types on all 1026 scope rows.

### Verification (done)

| Check | Scope | Result |
| --- | --- | --- |
| Trees, old vs new code | 254 + 281 OpenAPI, 202 + 26 AsyncAPI fixtures | 764 / 764 identical |
| Scope rows (badge type, block badge, highlighter, row fields) | 1026 rows, both API types | identical; 57 / 57 badges gained a cause |
| Toolbar sides / markers | 1098 sides / 571 alternatives × 2 | identical |
| Card rows | 1826 scheme + 1300 flow evaluations, both display modes | identical |
| OpenAPI flag and marker accessors | 5044 checks | identical |

Each check was broken on purpose once to prove it can fail (14 / 328 / 456 failing fixtures), then
restored. New permanent unit tests: `security-card-rows.test.ts` (8).

### Verification plan for batch 3 (as written before approval)

- Unit tests and `tsc` in both packages, as for every batch.
- Tree equivalence (batch 2 method) extended to **AsyncAPI**: the baseline copy's `@apihub/` alias
  imports (34 AsyncAPI files) are rewritten to relative paths, so the comparison really runs the
  old AsyncAPI code.
- Scope rows are computed at render time, not stored in the tree, so they get their own comparison:
  for every flow and scheme of every OpenAPI and AsyncAPI diff fixture, the new `severity.type` must
  equal what the old React code computed, and `causedAt` must be non-empty where the derived diff has
  a declaration path.
- Card rows (F4): the new row list must equal the old tuples' rows (field, label, placement, link,
  order) for every scheme and flow of both API types.
- Markers (F10): the old inline toolbar rule and the V9 rule are computed for every alternative of
  every fixture of both API types; the result shows whether the choice changes anything on screen.

## Batch 4 — the shared spacing engine and shared row names (done 2026-10-30)

Both findings are about **names and places**, not behaviour: nothing is wrong on screen today.
They matter because the code says "OpenAPI" where it means "shared by OpenAPI and AsyncAPI", so the
next person changing OpenAPI spacing or CSS does not know they are changing AsyncAPI too.

### Background: the separator engine

OpenAPI rows have **no vertical padding**. Every vertical gap is a separate, content-less
*separator row*, whose height and per-side colours are planned in next-data-model so that a
highlighted row's colour continues into the gap. Three pieces do this:

| Piece | Where | Does |
| --- | --- | --- |
| Planner + types + spacing numbers | ndm `model/openapi/layout/` (`OpenApiLayoutPlanner`, `OpenApiSeparatorRow`, `OpenApiFrameRow`, `OpenApiSpacingConfig`, `DEFAULT_OPENAPI_SPACING_CONFIG`) | given a list of blocks and their top / bottom edges, returns blocks with separator rows between them |
| Block edges | ndm `model/openapi/layout/block-edges.ts` (`OpenApiBlockEdges`) | the colour / badge at the top and bottom of each kind of block |
| Renderer | viewer `OpenApiOperationViewer/OpenApiLayout.tsx` + `shared-components/Separator/` | renders the plan; reads the spacing numbers from `OpenApiViewerContext` |

The AsyncAPI security sections use the same engine for their toolbar and framed scheme cards
(`<OpenApiLayout level="security" outerHalves>` in `AsyncApiSecuritySection`).

### F1 — the shared engine lives under OpenAPI names and folders

**Problem.** Who imports what today:

```
AsyncApiOperationViewer/AsyncApiSecuritySection.tsx ──┐
shared-components/Security/SecuritySchemeCardBase.tsx ┼──► OpenApiOperationViewer/OpenApiLayout.tsx
shared-components/Security/security-section-blocks.ts ┘    OpenApiOperationViewer/OpenApiViewerContext.ts
shared-components/Separator/*  ──────────────────────────► ndm model/openapi/layout (OpenApiSeparatorRow …)
```

A shared component and another API type depend on the OpenAPI *container* folder. And the spacing
numbers reach AsyncAPI by accident:

```ts
// OpenApiViewerContext.ts
export const OpenApiViewerContext = createContext({ devMode: false, spacing: DEFAULT_OPENAPI_SPACING_CONFIG })
// SecuritySchemeCardBase.tsx (rendered by AsyncAPI too)
const { spacing } = useOpenApiViewerContext()   // AsyncAPI never provides it → the default
```

So changing OpenAPI's default spacing changes AsyncAPI's security cards; a host that configured
OpenAPI spacing would not see that in AsyncAPI.

**Fix.** Split the engine into its generic part and its OpenAPI part, and give the generic part
neutral names and a neutral home:

| Today | After | Notes |
| --- | --- | --- |
| `OpenApiLayoutPlanner`, `OpenApiSeparatorRow`, `OpenApiFrameRow`, `OpenApiBand`, `OpenApiBadgeSegment`, `OpenApiBlockEdge(Pair)`, `OpenApiLayoutBlock`, `OpenApiLayoutItem`, `OpenApiPlanOptions`, `OpenApiSpacingConfig` | `LayoutPlanner`, `LayoutSeparatorRow`, … in ndm `model/abstract/layout/` | the spacing config becomes generic over its level names |
| generic edges in `OpenApiBlockEdges` (`row`, `nested`, `card`, `single`, `container`, `sectionTitleRow`, security toolbar / title rows) | `BlockEdges` in `model/abstract/layout/` (security edges next to the security module) | `OpenApiBlockEdges extends BlockEdges` keeps only operation header, Responses, Body, description edges |
| `OpenApiLayoutLevel` (incl. `security`, `card`) | shared levels `security`, `card`, `section` + OpenAPI levels `operation`, `operationHeader`, `request`, `responses` | |
| `OpenApiLayout.tsx`, `OpenApiBlock` | `shared-components/Layout/StackLayout.tsx`, `StackBlock` | |
| spacing via `OpenApiViewerContext` default | `LayoutSpacingContext` (spec-neutral) provided by each root: the OpenAPI roots pass the OpenAPI config, the AsyncAPI root passes its own (today's numbers) | no accidental defaults |

After:

```
AsyncAPI section ─┐                           ┌─ OpenAPI containers
shared Security  ─┼──► shared-components/Layout/StackLayout ──► ndm model/abstract/layout
shared Separator ─┘          ▲ LayoutSpacingContext                 ▲
                   AsyncAPI root ┘   OpenAPI roots ┘     ndm model/openapi/layout (OpenAPI edges, levels, config)
```

**Visible change:** none — same numbers, same DOM. Both API types' screenshot suites should stay
identical.

### F2 — API-type names on shared rows

**Problem.** Three shared names describe a *behaviour*, but are spelled as an API type:

```ts
PrecededBy.OPENAPI_ROW = 'openapi-row'        // meaning: "no vertical padding, the separator engine plans the gaps"
                                              // carried by AsyncAPI security rows too
TitleRowUsage.OpenApiSection = 'openapi-section'  // meaning: "collapsible title with a fixed-width expander column"
// …and OpenAPI CSS reaches into TitleRow's internals for it:
.title-row-content[data-usage="openapi-section"] > .level-indicator-column { width: var(--openapi-section-expander-width, 16px) }
X_AXIS_PADDING_ROWS_ASYNC_API = 'px-4'        // meaning: the padding of every standard row — used by TitleRow,
                                              // TextRow, MarkdownTextRow, AddressRow, security rows, two DDL components
```

**Fix.** Rename by behaviour, keep the values:

| Today | After |
| --- | --- |
| `PrecededBy.OPENAPI_ROW` / `OPENAPI_NESTED_VIEWER_START` | `PrecededBy.SEPARATOR_LAYOUT_ROW` / `SEPARATOR_LAYOUT_NESTED_VIEWER_START` (+ the `preceded-by.css` selectors) |
| `TitleRowUsage.OpenApiSection` + the rule in `CollapsibleSection.css` | `TitleRowUsage.CollapsibleSection`; the fixed expander-column rule moves to `TitleRow`'s own CSS |
| `X_AXIS_PADDING_ROWS_ASYNC_API` | `X_AXIS_PADDING_ROWS` (14 files) |

Not changed: the other API-type-named `TitleRowUsage` members (`DdlApiSection`, `AsyncApiJsoSection`,
…) — same pattern, outside this review; listed for their own reviews. `X_AXIS_PADDING_ROWS_DDL_API`
stays (DDL's own constant, same value).

**Visible change:** none. The DOM changes only in attribute values (`data-precededby`,
`data-usage`), which no story, IT or public export references.

### What was done, in one place each

| Concern | Lives in (data layer) | The viewer |
| --- | --- | --- |
| Planner, separator / frame-row types | `model/abstract/layout/` (`LayoutPlanner`, `LayoutSeparatorRow`, `LayoutFrameRow`, …) | `shared-components/Layout/StackLayout.tsx` renders one level |
| Shared numbers | `LayoutSpacingConfig<TLevel>` + `DEFAULT_LAYOUT_SPACING_CONFIG` (levels `security`, `section`, `card`) | `LayoutSpacingContext`, provided by every root; no default |
| OpenAPI numbers | `OpenApiSpacingConfig` = shared config over the OpenAPI levels + `nestedViewerInset`, `viewerEdges`, `sectionExpander` | OpenAPI roots provide it (and keep it in `OpenApiViewerContext` for the OpenAPI-only entries) |
| Generic edges (row, card, nested viewer, containers, section title) | `BlockEdges` | — |
| Security toolbar / title edges | `SecurityBlockEdges` (`model/security/block-edges.ts`) | `security-section-blocks.ts`, `security-blocks.tsx` |
| OpenAPI edges (operation header, Responses, Body, description) | `OpenApiBlockEdges extends BlockEdges` | OpenAPI `*-blocks.tsx` |
| "No vertical padding" rows | — | `PrecededBy.SEPARATOR_LAYOUT_ROW` / `SEPARATOR_LAYOUT_NESTED_VIEWER_START` |
| Collapsible title with a fixed expander column | — | `TitleRowUsage.CollapsibleSection`, styled by `TitleRow/TitleRow.css` |
| Standard row padding | — | `X_AXIS_PADDING_ROWS` |

Who imports what now:

```
AsyncAPI section ─┐
shared Security  ─┼──► shared-components/Layout/StackLayout ──► ndm model/abstract/layout
OpenAPI blocks   ─┘          ▲ useLayoutSpacing()                  ▲            ▲
                             │                                     │            │
       AsyncAPI roots: DEFAULT_LAYOUT_SPACING_CONFIG     model/security/  model/openapi/layout
       OpenAPI roots:  DEFAULT_OPENAPI_SPACING_CONFIG    block-edges      (OpenAPI levels, config, edges)
```

Nothing shared imports from `OpenApiOperationViewer/` or `model/openapi/layout/` any more.

One trade-off: `StackLayout`'s `level` prop is now a plain `string`. The context can hold any API
type's config, so the component cannot check the level against one API type's list. The planner is
still typed per API type, and a wrong level would show up as a broken gap in the render check.

Two CSS custom properties were renamed along with their rules, because those rules now live in
shared CSS: `--openapi-section-expander-width` → `--collapsible-section-expander-width` and
`--openapi-nested-viewer-inset` → `--separator-layout-nested-viewer-inset`. The OpenAPI roots still
write both from their config.

### Verification (done)

| Check | Scope | Result |
| --- | --- | --- |
| Harness on two identical copies (before the change) | 764 fixture cases | 764 / 764 equal |
| Rendered HTML, old vs new code, renamed attribute values mapped | 764 cases, 1530 renders (plain + diffs, every operation, both display modes); 670 OpenAPI + 104 AsyncAPI renders with security cards | 764 / 764 equal |
| The check can fail | AsyncAPI diffs root given `cardInnerInset: 9` | AsyncAPI security fixtures differ → restored |

Not covered by the HTML comparison: the CSS files. Their selectors were renamed one-to-one with the
attribute values. The screenshot suites of both API types are the final check for that part.

### Verification plan for batch 4 (as written before approval)

- `tsc` and unit tests in both packages; the existing layout unit tests (`openapi-layout.test.ts`)
  move with the planner.
- The planner itself only moves, so the tree / layout equivalence of batches 2–3 still applies to
  the data layer (plans compared old vs new for every block list the OpenAPI and AsyncAPI fixtures
  produce).
- The viewer change is a rename + a context: to show the DOM is unchanged without Docker, render
  the OpenAPI and AsyncAPI viewers to HTML for every fixture with the old and the new code and
  compare, with the renamed attribute values mapped. If the toolchain cannot render the viewers
  outside Storybook, the screenshot suites (Docker, on your side) are the check.

## Batch 5 — Body schema, Body elements, root viewers (done 2026-10-30)

All three are OpenAPI-only and change nothing on screen. F5 and F6 both touch the **Body** (request
body and response body: the `Body` title row with its media-type selector, an optional description
row, then the selected media type's schema in a nested JSON Schema viewer). F11 is about the two root
components.

### F5 — the Body schema wrapper is built in React

The Body does not show the schema root directly. Like AsyncAPI, it wraps the schema in a synthetic
object with one property `Type`, so the first row of the nested viewer reads `Type  object`:

```
Body  [application/json]°
  Type  object                  <- synthetic property: the whole schema
    id     string
    name   string
```

In diffs mode that `Type` row must turn green / red when the selected media type was added /
removed. The JSON Schema viewer only paints what the schema's diff records say, so somebody has to
write a record for the synthetic `Type` property. Today the viewer does it:

```ts
// MediaTypeContentSection.tsx — on every selection change
wrapJsonSchemaForDiffsViewer('Type', value.schema, OpenApiRowDiffs.Section.takeHeaderRowDiff(selected), diffMetaKeys)
// → { type: 'object', properties: { Type: schema, [diffsMetaKey]: { Type: diff } } }
```

That is diff data assembled in a component, which the project rules reserve for next-data-model.
OpenAPI already does the same job properly elsewhere: parameter groups and response headers get a
synthetic object schema, records included, from `OpenApiObjectSchemaSynthesizer` in the transformer.
The Body is the one OpenAPI schema still prepared in React.

**Fix.** The transformer stores the wrapped schema as the media type's `schema`; the with-diffs
content decorator, which already computes "was this media type added / removed", writes the `Type`
record from that same diff. The component then just passes `value.schema` on, like the parameter
groups. Only `MediaTypeContentSection` and `OpenApiBlockEdges.hasSchema` read that field, so the
change stays local. AsyncAPI's message payload uses the same helper; it is left for the AsyncAPI
review.

### F6 — the Body's elements are decided twice

To plan the separators around the Body, the parent level must know the Body's first and last
element **before** it renders it. The Body then plans its own elements inside. Both sides answer the
same questions independently:

```
block builder (request-blocks.tsx)          component (RequestBodyNodeViewer → MediaTypeContentSection)
  description shown?   ─── same rule ───►     description shown?        (computed again)
  title / description edges ─────────►       title / description edges (computed again)
  selected media type  ──────────────►       selected media type       (computed again)
  has a schema? (Reflect.get) ───────►       has a schema? (own typeof check)
  expanded?  ────────────────────────►       expanded?                 (computed again)
  ⇒ outer edges: head = title, tail = schema / description / title
```

What can go wrong: the outer separator below the Body takes its colour from what the **parent**
believes is the Body's last element. Say a media type was added (green), and one day only the
component's schema check is changed so that it shows a schema the parent's check rejects:

```
both copies agree                        the copies disagree

Body  [application/json]°                Body  [application/json]°
 Description text                         Description text
 Type  object        ▓▓ green             Type  object        ▓▓ green   <- drawn by the component
  id   string        ▓▓                    id   string        ▓▓
──────────────────── ▓▓ separator        ──────────────────── ░░ separator: gray, because the parent
Responses                                Responses               thinks the tail is the description
```

Nothing is wrong today because both copies agree; it is a trap for the next change. The response
Body has the same pair, and `ResponseBodyViewer` keeps two fallbacks for a missing `content` node
(`OpenApiBlockEdges.row({})`, `` `${node.id}:body` ``) that cannot run: the block is only built when
that node exists.

**Fix.** One data-layer answer: `OpenApiBlockEdges.bodyElements(…)` returns the ordered list
`title`, `description?`, `schema?` with their edges (collapsed: the title only), and `body(…)` takes
its outer edges from that list. The block builder computes the list once and passes it to the
component, which only maps each element id to its row. The dead fallbacks go.

### F11 — two root viewers with the same body

`OpenApiOperationViewer` and `OpenApiOperationDiffsViewer` differ in three things: the tree builder,
three diff-only providers, and the layout mode. Everything else is a copy: logger, viewer-context
memo, five nested providers, and the root `div` with the same inline style that writes three CSS
custom properties from the spacing config. Batch 4 had to add `LayoutSpacingContext` to both, which is
exactly the cost of the copy.

The CSS then reads those properties with fallbacks: `var(--collapsible-section-expander-width, 16px)`,
`var(--openapi-section-content-indent, 24px)`, `var(--separator-layout-nested-viewer-inset, 4px)`.
16 / 24 / 4 are the config defaults written a second time. Inside an OpenAPI root they never apply
(the root always writes the properties); they only mislead whoever changes the config later.

**Fix.**

```
OpenApiOperationViewer                    OpenApiOperationDiffsViewer
  builds the plain tree                     builds the with-diffs tree
        │                                   DiffMetaKeys / DiffTypes / UnchangedBlocks providers
        └──────────────┬────────────────────────────┘
                OpenApiViewerRoot  (new, presentational)
                  OpenApiViewerContext · DisplayMode · LayoutMode · Level · LayoutSpacingContext
                  <div data-testid=… style={toOpenApiCssVariables(spacing)}>
```

One deviation from the report: the CSS-variable helper lives in the viewer, not as
`OpenApiSpacing.toCssVariables` in next-data-model, because CSS property names are a view concern.
The numeric fallbacks are removed from the three CSS rules.

### What was done, in one place each

| Concern | Lives in (data layer) | The viewer |
| --- | --- | --- |
| Body schema under `Type` + its diff record | `OpenApiMediaTypeSchema.wrap` (`model/openapi/media-type-schema.ts`) | memoises the call per selected media type |
| "Does this media type have a schema to show?" | `OpenApiMediaTypeSchema.has` | — |
| Which Body elements exist | `OpenApiBlockEdges.bodyElements` | the block builders compute it once; `MediaTypeContentSection` renders it |
| A Body's outer edges | `OpenApiBlockEdges.body(elements)` | — |
| Root contexts + CSS custom properties | — | `OpenApiViewerRoot` (used by both roots) |

**One change of plan (F5).** The record could not be written by the transformer without changing
what is drawn. The `Type` row is painted with the media type's *final* whole diff, and that diff is
often **inherited**: when a whole operation, response or request body is added, every media type
under it inherits that add from the aggregator. The transformer only sees the media type's own
presence diff, a synthetic add whose diff type (breaking / non-breaking / annotation) can differ, so
the badge would change. So the wrapper is built by a next-data-model **model accessor** reading the
built tree: still no diff data assembled in React, and exactly the diff used today.

```
before                                         after
MediaTypeContentSection (React)                MediaTypeContentSection (React)
  wrapJsonSchemaForDiffsViewer('Type',           OpenApiMediaTypeSchema.wrap(mediaType, diffsMetaKey)
    schema, takeHeaderRowDiff(mt), keys)               │  next-data-model model layer
    └─ writes { [diffsMetaKey]: { Type: diff } }        └─ same wrapper, same diff object
```

**F6 after the change.** One list, two readers:

```
buildRequestBodyBlock / buildResponseBodyBlock
  elements = OpenApiBlockEdges.bodyElements(title, description?, selected, { expanded })
     │                                   │
     ▼                                   ▼
  OpenApiBlockEdges.body(elements)    MediaTypeContentSection elements={elements}
  (head / tail for the parent)        (renders title / description / schema as given)
```

### Verification (done)

| Check | Scope | Result |
| --- | --- | --- |
| Harness on two identical copies | 764 cases | 764 / 764 equal |
| Rendered HTML, old vs new (no renames) | 1530 renders, 298 with a Body schema | 764 / 764 equal after each of F5, F6, F11 |
| Each check can fail | F5: record dropped / F6: description element dropped / F11: wrong CSS width | 16 / 302 / 535 cases differ, then restored |

New unit tests: `openapi-media-type-schema.test.ts` (4). Not covered by the HTML comparison: the
removed CSS fallbacks; the screenshot suites are the final check.

### Verification plan for batch 5 (as written before approval)

- `tsc` and unit tests in both packages; new unit tests for the wrapped media-type schema (plain and
  with diffs: the `Type` record equals the media type's whole diff) and for `bodyElements`
  (expanded / collapsed, with / without description and schema).
- The render-HTML equivalence of batch 4, rebuilt: old vs new code, every OpenAPI and AsyncAPI
  fixture, plain and diffs, both display modes; no renames expected, so the HTML must be identical
  byte for byte. One deliberate break per finding to prove the check fails.
- Not covered by the HTML comparison: the CSS fallbacks (F11). Inside a root they are unused by
  construction; the screenshot suites are the final check.

## Batch 6 — selector options are nested nodes (F25, done 2026-10-30)

**What was wrong.** A selector's options — response codes under Responses, media types under Body,
alternatives in the Security toolbar — were plain children of an ordinary node in OpenAPI. The shared
tree model has a node type made for this, the **complex node**: one container whose *nested* nodes are
the options, and AsyncAPI already uses it for its section selector and bindings. You set the rule:
options are nested nodes of the container they belong to.

**The new shape:**

```
operation                                   security (simple: own value, title row)
├─ responses  ◆ complex                     └─ securityAlternatives ◆ complex  (the toolbar)
│   ╎ 200 ╎ 2XX ╎ default   (nested)             ╎ alternative 0 ╎ alternative 1   (nested)
└─ request                                        └─ securityScheme … (children)
    └─ requestBody
        └─ content  ◆ complex
            ╎ application/json ╎ application/xml   (nested)
```

**Two traps the change brings, and how they are handled:**

1. A complex node answers `value()` and `childrenNodes()` with the **first option's** data. Code that
   calls them on a container still compiles and renders something — just the wrong thing. All option
   reads go through helpers over `nestedNodes()` (`getOpenApiOptions`, `getSecurityAlternatives`), the
   rule is in `AGENTS.md` and both authoring skills, and an audit found no remaining misuse. The first
   real hit: `sortResponseCodes` called `.childrenNodes().sort()` on `responses`, which would have
   sorted the first response's headers / content — now `sortNestedNodes`.
2. `security` has its own value (`allowsAnonymous`, …), which a complex node would hide. So it stays
   simple and gets a dedicated container child for the toolbar; the toolbar's diff records and its
   badge placement moved to that container (shared module → AsyncAPI too).

**How we know nothing else changed.** Two comparisons on every OpenAPI and AsyncAPI fixture, old code
vs new: the trees with nested nodes flattened back (763 / 763 identical, including every diff,
severity and summary), and the rendered HTML (763 / 763 byte-identical). Both were broken on purpose
to prove they can fail.

## Batch 9 — the design pages match the code (D2, done 2026-10-30)

Five OpenAPI design pages (plus two found on the way) still named classes, files and tests that were
renamed, merged or never written: per-kind `Kind*` aggregators, `OpenApiSectionPresenceResolver`,
with-diffs visibility managers, five test files that do not exist. The rules they describe were right.
Batch 9 changed only "where it lives".

| Concern | Now described as |
| --- | --- |
| Diff pipeline | per-section steps of the with-diffs transformer with its collaborators, then the rollup |
| Diff aggregation | one record-driven registry from tables; a table of where each per-kind semantic lives |
| Row visibility | plain value rules (`OpenApiNodeVisibility`) + each side's diff styles; no with-diffs managers |
| Row accessors | `OpenApiRowDiffs` + `SecurityRowDiffs`, current signatures |
| Unit tests | existing files only, plus the list of what has no dedicated test |
| Security card frame | frame rows `first` / `last`, content rows `middle`, 8px gaps (vertical-gaps §6) |

**One rule disagreement.** The security entity page still had the old 20px between OAuth flow parts;
the later approved vertical-gaps design (8px) is what the code does, so the page follows it.

**Verification (done).** A name check over the pages: 41 missing code names before (18 in
`features/diffs.md` alone), 0 after; prose checked by word search. Docs only — no code changed.

## Batch 8 — last cleanups F24, F22, F21, F14 (done 2026-10-30)

Four low-severity findings, none visible on screen. Three proposals were revised after reading the
code again (notes → "F14, F21, F22, F24").

| ID | In one sentence | Fix in one sentence |
| --- | --- | --- |
| F24 | Every OpenAPI node gets a "this looks like an unresolved scheme" meta by a shape guess, and nothing reads it. | Delete the field and the guess; the unresolved row already reads `value.isResolved`. |
| F22 | The planner and the separator renderer each keep a page-wide cache, wiped at 1000 entries, for re-render skipping that `SeparatorRow`'s `memo` already does by signature. | Delete both caches and the `renderSeparatorRow` helper. |
| F21 | After the tree is rebuilt, the operation renders once with the previous selections and collapsed sections, then resets them in an effect and renders again. | Reset during render when the node object changes, so the stale state is never drawn. |
| F14 | The "one aggregator per kind, cached" logic exists three times, plus five near-empty `KindAny` classes; OpenAPI tables hide in aggregator files. | One generic registry built from tables, one instance per API type; tables in `placements.ts` / `aggregation-tables.ts`. |

### What was done (2026-10-30)

| Concern | Lives in | Notes |
| --- | --- | --- |
| "Is this scheme unresolved?" | the scheme value (`isResolved`), read by `SecurityNodeVisibility` | F24: the unread meta copy is gone |
| Separator re-render skipping | `SeparatorRow`'s memo on the `signature` | F22: no page-wide caches; the planner is pure |
| Resetting the view state on a rebuilt tree | `OperationNodeViewer`, during render | F21: no stale frame, no second render of the operation |
| The five aggregators per kind | one `RecordDrivenAggregatorRegistry` per API type, built from tables | F14: OpenAPI `OPENAPI_AGGREGATION_TABLES`; AsyncAPI `SECURITY_AGGREGATION_TABLES` |
| OpenAPI placement tables | `model/openapi/tree-with-diffs/placements.ts` | F14: like Security |

**Verification (done).** Trees and rendered HTML equal for every OpenAPI and AsyncAPI fixture after
each step. Breaks: F24 on a synthetic unresolved scheme (no fixture has one); F21 in a temporary jsdom
render (old: one commit still shows the previous selection; new: none); F14 4 OpenAPI and 14 AsyncAPI
cases differ when a table entry is dropped. Gaps: F22's memoisation cannot be seen in HTML (equal by
construction), and F21 has no committed test — the viewer has no DOM test environment (configuration
proposal in the notes).

### Verification plan for batch 8

- `tsc`, unit tests and lint in both packages.
- Tree comparison (every OpenAPI and AsyncAPI fixture) after F24 and F14; render-HTML comparison after
  every step; one deliberate break per finding.
- F21 cannot be seen in static HTML: a viewer unit test that fails on the old effect first.

## Batch 7 — smaller cleanups F12, F15–F18 (done 2026-10-30; F14 done in batch 8)

Six low-severity findings, all still in the code after batches 1–5, none visible on screen. Grouped
by risk: F12 + F15 (data path, mechanical), F14 (shared aggregator plumbing, touches AsyncAPI via
Security), F16 + F17 + F18 (viewer tidy-ups). Full text: notes → "F12, F14–F18".

| ID | In one sentence | Fix in one sentence |
| --- | --- | --- |
| F12 | The Extensions title row takes its diff from one accessor and its highlighting mode from a raw `node.diffs[""]` read. | Take the mode from the same diff object. |
| F14 | The "one aggregator per kind, cached" logic exists three times (two OpenAPI factories + `SecurityNodeAggregators`), plus five near-empty `KindAny` classes; OpenAPI tables hide in aggregator files. | One generic registry built from tables, one instance per stack; tables in `placements.ts` / `aggregation-tables.ts` like Security. |
| F15 | *(after F25: the complex path is used and the tree sort uses `sortNestedNodes`)* The transformer still sorts codes into an object that cannot keep the order. | Delete that sort and the then-unused `OpenApiResponseCode.sort`; the test checks `compare`. |
| F16 | "Default response = first 2XX" is a domain rule written as a viewer free function; the badge helper returns an inline type. | `OpenApiResponseCode.pickDefault` in next-data-model, an `OpenApiViewSelection` class, an `HttpMethodBadge` type. |
| F17 | Six section titles and the `Show N unchanged …` wording are literals in components, the plural rule twice. | Titles to the display-label classes; one `ShowUnchangedLabels` helper. |
| F18 | Two text colours and the red required star are hard-coded in components. | A `TextColors` module and a `RequiredMark` component for the OpenAPI / Security copies. |

### What was done (2026-10-30)

| Concern | Lives in | Notes |
| --- | --- | --- |
| Extensions title row highlighting | the row's own diff (`takeHeaderRowDiff`) | F12 |
| Response-code order | tree only (`sortNestedNodes` + `compare`) | F15: the transformer sort and `OpenApiResponseCode.sort` are gone |
| Default response (first 2XX) | `OpenApiResponseCode.pickDefault` (next-data-model) | F16 |
| Selected option per selector | `OpenApiViewSelection` (viewer, view state) | F16 |
| Section titles, row labels | `OpenApiDisplayLabels`, `SECURITY_SECTION_TITLE` (next-data-model) | F17 |
| "Show N unchanged …" wording | `ShowUnchangedLabels` | F17 |
| Text colours given as values | `TextColors` | F18 |
| Red required `*` | `RequiredMark` | F18 |

**Verification (done).** Trees and rendered HTML equal for every OpenAPI and AsyncAPI fixture after
each step; each step broken on purpose once (1 / 3 / 763 / 228 cases differ). One honest gap: F12's
highlighting mode has no visible effect on any fixture, so the HTML check cannot see it; it is equal by
construction (the same diff object whenever the row is painted).

### Verification plan for batch 7 (as written before approval)

- `tsc`, unit tests and lint in both packages.
- The render-HTML comparison of batches 4–5 (old vs new, every OpenAPI and AsyncAPI fixture): must
  be byte-identical; one deliberate break per finding.
- F14 / F15 change how trees are built, so the batch 2–3 tree comparison runs too (every OpenAPI
  and AsyncAPI fixture: node ids, order, values, diffs, severities).
