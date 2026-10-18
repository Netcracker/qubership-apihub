import { JsonSchemaTreeNode } from "@apihub/next-data-model/model/json-schema/types/aliases"
import { JsonSchemaTreeNodeKind, JsonSchemaTreeNodeKinds } from "@apihub/next-data-model/model/json-schema/types/node-kind"
import { JsonSchemaCombinerRowVisibility } from "./types"

const COMBINER_KINDS: ReadonlySet<JsonSchemaTreeNodeKind> = new Set([
  JsonSchemaTreeNodeKinds.ALL_OF,
  JsonSchemaTreeNodeKinds.ANY_OF,
  JsonSchemaTreeNodeKinds.ONE_OF,
])

export class PlainCombinerNodeVisibilityManager {
  public resolveNodeVisibility(node: JsonSchemaTreeNode): JsonSchemaCombinerRowVisibility {
    const nestedNodes = node.nestedNodes()
    // Matches legacy: the selector renders even for a single variant (nothing to switch to,
    // but the option is still shown) - do not special-case "only one option" as hidden.
    const showSelector = nestedNodes.length > 0
    const showSubheader = nestedNodes.length > 0
    const isExpandable = !node.isCycle && nestedNodes.length > 0

    return {
      showSelector,
      showSubheader,
      isExpandable,
      initiallyExpanded: isExpandable && !node.isCycle,
    }
  }

  public isCombinerKind(kind: JsonSchemaTreeNodeKind): boolean {
    return COMBINER_KINDS.has(kind)
  }
}

const defaultInstance = new PlainCombinerNodeVisibilityManager()

export function resolvePlainCombinerNodeVisibility(
  node: JsonSchemaTreeNode,
): JsonSchemaCombinerRowVisibility {
  return defaultInstance.resolveNodeVisibility(node)
}

export function isPlainCombinerNodeKind(kind: JsonSchemaTreeNodeKind): boolean {
  return defaultInstance.isCombinerKind(kind)
}
