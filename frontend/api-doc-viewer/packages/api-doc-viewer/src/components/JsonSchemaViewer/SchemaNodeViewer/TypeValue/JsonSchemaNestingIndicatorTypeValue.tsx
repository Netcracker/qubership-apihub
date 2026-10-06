import { resolveJsonSchemaTypeLabel } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/type-label"
import { JsonSchemaTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/aliases"
import { FC, memo } from "react"
import { JsonSchemaNodeTypeCheckers } from "../../utils/node-type-checkers"
import { JSON_SCHEMA_NESTING_INDICATOR_TYPE_VALUE_COLOR } from "./json-schema-type-value-colors"
import { JsonSchemaTypeValueText } from "./JsonSchemaTypeValueText"

export type JsonSchemaNestingIndicatorTypeValueProps = {
  node: JsonSchemaTreeNode
}

/**
 * Nesting-indicator row type-value orchestrator, plain (no diffs). Hidden when the node's
 * own type is primitive (no children to introduce).
 */
export const JsonSchemaNestingIndicatorTypeValue: FC<JsonSchemaNestingIndicatorTypeValueProps> = memo<JsonSchemaNestingIndicatorTypeValueProps>((props) => {
  const { node } = props

  if (JsonSchemaNodeTypeCheckers.isNestingIndicatorHiddenForPlainNode(node)) {
    return null
  }

  return (
    <JsonSchemaTypeValueText
      text={resolveJsonSchemaTypeLabel(node.value(), node.meta())}
      color={JSON_SCHEMA_NESTING_INDICATOR_TYPE_VALUE_COLOR}
    />
  )
})
