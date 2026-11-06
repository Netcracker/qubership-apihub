# Arrow scroll strip (previous / next arrow buttons)

A horizontal line of options (selector buttons) that does not fit its row scrolls inside a
**strip** framed by two arrow buttons: `‹ [option] [option] … ›`. The native scrollbar is hidden;
the arrows replace it. Status: **implemented**.

| Toolbar | API type | Row | Strip test-id prefix |
| --- | --- | --- | --- |
| Security toolbar (alternatives) | OpenAPI (AsyncAPI server security later) | its own row under the `Security` title — [../../openapi/entities/security.md](../../openapi/entities/security.md#security-toolbar) | `security-toolbar` |
| Response codes | OpenAPI | the subheader of the `Responses` title row — [../../openapi/features/response-code-selector.md](../../openapi/features/response-code-selector.md) | `response-codes` |

## Behaviour

| Item | Rule |
| --- | --- |
| Line | the options never wrap: one line (`Selector` `noWrap`); an option never grows wider than the strip, its label is cropped with an ellipsis (one character + `…` stay visible) |
| Native scrollbar | hidden (`scrollbar-width: none` and `::-webkit-scrollbar`); the strip still scrolls natively (touchpad, shift + wheel) and the arrows follow |
| Arrows shown | **always**, both of them, also when everything fits (then both disabled): the row never jumps when an option is added, removed, or the width changes |
| Left arrow | enabled when the strip is scrolled away from its left edge; disabled at the left edge |
| Right arrow | enabled while options are hidden past the right edge; disabled at the right edge |
| Click | scrolls by exactly **one option** in its direction: the next option hidden past the edge is aligned to that edge (`resolveStripScrollTarget`, `utils/common/strip-scroll.ts`); an option wider than the strip is aligned to its start |
| Animation | smooth: `scrollTo({ behavior: 'smooth' })`, no custom animation code |
| State updates | on scroll, on strip resize (`ResizeObserver`), and after every render (options added / removed / re-labelled); a state update is skipped when nothing changed |
| Diffs (side by side) | one strip per side, each with its own scroll position and arrows: the sides list different options (a wholly added option is hidden on the origin side, a removed one on the changed side) |
| Decoration inset | the strip keeps a 6px inset around the options, so diff round markers and border shadows (they overhang the option box by up to 5px) are never clipped at the strip edges. After the last option the room is the line's gap (8px) before a 1px spacer: an end margin on the last option does not count toward the scroll width, so it would leave the last option's border shadow clipped at the right edge |
| Row height | in its own row (security toolbar) the vertical inset is part of the row; in a title row's subheader (response codes) it overhangs the row (negative block margins), so the title row keeps its height (26.5px) |
| Selection | selecting an option does not scroll the strip |
| Absent side | no strip (no options, no arrows) on the side where the row's section does not exist: the Responses section, or a Security section wholly added / removed (`ResponsesTitleRow` via `OpenApiRowDiffs.NodeLevel.isPresentOnSide`; `SecurityToolbar` via its row diff) |

## Component

`ArrowScrollStrip` (`packages/api-doc-viewer/src/components/shared-components/ArrowScrollStrip/`) is
the universal wrapper: it owns the arrows, the hidden-scrollbar strip, the scroll state, and the
one-option step. It knows nothing about selectors or API types.

```tsx
<ArrowScrollStrip testIdPrefix="response-codes" overhangVertically={true}>
  <Selector options={options} … noWrap={true} />
</ArrowScrollStrip>
```

| Prop | Meaning |
| --- | --- |
| `children` | **one** element whose direct children are the options (the `Selector` line) |
| `testIdPrefix` | test ids `<prefix>-strip`, `<prefix>-arrow-left`, `<prefix>-arrow-right` |
| `decorationInset` | px kept around the options (default 6) |
| `overhangVertically` | the vertical inset overhangs the row instead of growing it (default `false`; `true` in a title-row subheader) |

The wrapper renders `flex min-w-0 flex-1 items-center`, so it takes the rest of whatever row it is
placed in: the security toolbar row, or the `Responses` title row after the title text. Applying it
to another toolbar is a two-line change: wrap the line, pass `noWrap` to `Selector`.

## Arrow button styles (shared icon-button config)

The arrows and the "three dots" trigger of [hiding unchanged nodes](hiding-unchanged-nodes.md)
(`ShowUnchangedTrigger`) are **icon buttons** and share one style config: the `icon-button` class
with CSS variables in `components/shared-styles/colors/icon-buttons.css`
([color-config.md](color-config.md)). Changing a value there changes both buttons.

| State | Background | Icon color | Radius |
| --- | --- | --- | --- |
| Enabled | transparent | `#0068FF` (`--icon-button-color`) | 6px |
| Enabled, hovered | `#ECEDEF` (`--icon-button-hover-background`) | `#0068FF` (`--icon-button-hover-color`) | 6px (`--icon-button-radius`) |
| Disabled (arrows only) | transparent | `#353C4E` (`--icon-button-disabled-color`) | — |

Disabled arrows have no hover, no pointer cursor, and take no clicks (`disabled`). The icons paint in
`currentColor` (`ChevronIcon`, `ThreeDotsIcon`), so the button decides the color. Padding is
per button: arrows `6px 8px` (24 × 24 with the 8 × 12 chevron; padding-top / -bottom 6px), the
three-dots trigger keeps `4px 6px 6px` (its icon sits 2px lower). The package-wide `button` rule of
`index.css` (padding, border, background) is overridden by the `icon-button` class.

## Tests

| Suite (Storybook root) | Cases per toolbar |
| --- | --- |
| `OpenAPI Operation Suite (Arrow Buttons)` | one option (both arrows disabled); every option (overflow: left / middle / right) |
| `OpenAPI Operation Diffs Suite (Arrow Buttons)` | one option → every option (the changed side overflows); every option → one option (the origin side overflows) |

Fixtures are programmatic (`packages/samples/src/openapi-arrow-buttons.ts`, catalogue in
`packages/samples/README.md`):

- **Security toolbar, every option** (OAS 3.1): one alternative per scheme kind (API key header /
  query / cookie, HTTP basic / bearer, OpenID Connect, OAuth 2.0 one flow / all flows, mutual TLS),
  then `A + B` alternatives of neighbouring kinds — the single-kind alternatives alone fit the
  1800px screenshot viewport.
- **Response codes, every option** (OAS 3.0): every IANA-registered HTTP status code except the
  reserved / deprecated / obsolete ones (305, 306, 418, 510) — 59 codes — plus the ranges
  `1XX`–`5XX` and `default`: 65 options, every tone.

An overflowing case is **one test with three screenshots** (`src/it/service/arrow-scroll-strip.ts`):

| State | How it is reached | Asserted |
| --- | --- | --- |
| Left | initial render | left arrow disabled, right arrow enabled |
| Middle | right-arrow clicks until the **median option** (number ⌊n / 2⌋ + 1 of the n options on that side) has reached the centre of the strip (its centre at or left of the strip's centre) — "visible" would not do: in the plain security case the median option is visible from the start | both arrows enabled |
| Right | right-arrow clicks until the right arrow is disabled | left arrow enabled, right arrow disabled |

A non-overflowing case is one screenshot with both arrows asserted disabled. Arrows are clicked in
the DOM (`element.click()`), not with the mouse, so no hover background is captured; after each
click the test waits until the smooth scroll has settled. Display mode `detailed` only: the strips
do not depend on it.

## Related documents

- [../../openapi/entities/security.md](../../openapi/entities/security.md#security-toolbar)
- [../../openapi/features/response-code-selector.md](../../openapi/features/response-code-selector.md)
- [color-config.md](color-config.md)
- [hiding-unchanged-nodes.md](hiding-unchanged-nodes.md)
