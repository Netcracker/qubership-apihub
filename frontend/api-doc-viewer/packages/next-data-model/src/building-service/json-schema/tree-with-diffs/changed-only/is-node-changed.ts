import { TreeNodeComplexityTypes } from "@apihub/next-data-model/model/abstract/tree/tree-node.interface"
import { JsonSchemaTreeNodeWithDiffs } from "@apihub/next-data-model/model/json-schema/types/aliases"
import { NodeId } from "@apihub/next-data-model/utility-types"
import { hasOwnChangeSignals } from "./has-own-change-signals"

type VisitState = {
  visiting: Set<NodeId>
}

function isJsonSchemaNodeChangedInternal(
  node: JsonSchemaTreeNodeWithDiffs,
  state: VisitState,
): boolean {
  if (node.isCycle) {
    return hasOwnChangeSignals(node)
  }

  if (state.visiting.has(node.id)) {
    return false
  }

  state.visiting.add(node.id)

  try {
    if (hasOwnChangeSignals(node)) {
      return true
    }

    if (node.type === TreeNodeComplexityTypes.COMPLEX) {
      return node.nestedNodes().some((nestedNode) => (
        isJsonSchemaNodeChangedInternal(nestedNode, state)
      ))
    }

    return node.childrenNodes().some((childNode) => (
      isJsonSchemaNodeChangedInternal(childNode, state)
    ))
  } finally {
    state.visiting.delete(node.id)
  }
}

export function isJsonSchemaNodeChanged(node: JsonSchemaTreeNodeWithDiffs): boolean {
  return isJsonSchemaNodeChangedInternal(node, { visiting: new Set() })
}
