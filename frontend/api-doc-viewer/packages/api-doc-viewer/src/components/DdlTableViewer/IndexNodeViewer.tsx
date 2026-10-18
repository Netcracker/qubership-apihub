import { useDisplayMode } from "@apihub/contexts/DisplayModeContext"
import {
  resolvePlainIndexListLastRowFlags,
  resolvePlainIndexNodeVisibility,
} from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/tree/node-visibility/kind-index"
import { DdlApiTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/types/aliases"
import { DdlApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/types/node-kind"
import { LayoutSide } from "@apihub/types/internal/LayoutSide"
import { FC, useCallback, useMemo } from "react"
import { TextRow } from "../shared-components/TextRow/TextRow"
import { DEFAULT_LONG_TEXT_COLOR } from "../shared-components/TextRow/consts"
import { TextRowUsage } from "../shared-components/TextRow/types"
import { TextValueVariant } from "../shared-components/TextValue/types"
import { TitleRow } from "../shared-components/TitleRow/TitleRow"
import { TitleRowUsage } from "../shared-components/TitleRow/types"
import { ATTRIBUTE_DDL_LIST_LAST_ROW, ATTRIBUTE_PRECEDED_BY, PrecededBy, WithPrecededByProps } from "../shared-components/WithPrecededByProps"
import { ColumnRowBadgesContent } from "./ColumnRowBadges/ColumnRowBadgesContent"
import { DdlApiPropertyValue } from "./DdlApiPropertyValue/DdlApiPropertyValue"
import { formatIndexPartNames } from "./formatters"

export type IndexNodeViewerProps = WithPrecededByProps & {
  node: DdlApiTreeNode<typeof DdlApiTreeNodeKinds.INDEX>
  isLastInList?: boolean
}

export const IndexNodeViewer: FC<IndexNodeViewerProps> = (props) => {
  const { node, isLastInList = false, [ATTRIBUTE_PRECEDED_BY]: precededBy } = props

  const displayMode = useDisplayMode()
  const value = node.value()

  const visibility = useMemo(
    () => resolvePlainIndexNodeVisibility(node, displayMode),
    [node, displayMode],
  )
  const listLastRowFlags = useMemo(
    () => resolvePlainIndexListLastRowFlags(isLastInList, visibility),
    [isLastInList, visibility],
  )

  const indexTitle = value?.indexName ?? ''

  const subheader = useCallback(
    (layoutSide: LayoutSide) => {
      if (!value) {
        return <></>
      }

      const partNamesText = formatIndexPartNames(value.partNames)

      return (
        <div className="flex flex-wrap items-center gap-2">
          {value.partNames.length > 0 && (
            <DdlApiPropertyValue
              isVisible={true}
              value={`(${partNamesText})`}
              appearance="text"
            />
          )}
          <ColumnRowBadgesContent
            columnId={node.id}
            layoutSide={layoutSide}
            value={value}
          />
        </div>
      )
    },
    [node.id, value],
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
        />
      )}
    </div>
  )
}
