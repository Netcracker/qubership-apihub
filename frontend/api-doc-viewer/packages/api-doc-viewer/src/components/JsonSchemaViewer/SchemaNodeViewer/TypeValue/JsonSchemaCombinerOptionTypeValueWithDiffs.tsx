import { LayoutSide } from "@apihub/types/internal/LayoutSide"
import { JsonSchemaRowDiffs } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/tree-with-diffs/property-row-diffs"
import { JsonSchemaTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/aliases"
import { FC, memo } from "react"
import { JsonSchemaCombiner } from "../../utils/resolve-combiner"
import { JsonSchemaTypeValueSideDisplay } from "./JsonSchemaTypeValueSideDisplay"
import { JsonSchemaTypeValueText } from "./JsonSchemaTypeValueText"

export type JsonSchemaCombinerOptionTypeValueWithDiffsProps = {
  node: JsonSchemaTreeNodeWithDiffs
  layoutSide: LayoutSide
}

/**
 * Combiner-selector option button content, with diffs. Same leaf-resolution + suffix rule as
 * the plain sibling (`JsonSchemaCombinerOptionTypeValue`), but renders the resolved leaf's
 * type/format/title through the shared per-side diff-highlighted SideListDisplay renderer, so a
 * leaf-level type/title/format change is visible directly on the option button - not just as
 * the generic "changed" round marker `Selector` already draws for other kinds of changes.
 * `color={null}` leaves text color to the button's own CSS (selected/unselected state); the
 * suffix is plain, non-diff-highlighted text, matching the plain sibling.
 */
export const JsonSchemaCombinerOptionTypeValueWithDiffs: FC<JsonSchemaCombinerOptionTypeValueWithDiffsProps> = memo<JsonSchemaCombinerOptionTypeValueWithDiffsProps>((props) => {
  const { node, layoutSide } = props

  const leafNode = JsonSchemaCombiner.Selection.resolveOptionLeafNode(node)
  const display = JsonSchemaRowDiffs.TypeLabel.resolveSideDisplay(leafNode, leafNode.meta(), layoutSide)
  const suffix = JsonSchemaCombiner.NodeDiffs.resolveOptionTitleSuffix(node)

  return (
    <>
      <JsonSchemaTypeValueSideDisplay display={display} layoutSide={layoutSide} color={null} />
      {suffix && <JsonSchemaTypeValueText text={suffix} color={null} />}
    </>
  )
})
