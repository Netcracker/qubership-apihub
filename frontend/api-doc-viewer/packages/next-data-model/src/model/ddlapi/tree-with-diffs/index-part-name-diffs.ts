import {
  LayoutSide,
} from "../../abstract/layout-side"
import { DdlApiTreeNodeWithDiffs } from "../types/aliases"
import { DdlApiTreeNodeKinds } from "../types/node-kind"
import {
  buildCommaSeparatedListSideSegments,
  DdlListSideSegment,
  resolveListSideItems,
} from "./list-side-display"
import {
  DdlApiIndexPartNameDiffs,
  DdlApiIndexPropertyRowDiffs,
} from "./property-row-diffs.types"

export type DdlIndexPartNamesSideDisplay =
  | {
    readonly kind: "plain"
    readonly text: string
  }
  | {
    readonly kind: "segmented"
    readonly segments: readonly DdlListSideSegment[]
  }

export function takeIndexPartNameDiffs(
  node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.INDEX>,
): DdlApiIndexPartNameDiffs | undefined {
  const partNameDiffs = (node.diffs as DdlApiIndexPropertyRowDiffs).partNameDiffs
  if (!partNameDiffs || Object.keys(partNameDiffs).length === 0) {
    return undefined
  }
  return partNameDiffs
}

export function resolveIndexPartNamesSideDisplay(
  node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.INDEX>,
  layoutSide: LayoutSide,
): DdlIndexPartNamesSideDisplay {
  const mergedPartNames = node.value()?.partNames ?? []
  const partNameDiffs = takeIndexPartNameDiffs(node)

  const sideItems = partNameDiffs
    ? resolveListSideItems(mergedPartNames, partNameDiffs, layoutSide)
    : mergedPartNames.map((text) => ({ text }))

  const segments = buildCommaSeparatedListSideSegments(sideItems, "tight")

  if (segments.length === 0) {
    return {
      kind: "plain",
      text: "",
    }
  }

  return {
    kind: "segmented",
    segments,
  }
}
