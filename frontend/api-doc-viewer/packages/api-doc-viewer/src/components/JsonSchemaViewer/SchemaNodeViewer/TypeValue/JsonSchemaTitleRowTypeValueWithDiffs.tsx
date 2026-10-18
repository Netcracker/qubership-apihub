import { LayoutSide } from "@apihub/types/internal/LayoutSide"
import { JsonSchemaRowDiffs } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/tree-with-diffs/property-row-diffs"
import { JsonSchemaTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/aliases"
import { JsonSchemaTreeNodeMeta } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/node-meta"
import { FC, memo } from "react"
import { JsonSchemaTypeValueSideDisplay } from "./JsonSchemaTypeValueSideDisplay"
import { JsonSchemaTypeValueText } from "./JsonSchemaTypeValueText"

export type JsonSchemaTitleRowTypeValueWithDiffsProps = {
  node: JsonSchemaTreeNodeWithDiffs
  meta: JsonSchemaTreeNodeMeta | null | undefined
  layoutSide: LayoutSide
  /** See the plain sibling's `suffix` prop (JsonSchemaTitleRowTypeValue) - same contract. */
  suffix?: string
}

/**
 * Title-row type-value orchestrator, with diffs. Never hides on primitiveness (see plain
 * sibling JsonSchemaTitleRowTypeValue).
 */
export const JsonSchemaTitleRowTypeValueWithDiffs: FC<JsonSchemaTitleRowTypeValueWithDiffsProps> = memo<JsonSchemaTitleRowTypeValueWithDiffsProps>((props) => {
  const { node, meta, layoutSide, suffix } = props
  const display = JsonSchemaRowDiffs.TypeLabel.resolveSideDisplay(node, meta, layoutSide)
  return (
    <>
      <JsonSchemaTypeValueSideDisplay display={display} layoutSide={layoutSide} />
      {suffix && <JsonSchemaTypeValueText text={suffix} />}
    </>
  )
})
