import { resolveJsonSchemaTypeLabel } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/type-label"
import { JsonSchemaTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/aliases"
import { FC, memo } from "react"
import { JsonSchemaCombiner } from "../../utils/resolve-combiner"
import { JsonSchemaTypeValueText } from "./JsonSchemaTypeValueText"

export type JsonSchemaCombinerOptionTypeValueProps = {
  node: JsonSchemaTreeNode
}

/**
 * Combiner-selector option button content, plain (no diffs). Displays the type value of the
 * leaf reached by always taking the first nested variant recursively (see
 * `JsonSchemaCombiner.Selection.resolveOptionLeafNode`), with a trailing " (combinerKind)" suffix when `node` (the
 * option itself, not the resolved leaf) is itself a combiner owner. `color={null}` leaves text
 * color to the button's own CSS (selected/unselected state), not the leaf's title-row default.
 */
export const JsonSchemaCombinerOptionTypeValue: FC<JsonSchemaCombinerOptionTypeValueProps> = memo<JsonSchemaCombinerOptionTypeValueProps>((props) => {
  const { node } = props

  const leafNode = JsonSchemaCombiner.Selection.resolveOptionLeafNode(node)
  const text = resolveJsonSchemaTypeLabel(JsonSchemaCombiner.Display.resolveBranchValue(leafNode), leafNode.meta())
    + JsonSchemaCombiner.NodeDiffs.resolveOptionTitleSuffix(node)

  return <JsonSchemaTypeValueText text={text} color={null} />
})
