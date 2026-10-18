import { useLayoutMode } from "@apihub/contexts/LayoutModeContext"
import { LayoutSide } from "@apihub/types/internal/LayoutSide"
import { getLayoutModeFlags } from "@apihub/utils/common/changes"
import { Diff } from "@netcracker/qubership-apihub-api-diff"
import { JsonSchemaRowDiffs } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/tree-with-diffs/property-row-diffs"
import { FC } from "react"

export type JsonSchemaRequiredDiffIndicatorProps = {
  required: boolean
  requiredDiff?: Diff
  layoutSide?: LayoutSide
}

export const JsonSchemaRequiredDiffIndicator: FC<JsonSchemaRequiredDiffIndicatorProps> = (props) => {
  const { required, requiredDiff, layoutSide } = props
  const layoutMode = useLayoutMode()
  const { isSideBySideDiffsLayoutMode } = getLayoutModeFlags(layoutMode)

  if (layoutSide === undefined) {
    return null
  }

  const isVisible = isSideBySideDiffsLayoutMode
    ? JsonSchemaRowDiffs.RequiredStar.isVisibleOnSide(required, requiredDiff, layoutSide)
    : required

  if (!isVisible) {
    return null
  }

  return <sup className="ml-0.5 text-red-500">*</sup>
}
