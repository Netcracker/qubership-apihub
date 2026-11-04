# Vertical gaps: every gap is a separator row

Status: **approved and implemented 2026-10-16** (decision points §10: all as recommended — 8px
between sub-blocks, 8px between cards, flow parts 8px apart, border → content 12px, the viewer keeps
its 4px top / bottom). It replaces the numbers of [block-separators.md](block-separators.md) §1, §4
and §9.1, the frame-row outer half of §3, and the §10 proposal (its problem disappears, §5 below). The colouring principle of §2, the
badge stubs of §9.2 and the data / viewer split of §7 stay. JSON Schema and JSO viewers are **not**
changed: they keep their own rows and paddings.

**Numbers doubled 2026-11-01** (rows stuck together): every OpenAPI element owns **8px** above and
below (rows, cards) and the operation level adds **8px**, so rows of one block are **16px** apart and
top-level blocks **24px**. Unchanged: the rule itself (R1–R4), the nested viewers' 0px half, the
nested-viewer inset (4px), `cardInnerInset` (8px) and the expander column. AsyncAPI Security sections
keep the shared 4px defaults (§7). All numbers below are the doubled ones; where a comparison column
says "4px baseline" it gives the numbers approved on 2026-10-16.

## 1. Requirements

| # | Element(s) | Spacing |
| --- | --- | --- |
| 1 | **Block 1**: summary, operation ID, address, description, external docs rows | ≥ 8px above, ≥ 8px below each |
| 2 | **Block 2**: Security header, security toolbar, security card(s) | ≥ 8px above / below each; ≥ 8px between cards |
| 4 | **Block 3**: Extensions header, JSO viewer | ≥ 8px above / below |
| 6 | **Block 4**: Request header; path / query / header / cookie parameter and Body sub-blocks (header + JSON Schema viewer) | ≥ 8px above / below |
| 8 | **Block 5**: Responses header, response description, Headers / Body sub-blocks | ≥ 8px above / below |
| 3, 5, 7, 9 | between blocks 1–2, 2–3, 3–4, 4–5 | **24px** |

As given on 2026-10-16: ≥ 4px around every element, 12px between top-level blocks; doubled on
2026-11-01.

Plus: every vertical gap in OpenAPI is a separator row (or a set of separator rows) coloured by what
changed; everything stays configurable.

## 2. Inferred rule

**R1 — no row padding.** OpenAPI rows (title, text, address, external docs, toolbar, card rows, …)
get **no vertical padding**: a row is its content only. Every vertical gap between two OpenAPI
elements is **one separator row made of bands** — the "set of separator rows".

**R2 — each element owns a half-gap above and below.** An *element* is anything the OpenAPI layer
stacks: a row, a security card (seen from outside), a nested JSON Schema / JSO viewer.

| Element | Owned half-gap (above and below) | Why |
| --- | --- | --- |
| OpenAPI row | **8px** | the "≥ 8px above / below" of every row |
| Security card (outside its border) | **8px** | "≥ 8px around the cards" |
| Nested JSON Schema / JSO viewer | **0px** | its first / last row already insets its text by ≥ 4px (JSON Schema: 4px row body, overridden for OpenAPI; JSO: 26px min-height centring); the OpenAPI half next to it supplies the rest |

**R3 — a level gap between top-level blocks.** Between two blocks of the **operation level**
(blocks 1–5 above) the gap gets an extra **8px**, always split into **two 4px halves**: the upper
half continues the element above, the lower half the element below (§3). Inside a block (rows of
block 1, sub-blocks of Request / Responses, cards) the level gap is **0**.

**R4 — gap = owned half of the element above + level gap + owned half of the element below.**

| Between | Gap | 4px baseline |
| --- | --- | --- |
| two rows of one block (summary → operation ID → address → description → external docs; Security header → toolbar; Request header → first sub-block header; Responses header → description) | 8 + 0 + 8 = **16** | 8 |
| two sub-blocks (Path Parameters → Query Parameters, Headers → Body, …) | nested 0 + 0 + 8 = **8** below the viewer's own ≥ 4 inset → **12 visible** | 4 → 8 visible |
| a sub-block header → its nested viewer | 8 + 0 + 0 → **8** above the viewer's own ≥ 4 inset → **12 visible** | 4 → 8 visible |
| toolbar → first card border; card border → card border | 8 + 0 + 8 = **16** | 8 |
| two top-level blocks (1–2, 2–3, 3–4, 4–5) | 8 + **8** + 8 = **24** (after a nested viewer: 0 + 8 + 8 = 16 below its own ≥ 4 inset → 20 visible) | 12 (after a nested viewer: 8 → 12 visible) |
| top / bottom of the viewer | the first / last element's own 8px half (§7, D5) | 4 |

