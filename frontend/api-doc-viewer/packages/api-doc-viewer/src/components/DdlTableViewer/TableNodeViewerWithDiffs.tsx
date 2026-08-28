import { useDisplayMode } from "@apihub/contexts/DisplayModeContext"
import {
  buildDdlTableTitleRowDiffProps,
  takeTableNodeDiffIfPresent,
} from "@apihub/utils/ddlapi/node-level-diff"
import { getDdlApiChildNodes, isColumnsNode, isIndexesNode } from "@apihub/utils/ddlapi/node-type-checkers"
import {
  resolveTableSchemaNameSideDisplay,
  takeTableDescriptionDiff,
  takeTableSchemaNameDiff,
} from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/tree-with-diffs/property-row-diffs"
import { DdlApiTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/types/aliases"
import { DdlApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/types/node-kind"
import { LayoutSide } from "@apihub/types/internal/LayoutSide"
import { FC, useCallback, useMemo } from "react"
import { DETAILED_DISPLAY_MODE } from "../../types/DisplayMode"
import { TextRow } from "../shared-components/TextRow/TextRow"
import { DEFAULT_LONG_TEXT_COLOR } from "../shared-components/TextRow/consts"
import { TextValueVariant } from "../shared-components/TextValue/types"
import { TitleRow } from "../shared-components/TitleRow/TitleRow"
import { TitleRowProps } from "../shared-components/TitleRow/types"
import { ATTRIBUTE_PRECEDED_BY, PrecededBy, WithPrecededByProps } from "../shared-components/WithPrecededByProps"
import { DEFAULT_SCHEMA_NAME } from "./consts"
import { ColumnsNodeViewer } from "./ColumnsNodeViewer"
import { DdlSchemaNameBlockWithDiffs } from "./DdlSchemaNameBlock/DdlSchemaNameBlockWithDiffs"
import { IndexesNodeViewer } from "./IndexesNodeViewer"

type TableNodeViewerWithDiffsProps = WithPrecededByProps & {
  node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.TABLE>
  noHeading?: boolean
}

export const TableNodeViewerWithDiffs: FC<TableNodeViewerWithDiffsProps> = (props) => {
  const { node, noHeading = false, [ATTRIBUTE_PRECEDED_BY]: precededBy = PrecededBy.ROOT } = props

  const displayMode = useDisplayMode()
  const value = node.value()
  const children = getDdlApiChildNodes(node)

  const columnsChild = children.find(isColumnsNode)
  const indexesChild = children.find(isIndexesNode)

  const nodeDiff = useMemo(() => takeTableNodeDiffIfPresent(node), [node])
  const titleRowDiffProps: Pick<TitleRowProps, "diff" | "descendantDiffs" | "diffsSeverities" | "highlightingMode"> =
    useMemo(() => buildDdlTableTitleRowDiffProps(node), [node])
  const schemaNameDiff = useMemo(() => takeTableSchemaNameDiff(node), [node])
  const descriptionDiff = useMemo(() => takeTableDescriptionDiff(node), [node])

  const resolveSchemaName = useCallback(
    (layoutSide: LayoutSide) => resolveTableSchemaNameSideDisplay(node, layoutSide),
    [node],
  )

  const mergedSchemaName = value?.schemaName ?? ''
  const isSchemaNameDisplayed = (
    mergedSchemaName !== DEFAULT_SCHEMA_NAME
    || !!schemaNameDiff
  ) && !nodeDiff

  const isDescriptionDisplayed =
    displayMode === DETAILED_DISPLAY_MODE
    && (!!value?.description || !!descriptionDiff)
    && !nodeDiff

  const tableHeaderPrecededBy = noHeading ? PrecededBy.ROOT : PrecededBy.DDL_TABLE_HEADER_ROW

  return (
    <div data-testid="ddl-table-node-viewer" className="flex flex-col">
      {!noHeading && (
        <TitleRow
          data-precededby={precededBy}
          value={value?.tableName ?? ''}
          expandable={false}
          expanded={true}
          variant={TextValueVariant.h1}
          {...titleRowDiffProps}
        />
      )}
      {isSchemaNameDisplayed && (
        <DdlSchemaNameBlockWithDiffs
          data-precededby={tableHeaderPrecededBy}
          resolveSchemaName={resolveSchemaName}
          diff={schemaNameDiff}
          diffsSeverities={node.diffsSeverities}
        />
      )}
      {isDescriptionDisplayed && (
        <TextRow
          data-precededby={
            isSchemaNameDisplayed
              ? PrecededBy.DDL_TABLE_SCHEMA_ROW
              : tableHeaderPrecededBy
          }
          value={value?.description ?? ''}
          variant={TextValueVariant.h4}
          textFontWeight="normal"
          textColor={DEFAULT_LONG_TEXT_COLOR}
          diff={descriptionDiff}
          diffsSeverities={node.diffsSeverities}
        />
      )}
      {columnsChild && (
        <ColumnsNodeViewer
          data-precededby={
            isDescriptionDisplayed
              ? PrecededBy.DDL_TABLE_DESCRIPTION_ROW
              : isSchemaNameDisplayed
                ? PrecededBy.DDL_TABLE_SCHEMA_ROW
                : tableHeaderPrecededBy
          }
          node={columnsChild}
        />
      )}
      {indexesChild && (
        <IndexesNodeViewer
          data-precededby={
            columnsChild?.childrenNodes().length
              ? PrecededBy.DDL_COLUMN_ROW
              : isDescriptionDisplayed
                ? PrecededBy.DDL_TABLE_DESCRIPTION_ROW
                : isSchemaNameDisplayed
                  ? PrecededBy.DDL_TABLE_SCHEMA_ROW
                  : tableHeaderPrecededBy
          }
          node={indexesChild}
        />
      )}
    </div>
  )
}
