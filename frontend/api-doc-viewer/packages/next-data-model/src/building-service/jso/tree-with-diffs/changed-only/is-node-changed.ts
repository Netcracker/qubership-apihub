import { hasOwnChangeSignals } from "@apihub/next-data-model/model/abstract/tree-with-diffs/changed-only/has-own-change-signals"
import { JsoTreeNodeWithDiffs } from "@apihub/next-data-model/model/jso/types/aliases"
import { NodeId } from "@apihub/next-data-model/utility-types"

function isJsoNodeChangedInternal(node: JsoTreeNodeWithDiffs, visiting: Set<NodeId>): boolean {
  // A cycle clone shares its source's children: judge it by its own signals only.
  if (node.isCycle) {
    return hasOwnChangeSignals(node)
  }
  if (visiting.has(node.id)) {
    return false
  }
  visiting.add(node.id)
  try {
    return hasOwnChangeSignals(node)
      || node.childrenNodes().some((childNode) => isJsoNodeChangedInternal(childNode, visiting))
  } finally {
    visiting.delete(node.id)
  }
}

/**
 * A JSO node is changed when its own diff fields carry anything (a value diff, an inherited diff
 * of a wholly added / removed / type-changed parent, descendant diffs, a severity) or when any
 * node below it is changed. A node already on the current walk counts as unchanged.
 */
export function isJsoNodeChanged(node: JsoTreeNodeWithDiffs): boolean {
  return isJsoNodeChangedInternal(node, new Set())
}
