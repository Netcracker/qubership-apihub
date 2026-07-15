import { HighlightVariant } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { DiffType } from "@netcracker/qubership-apihub-api-diff";

export class DiffsClassesBuilder {
  public static highlighter(variant: HighlightVariant | undefined) {
    if (!variant) {
      return ''
    }
    return `diffs-highlighter_${variant}`
  }

  public static background(variant: HighlightVariant | undefined) {
    if (!variant) {
      return ''
    }
    return `diffs-background_${variant}`
  }

  public static borderShadow(variant: HighlightVariant | undefined) {
    if (!variant) {
      return ''
    }
    return `diffs-border-shadow_${variant}`
  }

  public static roundMarker(variant: DiffType | undefined) {
    if (!variant) {
      return ''
    }
    return `diffs-round-marker_${variant}`
  }

  public static fontMuted() {
    return `diffs-font-muted`
  }
}