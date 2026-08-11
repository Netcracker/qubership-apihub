import { takeDiffSideBackgroundColor } from "@apihub/utils/diffs/take-diff-side-background-color"
import { takeDiffSideTextHighlighterColor } from "@apihub/utils/diffs/take-diff-side-text-highlighter-color"
import { LayoutSide } from "@apihub/types/internal/LayoutSide"
import { ChangedPropertyMetaData } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { DdlListSideSegment } from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/tree-with-diffs/property-row-diffs"
import { FC, memo } from "react"
import { DdlApiPropertyValue } from "../DdlApiPropertyValue/DdlApiPropertyValue"
import { DdlApiPropertyValueWithDiffs } from "../DdlApiPropertyValue/DdlApiPropertyValueWithDiffs"

export type DdlCommaSeparatedListDisplay =
  | {
    readonly kind: "plain"
    readonly text: string
  }
  | {
    readonly kind: "monolithic"
    readonly text: string
    readonly diff: ChangedPropertyMetaData
  }
  | {
    readonly kind: "segmented"
    readonly segments: readonly DdlListSideSegment[]
  }

type DdlCommaSeparatedListWithDiffsProps = {
  layoutSide: LayoutSide
  display: DdlCommaSeparatedListDisplay
}

function isCommaSeparatorSegment(segment: DdlListSideSegment): boolean {
  return segment.text === ", " || segment.text === ","
}

function renderSegmentedList(
  segments: readonly DdlListSideSegment[],
  layoutSide: LayoutSide,
) {
  const nodes: JSX.Element[] = []
  let pendingComma = false

  segments.forEach((segment, index) => {
    if (isCommaSeparatorSegment(segment)) {
      pendingComma = true
      return
    }

    if (pendingComma) {
      nodes.push(
        <span key={`comma-${index}`} className="mr-1">
          ,
        </span>,
      )
      pendingComma = false
    }

    nodes.push(renderListSegment(segment, index, layoutSide))
  })

  return nodes
}

function renderListSegment(
  segment: DdlListSideSegment,
  index: number,
  layoutSide: LayoutSide,
) {
  if (segment.diff) {
    return (
      <DdlApiPropertyValueWithDiffs
        key={`${segment.text}-${index}`}
        isVisible={true}
        value={segment.text}
        appearance="text"
        textHighlighterColor={takeDiffSideTextHighlighterColor(segment.diff, layoutSide)}
      />
    )
  }

  return (
    <DdlApiPropertyValue
      key={`${segment.text}-${index}`}
      isVisible={true}
      value={segment.text}
      appearance="text"
    />
  )
}

export const DdlCommaSeparatedListWithDiffs: FC<DdlCommaSeparatedListWithDiffsProps> = memo<DdlCommaSeparatedListWithDiffsProps>((props) => {
  const { display, layoutSide } = props

  if (display.kind === "plain") {
    return (
      <DdlApiPropertyValue
        isVisible={true}
        value={display.text}
        appearance="text"
      />
    )
  }

  if (display.kind === "monolithic") {
    return (
      <DdlApiPropertyValueWithDiffs
        isVisible={true}
        value={display.text}
        appearance="text"
        textHighlighterColor={takeDiffSideTextHighlighterColor(display.diff, layoutSide)}
        backgroundColor={takeDiffSideBackgroundColor(display.diff, layoutSide)}
      />
    )
  }

  return (
    <span className="inline-flex items-center">
      {renderSegmentedList(display.segments, layoutSide)}
    </span>
  )
})
