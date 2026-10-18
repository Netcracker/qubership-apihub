import { resolveDiffSideStyle } from "@apihub/utils/diffs/resolve-diff-side-style"
import { LayoutSide } from "@apihub/types/internal/LayoutSide"
import {
  ListSideSegment,
  SideListDisplay,
  SideListDisplayKinds,
} from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/list-side-display"
import { FC, memo } from "react"
import { SubheaderValue } from "../SubheaderValue/SubheaderValue"
import { SubheaderValueAppearance } from "../SubheaderValue/types"
import { SubheaderValueWithDiffs } from "../SubheaderValue/SubheaderValueWithDiffs"

export type { SideListDisplay }

type CommaSeparatedListWithDiffsProps = {
  layoutSide: LayoutSide
  display: SideListDisplay
}

function isCommaSeparatorSegment(segment: ListSideSegment): boolean {
  return segment.text === ", " || segment.text === ","
}

function renderListSegment(
  segment: ListSideSegment,
  index: number,
  layoutSide: LayoutSide,
  monolithic: boolean,
) {
  if (segment.diff) {
    const style = resolveDiffSideStyle(segment.diff, layoutSide)
    return (
      <SubheaderValueWithDiffs
        key={`${segment.text}-${index}`}
        isVisible={true}
        value={segment.text}
        appearance={SubheaderValueAppearance.Text}
        textHighlighterColor={style.textHighlighterColor}
        backgroundColor={monolithic ? style.backgroundColor : undefined}
      />
    )
  }

  return (
    <SubheaderValue
      key={`${segment.text}-${index}`}
      isVisible={true}
      value={segment.text}
      appearance={SubheaderValueAppearance.Text}
    />
  )
}

function renderSegmentedList(
  segments: readonly ListSideSegment[],
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

    nodes.push(renderListSegment(segment, index, layoutSide, false))
  })

  return nodes
}

export const CommaSeparatedListWithDiffs: FC<CommaSeparatedListWithDiffsProps> = memo<CommaSeparatedListWithDiffsProps>((props) => {
  const { display, layoutSide } = props

  if (display.kind === SideListDisplayKinds.NO_DIFFS) {
    return renderListSegment({ text: display.text }, 0, layoutSide, false)
  }

  if (display.kind === SideListDisplayKinds.WHOLE_DIFFS) {
    return renderListSegment(
      { text: display.text, diff: display.diff },
      0,
      layoutSide,
      true,
    )
  }

  return (
    <span className="inline-flex items-center">
      {renderSegmentedList(display.segments, layoutSide)}
    </span>
  )
})
