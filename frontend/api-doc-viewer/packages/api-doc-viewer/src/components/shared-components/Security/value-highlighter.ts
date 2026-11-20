import { LayoutSide, ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide"
import { DiffsClassesBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities"
import { ChangedPropertyMetaData } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"

/** A text highlighter class on the side where a replaced value is shown; nothing for add / remove. */
export function resolveValueHighlighter(diff: ChangedPropertyMetaData | undefined, layoutSide: LayoutSide): string {
  const styles = layoutSide === ORIGIN_LAYOUT_SIDE ? diff?.styles.before : diff?.styles.after
  return DiffsClassesBuilder.highlighter(styles?.textHighlighterColor)
}
