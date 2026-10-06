import {
  LayoutSide,
} from "../../abstract/layout-side"
import { DdlApiTreeNodeWithDiffs } from "../types/aliases"
import { DdlApiTreeNodeKinds } from "../types/node-kind"
import {
  buildCommaSeparatedListSideSegments,
  resolveListSideItems,
  SideListDisplay,
  SideListDisplayKinds,
} from "../../abstract/tree-with-diffs/list-side-display"
import {
  DdlApiIndexPartNameDiffs,
  DdlApiIndexPropertyRowDiffs,
} from "./property-row-diffs.types"

/**
 * Index part-name diffs: the comma-separated column list in an index subheader
 * (`(c1, c2)`) always renders as a merged whole-list diff, never per-part.
 */
export class DdlIndexPartNamesResolver {
  private static takeDiffs(
    node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.INDEX>,
  ): DdlApiIndexPartNameDiffs | undefined {
    const partNameDiffs = (node.diffs as DdlApiIndexPropertyRowDiffs).partNameDiffs
    if (!partNameDiffs || Object.keys(partNameDiffs).length === 0) {
      return undefined
    }
    return partNameDiffs
  }

  public static resolveSideDisplay(
    node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.INDEX>,
    layoutSide: LayoutSide,
  ): SideListDisplay {
    const mergedPartNames = node.value()?.partNames ?? []
    const partNameDiffs = DdlIndexPartNamesResolver.takeDiffs(node)

    const sideItems = partNameDiffs
      ? resolveListSideItems(mergedPartNames, partNameDiffs, layoutSide)
      : mergedPartNames.map((text) => ({ text }))

    const segments = buildCommaSeparatedListSideSegments(sideItems, "tight")

    if (segments.length === 0) {
      return {
        kind: SideListDisplayKinds.NO_DIFFS,
        text: "",
      }
    }

    return {
      kind: SideListDisplayKinds.PARTIAL_DIFFS,
      segments,
    }
  }
}
