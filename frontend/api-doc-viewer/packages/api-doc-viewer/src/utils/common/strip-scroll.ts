/** Horizontal extent of one option inside a scrolling strip (relative to the strip's content). */
export type StripItemBox = {
  readonly left: number
  readonly width: number
}

/** Tolerance for sub-pixel layout: an item within 1px of the viewport edge counts as visible. */
const EDGE_TOLERANCE = 1

/** Whether the strip can scroll further left / right (each arrow enabled or disabled). */
export type StripScrollState = {
  readonly canScrollLeft: boolean
  readonly canScrollRight: boolean
}

/** Whether the strip can scroll further left / right. */
export function resolveStripScrollState(scrollLeft: number, clientWidth: number, scrollWidth: number): StripScrollState {
  return {
    canScrollLeft: scrollLeft > EDGE_TOLERANCE,
    canScrollRight: scrollLeft + clientWidth < scrollWidth - EDGE_TOLERANCE,
  }
}

/**
 * Scroll position that reveals exactly one more option in a direction: the first option (not)
 * fully visible past the right edge is aligned to the right edge; the last option cut by the left
 * edge is aligned to the left edge. Revealing the first / last option scrolls to the very start /
 * end, and so does a click when only the room around the options is left to scroll: an enabled
 * arrow always moves the strip, and reaching an edge disables its arrow. `undefined` when the strip
 * is already at that edge.
 */
export function resolveStripScrollTarget(
  items: readonly StripItemBox[],
  scrollLeft: number,
  clientWidth: number,
  direction: 'left' | 'right',
  /** Room kept between a revealed option and the strip edge (option markers / border shadows). */
  edgeInset = 0,
  /** `scrollWidth - clientWidth`; omitted = the end of the last option plus `edgeInset`. */
  maxScrollLeft?: number,
): number | undefined {
  const last = items[items.length - 1]
  const end = maxScrollLeft ?? (last ? Math.max(0, last.left + last.width + edgeInset - clientWidth) : 0)
  if (direction === 'right') {
    const viewportRight = scrollLeft + clientWidth
    const nextIndex = items.findIndex(item => item.left + item.width + edgeInset > viewportRight + EDGE_TOLERANCE)
    const next = items[nextIndex]
    if (!next) {
      return end - scrollLeft > EDGE_TOLERANCE ? end : undefined
    }
    // An option wider than the strip (cropped by its max-width anyway) is aligned to its start; the
    // last option otherwise takes the room after it along (the very end).
    const isWide = next.width + 2 * edgeInset >= clientWidth
    const target = isWide
      ? next.left - edgeInset
      : nextIndex === items.length - 1 ? end : next.left + next.width + edgeInset - clientWidth
    const clamped = Math.min(end, Math.max(0, target))
    // No progress (a wide option already aligned): the rest of it, up to the end.
    return clamped > scrollLeft + EDGE_TOLERANCE ? clamped : end
  }
  const previousIndex = items.findLastIndex(item => item.left - edgeInset < scrollLeft - EDGE_TOLERANCE)
  if (previousIndex <= 0) {
    return scrollLeft > EDGE_TOLERANCE ? 0 : undefined
  }
  return Math.max(0, items[previousIndex].left - edgeInset)
}
