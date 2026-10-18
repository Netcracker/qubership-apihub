import { useDisplayMode } from "@apihub/contexts/DisplayModeContext"
import { takeIndexFlagDiffs } from "@apihub/utils/ddlapi/column-row-badges"
import {
  buildDdlPropertyTitleRowDiffProps,
  takeNodeDiffIfPresent,
} from "@apihub/utils/ddlapi/node-level-diff"
import {
  isDdlPropertySubheaderVisible,
  resolveIndexPartNamesSideDisplay,
  takeIndexDescriptionDiff,
} from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/tree-with-diffs/property-row-diffs"
import {
  resolveIndexListLastRowFlags,
  resolveIndexNodeVisibility,
} from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/tree-with-diffs/node-visibility/kind-index"
import { DdlApiTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/types/aliases"
import { DdlApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/types/node-kind"
import { LayoutSide } from "@apihub/types/internal/LayoutSide"
import { FC, useCallback, useMemo } from "react"
import { TextRow } from "../shared-components/TextRow/TextRow"
import { DEFAULT_LONG_TEXT_COLOR } from "../shared-components/TextRow/consts"
import { TextRowUsage } from "../shared-components/TextRow/types"
import { TextValueVariant } from "../shared-components/TextValue/types"
import { TitleRow } from "../shared-components/TitleRow/TitleRow"
import { TitleRowProps, TitleRowUsage } from "../shared-components/TitleRow/types"
import { ATTRIBUTE_DDL_LIST_LAST_ROW, ATTRIBUTE_PRECEDED_BY, PrecededBy, WithPrecededByProps } from "../shared-components/WithPrecededByProps"
import { ColumnRowBadgesContent } from "./ColumnRowBadges/ColumnRowBadgesContent"
import { DdlCommaSeparatedListWithDiffs } from "./DdlCommaSeparatedListWithDiffs/DdlCommaSeparatedListWithDiffs"

type IndexNodeViewerWithDiffsProps = WithPrecededByProps & {
  node: DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.INDEX>
  isLastInList?: boolean
  hideLevelIndicatorWhenSideEmpty?: boolean
}

export const IndexNodeViewerWithDiffs: FC<IndexNodeViewerWithDiffsProps> = (props) => {
  const {
    node,
    isLastInList = false,
    hideLevelIndicatorWhenSideEmpty = false,
    [ATTRIBUTE_PRECEDED_BY]: precededBy,
  } = props

  const displayMode = useDisplayMode()
  const value = node.value()

  const visibility = useMemo(
    () => resolveIndexNodeVisibility(node, displayMode),
    [node, displayMode],
  )
  const listLastRowFlags = useMemo(
    () => resolveIndexListLastRowFlags(isLastInList, visibility),
    [isLastInList, visibility],
  )

  const nodeDiff = useMemo(() => takeNodeDiffIfPresent(node), [node])

  const titleRowDiffProps: Pick<TitleRowProps, "diff" | "descendantDiffs" | "diffsSeverities" | "highlightingMode"> =
    useMemo(() => buildDdlPropertyTitleRowDiffProps(node), [node])

  const flagDiffs = useMemo(() => takeIndexFlagDiffs(node), [node])
  const descriptionDiff = useMemo(
    () => takeIndexDescriptionDiff(node),
    [node],
  )

  const indexTitle = value?.indexName ?? ''

  const renderPartNames = useCallback(
    (layoutSide: LayoutSide) => {
      const display = resolveIndexPartNamesSideDisplay(node, layoutSide)
      return (
        <DdlCommaSeparatedListWithDiffs
          layoutSide={layoutSide}
          display={display}
        />
      )
    },
    [node],
  )

  const subheader = useCallback(
    (layoutSide: LayoutSide) => {
      if (!value) {
        return <></>
      }

      if (!isDdlPropertySubheaderVisible(nodeDiff, layoutSide)) {
        return <></>
      }

      const shouldRenderPartNames = value.partNames.length > 0

      return (
        <div className="flex flex-wrap items-center gap-2">
          {shouldRenderPartNames && renderPartNames(layoutSide)}
          <ColumnRowBadgesContent
            columnId={node.id}
            layoutSide={layoutSide}
            value={value}
            flagDiffs={flagDiffs}
          />
        </div>
      )
    },
    [flagDiffs, node.id, nodeDiff, renderPartNames, value],
  )

  const isDescriptionDisplayed = visibility.showDescription

  if (!value) {
    return null
  }

  return (
    <div data-testid="ddl-index-node-viewer" className="flex flex-col ddlapi-property">
      <TitleRow
        data-precededby={precededBy}
        {...{ [ATTRIBUTE_DDL_LIST_LAST_ROW]: listLastRowFlags.isTitleListLastRow || undefined }}
        value={indexTitle}
        expandable={false}
        expanded={true}
        variant={TextValueVariant.body2}
        subheader={visibility.showSubheader ? subheader : undefined}
        usage={TitleRowUsage.DdlApiProperty}
        hideLevelIndicatorWhenSideEmpty={hideLevelIndicatorWhenSideEmpty}
        {...titleRowDiffProps}
      />
      {isDescriptionDisplayed && (
        <TextRow
          data-precededby={PrecededBy.DDL_INDEX_ROW}
          {...{ [ATTRIBUTE_DDL_LIST_LAST_ROW]: listLastRowFlags.isDescriptionListLastRow || undefined }}
          value={value.description ?? ''}
          variant={TextValueVariant.body1}
          textFontWeight="normal"
          textColor={DEFAULT_LONG_TEXT_COLOR}
          usage={TextRowUsage.DdlApiProperty}
          diff={descriptionDiff}
          diffsSeverities={node.diffsSeverities}
          hideLevelIndicatorWhenSideEmpty={hideLevelIndicatorWhenSideEmpty}
        />
      )}
    </div>
  )
}
