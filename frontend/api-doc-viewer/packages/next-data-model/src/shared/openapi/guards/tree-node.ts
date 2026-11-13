import { OpenApiTreeNode, OpenApiTreeNodeWithDiffs } from "../../../model/openapi/types/aliases"

export function isOpenApiTreeNodeWithDiffs(node: OpenApiTreeNode): node is OpenApiTreeNodeWithDiffs {
  return (
    'diffs' in node &&
    'diffsSummary' in node &&
    'descendantDiffs' in node &&
    'descendantDiffsSummary' in node &&
    'diffsSeverities' in node
  )
}
