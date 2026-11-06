# Block separators

Status: **approved and implemented 2026-10-15** — calculation (§1–§6), algorithm (§7),
implementation map (§8). Replaced the earlier "split gaps" model; summary in
[operation-viewer.md](operation-viewer.md#spacing-data-precededby).
**§9 (operation ID row padding, badge stubs on synthetic rows): approved and implemented 2026-10-15**
(decision points 9.3: all three as recommended).
**§10 (a row that changes alone at a block edge — asymmetric band): proposed 2026-10-16, awaiting
approval**; until then §2.2 describes the implemented behaviour.
**Superseded 2026-10-16 by [vertical-gaps.md](vertical-gaps.md)** (approved and implemented): every
gap a separator row, owned half-gaps — it replaces §1, §4, §9.1, the frame rows' outer half (§3) and
§10. The colouring principle (§2), the badge stubs (§9.2) and the data / viewer split (§7) still
apply; the numbers in the drawings below are historical.

## 1. Rule

- Every row has **symmetric** vertical padding: **4px top, 4px bottom** — the title (h1), address,
  description, external docs, section headers (h2 / h3), the security toolbar, card rows,
  descriptions; the operation ID row **12px** (§9.1). A highlighted row's band is as tall above its
  content as below it.
- Inside a block, rows touch: the gap is 4 + 4 = **8px**.
- Between blocks there is a **separator row**: a content-less, full-width row of **12px**, so the
  gap is 4 + 12 + 4 = **20px**.
- Nested JSON Schema / JSO viewers keep their own rows; their last row already ends with its own
  ~4px, so the separator after them is the same 12px — no compensation, no "tails".
- Padding is still the only spacing inside a row; separators are rows of their own (like the
  card's opening / closing rows below), never margins.

Legend for the drawings: `▒G` green (added), `▒R` red (removed), `▒Y` yellow (replaced), `░░` gray
(side where the block does not exist), blank = unchanged (white). Left = origin, right = changed.
`┄┄` marks a separator.

## 2. Separator colouring

A separator takes the colour of the rows it touches, **per side**:

| Row above | Row below | Separator on that side |
| --- | --- | --- |
| same colour (both white, both green, …) | | **one** 12px band of that colour |
| different colours | | **two** 6px bands: the upper one coloured like the row above, the lower one like the row below |

The row's colour is its own row background on that side (the same diff that paints the row).

### 2.1 Nothing changed

```text
Replaces the order.                     │ Replaces the order.
┄┄ 12 white ┄┄                          │ ┄┄ 12 white ┄┄
Security                                │ Security
```

### 2.2 Row above changed, row below not

`operation/09-description-changed`: the description is yellow, the Security header is not.
(Implemented; contradicts §1 for a row that changed alone — see §10.)

```text
▒Y Replaces the order.                  │ ▒Y Replaces the whole order.
▒Y ┄┄ 6 ┄┄                              │ ▒Y ┄┄ 6 ┄┄
   ┄┄ 6 ┄┄                              │    ┄┄ 6 ┄┄
   Security                             │    Security
```

### 2.3 A wholly added section between unchanged ones

`query-parameters/19-all-added`: Query Parameters exists only on the changed side.

```text
   orderId* string                      │    orderId* string            ← last row of Path Parameters
   ┄┄ 6 ┄┄                              │    ┄┄ 6 ┄┄
░░ ┄┄ 6 ┄┄                              │ ▒G ┄┄ 6 ┄┄
░░                                      │ ▒G Query Parameters
░░                                      │ ▒G dryRun boolean
░░                                      │ ▒G expand string
░░ ┄┄ 6 ┄┄                              │ ▒G ┄┄ 6 ┄┄
   ┄┄ 6 ┄┄                              │    ┄┄ 6 ┄┄
   Headers                              │    Headers
```

### 2.4 Removed above, added below

A removed block directly followed by an added one (e.g. the response `400` Body removed, the
Responses Extensions added):

```text
▒R type string                          │ ░░
▒R ┄┄ 6 ┄┄                              │ ░░ ┄┄ 6 ┄┄
░░ ┄┄ 6 ┄┄                              │ ▒G ┄┄ 6 ┄┄
░░                                      │ ▒G Extensions
```

### 2.5 Two added blocks in a row

```text
░░ ┄┄ 12 gray ┄┄                        │ ▒G ┄┄ 12 green ┄┄
```

### 2.6 Next to a nested viewer

The OpenAPI layer does not know the colour of a nested JSON Schema / JSO viewer's last (or first)
row. **Proposal:** use the colour of the block that owns the nested viewer when that block is wholly
added / removed (green / red, gray on the absent side), white otherwise. A changed last property
inside an unchanged section therefore meets a white separator half:

```text
   Query Parameters                     │    Query Parameters
   dryRun boolean                       │    dryRun boolean
▒R expand string                        │ ░░                            ← nested row (JSON Schema)
   ┄┄ 12 white ┄┄                       │    ┄┄ 12 white ┄┄             ← section not wholly changed
   Headers                              │    Headers
```

## 3. Security cards (point 5)

The card's top and bottom frame edges become two content-less rows of their own: an **opening
row** and a **closing row**. The horizontal border is drawn at the **vertical middle** of the
row. Their colour is **only the whole-card diff**: green / red when the card is wholly added /
removed (gray on the absent side), otherwise unchanged — never the colour of the title row or of
the last content row.

Proposed height: **24px** (12 above the border, 12 below). With the title row's own 4px the
content starts 16px below the border — the same 16px as the horizontal inner padding. The frame
rows replace separators at the card's edges:

```text
   ‹ oauth  api_key ›                   toolbar, padding 4/4
   (12)                                 opening row, upper half (outside the frame)
   ┌─────────────────────────┐          border at the middle of the opening row
   │ (12)                    │          opening row, lower half (inside the frame)
   │ oauth  OAuth 2.0        │          title row, padding 4/4
   │ Flow type Client Cred.  │          card rows, padding 4/4 (8px apart)
   │ Token URL   https://…   │
   │ (12)                    │          closing row, upper half
   └─────────────────────────┘          border at the middle of the closing row
   (12)                                 closing row, lower half
   (12)                                 opening row of the next card, upper half
   ┌─────────────────────────┐
```

Distances: toolbar → border 4 + 12 = 16; border → card text 12 + 4 = 16; card → card (border to
border) 12 + 12 = 24; last card → next section header 12 + 4 = 16.

Type change (`security/16-scheme-type-changed`): the title row is yellow, the opening row is not:

```text
   ┌─────────────────────────┐          │    ┌─────────────────────────┐
   │ (12 white)              │          │    │ (12 white)              │
▒Y │ api_key  API key        │          │ ▒Y │ api_key  HTTP           │
```

A card added to an existing alternative (`security/09-scheme-added-to-alternative`):

```text
   └─────────────────────────┘          │    └─────────────────────────┘
   (12 white)                           │    (12 white)                 ← previous card's closing row
░░ (12 gray)                            │ ▒G (12 green)                 ← opening row, upper half
░░                                      │ ▒G ┌─────────────────────────┐
░░                                      │ ▒G │ basic  HTTP             │
```

Inside a card, flow parts after the first one (and the trailing required-scopes list after flow
parts) are sub-blocks: a 12px separator **inside** the frame (side borders continue through it),
coloured by the separator rule above.

## 4. Other rows

| Row | Now | Proposed |
| --- | --- | --- |
| Summary (h1) | 10 / 4 | 4 / 4 |
| Operation ID | 4 / 4 | 4 / 4 |
| Address | 4 / 4 (+ the method chip's own 8px plate padding) | 4 / 4 |
| Description, external docs | 4 / 10 when last in the header block | 4 / 4, then a separator |
| Security toolbar | 4 / 10 + 6px decoration inset | 4 / 4 + 6px decoration inset (diff markers overhang the option boxes inside the scrolling strip) |
| Section headers | 10 / 4 or 16 / 4 | 4 / 4, separator above |

## 5. What goes away

`data-block-last-row`, the 10 / 16px top paddings, section `tail` / `closing` promises, the frame's
outer half-gap padding (`--frame-outer-gap`). `data-precededby` stays for the nested viewers' first
row (`SEPARATOR_LAYOUT_NESTED_VIEWER_START`). The one-pass chain now emits a separator between two blocks
and hands it the colours of the rows around it.

## 6. Decided points (approved 2026-10-15)

1. Separator colouring next to a nested viewer: whole-block colour only (§2.6).
2. Card frame rows 24px (12 / 12) and the resulting distances (§3).
3. Viewer top / bottom edge: no separator — the first row starts with its own 4px.

## 7. Algorithm

Two goals drive it: the data for every synthetic row (separators, card frame rows) is **computed in
next-data-model**, and every number or rule that may change later is **one entry in a config
object** or **one replaceable strategy function** — the viewer only renders what it is given.

> **Module layout since the 2026-10 architecture review (F1).** The engine is spec-neutral: types,
> planner, shared config (`LayoutSpacingConfig`, `DEFAULT_LAYOUT_SPACING_CONFIG`) and generic edges
> (`BlockEdges`) live in next-data-model `model/abstract/layout/`; the Security edges in
> `model/security/block-edges.ts` (`SecurityBlockEdges`); `model/openapi/layout/` keeps the OpenAPI
> levels (`OpenApiLayoutLevel`), `OpenApiSpacingConfig` and `OpenApiBlockEdges extends BlockEdges`.
> The viewer renders with `shared-components/Layout/StackLayout.tsx`, which reads
> `LayoutSpacingContext`. The type names below follow the current code; the numbers and fields of
> this section are the v1 design, superseded by [vertical-gaps.md](vertical-gaps.md).

### 7.1 Responsibilities

| Layer | Owns | Does not own |
| --- | --- | --- |
| next-data-model `model/abstract/layout/` + `model/openapi/layout/` | spacing config; tones of block edges per block kind; the separator / frame-row data (heights, per-side bands and their tones); the one-pass planner that interleaves blocks and separators | React, CSS, view state |
| api-doc-viewer `OpenApiOperationViewer/` | which blocks are visible, in the configured section order (`OPENAPI_SECTION_ORDER`), and the view state that decides them (selected alternative / response / media type); rendering of the planned items | any colour, height or "is a separator needed" decision |

View state stays in React; it is passed **into** the data-layer functions as plain arguments (the
selected node), so they remain pure and unit-testable on fixtures.

### 7.2 Data types (`model/abstract/layout/types.ts`)

```typescript
/** Background of a row on one side: green / red / yellow / gray, or undefined = unchanged. */
type LayoutSideTone = HighlightVariant | undefined

type LayoutEdgeTones = { readonly before: LayoutSideTone, readonly after: LayoutSideTone }

/** The top or bottom edge of a block: a plain row, or a card frame row (already holds outer space). */
type LayoutBlockEdge = { readonly kind: 'row' | 'frame', readonly tones: LayoutEdgeTones, readonly badge?: DiffType }

/** What the planner needs to know about a block; `TPayload` is the viewer's render data. */
type LayoutBlock<TPayload> = {
  readonly id: string
  readonly head: LayoutBlockEdge
  readonly tail: LayoutBlockEdge
  readonly payload: TPayload
}

type LayoutBand = { readonly height: number, readonly tone: LayoutSideTone }

type LayoutBadgeSegment = { readonly height: number, readonly type?: DiffType }

/** A separator row: per side a stack of bands (both sum to the same height), one badge stub stack. */
type LayoutSeparatorRow = { readonly id: string, readonly before: readonly LayoutBand[], readonly after: readonly LayoutBand[], readonly badge: readonly LayoutBadgeSegment[] }

/** A card frame row (opening / closing): its height, where the border runs, its tones, its badge stub. */
type LayoutFrameRow = { readonly height: number, readonly borderOffset: number, readonly tones: LayoutEdgeTones, readonly badge?: DiffType }

type LayoutItem<TPayload> =
  | { readonly type: 'block', readonly block: LayoutBlock<TPayload> }
  | { readonly type: 'separator', readonly separator: LayoutSeparatorRow }
```

### 7.3 Config (`model/openapi/layout/spacing-config.ts`)

One object; numbers and rules side by side. Derived values are computed, never duplicated.

```typescript
type OpenApiSpacingConfig = {
  readonly rowPadding: { default: number, operationId: number }   // 4 / 12 — top and bottom alike
  readonly blockGap: number              // 20 — between two blocks (text box to text box of rows)
  readonly frameRowHeight: number        // 24 — card opening / closing row
  readonly frameBorderOffset: number     // 12 — border position inside a frame row (middle)
  /** Whether two neighbouring block edges get a separator (default: none next to a frame edge). */
  readonly needsSeparator: (above: LayoutBlockEdge, below: LayoutBlockEdge) => boolean
  /** Bands of one side of a separator (default: one band if the tones match, else two halves). */
  readonly splitBands: (above: LayoutSideTone, below: LayoutSideTone, height: number) => LayoutBand[]
  /** Badge stub of a separator (default: the band rule, by diff type) — §9.2. */
  readonly splitBadge: (above?: DiffType, below?: DiffType, height: number) => LayoutBadgeSegment[]
  /** Card frame rows show the whole card's badge stub (§9.3-1). */
  readonly frameRowBadge: boolean
}

const DEFAULT_OPENAPI_SPACING_CONFIG: OpenApiSpacingConfig = { … }

/** separatorHeight = blockGap - 2 * rowPadding.default (12). */
class OpenApiSpacing { static separatorHeight(config): number }
```

Changing the look later is a one-line edit of the default (or a partial override merged over it —
an `OpenApiSpacing.withOverrides(partial)` helper; not exposed to hosts in v1). The viewer receives
the config through `OpenApiViewerContext` and writes the numbers to CSS custom properties on the
viewer root (`--openapi-row-padding`, …), so CSS never hard-codes them.

### 7.4 Block edge tones (`model/abstract/layout/block-edges.ts`, `model/openapi/layout/block-edges.ts`)

One static accessor per **block kind** on a class `OpenApiBlockEdges`, built from the existing row
diff accessors (`OpenApiRowDiffs`) — the same diff that paints the row:

```text
tones(diff)                     = { before: diff?.styles.before.backgroundColor, after: diff?.styles.after.backgroundColor }
rowEdge(diff)                   = { kind: 'row',   tones: tones(diff) }
frameEdge(card)                 = { kind: 'frame', tones: tones(Section.takeHeaderRowDiff(card)) }   // whole card only
nestedEdge(owner)               = { kind: 'row',   tones: tones(Section.takeHeaderRowDiff(owner)) }  // §2.6: whole block only
```

| Block kind | head | tail |
| --- | --- | --- |
| Operation header (title … external docs) | first visible header row's diff | last visible header row's diff |
| Security header (title + toolbar) | Security title row | toolbar row |
| Security card | `frameEdge(card)` | `frameEdge(card)` |
| Card flow part / required-scopes list (inside a card) | its first row (flow header / `Scopes` toggle) | its last scope row (or the toggle when collapsed) |
| Extensions section | its title row | `nestedEdge(extensions)` |
| Parameter group / response Headers | its title row | `nestedEdge(group)`, or the title row without a schema |
| Body (request / response) | its title row | `nestedEdge(owner)` with a schema, else the last of title / description |
| Response description | its row | its row |
| Container (Request, Responses, Security) | its header row | the **tail of its last child block**, or its header row when it has no children |

A new block kind = one new accessor; nothing else changes.

### 7.5 Planner (`model/abstract/layout/planner.ts`) — one pass per container level

```text
plan(blocks, config):
  items = []
  for i in 0 … blocks.length - 1:
    if i > 0 and config.needsSeparator(blocks[i-1].tail, blocks[i].head):
      items.push(separator(id = blocks[i-1].id + '|' + blocks[i].id, above = blocks[i-1].tail.tones, below = blocks[i].head.tones))
    items.push(block(blocks[i]))
  return items

separator(above, below):
  h = OpenApiSpacing.separatorHeight(config)                       // 12
  before = config.splitBands(above.before, below.before, h)          // per side, independently
  after  = config.splitBands(above.after,  below.after,  h)
  return { before, after }

default splitBands(a, b, h) = a === b ? [{ h, a }] : [{ h/2, a }, { h/2, b }]
default needsSeparator(x, y) = x.kind !== 'frame' and y.kind !== 'frame'

frameRow(card, config) = { height: config.frameRowHeight, borderOffset: config.frameBorderOffset, tones: frameEdge(card).tones }
```

Levels that call `plan` (each over its own visible children, in the configured order):

| Level | Blocks |
| --- | --- |
| Operation | header block, Security, operation Extensions, Request, Responses |
| Request | parameter groups, Body (the h2 title row is the container's header: 8px to the first child, no separator) |
| Responses | selected response's sections (description, Headers, Extensions, Body), Responses Extensions (same: h2 + selector is the header) |
| Security | security header (title + toolbar; the title alone for an anonymous-only list), the cards |
| Card | scheme rows block, flow parts, required-scopes list — inside the frame, between the opening and closing rows |

A container is itself one block of its parent level: its `head` is its header row, its `tail` the
tail of its last child (§7.4), so separators between levels compose without special cases.

### 7.6 Viewer rendering

- Each container builds its `LayoutBlock<render function>[]` (visibility + config order +
  view state), calls `LayoutPlanner.plan`, and maps the items: a block → its rows, a separator
  → `SeparatorRow` component (`StackLayout` does this).
- `SeparatorRow` (`shared-components/Separator/`): a `SideBySideLayout` / `OneSideLayout`
  row whose sides render their bands as stacked divs with `height` from the data and the background
  class of the band's tone (`DiffsClassesBuilder.background`). No padding, no margin, no text.
  Inside a card it also carries `data-frame-position="middle"`, so the side borders continue.
- Card opening / closing rows: `SecurityFrameRow` with `height` from `frameRow(...)`; it passes the
  border position as `--frame-border-top` (opening) / `--frame-border-bottom` (closing) and
  `frame.css` draws the border there (both rows get their tone from the whole card).
- All OpenAPI content rows use one member `PrecededBy.SEPARATOR_LAYOUT_ROW` whose rule is
  `padding: var(--openapi-row-padding) 0`; `SEPARATOR_LAYOUT_NESTED_VIEWER_START` stays for the first row of a
  nested viewer.

### 7.7 Removed by this change

`data-block-last-row` (`ATTRIBUTE_BLOCK_LAST_ROW`), `OPENAPI_VIEWER_START` / `OPENAPI_BLOCK_ROW` /
`OPENAPI_BLOCK_START` / `OPENAPI_AFTER_NESTED_VIEWER`, section `tail` / `closing`,
`resolveBlockRowsSpacing`, `resolveRequestTail`, `resolveParametersTail`, `CardRow.startsBlock`, and
the frame's outer-gap padding. No re-export shims.

### 7.8 Tests

| Where | What |
| --- | --- |
| `next-data-model/tests/unit-tests/openapi-layout.test.ts` | `splitBands` (same tone → one band; different → two halves; per side independently), `needsSeparator` (frame edges), planner interleaving and ids, a config override changes the output; block edges on fixtures: `operation/09` (yellow description tail), `query-parameters/19` (green / gray nested edge), `security/09` (green frame edge), `security/15` (title yellow, frame edge unchanged) |
| api-doc-viewer | Puppeteer spacing audit (every content row 4 / 4; separators 12 or 6 + 6 with the right tones; frame rows 24 with the border at 12), then screenshot regeneration on a Docker machine |
| Design | `operation-viewer.md` → "Spacing" replaced by a link to this file; security entity docs; authoring and testing skills |

### 7.9 Cost and collapsible blocks

**Cost — no crawl.** The algorithm reads only the operation tree that is already built (one
`OpenApiTreeBuilder` / `OpenApiTreeWithDiffsBuilder` pass, unchanged):

| Step | Work |
| --- | --- |
| Edge tones | O(1) per block: one diff lookup on one node (`node.diffs[...]` through `OpenApiRowDiffs`) — the same accessors the rows call to paint themselves |
| Nested viewers | **never entered**: their edges use the owning block's whole-block diff (§2.6), so JSON Schema / JSO trees (properties, combiners, `$ref`s) are not walked |
| Planner | one linear pass per container level over its visible blocks (≈ 5 at operation level, ≤ 5 in Request / Responses / Security / a card); container tails recurse at most 3 levels |
| Data size | a separator = two band lists of 1–2 bands; a frame row = 3 numbers; nothing is cached in the tree |

Per render this is a few dozen constant-time steps — negligible next to rendering the rows. Each
container memoises its plan (`useMemo` over the node, the selection and the collapsed state).

**View state is input.** Selections (security alternative, response, media type per body) live in
one view-state store of the operation viewer (`OpenApiViewStateContext`: owner node id → selected
node id), read by every container. The parent level needs them too: the selected media type decides
a Body's tail, which is the Request's tail, which touches the separator before Responses. The store
resets when the operation node changes (a rebuilt tree), as the per-container states did.

**Collapsible blocks (implemented 2026-10-20, [collapsible-sections.md](collapsible-sections.md)).**
Collapsing is one more view-state input — a set of collapsed section node ids in the same store —
passed to the block builders (a collapsed section is its title row alone) and `OpenApiBlockEdges.bodyElements`.
Numbers below are from this document's original model; the effects are the same:

| Effect of collapsing | Handled by |
| --- | --- |
| The block shows its title row only, so its `tail` becomes the title row instead of the nested viewer | the block's edge accessor takes `expanded` (e.g. `OpenApiBlockEdges.parameters(node, { expanded })`) |
| The parent's tail may change (Request ends with that block) | container tails are recomputed from the children in the same pass |
| Heights | none: separators are always 12 (or 6 + 6) and frame rows 24, so collapsing only removes the block's own rows — nothing jumps |
| Nested JSON Schema expanders | no effect on OpenAPI separators (whole-block tones only) |

The card's `Scopes` toggle already follows this pattern: the card plans its segments with the
collapsed scopes as input, so a collapsed flow part ends with its `Scopes` row.

## 8. Implementation map

| Piece | Where |
| --- | --- |
| Types, config, edges, planner | next-data-model `src/model/abstract/layout/` (`types.ts`, `spacing-config.ts`, `block-edges.ts`, `planner.ts`, `index.ts`); OpenAPI part `src/model/openapi/layout/` (`types.ts`, `spacing-config.ts`, `block-edges.ts`); Security edges `src/model/security/block-edges.ts` |
| Header row order | `OpenApiNodeVisibility.resolveOperationHeaderRows` (`OPENAPI_OPERATION_HEADER_ROWS`) and `OpenApiRowDiffs.Operation.takeHeaderRowDiff` |
| Unit tests | next-data-model `tests/unit-tests/openapi-layout.test.ts`; api-doc-viewer `tests/openapi-view-selection.test.ts` |
| View state | api-doc-viewer `OpenApiViewStateContext.ts` (store in `OperationNodeViewer`), `src/utils/openapi/view-selection.ts` (resolvers with the defaults) |
| Rendering | `shared-components/Layout/StackLayout.tsx` (plans one level; spacing from `LayoutSpacingContext`), `shared-components/Separator/SeparatorRow.tsx`, `shared-components/Separator/BadgeStub.tsx` (decorative badge stub), `SecurityFrameRow` in `shared-components/Security/SecurityRows.tsx` |
| Block builders | `buildSecurityBlock`, `buildExtensionsBlock`, `buildRequestBlock`, `buildParametersBlock`, `buildResponsesBlock`, `buildResponseBlocks` (`response-blocks.tsx`), card segments in `SecuritySchemeCardBase` |
| CSS | `preceded-by.css` → "OpenAPI operation viewer" (`--openapi-row-padding`, `--openapi-row-padding-operation-id`, set on the viewer root from the config); `frame.css` (`--frame-border-top` / `--frame-border-bottom`); `SeparatorRow.css` |
| Badge placements | `OpenApiRowDiffs.Operation.resolveHeaderRowSeverityPlacement` (header rows and their edges); other edges read the `TitleRow` / `DescriptionRow` / `SelectorRow` placement their row renders; card rows carry the severity they render (`CardRow.severity`) |
| Config entry point | `OpenApiViewerContext.spacing` (= `DEFAULT_OPENAPI_SPACING_CONFIG`), also provided as `LayoutSpacingContext` by the OpenAPI roots; not a public prop in v1 |

## 9. Operation ID padding, badge stubs on synthetic rows (implemented 2026-10-15)

### 9.1 Operation ID row: 12px padding

The operation ID row (small grey text) looks glued to the title and the address row at 4px. It gets
**12px top and bottom** (symmetric, so a highlighted row stays centred); every other row keeps 4px.

```text
Update an order                 (h1)    padding 4 / 4
                                         4 + 12 = 16
Operation ID: updateOrder               padding 12 / 12
                                         12 + 4 = 16
[POST] /orders/{orderId}                padding 4 / 4
```

How: the config gets per-row-kind padding instead of one number —
`rowPadding: { default: 4, operationId: 12 }` (`OpenApiSpacingConfig`); the viewer root writes one
CSS custom property per entry (`--openapi-row-padding`, `--openapi-row-padding-operation-id`) and
the operation ID row uses a dedicated member `PrecededBy.OPENAPI_OPERATION_ID_ROW` whose rule reads
the second one. Separators are unaffected: the operation ID row is never at a block edge (the address
row always follows it), and only as the very first row of the viewer when there is no title.

### 9.2 Diff floating badge stubs on separator and frame rows

**Today.** A changed row carries a **floating badge**: a 4px vertical bar at the left edge of the
whole row (one per row, not per side), as tall as the row, coloured by the **diff type**
(breaking `#ED4A54`, risky `#E98554`, deprecated `#FFB02E`, non-breaking `#84CB7A`, annotation
`#B866C9`, unclassified `#70A9EC`); hover shows the type and cause (`UxDiffFloatingBadge`). Badged
rows of one block touch, so their bars form one line; a separator between two blocks breaks it.

**Proposal.** Separator rows get a **badge stub**: the same 4px bar at the same x, **decorative
only** — no hover, no tooltip, no text, `pointer-events: none`. It follows the band rule of §2, for
the one bar instead of per side:

| Badge of the row above | Badge of the row below | Stub |
| --- | --- | --- |
| none | none | none |
| same diff type | | one full-height (12px) bar of that colour |
| different types, or only one of them has a badge | | two 6px halves: the upper one like the row above (or nothing), the lower one like the row below (or nothing) |

Legend: `▌b` breaking, `▌n` non-breaking, `▌a` annotation — the stub / badge column, leftmost.

`operation/09-description-changed` (description replaced = annotation; the Security header has no
badge):

```text
▌a ▒Y Replaces the order.             │ ▒Y Replaces the whole order.
▌a ▒Y ┄┄ 6 ┄┄                          │ ▒Y ┄┄ 6 ┄┄        ← upper stub half: annotation
      ┄┄ 6 ┄┄                          │    ┄┄ 6 ┄┄        ← lower half: no stub
      Security                         │    Security
```

`query-parameters/19-all-added` (the whole section non-breaking; the rows around it unchanged):

```text
      orderId* string                  │    orderId* string
      ┄┄ 6 ┄┄                          │    ┄┄ 6 ┄┄
▌n ░░ ┄┄ 6 ┄┄                          │ ▒G ┄┄ 6 ┄┄
▌n ░░                                  │ ▒G Query Parameters
▌n ░░                                  │ ▒G dryRun boolean
▌n ░░ ┄┄ 6 ┄┄                          │ ▒G ┄┄ 6 ┄┄
      ┄┄ 6 ┄┄                          │    ┄┄ 6 ┄┄
      Headers                          │    Headers
```

Neighbouring blocks with different types (a removed section — breaking — directly above an added
one — non-breaking):

```text
▌b ▒R type string                     │ ░░
▌b ▒R ┄┄ 6 ┄┄                          │ ░░ ┄┄ 6 ┄┄
▌n ░░ ┄┄ 6 ┄┄                          │ ▒G ┄┄ 6 ┄┄
▌n ░░                                  │ ▒G Extensions
```

**Card frame rows** (opening / closing, §3) are synthetic too: they get a stub over their full 24px
when the **whole card** is added / removed (the card's own badge type), and none otherwise — the same
whole-card-only rule as their background. Without it a wholly added card's badge line has 24px holes
at both ends. *(Decision point 9.3-1.)*

### 9.3 Decision points

1. Frame rows get stubs too (whole card only) — recommended, see above.
2. The stub split follows the band rule (one bar if the neighbours' types match, else halves).
3. Next to a nested JSON Schema / JSO viewer the stub uses the **owning block's** whole add / remove
   badge type only (as §2.6 for colours): a badged last property of an unchanged section meets no
   stub half.

### 9.4 Algorithm changes

Data layer (`model/openapi/layout/`):

| Piece | Change |
| --- | --- |
| `LayoutBlockEdge` | `+ badge?: DiffType` — the diff type of the floating badge the edge row shows (absent = no badge) |
| `OpenApiBlockEdges` accessors | read the badge type from the **same severity placement the row renders** (`node.diffsSeverities[placement]?.type`) via one helper `rowEdge(diff, severity)`; nested / frame edges: the owner's whole-block severity. The severity placement of each operation header row moves into one data-layer accessor (`Operation.resolveHeaderRowSeverityPlacement(row, deprecatedTagRow)`) used by both the edges and the rows, so they cannot disagree |
| `LayoutSeparatorRow` | `+ badge: readonly LayoutBadgeSegment[]` (`{ height, type?: DiffType }`), one stack for the whole row |
| `LayoutFrameRow` | `+ badge?: DiffType` |
| `OpenApiSpacingConfig` | `rowPadding` becomes `{ default, operationId }` (§9.1); `+ splitBadge(above?, below?, height) => LayoutBadgeSegment[]` (default = the band rule); `+ frameRowBadge: boolean` (decision 9.3-1) |
| Planner | `separator(...)` also fills `badge` from `above.badge` / `below.badge` |

Viewer:

| Piece | Change |
| --- | --- |
| `SeparatorRow` | a `relative` wrapper with an absolutely positioned 4px stub column at the badge's x, stacked segments with `height` and `background-color: DIFF_TYPE_COLORS[type]`; `pointer-events: none`, no text |
| `SecurityFrameRow` | the same stub over its full height when `frameRow.badge` is set |
| Card segments | `CardRow` carries the severity it already renders, so segment edges get their badge |
| Operation ID row | `PrecededBy.OPENAPI_OPERATION_ID_ROW`; one more CSS custom property on the viewer root |

### 9.5 Cost estimate

| Aspect | Estimate |
| --- | --- |
| Runtime | negligible: badge types are already computed by the severities aggregators during the tree build; each block edge reads one more value (O(1)), each separator gets one more 1–2 item list; the stub is 1–2 absolutely positioned divs per separator / frame row |
| Data layer | small: 4 type additions, ~10 edge accessors gain a severity, one config rule, planner +3 lines; unit tests for the stub split and for edge badges on fixtures (`operation/09`, `query-parameters/19`, `security/09`, a breaking-above / non-breaking-below pair) |
| Viewer | small: the stub element in `SeparatorRow` / `SecurityFrameRow`, severities on card rows, the operation ID member + CSS property |
| Risk | an edge's badge must be the badge its row really shows — mitigated by one placement accessor for both, and checked by the Puppeteer audit (stub colours against the neighbouring rows' real badges) |
| Screenshots | OpenAPI diffs cases with a change next to a separator or a whole card change again (they need regenerating anyway); plain suites change only through the operation ID padding |

Overall: a few hours of work and no structural change — the plan already carries per-side tones;
the badge type is one more value travelling the same path.

## 10. A row that changes alone at a block edge (proposed 2026-10-16 — not implemented)

### 10.1 Finding

`operation/09-description-changed`: the yellow description has a separator below it and none above.

- **Why.** The description is the **tail row of the operation header block** (title … external docs,
  §7.4). The address row is in the same block, so the two rows touch (4 + 4, no separator); the next
  block (Security) starts below, so a separator follows. §2 paints the upper separator half like the
  row above, so the yellow band is **4px above** the text and **4 + 6 = 10px below**; the badge stub
  (§9.2) makes the floating badge 6px longer below as well.
- **Code = design.** The implementation follows §2.2 and the §9.2 drawing exactly
  (`openapi-layout.test.ts` pins the yellow tail of `operation/09`). The design contradicts itself:
  §1 says "a highlighted row's band is as tall above its content as below it", §2 breaks that for a
  changed row at a block edge, and §2.6 already avoids it next to nested viewers (whole-block colour
  only).

### 10.2 The same change, three different bands

The band around a row that changed **alone** depends on where the row sits in its block:

| Row that changed alone | Position | Band above / below today |
| --- | --- | --- |
| Operation summary | head of the header block, first row of the viewer | 4 / 4 |
| Operation ID, address | inside the header block | 4 / 4 (12 / 12 for the operation ID) |
| Operation description, external docs (replaced / added / removed) | tail of the header block | **4 / 10** |
| Body title row (yellow: `required`, media-type options), Responses title row (yellow: code options) | head of their block | **10 / 4** |
| Response description | its own block, first under the Responses h2 (touches it), a separator below | **4 / 10** |
| Last scope row of a flow part, another flow part below | tail of a card segment | **4 / 10** |
| Last property of a section (nested JSON Schema / JSO row) | §2.6: whole-block colour only | 4 / 4 |

Whole blocks (a section, card, flow part, operation wholly added / removed) are the case §2 was
made for: the colour continues through the separator halves on both ends (§2.3–2.5), which is
symmetric at block level and stays as it is.

### 10.3 Options

**A (recommended): separators take colour only from whole blocks.** Generalise §2.6 to every edge:
an edge's tones and badge type are those of the **block's own whole add / remove** (including an
inherited one), never those of a single row that changed alone. A row that changed alone gets
4 / 4 wherever it sits; whole blocks keep their continuous colour.

```text
                                        today                         A
   [POST] /orders/{orderId}             │ [POST] /orders/{orderId}    │ [POST] /orders/{orderId}
▌a ▒Y Replaces the whole order.         │ ▒Y Replaces …   (4 above)   │ ▒Y Replaces …   (4 above)
▌a ▒Y ┄┄ 6 ┄┄                           │ ▒Y ┄┄ 6 ┄┄      (4 + 6)     │    ┄┄ 12 white ┄┄  (4 below)
      ┄┄ 6 ┄┄                           │    ┄┄ 6 ┄┄                  │
      Security                          │    Security                 │    Security
```

`query-parameters/19-all-added`, `security/09` (whole card), §2.3–2.5: unchanged.

**B: the description and external docs become a block of their own** (a separator above them too).
`operation/09` becomes 10 / 10, but the plain layout changes (address → description 8 → 20px), and
the Body / Responses title rows (10 / 4), the response description (4 / 10) and the card segments
stay as they are — not uniform.

**C: keep the behaviour** and narrow §1 to "inside a block".

### 10.4 Algorithm (A)

| Piece | Change |
| --- | --- |
| `LayoutBlockEdge` | `+ scope: 'row' \| 'block'` — whether the edge's tones / badge come from a row that changed alone or from the block's whole add / remove |
| `OpenApiBlockEdges` | row-based accessors (`operationHeader`, `securityHeader`, `noAuthentication`, `requestBody`, `responseBody`, `responses`, `responseDescription`, `rows` for card segments) mark their edges `scope: 'row'` unless the painting diff is the owning block's whole add / remove (`Section.takeHeaderRowDiff(owner)`; for card segments the flow / scheme that the segment belongs to) — then `'block'`. `nestedEdge` / `frameEdge` / `wholeBlockEdge` are `'block'` |
| `OpenApiSpacingConfig` | `+ separatorEdge: (edge) => { tones, badge }` — default: the edge's own values when `scope === 'block'`, none otherwise; returning the edge as is restores today's §2 behaviour (one-line switch) |
| Planner | `separator(...)` reads `config.separatorEdge(above)` / `config.separatorEdge(below)` before `splitBands` / `splitBadge` |
| Viewer | no change (it renders the plan) |

Tests: `operation/09` tail → `scope: 'row'`, separator one white 12px band, no stub; `request-body/03`
and `responses/03` head → the same above the yellow title row; `responses/17-description-changed`
(response description replaced) → white separator below; `query-parameters/19`, `security/09`
unchanged (whole blocks).

### 10.5 Cost

| Aspect | Estimate |
| --- | --- |
| Data layer | small: one field on the edge, ~8 accessors set it, one config rule, planner +2 lines; unit tests above |
| Viewer | none |
| Runtime | negligible (one more value per edge) |
| Screenshots | every OpenAPI diffs case with a row that changed alone at a block edge (operation description / external docs, Body / Responses title rows, response descriptions, scope rows at segment ends) — plain suites unchanged |

### 10.6 Decision points

1. Option A, B or C.
2. (A) Card segments: should a scope row that changed alone at a flow part's end also lose its
   separator colour (recommended: yes — the same rule), or do card segments keep today's §2?
