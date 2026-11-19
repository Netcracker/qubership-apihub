import { OpenApiRowDiffs } from "@netcracker/qubership-apihub-next-data-model/model/openapi/tree-with-diffs/row-diffs"
import { OpenApiTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/openapi/types/aliases"
import { OpenApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/openapi/types/node-kind"
import { FC } from "react"
import { TextValueVariant } from "../shared-components/TextValue/types"
import { TitleRow } from "../shared-components/TitleRow/TitleRow"
import { PrecededBy } from "../shared-components/WithPrecededByProps"
import { useOpenApiSectionTitleRowProps } from "./CollapsibleSection"
import { takeOpenApiSeverities } from "./diff-state"

export type ParametersNode = OpenApiTreeNode<typeof OpenApiTreeNodeKinds.PARAMETERS> | OpenApiTreeNode<typeof OpenApiTreeNodeKinds.RESPONSE_HEADERS>

type ParametersTitleRowProps = {
  node: ParametersNode
  title: string
}

/** A parameter group / response Headers title (h3) with the section expander. Layout block: `parameters-blocks.tsx`. */
export const ParametersTitleRow: FC<ParametersTitleRowProps> = ({ node, title }) => {
  const sectionProps = useOpenApiSectionTitleRowProps(node.id)
  return (
    <TitleRow
      data-precededby={PrecededBy.SEPARATOR_LAYOUT_ROW}
      value={title}
      variant={TextValueVariant.h3}
      {...sectionProps}
      diff={OpenApiRowDiffs.Section.takeHeaderRowDiff(node)}
      diffsSeverities={takeOpenApiSeverities(node)}
    />
  )
}
