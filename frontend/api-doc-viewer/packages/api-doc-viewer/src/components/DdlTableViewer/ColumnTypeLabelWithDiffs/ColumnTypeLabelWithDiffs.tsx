import { takeDiffSideTextHighlighterColor } from "@apihub/utils/diffs/take-diff-side-text-highlighter-color"
import { LayoutSide } from "@apihub/types/internal/LayoutSide"
import {
  DdlColumnTypeLabelSideSegment,
  resolveColumnTypeLabelSideDisplay,
} from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/tree-with-diffs/property-row-diffs"
import { DdlApiTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/types/aliases"
import { DdlApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/types/node-kind"
import { FC, memo } from "react"
import { DdlApiPropertyValue } from "../DdlApiPropertyValue/DdlApiPropertyValue"
import { DdlApiPropertyValueWithDiffs } from "../DdlApiPropertyValue/DdlApiPropertyValueWithDiffs"
import { DdlCommaSeparatedListWithDiffs } from "../DdlCommaSeparatedListWithDiffs/DdlCommaSeparatedListWithDiffs"

type ColumnTypeLabelWithDiffsProps = {
  node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMN>
  layoutSide: LayoutSide
}

function splitTypeNameAndParameterSegments(
  segments: readonly DdlColumnTypeLabelSideSegment[],
): {
  readonly typeNameSegments: readonly DdlColumnTypeLabelSideSegment[]
  readonly parameterSegments: readonly DdlColumnTypeLabelSideSegment[]
} {
  const parameterStartIndex = segments.findIndex(segment => (
    segment.text.startsWith("(") || segment.text.startsWith(" (")
  ))
  if (parameterStartIndex === -1) {
    return {
      typeNameSegments: segments,
      parameterSegments: [],
    }
  }

  return {
    typeNameSegments: segments.slice(0, parameterStartIndex),
    parameterSegments: segments.slice(parameterStartIndex),
  }
}

function renderColumnTypeLabelSegment(
  segment: DdlColumnTypeLabelSideSegment,
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

export const ColumnTypeLabelWithDiffs: FC<ColumnTypeLabelWithDiffsProps> = memo<ColumnTypeLabelWithDiffsProps>((props) => {
  const { node, layoutSide } = props
  const display = resolveColumnTypeLabelSideDisplay(node, layoutSide)

  if (display.kind === "plain" || display.kind === "monolithic") {
    return (
      <DdlCommaSeparatedListWithDiffs
        layoutSide={layoutSide}
        display={display}
      />
    )
  }

  const { typeNameSegments, parameterSegments } = splitTypeNameAndParameterSegments(display.segments)

  return (
    <span className="inline-flex items-center gap-1">
      {typeNameSegments.map((segment, index) => renderColumnTypeLabelSegment(segment, index, layoutSide))}
      {parameterSegments.length > 0 && (
        <DdlCommaSeparatedListWithDiffs
          layoutSide={layoutSide}
          display={{
            kind: "segmented",
            segments: parameterSegments,
          }}
        />
      )}
    </span>
  )
})
