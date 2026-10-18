import { LayoutSide } from "@apihub/types/internal/LayoutSide"
import { JsonSchemaRowDiffs } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/tree-with-diffs/property-row-diffs"
import { JsonSchemaTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/aliases"
import { JsonSchemaTreeNodeMeta } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/node-meta"
import { FC, memo } from "react"
import { JsonSchemaNodeTypeCheckers } from "../../utils/node-type-checkers"
import { JSON_SCHEMA_NESTING_INDICATOR_TYPE_VALUE_COLOR } from "./json-schema-type-value-colors"
import { JsonSchemaTypeValueSideDisplay } from "./JsonSchemaTypeValueSideDisplay"

export type JsonSchemaNestingIndicatorTypeValueWithDiffsProps = {
  node: JsonSchemaTreeNodeWithDiffs
  meta: JsonSchemaTreeNodeMeta | null | undefined
  layoutSide: LayoutSide
}

/**
 * Nesting-indicator row type-value orchestrator, with diffs. Hidden on whichever side's
 * resolved type is primitive - see plain sibling JsonSchemaNestingIndicatorTypeValue.
 */
export const JsonSchemaNestingIndicatorTypeValueWithDiffs: FC<JsonSchemaNestingIndicatorTypeValueWithDiffsProps> = memo<JsonSchemaNestingIndicatorTypeValueWithDiffsProps>((props) => {
  const { node, meta, layoutSide } = props

  if (JsonSchemaNodeTypeCheckers.isNestingIndicatorHiddenForSide(node, layoutSide)) {
    return null
  }

  const display = JsonSchemaRowDiffs.TypeLabel.resolveSideDisplay(node, meta, layoutSide)
  return (
    <JsonSchemaTypeValueSideDisplay
      display={display}
      layoutSide={layoutSide}
      color={JSON_SCHEMA_NESTING_INDICATOR_TYPE_VALUE_COLOR}
    />
  )
})
