import { useDisplayMode } from "@apihub/contexts/DisplayModeContext"
import { LevelContext, useLevelContext } from "@apihub/contexts/LevelContext"
import { getColumnChildNodes } from "@apihub/utils/ddlapi/node-type-checkers"
import { hasDdlColumnAdditionalInfoRows } from "@apihub/utils/ddlapi/column-row-utils"
import { DdlApiTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/types/aliases"
import { DdlApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/types/node-kind"
import { FC, useMemo } from "react"
import { DETAILED_DISPLAY_MODE } from "../../types/DisplayMode"
import { TextValueVariant } from "../shared-components/TextValue/types"
import { TitleRow } from "../shared-components/TitleRow/TitleRow"
import { ATTRIBUTE_PRECEDED_BY, PrecededBy, WithPrecededByProps } from "../shared-components/WithPrecededByProps"
import { ColumnNodeViewer } from "./ColumnNodeViewer"

type ColumnsNodeViewerProps = WithPrecededByProps & {
  node: DdlApiTreeNode<typeof DdlApiTreeNodeKinds.COLUMNS>
}

type ColumnViewerContext = {
  columnNode: ReturnType<typeof getColumnChildNodes>[number]
  titlePrecededBy: PrecededBy
  additionalInfoPrecededBy: PrecededBy
  isLastInList: boolean
}

function buildColumnViewerContexts(
  columnNodes: ReturnType<typeof getColumnChildNodes>,
  isAdditionalInfoDisplayed: boolean,
): ColumnViewerContext[] {
  let previousHadAdditionalInfo = false

  return columnNodes.map((columnNode, index) => {
    const isLastInList = index === columnNodes.length - 1

    const titlePrecededBy = index === 0
      ? PrecededBy.DDL_SECTION_HEADER
      : previousHadAdditionalInfo
        ? PrecededBy.DDL_COLUMN_AFTER_ADDITIONAL_INFO_ROW
        : PrecededBy.DDL_COLUMN_ROW

    const additionalInfoPrecededBy = previousHadAdditionalInfo
      ? PrecededBy.DDL_COLUMN_AFTER_ADDITIONAL_INFO_ROW
      : PrecededBy.DDL_COLUMN_ROW

    const context: ColumnViewerContext = {
      columnNode,
      titlePrecededBy,
      additionalInfoPrecededBy,
      isLastInList,
    }

    previousHadAdditionalInfo = isAdditionalInfoDisplayed
      && hasDdlColumnAdditionalInfoRows(columnNode.value())

    return context
  })
}

export const ColumnsNodeViewer: FC<ColumnsNodeViewerProps> = (props) => {
  const { node, [ATTRIBUTE_PRECEDED_BY]: precededBy } = props

  const level = useLevelContext()
  const displayMode = useDisplayMode()
  const value = node.value()
  const columnNodes = getColumnChildNodes(node.childrenNodes())
  const isAdditionalInfoDisplayed = displayMode === DETAILED_DISPLAY_MODE

  const columnViewerContexts = useMemo(
    () => buildColumnViewerContexts(columnNodes, isAdditionalInfoDisplayed),
    [columnNodes, isAdditionalInfoDisplayed],
  )

  if (columnNodes.length === 0) {
    return null
  }

  return (
    <div data-testid="ddl-columns-node-viewer" className="flex flex-col">
      <TitleRow
        data-precededby={precededBy}
        value={value?.title ?? 'Columns'}
        expandable={false}
        expanded={true}
        variant={TextValueVariant.h2}
      />
      <LevelContext.Provider value={level + 1}>
        {columnViewerContexts.map(({ columnNode, titlePrecededBy, additionalInfoPrecededBy, isLastInList }) => (
          <ColumnNodeViewer
            key={columnNode.id}
            data-precededby={titlePrecededBy}
            additionalInfoPrecededBy={additionalInfoPrecededBy}
            isLastInList={isLastInList}
            node={columnNode}
          />
        ))}
      </LevelContext.Provider>
    </div>
  )
}