## 3. Colouring

Each band of a separator takes a tone **per side**, as in block-separators §2:

| Band | Tone on a side |
| --- | --- |
| owned half of an element | that element's own background on that side (the row diff that paints the row; a card: its whole-card diff; a nested viewer has a 0px half, but its tone — the whole add / remove of the block that owns it, as block-separators §2.6 — feeds the level half next to it) |
| upper level half (4px) | the tone of the element **above** (the same as its owned half) |
| lower level half (4px) | the tone of the element **below** |

So a gap between top-level blocks is, per side, `8 + 4` in the tone of the element above and
`4 + 8` in the tone of the element below — two 12px halves. Neighbouring bands with the same tone
render as one band (rendering only). Badge stubs follow the same bands: an owned half and the level
half next to it carry their element's badge.

**Consequence:**

| Row that changed alone | Band above / below |
| --- | --- |
| inside a block (every gap 8 + 8) | **8 / 8** |
| at the edge of a top-level block (the last row of block 1, a block's h2 title, the last row before the next block) | **8 / 12** or **12 / 8** — 4px more on the side of the 24px gap |

A wholly added / removed block is coloured through its elements and their halves; at the operation
level its colour reaches 12px beyond its edge rows' content.

## 4. Visual examples

Notation: one line per band or row; `(8)` an 8px band, `▒G` green, `▒R` red, `▒Y` yellow, `░░` gray
(absent side), blank = white; `▌` the floating badge / badge stub of the row's diff type (`▌a`
annotation, `▌n` non-breaking where the fixture's type is known), leftmost. Left = origin, right = changed. Nested JSON Schema / JSO rows are marked `·`.

### 4.1 Plain operation (one column)

```text
(8)                                        viewer top: first row's own half
Update an order                            summary (h1)
(8)(8)                                     16
updateOrder                                operation ID
(8)(8)                                     16
[POST] /orders/{orderId}
(8)(8)                                     16
Replaces the order.                        description
(8)(8)                                     16
Order docs ↗                               external docs
(8)(4)(4)(8)                               24 ── block 1 → block 2: 8 + 4 | 4 + 8
Security                                   h2
(8)(8)                                     16
‹ oauth  api_key ›                         toolbar
(8)(8)                                     16
┌ oauth  OAuth 2.0 ───────────┐            card 1 (its border; inside: §6)
└─────────────────────────────┘
(8)(8)                                     16 between cards
┌ api_key  API Key ───────────┐            card 2
└─────────────────────────────┘
(8)(4)(4)(8)                               24 ── block 2 → block 3
Extensions                                 h2
(8)                                        8 + JSO row's own inset
· x-rate-limit  100                        JSO viewer
(4)(4)(8)                                  JSO inset + 16 = 20 ── block 3 → block 4: 0 + 4 | 4 + 8
Request                                    h2
(8)(8)                                     16
Path Parameters                            h3
(8)                                        8 + JSON Schema inset
· orderId* string                          JSON Schema viewer
(8)                                        inset + 8 ── sub-block → sub-block
Query Parameters
(8)
· dryRun boolean
(8)
Body*  [application/json]
(8)
· Type object
(4)(4)(8)                                  inset + 16 = 20 ── block 4 → block 5
Responses  [200] [400]                     h2 + code selector
(8)(8)                                     16
Updated order.                             response description
(8)(8)                                     16
Headers                                    h3
(8)
· ETag string
(8)
Body  [application/json]
(8)
· Type object                              viewer bottom: nested viewer's own inset
```

### 4.2 A row that changed alone — 8 / 8 inside a block, 8 / 12 at a top-level edge

`operation/09-description-changed` (description replaced, annotation; the description is the last
row of block 1, so the 24px gap to Security is below it):

```text
      [POST] /orders/{orderId}       │    [POST] /orders/{orderId}
      (8)                            │    (8)                       address's half
▌a ▒Y (8)                            │ ▒Y (8)                       description's half
▌a ▒Y Replaces the order.            │ ▒Y Replaces the whole order.
▌a ▒Y (8)                            │ ▒Y (8)                       description's half
▌a ▒Y (4)                            │ ▒Y (4)                       upper level half: continues the description
      (4)                            │    (4)                       lower level half: continues Security
      (8)                            │    (8)                       Security's half
      Security                       │    Security
```

Band: 8 above, 12 below (a middle row such as the address would be 8 / 8).

`operation/05-operation-id-removed` (a middle row of block 1):

```text
      Update an order                │    Update an order
      (8)                            │    (8)
▌  ▒R (8)                            │ ░░ (8)
▌  ▒R updateOrder                    │ ░░
▌  ▒R (8)                            │ ░░ (8)
      (8)                            │    (8)
      [POST] /orders/{orderId}       │    [POST] /orders/{orderId}
```

`request-body/03-required-added` (the Body title row is yellow; Body is not the first sub-block):

```text
      · session string               │    · session string          Cookies' viewer: its own inset, half 0
▌  ▒Y (8)                            │ ▒Y (8)                       Body title's half
▌  ▒Y Body  [application/json]       │ ▒Y Body*  [application/json] [required]
▌  ▒Y (8)                            │ ▒Y (8)                       Body title's half
      (8)                            │    (8)                       description's half
      New order state.               │    New order state.
```

`responses/15-code-case-renamed` (the Responses h2 is yellow; it starts block 5):

```text
      · Type object                  │    · Type object             Request's last nested row (half 0)
      (4)                            │    (4)                       upper level half: continues the nested viewer (Request unchanged)
▌  ▒Y (4)                            │ ▒Y (4)                       lower level half: continues the Responses title
▌  ▒Y (8)                            │ ▒Y (8)                       Responses title's half
▌  ▒Y Responses [200] [400] [4xx]    │ ▒Y Responses [200] [400] [4XX]
▌  ▒Y (8)                            │ ▒Y (8)
      (8)                            │    (8)
      Updated order.                 │    Updated order.
```

### 4.3 A wholly added / removed block

`query-parameters/19-all-added` (a sub-block inside Request):

```text
      · orderId* string              │    · orderId* string         Path Parameters' viewer
▌n ░░ (8)                            │ ▒G (8)                       Query Parameters title's half
▌n ░░                                │ ▒G Query Parameters
▌n ░░ (8)                            │ ▒G (8)
▌n ░░ ·                              │ ▒G · dryRun boolean          nested rows (painted by JSON Schema)
▌n ░░ ·                              │ ▒G · expand string
      (8)                            │    (8)                       Headers title's half
      Headers                        │    Headers
```

A top-level block wholly added — the Security section added between block 1 and Extensions:

```text
      Replaces the order.            │    Replaces the order.
      (8)                            │    (8)                       description's half
      (4)                            │    (4)                       upper level half: continues the description
▌n ░░ (4)                            │ ▒G (4)                       lower level half: continues the Security title
▌n ░░ (8)                            │ ▒G (8)                       Security title's half
▌n ░░                                │ ▒G Security
   …                                 │    …
▌n ░░ └ card ┘                       │ ▒G └ card ┘
▌n ░░ (8)                            │ ▒G (8)                       card's half
▌n ░░ (4)                            │ ▒G (4)                       upper level half: continues the card
      (4)                            │    (4)                       lower level half: continues the Extensions title
      (8)                            │    (8)
      Extensions                     │    Extensions
```

A removed block directly above an added one (both at the operation level):

```text
▌  ▒R (8)                            │ ░░ (8)                       last element's half of the removed block
▌  ▒R (4)                            │ ░░ (4)                       upper level half
▌n ░░ (4)                            │ ▒G (4)                       lower level half
▌n ░░ (8)                            │ ▒G (8)
▌n ░░                                │ ▒G Extensions
```

### 4.4 Cards

A card wholly added after an unchanged one:

```text
      └ card 1 ┘                     │    └ card 1 ┘
      (8)                            │    (8)                       card 1's half
▌n ░░ (8)                            │ ▒G (8)                       card 2's half
▌n ░░ ┌ card 2 ┐                     │ ▒G ┌ card 2 ┐
```

## 5. What this does to the open questions

- **block-separators §10 (asymmetric band of a row that changed alone):** gone inside a block
  (8 / 8); at a top-level block edge it is 8 / 12 by choice — each 24px gap splits into two halves
  that continue their neighbours (§3) — instead of the pre-2026-10-16 4 / 10.
- **Your earlier request (separators between the block-1 rows, then 8 = 4 + 4, now 16 = 8 + 8):**
  this is R4 for block 1.
- **Operation ID padding (§9.1):** gone — the row is 16px from its neighbours like every row.

## 6. Security cards (inside)

From outside a card is one element with an 8px half (§2). Inside, the pre-2026-10-16 frame rows
(24px, border in the middle) lost their outer 12px — that space is now the card's half in the
separator outside. They keep the inner part: **`cardInnerInset`** between the border and the first /
last content row's own 8px half. Default **8** (not doubled), so border → content is **16px** (12px
with the 4px baseline). Rows inside a card follow R4 with level gap 0: 16px between rows and between
card segments (flow parts) — see D3.

