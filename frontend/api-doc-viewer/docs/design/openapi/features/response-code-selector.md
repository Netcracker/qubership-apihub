# Response-code selector (Selector tones)

The response codes in the **Responses** header are the shared `Selector` with a per-option
**tone**. Status: **implemented** (first iteration; see [../notes/2026-10-implementation-decisions.md](../notes/2026-10-implementation-decisions.md)).

## Why not a new component

`Selector` (`shared-components/Selector/Selector.tsx`) already owns option rendering, selection,
per-side visibility of wholly added / removed options, change markers, and border-shadow diff
chrome. The response codes need exactly that plus color. A tone is one optional class on
`SelectorOption`; every existing caller (AsyncAPI sections, bindings, combiner selector rows)
keeps the default and does not change.

## API change

```typescript
// shared-components/Selector/Selector.tsx
export type SelectorOption<N extends ITreeNode, V extends object | null = object | null> = {
  title: ReactNode | ((layoutSide: LayoutSide) => ReactNode)
  node: N
  testId?: string
  toneClass?: string               // color class from the caller's color config; undefined = neutral grey
  diffs?: NodeDiffs<V>
  diffsSummary?: NodeDiffsSummary
  descendantDiffsSummary?: NodeDescendantDiffsSummary
}
```

The button gets `toneClass` as one more class (only when set, so neutral markup stays byte-identical
and existing screenshots do not move). `Selector` holds no tone colors: the caller's color file does
([../../shared/features/color-config.md](../../shared/features/color-config.md)).

## Mapping (`utils/openapi/response-code-tone.ts`)

| `OpenApiResponseCodeClass` | Tone class | Color |
| --- | --- | --- |
| `1XX` | `openapi-response-code_1xx` | violet |
| `2XX` | `openapi-response-code_2xx` | green |
| `3XX` | `openapi-response-code_3xx` | sky blue |
| `4XX` | `openapi-response-code_4xx` | amber |
| `5XX` | `openapi-response-code_5xx` | red |
| `default`, `unknown` | — | neutral grey |

The class comes from next-data-model (`OpenApiResponseCode.resolveClass`, stored on the `response`
node value); the viewer only maps class → tone class. Ranges (`2XX`) and explicit codes (`200`) share the
class color.

## Styles (`Selector.css` neutral, `shared-styles/colors/openapi.css` toned)

| State | Neutral (unchanged) | Toned |
| --- | --- | --- |
| Untouched | white background, `#8F9EB4` border and text | transparent background, tone border and text |
| Hovered | `#D5DCE3` background | pale tone tint background, tone border and text |
| Selected | `#D5DCE3` background, `#626D82` text | **solid** tone background and border, white text |

| Code class | Untouched (background / text) | Hovered (background / text) | Selected (background / text) |
| --- | --- | --- | --- |
| `1XX` | transparent / `#9B7BF7` | `#ECE6FE` / `#9B7BF7` | `#9B7BF7` / `#FFFFFF` |
| `2XX` | transparent / `#00BB5B` | `#D0FAD4` / `#00BB5B` | `#00BB5B` / `#FFFFFF` |
| `3XX` | transparent / `#4FC0F8` | `#D6F2FE` / `#4FC0F8` | `#4FC0F8` / `#FFFFFF` |
| `4XX` | transparent / `#FFB02E` | `#FFF4CC` / `#FFB02E` | `#FFB02E` / `#FFFFFF` |
| `5XX` | transparent / `#FF5260` | `#FFC8C1` / `#FF5260` | `#FF636F` / `#FFFFFF` |

`2XX`, `4XX` and `5XX` are the product palette. `1XX` and `3XX` follow the same scheme: `3XX` reuses
the POST badge sky blue (redirection is neutral, informative), `1XX` takes a violet of the same
lightness so it differs from both `3XX` and the neutral grey of `default`. The border always
matches the text (untouched / hovered) or the fill (selected).

Rules:

1. **Selected is solid, never a pale tint.** The diff palette uses pale green / red / yellow
   backgrounds for added / removed / changed rows (`--diffs-background-*`); a pale green selected
   `2XX` would read as "added". Solid fills cannot be confused with diff chrome.
2. **Diff chrome stays on top.** Diff border shadows (`DiffsClassesBuilder.borderShadow`) are
   `box-shadow`, toned borders are `border-color` — both stay visible together. The change marker
   (`roundMarker`) is unchanged. Verify every tone × {idle, selected} × {add, remove, replace marker}
   in a Storybook story before snapshotting.
   **Exception — a wholly added / removed code** (its own diff, not inherited): no tone at all; the
   option keeps the neutral look and shows only its green / red border shadow, so the change reads
   as a change and not as a code class (`OpenApiRowDiffs.Response.keepsCodeTone`). A renamed code
   keeps its tone; its text gets the yellow highlighter.
3. **Font sizes stay with the variant** (`_primary` 20px, `_secondary` 15px); the Responses header
   uses `Secondary`.

## Strip (arrow buttons)

The codes are one non-wrapping line (`Selector` `noWrap`) in the shared `ArrowScrollStrip`
(test ids `response-codes-strip`, `response-codes-arrow-{left,right}`), placed in the `Responses`
title row's subheader: `Responses ‹ [200] [404] … ›`. The strip takes the rest of the row; both
arrows are always shown, disabled while every code fits. Behaviour, styles, and tests:
[../../shared/features/arrow-scroll-strip.md](../../shared/features/arrow-scroll-strip.md).

## Diffs

Unchanged `Selector` semantics, fed from `response` nodes:

| Case | Origin side | Changed side |
| --- | --- | --- |
| Response added | option hidden | option shown, green border shadow, **no** change marker |
| Response removed | option shown, red border shadow, **no** change marker | option hidden |
| Code renamed (`4xx` → `4XX`) | `4xx` (title function per side), no marker for the rename itself | `4XX` |
| Changes inside the response | change marker = strongest type of the inner changes only, from the aggregated diff set (`OpenApiRowDiffs.Response.takeChangesMarkerSummary`, passed as `descendantDiffsSummary`; `diffsSummary` is not passed) — rules in [../entities/responses.md](../entities/responses.md#change-markers-on-response-code-options) | same |

## Tests

- Unit test (`packages/api-doc-viewer/tests/openapi-viewer-config.test.ts`): every class → tone
  class (CSS-free module), and the colors of every state read from `openapi.css` as text.
- Stories `OpenAPI Operation Suite/OAS 3.0/Document Structure` (`oas30/structure/04-response-code-order`) and `…/OAS 3.0/Fields/Responses/*` (`oas30/fields/responses/{2xx,3xx,4xx,5xx}/*`, one sub-group per code kind):
  all classes, ranges, `default`, canonical order; ITs click `response-code-404` and
  `response-code-default` to capture selected Warning and Neutral states.
- Strip: `OpenAPI Operation Suite (Arrow Buttons)/Response Codes` and
  `OpenAPI Operation Diffs Suite (Arrow Buttons)/Response Codes` (one code, every code: left /
  middle / right), see [../../shared/features/arrow-scroll-strip.md](../../shared/features/arrow-scroll-strip.md#tests).
- Regression: AsyncAPI section / bindings and JSON Schema combiner screenshot ITs must not change.

## Related documents

- [../entities/responses.md](../entities/responses.md)
