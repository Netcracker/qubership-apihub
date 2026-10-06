import { resolveDiffSideStyle } from "@apihub/utils/diffs/resolve-diff-side-style"
import { LayoutSide } from "@apihub/types/internal/LayoutSide"
import {
  DdlApiRowDiffs,
  DdlColumnTypeLabelSideSegment,
} from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/tree-with-diffs/property-row-diffs"
import { SideListDisplayKinds } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/list-side-display"
import { DdlApiTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/types/aliases"
import { DdlApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/types/node-kind"
import { FC, memo } from "react"
import { CommaSeparatedListWithDiffs } from "../../shared-components/CommaSeparatedList/CommaSeparatedListWithDiffs"
import { SubheaderValue } from "../../shared-components/SubheaderValue/SubheaderValue"
import { SubheaderValueAppearance } from "../../shared-components/SubheaderValue/types"
import { SubheaderValueWithDiffs } from "../../shared-components/SubheaderValue/SubheaderValueWithDiffs"

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
    const style = resolveDiffSideStyle(segment.diff, layoutSide)
    return (
      <SubheaderValueWithDiffs
        key={`${segment.text}-${index}`}
        isVisible={true}
        value={segment.text}
        appearance={SubheaderValueAppearance.Text}
        textHighlighterColor={style.textHighlighterColor}
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

export const ColumnTypeLabelWithDiffs: FC<ColumnTypeLabelWithDiffsProps> = memo<ColumnTypeLabelWithDiffsProps>((props) => {
  const { node, layoutSide } = props
  const display = DdlApiRowDiffs.ColumnTypeLabel.resolveSideDisplay(node, layoutSide)

  if (display.kind === SideListDisplayKinds.NO_DIFFS || display.kind === SideListDisplayKinds.WHOLE_DIFFS) {
    return (
      <CommaSeparatedListWithDiffs
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
        <CommaSeparatedListWithDiffs
          layoutSide={layoutSide}
          display={{
            kind: SideListDisplayKinds.PARTIAL_DIFFS,
            segments: parameterSegments,
          }}
        />
      )}
    </span>
  )
})