## 7. Configuration

All numbers and rules in one object, replacing `rowPadding` / `blockGap`. The engine is shared with
the Security sections of other API types (AsyncAPI), so the object has a spec-neutral part
(next-data-model `model/abstract/layout/spacing-config.ts`: `LayoutSpacingConfig<TLevel>`,
`DEFAULT_LAYOUT_SPACING_CONFIG` with the shared levels `security` / `section` / `card`) and an
OpenAPI part (`model/openapi/layout/spacing-config.ts`: `OpenApiSpacingConfig` =
`LayoutSpacingConfig<OpenApiLayoutLevel>` + the OpenAPI-only entries; `DEFAULT_OPENAPI_SPACING_CONFIG`
spreads the shared defaults). Each root viewer provides its config through the viewer's
`LayoutSpacingContext` (OpenAPI: `DEFAULT_OPENAPI_SPACING_CONFIG`; AsyncAPI:
`DEFAULT_LAYOUT_SPACING_CONFIG`); the shared `StackLayout` and the security cards read only that.
The doubled numbers are an OpenAPI override (`halfGap` and `levelGap.operation` in
`DEFAULT_OPENAPI_SPACING_CONFIG`); the shared defaults keep `halfGap` 4 / 4 / 0, so AsyncAPI Security
sections are unchanged. Together (OpenAPI defaults):

