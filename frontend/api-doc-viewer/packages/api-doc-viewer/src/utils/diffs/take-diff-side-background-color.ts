import { LayoutSide, ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide"
import {
  ChangedPropertyMetaData,
  HighlightVariant,
} from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"

export function takeDiffSideBackgroundColor(
  diff: ChangedPropertyMetaData | undefined,
  layoutSide: LayoutSide,
): HighlightVariant | undefined {
  if (!diff) {
    return undefined
  }

  const styles = layoutSide === ORIGIN_LAYOUT_SIDE
    ? diff.styles.before
    : diff.styles.after

  return styles.backgroundColor
}
