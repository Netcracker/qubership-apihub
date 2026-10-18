import { JsonSchemaTreeNode, JsonSchemaTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/aliases"
import { createContext, useContext } from "react"
import { TopLevelPropsMediaTypesMap } from "./utils/top-level-props-media-types"

export type JsonSchemaViewerContextValue = {
  expandedDepth: number
  materializeChildren: (node: JsonSchemaTreeNode | JsonSchemaTreeNodeWithDiffs) => void
  /** Bumped after lazy materialization so viewers re-read `childrenNodes()`. */
  treeRevision: number
  /** Plain viewer only - see docs/design/json-schema/features/top-level-props-media-types.md */
  topLevelPropsMediaTypes?: TopLevelPropsMediaTypesMap
}

export const JsonSchemaViewerContext = createContext<JsonSchemaViewerContextValue | null>(null)

export function useJsonSchemaViewerContext(): JsonSchemaViewerContextValue {
  const context = useContext(JsonSchemaViewerContext)
  if (!context) {
    throw new Error("useJsonSchemaViewerContext must be used within JsonSchemaViewer")
  }
  return context
}
