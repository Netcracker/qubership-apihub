import { LayoutSide, ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide"
import { ChangedPropertyMetaData, DiffStyles } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"

/** Matches the `isContentVisible`/`isHeaderVisible` default next-data-model's own aggregators use
 * (`DEFAULT_DIFF_STYLES`) when there is no diff to style against. */
const DEFAULT_DIFF_SIDE_STYLE: DiffStyles = {
  isContentVisible: true,
  isHeaderVisible: true,
}

/**
 * Resolves the single `DiffStyles` slice - text highlighter/background/border-shadow color, muted
 * font, content/header visibility - a diff-aware chip/badge/text-value component needs for one
 * layout side, in one call. Replaces the four near-identical `takeDiffSideXxx` getters (text
 * highlighter color, background color, border-shadow color, font-muted) that each repeated the
 * same "no diff -> default; pick `styles.before`/`styles.after`; read one field" shape - callers
 * destructure whichever fields they need, since `diff.styles.before`/`.after` is already a plain,
 * precomputed object and reading an unused field costs nothing extra.
 */
export function resolveDiffSideStyle(
  diff: ChangedPropertyMetaData | undefined,
  layoutSide: LayoutSide,
): DiffStyles {
  if (!diff) {
    return DEFAULT_DIFF_SIDE_STYLE
  }

  return layoutSide === ORIGIN_LAYOUT_SIDE ? diff.styles.before : diff.styles.after
}
