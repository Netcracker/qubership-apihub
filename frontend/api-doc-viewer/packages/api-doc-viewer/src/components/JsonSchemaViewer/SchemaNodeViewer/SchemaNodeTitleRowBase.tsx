import { LayoutSide } from "@apihub/types/internal/LayoutSide"
import { JsonSchemaViewerTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/aliases"
import { JsonSchemaTreeNodeStoredValue, JsonSchemaTreeNodeValue } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/node-value"
import { JsonSchemaPropertyRowVisibility } from "@netcracker/qubership-apihub-next-data-model/building-service/json-schema/tree/node-visibility-data/types"
import { Diff } from "@netcracker/qubership-apihub-api-diff"
import { FC, ReactElement } from "react"
import { TextValueVariant } from "@apihub/components/shared-components/TextValue/types"
import { TitleRow } from "@apihub/components/shared-components/TitleRow/TitleRow"
import { TitleRowUsage } from "@apihub/components/shared-components/TitleRow/types"
import { TitleRowProps } from "../../shared-components/TitleRow/types"
import { ATTRIBUTE_PRECEDED_BY, WithPrecededByProps } from "../../shared-components/WithPrecededByProps"
import { JsonSchemaNodeTypeCheckers } from "../utils/node-type-checkers"
import { useSchemaNodeTitleRowShared } from "./schema-node-title-row-shared"

export type SchemaNodeTitleRowBaseProps = WithPrecededByProps & {
  ownerNode: JsonSchemaViewerTreeNode
  displayNode: JsonSchemaViewerTreeNode
  displayValue?: JsonSchemaTreeNodeStoredValue | null
  contentVisibility: JsonSchemaPropertyRowVisibility
  isLastInList?: boolean
  expandable?: boolean
  expanded?: boolean
  onClickExpander?: () => void
  titleRowDiffProps?: Pick<TitleRowProps, "diff" | "descendantDiffs" | "diffsSeverities">
  requiredDiff?: Diff
  withRequiredDiffIndicator?: boolean
  renderSubheader: (context: {
    layoutSide: LayoutSide
    displayValueResolved: JsonSchemaTreeNodeValue | null | undefined
    displayMeta: ReturnType<JsonSchemaViewerTreeNode["meta"]>
    displayNode: JsonSchemaViewerTreeNode
    showTypeSubheader: boolean
  }) => ReactElement
}

export const SchemaNodeTitleRowBase: FC<SchemaNodeTitleRowBaseProps> = (props) => {
  const {
    ownerNode,
    displayNode,
    displayValue,
    contentVisibility,
    isLastInList = false,
    expandable = false,
    expanded = false,
    onClickExpander,
    titleRowDiffProps,
    requiredDiff,
    withRequiredDiffIndicator = false,
    renderSubheader,
    [ATTRIBUTE_PRECEDED_BY]: precededBy,
  } = props

  const {
    displayValueResolved,
    displayMeta,
    listLastRowFlags,
    titleContent,
    showTypeSubheader,
  } = useSchemaNodeTitleRowShared({
    ownerNode,
    displayNode,
    displayValue,
    contentVisibility,
    isLastInList,
    requiredDiff,
    withRequiredDiffIndicator,
    titleRowDiff: titleRowDiffProps?.diff,
  })

  return (
    <TitleRow
      {...listLastRowFlags}
      data-precededby={precededBy}
      titleContent={titleContent}
      expandable={expandable}
      expanded={expanded}
      isRoot={JsonSchemaNodeTypeCheckers.isRootNode(ownerNode)}
      onClickExpander={expandable ? onClickExpander : undefined}
      variant={TextValueVariant.body2}
      subheader={(layoutSide) => renderSubheader({
        layoutSide,
        displayValueResolved,
        displayMeta,
        displayNode,
        showTypeSubheader,
      })}
      usage={TitleRowUsage.JsonSchemaProperty}
      {...titleRowDiffProps}
    />
  )
}
