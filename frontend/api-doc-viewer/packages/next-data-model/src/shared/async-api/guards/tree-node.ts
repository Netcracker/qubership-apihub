import { AsyncApiTreeNode, AsyncApiTreeNodeWithDiffs } from "@apihub/next-data-model/model/async-api/types/aliases"

export function isAsyncApiTreeNodeWithDiffs(node: AsyncApiTreeNode): node is AsyncApiTreeNodeWithDiffs {
  return (
    'diffs' in node &&
    'diffsSummary' in node &&
    'descendantDiffs' in node &&
    'descendantDiffsSummary' in node &&
    'diffsSeverities' in node
  )
}
