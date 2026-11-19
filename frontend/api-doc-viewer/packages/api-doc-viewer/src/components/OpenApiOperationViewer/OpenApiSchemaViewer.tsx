import { SUPPRESS_ROOT_NESTING_INDICATOR_CUSTOMIZATION_OPTIONS } from "@apihub/contexts/CustomizationOptionsContext"
import { useDiffMetaKeys } from "@apihub/contexts/DiffMetaKeysContext"
import { useDiffTypes } from "@apihub/contexts/DiffTypesContext"
import { useDisplayMode } from "@apihub/contexts/DisplayModeContext"
import { useLayoutMode } from "@apihub/contexts/LayoutModeContext"
import { SIDE_BY_SIDE_DIFFS_LAYOUT_MODE } from "@apihub/types/LayoutMode"
import { FC } from "react"
import { JsonSchemaDiffsViewer } from "../JsonSchemaViewer/JsonSchemaDiffsViewer"
import { JsonSchemaViewer } from "../JsonSchemaViewer/JsonSchemaViewer"
import { PrecededBy } from "../shared-components/WithPrecededByProps"
import { useOpenApiViewerContext } from "./OpenApiViewerContext"

type OpenApiSchemaViewerProps = {
  /** Plain or merged JSON Schema, already prepared (synthesized / wrapped) by the data layer or the caller. */
  schema: unknown
}

/**
 * The nested JSON Schema viewer of every OpenAPI section (parameters, headers, bodies): the plain or
 * the diffs viewer by layout mode, with the root viewer's `expandedDepth` / `hideUnchangedNodes`.
 * It always follows an OpenAPI row of its own block, so its first row takes the in-block half-gap.
 */
export const OpenApiSchemaViewer: FC<OpenApiSchemaViewerProps> = ({ schema }) => {
  const layoutMode = useLayoutMode()
  const displayMode = useDisplayMode()
  const diffMetaKeys = useDiffMetaKeys()
  const diffTypes = useDiffTypes()
  const { expandedDepth, hideUnchangedNodes } = useOpenApiViewerContext()

  if (schema === undefined) {
    return null
  }
  if (layoutMode === SIDE_BY_SIDE_DIFFS_LAYOUT_MODE) {
    return diffMetaKeys
      ? (
        <JsonSchemaDiffsViewer
          firstRowPrecededBy={PrecededBy.SEPARATOR_LAYOUT_NESTED_VIEWER_START}
          schema={schema}
          displayMode={displayMode}
          diffMetaKeys={diffMetaKeys}
          diffTypes={diffTypes}
          expandedDepth={expandedDepth}
          hideUnchangedNodes={hideUnchangedNodes}
          customizationOptions={SUPPRESS_ROOT_NESTING_INDICATOR_CUSTOMIZATION_OPTIONS}
        />
      )
      : null
  }
  return (
    <JsonSchemaViewer
      firstRowPrecededBy={PrecededBy.SEPARATOR_LAYOUT_NESTED_VIEWER_START}
      schema={schema}
      displayMode={displayMode}
      expandedDepth={expandedDepth}
      customizationOptions={SUPPRESS_ROOT_NESTING_INDICATOR_CUSTOMIZATION_OPTIONS}
    />
  )
}
