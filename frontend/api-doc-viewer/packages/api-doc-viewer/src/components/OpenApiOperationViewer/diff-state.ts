import { NodeDiffsSeverities } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { OpenApiTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/openapi/types/aliases"
import { isOpenApiTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/shared/openapi/guards/tree-node"

/** Severities of a node in a with-diffs tree; `undefined` in a plain tree. */
export function takeOpenApiSeverities(node: OpenApiTreeNode | null | undefined): NodeDiffsSeverities | undefined {
  return node && isOpenApiTreeNodeWithDiffs(node) ? node.diffsSeverities : undefined
}
