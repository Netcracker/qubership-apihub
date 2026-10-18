import { DdlApiTreeNode, DdlApiTreeNodeWithDiffs } from "@apihub/next-data-model/model/ddlapi/types/aliases"

export function isDdlApiTreeNodeWithDiffs(node: DdlApiTreeNode): node is DdlApiTreeNodeWithDiffs {
  return (
    'diffs' in node &&
    'diffsSummary' in node &&
    'descendantDiffs' in node &&
    'descendantDiffsSummary' in node &&
    'diffsSeverities' in node
  )
}