```typescript
type OpenApiSpacingConfig = {
  /** R2: owned half-gap above and below, per element kind (px). */
  readonly halfGap: { readonly row: number, readonly card: number, readonly nested: number }   // 8 / 8 / 0 (shared default 4 / 4 / 0)
  /** R3: extra gap between two siblings, per container level (px); split in two halves that continue the neighbours. */
  readonly levelGap: {
    readonly operation: number          // 8  — blocks 1–5
    readonly operationHeader: number    // 0  — rows of block 1
    readonly security: number           // 0  — Security header, toolbar, cards
    readonly request: number            // 0  — Request sub-blocks (D1)
    readonly responses: number          // 0  — Responses sub-blocks (D1)
    readonly section: number            // 0  — rows of a parameter group / Body / Extensions
    readonly card: number               // 0  — card rows and segments (D3)
  }
  /** Border → first / last card content row's half (px). */
  readonly cardInnerInset: number       // 8
  /** A nested JSON Schema viewer's first-row inset under an OpenAPI row (px; CSS --separator-layout-nested-viewer-inset). */
  readonly nestedViewerInset: number    // 4
  /** Keep the first / last element's half at the viewer's top / bottom. */
  readonly viewerEdges: boolean         // true (D5)
  /** Collapsible sections: expander column width and the gap after it (px; collapsible-sections.md). */
  readonly sectionExpander: { readonly width: number, readonly gap: number }   // 16 / 8
  /** Unchanged rules (block-separators §7.3): */
  readonly splitBands: (above, below, height) => LayoutBand[]
  readonly splitBadge: (above, below, height) => LayoutBadgeSegment[]
  readonly frameRowBadge: boolean
}
// Shared part (LayoutSpacingConfig): halfGap, levelGap (security / section / card), cardInnerInset,
// splitBands, splitBadge, frameRowBadge. OpenAPI only: the levels operation / operationHeader /
// request / responses, nestedViewerInset, viewerEdges, sectionExpander.
```

Changing a gap later is a one-number edit: e.g. `levelGap.request: 8` adds 8px between Request
sub-blocks (as between top-level blocks); `halfGap.row: 6` gives 12px between rows everywhere.

