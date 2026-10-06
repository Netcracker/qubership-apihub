import { JsonSchemaTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/aliases"
import { JsonSchemaTreeNodeValue } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/node-value"
import { JsonSchemaPropertyRowVisibility } from "@netcracker/qubership-apihub-next-data-model/building-service/json-schema/tree/node-visibility-data/types"
import { FC, useMemo } from "react"
import { useJsonSchemaViewerContext } from "../JsonSchemaViewerContext"
import { JsonSchemaTopLevelPropsMediaTypes } from "../utils/top-level-props-media-types"
import { WithPrecededByProps } from "../../shared-components/WithPrecededByProps"
import { JsonSchemaTitleSubheader } from "./JsonSchemaTitleSubheader"
import { SchemaNodeTitleRowBase } from "./SchemaNodeTitleRowBase"

export type SchemaNodeTitleRowProps = WithPrecededByProps & {
  ownerNode: JsonSchemaTreeNode
  displayNode?: JsonSchemaTreeNode
  displayValue?: JsonSchemaTreeNodeValue | null
  contentVisibility: JsonSchemaPropertyRowVisibility
  isLastInList?: boolean
  expandable?: boolean
  expanded?: boolean
  onClickExpander?: () => void
  /** See JsonSchemaTitleSubheaderProps's `typeValueSuffix` - only combiner owners pass this. */
  typeValueSuffix?: string
}

export const SchemaNodeTitleRow: FC<SchemaNodeTitleRowProps> = (props) => {
  const {
    ownerNode,
    displayNode = ownerNode,
    displayValue,
    contentVisibility,
    isLastInList = false,
    expandable = false,
    expanded = false,
    onClickExpander,
    typeValueSuffix,
    ...precededByProps
  } = props

  const { topLevelPropsMediaTypes } = useJsonSchemaViewerContext()
  const mediaType = useMemo(
    () => JsonSchemaTopLevelPropsMediaTypes.resolve(ownerNode, topLevelPropsMediaTypes),
    [ownerNode, topLevelPropsMediaTypes],
  )

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
      renderSubheader={({
        layoutSide,
        displayValueResolved,
        displayMeta,
        displayNode: subheaderDisplayNode,
        showTypeSubheader,
      }) => (
        <JsonSchemaTitleSubheader
          value={displayValueResolved}
          meta={displayMeta}
          isCycle={subheaderDisplayNode.isCycle}
          layoutSide={layoutSide}
          showTypeLabel={showTypeSubheader}
          typeValueSuffix={typeValueSuffix}
          mediaType={mediaType}
        />
      )}
    />
  )
}
