import { ITreeNode } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree/tree-node.interface"
import { hasNodeDiffs } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/row-diffs-base"
import { NodeDiffsSeverities } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"

/** Severities of a Security section node in a with-diffs tree (any API type); `undefined` in a plain tree. */
export function takeSecuritySeverities(node: ITreeNode | null | undefined): NodeDiffsSeverities | undefined {
  return node && hasNodeDiffs(node) ? node.diffsSeverities : undefined
}
