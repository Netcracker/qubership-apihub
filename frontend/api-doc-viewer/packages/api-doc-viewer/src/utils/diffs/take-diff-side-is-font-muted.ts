import { LayoutSide, ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide"
import { ChangedPropertyMetaData } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"

export function takeDiffSideIsFontMuted(
  diff: ChangedPropertyMetaData | undefined,
  layoutSide: LayoutSide,
): boolean {
  if (!diff) {
    return false
  }

  const styles = layoutSide === ORIGIN_LAYOUT_SIDE
    ? diff.styles.before
    : diff.styles.after

  return styles.isFontMuted === true
}