## 8. Algorithm

Data layer (`model/abstract/layout/`, OpenAPI part in `model/openapi/layout/`):

| Piece | Change |
| --- | --- |
| `LayoutBlockEdge` | `{ halfGap: number, tones, badge }` — `halfGap` from the element kind (R2); `tones` / `badge` the element's own (row diff, whole card; nested viewer: its owner's whole add / remove) |
| `BlockEdges` (generic) | `row(painted)`, `card(card)`, `nested(owner)`, `single(edge)`, `container(children)`, `sectionTitleRow` |
| `SecurityBlockEdges extends BlockEdges` | `toolbarRow`, `titleRow` (`model/security/block-edges.ts`) |
| `OpenApiBlockEdges extends BlockEdges` | `bodyElements(title, description, selectedMediaType, state)` (the Body's elements, decided once for the parent and the Body) and `body(elements)` (their outer edges); painted-row accessors per OpenAPI row kind (`operationHeaderRow`, `responsesTitleRow`, `requestBodyTitleRow`, `responseBodyTitleRow`, `descriptionRow`) |
| Planner `plan(blocks, level, config, { outerHalves })` | between two siblings, per side: `[ owned(above.tail), splitBands(above, below, levelGap[level]), owned(below.head) ]` — the default `splitBands` gives two halves in the neighbours' tones (one piece when equal); empty bands dropped, equal neighbours merged; the badge stub the same way (`splitBadge`). `outerHalves` (the root with `viewerEdges`, the inside of a card) adds the first element's upper half and the last element's lower half |
| Frame rows | `cardInnerInset` high, border at the outer edge; outside space comes from the card's half in the separator |

Viewer (`OpenApiOperationViewer/`):

| Piece | Change |
| --- | --- |
| Containers | every row is its own block of its container (block 1: one block per header row; Security: header, toolbar, each card) — no "rows touching" any more |
| `StackLayout` | `+ level`; renders the leading / trailing separators the planner returns |
| CSS | OpenAPI row padding rules (`--openapi-row-padding`, `openapi-operation-id-row`) removed; nested-viewer first-row override stays (it is the viewer's ≥ 4 inset) |
| `SeparatorRow` / `BadgeStub` | render any stack of bands; frame positions passed as resolved values |
| Memoisation | the planner is pure (no caches); every separator carries a `signature` of its bands and badge segments; `SeparatorRow` (memo on `signature` + frame positions) and `SecurityFrameRow` are `memo` with value comparators, so React skips them on re-render |

## 9. Cost

| Aspect | Estimate |
| --- | --- |
| Data layer | medium: new edge shape, planner with levels and three-part separators, config, frame rows; unit tests (band stacks for every §4 example, config overrides) |
| Viewer | medium: header / Security / card rows as blocks, `level` on every `StackLayout`, CSS padding removed |
| Runtime | negligible (a few more separator rows per operation: one per row instead of one per block) |
| Screenshots | **all** OpenAPI suites, plain and diffs (every gap changes); JSON Schema / JSO suites unchanged |
| Risk | nested viewers' inset differs slightly (JSON Schema 4px, JSO ≈ 5px from centring) — within "≥ 4"; verified by the vertical spacing audit |

Roughly one working day including tests, the audit and screenshot regeneration.

## 10. Decision points

As decided on 2026-10-16, with the 4px baseline numbers (doubled since, see the status note; the
choices themselves still hold: 16px between sub-blocks, cards and flow parts, border → content 16px,
the viewer keeps its 8px top / bottom).

1. **Sub-blocks inside Request / Responses** (Path Parameters → Query Parameters, Headers → Body):
   **8px** as the requirements read (today 20), or `levelGap.request / responses = 4` → 12px.
2. **Between cards:** **8px** (4 + 4, each card ≥ 4 around it — recommended), or exactly 4px
   (`halfGap.card = 2`, which also makes toolbar → first card 6px).
3. **Inside a card:** flow parts / required-scopes list **8px** apart (rule, level gap 0), or keep a
   larger gap (`levelGap.card = 4` → 12px).
4. **Card inner inset:** border → content **12px** as today (`cardInnerInset = 8`), or tighter.
5. **Viewer top / bottom:** keep the first / last element's **4px** half (as today's row padding) —
   recommended — or start flush.
