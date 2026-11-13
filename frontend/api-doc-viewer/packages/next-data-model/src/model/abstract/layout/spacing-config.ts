import { DiffType } from "@netcracker/qubership-apihub-api-diff"
import { LayoutBadgeSegment, LayoutBand, LayoutElementKind, LayoutSideTone, SharedLayoutLevel } from "./types"

/**
 * The numbers and rules of a separator layout, in one object. Its rows have no vertical padding:
 * every gap is a separator row = the upper element's half-gap + the level gap of the container + the
 * lower element's half-gap. `TLevel` names the container levels of the API type (at least the
 * shared ones); an API type extends this with its own entries (OpenAPI: `OpenApiSpacingConfig`).
 * Design: docs/design/openapi/features/vertical-gaps.md -> "Configuration".
 */
export type LayoutSpacingConfig<TLevel extends string = SharedLayoutLevel> = {
  /** Half-gap each element owns above and below (px), per element kind. */
  readonly halfGap: Readonly<Record<LayoutElementKind, number>>
  /** Extra gap between two siblings of a level (px), split into halves that continue the neighbours. */
  readonly levelGap: Readonly<Record<TLevel, number>>
  /** Height of a card's opening / closing row, between the border and the first / last row's half (px). */
  readonly cardInnerInset: number
  /** Whether card frame rows show the whole card's badge stub when it is wholly added / removed. */
  readonly frameRowBadge: boolean
  /** The bands of one side of a level gap of `height`, between elements of tones `above` and `below`. */
  readonly splitBands: (above: LayoutSideTone, below: LayoutSideTone, height: number) => LayoutBand[]
  /** The badge stub of a level gap of `height`, between elements with badges `above` and `below`. */
  readonly splitBadge: (above: DiffType | undefined, below: DiffType | undefined, height: number) => LayoutBadgeSegment[]
}

/** One piece if both neighbours look the same, else each half takes its neighbour's look. */
function splitInHalves<T>(above: T, below: T, height: number): { height: number, value: T }[] {
  return above === below
    ? [{ height, value: above }]
    : [{ height: height / 2, value: above }, { height: height / 2, value: below }]
}

/** The shared defaults: what a Security section looks like in every API type. */
export const DEFAULT_LAYOUT_SPACING_CONFIG: LayoutSpacingConfig = {
  // A nested viewer's first / last row already insets its text (JSON Schema row body, JSO centring).
  halfGap: { row: 4, card: 4, nested: 0 },
  // 4 + 4 = 8 between two elements of a shared level.
  levelGap: { security: 0, section: 0, card: 0 },
  // Border -> content 8 + the row's own 4 = 12.
  cardInnerInset: 8,
  frameRowBadge: true,
  splitBands: (above, below, height) => splitInHalves(above, below, height).map(({ height, value }) => ({ height, tone: value })),
  splitBadge: (above, below, height) => splitInHalves(above, below, height).map(({ height, value }) => ({ height, type: value })),
}
