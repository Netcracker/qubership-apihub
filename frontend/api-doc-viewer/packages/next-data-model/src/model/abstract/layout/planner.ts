import { DiffSide } from "../diff-side"
import { RowDiffsNode } from "../tree-with-diffs/row-diffs-base"
import { BlockEdges } from "./block-edges"
import { LayoutSpacingConfig } from "./spacing-config"
import {
  LayoutBadgeSegment,
  LayoutBand,
  LayoutBlock,
  LayoutBlockEdge,
  LayoutFrameRow,
  LayoutItem,
  LayoutPlanOptions,
  LayoutSeparatorRow,
  LayoutSideTone,
} from "./types"

/** Adjacent pieces of the same look become one piece; zero-height pieces are dropped. */
function merge<T extends { readonly height: number }>(pieces: readonly T[], same: (a: T, b: T) => boolean): T[] {
  const result: T[] = []
  for (const piece of pieces) {
    if (piece.height <= 0) {
      continue
    }
    const last = result[result.length - 1]
    if (last && same(last, piece)) {
      result[result.length - 1] = { ...last, height: last.height + piece.height }
    } else {
      result.push(piece)
    }
  }
  return result
}

/** `4yellow,8-`: heights with their tone / badge type (`-` = none). */
function signatureOf(pieces: readonly { readonly height: number, readonly look: string | undefined }[]): string {
  return pieces.map(piece => `${piece.height}${piece.look ?? '-'}`).join(',')
}

/**
 * One pass over the visible blocks of one container level: blocks in the given (configured) order,
 * a separator row between every two of them (and, with `outerHalves`, before the first / after the
 * last). A separator = the upper element's own half-gap + the level gap (two halves continuing the
 * neighbours) + the lower element's own half-gap, per side. Pure; the consumer renders the items.
 * Design: docs/design/openapi/features/vertical-gaps.md -> "Algorithm".
 */
export class LayoutPlanner {
  public static plan<TPayload, TLevel extends string>(
    blocks: readonly LayoutBlock<TPayload>[],
    level: TLevel,
    config: LayoutSpacingConfig<TLevel>,
    options: LayoutPlanOptions = {},
  ): LayoutItem<TPayload>[] {
    const items: LayoutItem<TPayload>[] = []
    const pushSeparator = (id: string, above: LayoutBlockEdge | undefined, below: LayoutBlockEdge | undefined): void => {
      const separator = LayoutPlanner.separator(above, below, level, config)
      if (separator) {
        items.push({ type: 'separator', id, separator })
      }
    }
    const first = blocks[0]
    const last = blocks[blocks.length - 1]
    if (options.outerHalves && first) {
      pushSeparator(`^${first.id}`, undefined, first.head)
    }
    blocks.forEach((block, index) => {
      const previous = blocks[index - 1]
      if (previous) {
        pushSeparator(`${previous.id}|${block.id}`, previous.tail, block.head)
      }
      items.push({ type: 'block', block })
    })
    if (options.outerHalves && last) {
      pushSeparator(`${last.id}$`, last.tail, undefined)
    }
    return items
  }

  /**
   * The separator between `above` and `below` (either may be absent at a level's outer edge: then
   * only the present element's half, no level gap). `undefined` when it would be 0px high.
   */
  public static separator<TLevel extends string>(
    above: LayoutBlockEdge | undefined,
    below: LayoutBlockEdge | undefined,
    level: TLevel,
    config: LayoutSpacingConfig<TLevel>,
  ): LayoutSeparatorRow | undefined {
    const levelGap = above && below ? config.levelGap[level] : 0
    const half = (edge: LayoutBlockEdge | undefined): number => edge ? config.halfGap[edge.kind] : 0
    const sideBands = (side: DiffSide): LayoutBand[] => {
      const tone = (edge: LayoutBlockEdge | undefined): LayoutSideTone => edge?.tones[side]
      return merge<LayoutBand>([
        { height: half(above), tone: tone(above) },
        ...(levelGap > 0 ? config.splitBands(tone(above), tone(below), levelGap) : []),
        { height: half(below), tone: tone(below) },
      ], (a, b) => a.tone === b.tone)
    }
    const badge = merge<LayoutBadgeSegment>([
      { height: half(above), type: above?.badge },
      ...(levelGap > 0 ? config.splitBadge(above?.badge, below?.badge, levelGap) : []),
      { height: half(below), type: below?.badge },
    ], (a, b) => a.type === b.type)
    const before = sideBands('before')
    const after = sideBands('after')
    const height = before.reduce((sum, band) => sum + band.height, 0)
    if (height <= 0) {
      return undefined
    }
    return LayoutPlanner.separatorRow(height, before, after, badge)
  }

  /** A card opening / closing row (inside the border): whole-card tones and badge stub. */
  public static frameRow<TLevel extends string>(card: RowDiffsNode, config: LayoutSpacingConfig<TLevel>): LayoutFrameRow {
    const edge = BlockEdges.card(card)
    return {
      height: config.cardInnerInset,
      tones: edge.tones,
      ...(config.frameRowBadge && edge.badge ? { badge: edge.badge } : {}),
    }
  }

  private static separatorRow(
    height: number,
    before: readonly LayoutBand[],
    after: readonly LayoutBand[],
    badge: readonly LayoutBadgeSegment[],
  ): LayoutSeparatorRow {
    const signature = [
      signatureOf(before.map(band => ({ height: band.height, look: band.tone }))),
      signatureOf(after.map(band => ({ height: band.height, look: band.tone }))),
      signatureOf(badge.map(segment => ({ height: segment.height, look: segment.type }))),
    ].join('/')
    return { height, before, after, badge, signature }
  }
}
