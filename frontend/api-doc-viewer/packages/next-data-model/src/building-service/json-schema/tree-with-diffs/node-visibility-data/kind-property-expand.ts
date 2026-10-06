import { JsonSchemaTreeNodeWithDiffs } from "@apihub/next-data-model/model/json-schema/types/aliases"
import { JsonSchemaTreeNodeKinds } from "@apihub/next-data-model/model/json-schema/types/node-kind"
import { isJsonSchemaNodeChanged } from "../changed-only/is-node-changed"
import {
  PlainPropertyExpandStateOptions,
  resolvePlainPropertyIsExpandable,
} from "../../tree/node-visibility-data/kind-property"

export type JsonSchemaPropertyInitiallyExpandedWithDiffsOptions = PlainPropertyExpandStateOptions & {
  hideUnchangedNodes: boolean
  isRoot?: boolean
}

export function resolveJsonSchemaPropertyInitiallyExpandedWithDiffs(
  node: JsonSchemaTreeNodeWithDiffs,
  options: JsonSchemaPropertyInitiallyExpandedWithDiffsOptions,
): boolean {
  if (node.isCycle) {
    return false
  }

  if (!resolvePlainPropertyIsExpandable(node)) {
    return true
  }

  if (options.hideUnchangedNodes) {
    if (options.isRoot || node.kind === JsonSchemaTreeNodeKinds.ROOT) {
      return true
    }
    return isJsonSchemaNodeChanged(node)
  }

  return options.level < options.expandedDepth
}
