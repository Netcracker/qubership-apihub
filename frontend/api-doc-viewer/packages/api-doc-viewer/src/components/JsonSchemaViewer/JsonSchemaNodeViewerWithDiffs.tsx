import { JsonSchemaTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/aliases"
import { FC } from "react"
import { WithPrecededByProps } from "../shared-components/WithPrecededByProps"
import { CombinerNodeViewerWithDiffs } from "./CombinerNodeViewer/CombinerNodeViewerWithDiffs"
import { SchemaNodeViewerWithDiffs } from "./SchemaNodeViewer/SchemaNodeViewerWithDiffs"
import { JsonSchemaCombiner } from "./utils/resolve-combiner"

export type JsonSchemaNodeViewerWithDiffsProps = WithPrecededByProps & {
  node: JsonSchemaTreeNodeWithDiffs
  isLastInList?: boolean
}

export const JsonSchemaNodeViewerWithDiffs: FC<JsonSchemaNodeViewerWithDiffsProps> = (props) => {
  const { node } = props

  if (JsonSchemaCombiner.isOwnerNode(node)) {
    return <CombinerNodeViewerWithDiffs {...props} />
  }

  return <SchemaNodeViewerWithDiffs {...props} />
}
