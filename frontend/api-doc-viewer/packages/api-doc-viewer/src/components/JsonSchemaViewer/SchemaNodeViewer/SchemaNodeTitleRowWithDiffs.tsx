import { JsonSchemaTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/aliases"
import { JsonSchemaTreeNodeStoredValue } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/node-value"
import { JsonSchemaPropertyRowVisibility } from "@netcracker/qubership-apihub-next-data-model/building-service/json-schema/tree/node-visibility-data/types"
import {
  JsonSchemaRowDiffs,
} from "@netcracker/qubership-apihub-next-data-model/model/json-schema/tree-with-diffs/property-row-diffs"
import {
  isDiffSideHeaderVisible,
  takeAddRemoveDiffIfPresent,
} from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/list-side-display"
import { FC, useMemo } from "react"
import { UxMarkerPanel } from "@apihub/components/kit/ux/UxMarkerPanel/UxMarkerPanel"
import { useLayoutMode } from "@apihub/contexts/LayoutModeContext"
import { SIDE_BY_SIDE_DIFFS_LAYOUT_MODE } from "@apihub/types/LayoutMode"
import { TitleRowProps } from "../../shared-components/TitleRow/types"
import { WithPrecededByProps } from "../../shared-components/WithPrecededByProps"
import { JsonSchemaTitleRowViewProps } from "../utils/json-schema-title-row-view-props"
import { JsonSchemaTitleSubheaderWithDiffs } from "./JsonSchemaTitleSubheader"
import { SchemaNodeTitleRowBase } from "./SchemaNodeTitleRowBase"

export type SchemaNodeTitleRowWithDiffsProps = WithPrecededByProps & {
  ownerNode: JsonSchemaTreeNodeWithDiffs
  displayNode?: JsonSchemaTreeNodeWithDiffs
  displayValue?: JsonSchemaTreeNodeStoredValue | null
  contentVisibility: JsonSchemaPropertyRowVisibility
  isLastInList?: boolean
  expandable?: boolean
  expanded?: boolean
  onClickExpander?: () => void
  titleRowDiffProps?: Pick<TitleRowProps, "diff" | "descendantDiffs" | "diffsSeverities">
  /** See JsonSchemaTitleSubheaderProps's `typeValueSuffix` - only combiner owners pass this. */
  typeValueSuffix?: string
}

export const SchemaNodeTitleRowWithDiffs: FC<SchemaNodeTitleRowWithDiffsProps> = (props) => {
  const {
    ownerNode,
    displayNode = ownerNode,
    displayValue,
    contentVisibility,
    isLastInList = false,
    expandable = false,
    expanded = false,
    onClickExpander,
    titleRowDiffProps: titleRowDiffPropsOverride,
    typeValueSuffix,
    ...precededByProps
  } = props

  const titleRowDiffProps = useMemo(
    () => titleRowDiffPropsOverride ?? JsonSchemaTitleRowViewProps.buildRowDiffProps(displayNode),
    [displayNode, titleRowDiffPropsOverride],
  )

  const requiredDiff = useMemo(
    () => JsonSchemaRowDiffs.RequiredStar.takeMetaDiffForDisplay(ownerNode),
    [ownerNode],
  )

  const layoutMode = useLayoutMode()
  const nodeChangesSummary = useMemo(
    () => JsonSchemaRowDiffs.NodeLevel.takeNodeChangesSummary(displayNode),
    [displayNode],
  )
  const showNodeChangesSummary = !expanded
    && expandable
    && layoutMode === SIDE_BY_SIDE_DIFFS_LAYOUT_MODE
    && !!nodeChangesSummary
    && nodeChangesSummary.size > 0

  return (
    <SchemaNodeTitleRowBase
      {...precededByProps}
      ownerNode={ownerNode}
      displayNode={displayNode}
      displayValue={displayValue}
      contentVisibility={contentVisibility}
      isLastInList={isLastInList}
      expandable={expandable}
      expanded={expanded}
      onClickExpander={onClickExpander}
      titleRowDiffProps={titleRowDiffProps}
      requiredDiff={requiredDiff}
      withRequiredDiffIndicator={true}
      renderSubheader={({
        layoutSide,
        displayMeta,
        displayNode: subheaderDisplayNode,
        showTypeSubheader,
      }) => {
        if (!isDiffSideHeaderVisible(takeAddRemoveDiffIfPresent(titleRowDiffProps.diff), layoutSide)) {
          return <></>
        }

        return (
          <>
            <JsonSchemaTitleSubheaderWithDiffs
              meta={displayMeta}
              node={displayNode}
              isCycle={subheaderDisplayNode.isCycle}
              layoutSide={layoutSide}
              showTypeLabel={showTypeSubheader}
              typeValueSuffix={typeValueSuffix}
            />
            {showNodeChangesSummary && (
              <UxMarkerPanel values={Array.from(nodeChangesSummary!)} />
            )}
          </>
        )
      }}
    />
  )
}
