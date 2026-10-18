import { SelectorOption } from "@apihub/components/shared-components/Selector/Selector"
import { isPlainCombinerNodeKind } from "@netcracker/qubership-apihub-next-data-model/building-service/json-schema/tree/node-visibility-data/kind-combiner"
import { resolvePlainCombinerNodeVisibility } from "@netcracker/qubership-apihub-next-data-model/building-service/json-schema/tree/node-visibility-data/kind-combiner"
import { TreeNodeComplexityTypes } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree/tree-node.interface"
import { resolveJsonSchemaTypeLabel } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/type-label"
import { JsonSchemaRowDiffs } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/tree-with-diffs/property-row-diffs"
import { JsonSchemaTreeNode, JsonSchemaTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/aliases"
import { JsonSchemaTreeNodeKind } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/node-kind"
import { JsonSchemaTreeNodeValue } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/node-value"
import { isJsonSchemaTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/shared/json-schema/guards/tree-node"
import { isJsonSchemaComplexValue } from "@netcracker/qubership-apihub-next-data-model/shared/json-schema/guards/schema-value"
import { isObject } from "@netcracker/qubership-apihub-next-data-model/utilities"
import { NodeId } from "@netcracker/qubership-apihub-next-data-model/utility-types"
import { JsonSchemaNodeTypeCheckers } from "./node-type-checkers"

export type CombinerSelections = ReadonlyMap<NodeId, NodeId>

export type CombinerSelectorLevel<N extends JsonSchemaTreeNode = JsonSchemaTreeNode> = {
  combinerNode: N
  nestedNodes: N[]
  selectedNestedNode: N
  showSelector: boolean
  combinerKindLabel: string | undefined
}

/**
 * Shared combiner-node reads used by every sub-domain class below. All three members here are
 * `public` (not `protected`) because they are also genuine external entry points in their own
 * right - `JsonSchemaNodeViewer[WithDiffs]` call `isOwnerNode` directly to decide whether to
 * render a combiner or a plain schema node, and `resolveNestingIndicatorTitle` has its own
 * dedicated unit test - so `JsonSchemaCombiner` itself extends this base to re-expose them at the
 * top level alongside the nested `Display`/`Selection`/`NodeDiffs` sub-domains.
 */
abstract class JsonSchemaCombinerBase {
  public static isOwnerNode(node: JsonSchemaTreeNode): boolean {
    if (node.type !== TreeNodeComplexityTypes.COMPLEX) {
      return false
    }

    const nestedNodes = node.nestedNodes()
    if (nestedNodes.length === 0) {
      return false
    }

    if (JsonSchemaNodeTypeCheckers.isRootNode(node)) {
      return true
    }

    return nestedNodes.every((nestedNode) => this.isNestedKind(nestedNode.kind))
  }

  public static isNestedKind(kind: JsonSchemaTreeNodeKind): boolean {
    return isPlainCombinerNodeKind(kind)
  }

  public static resolveNestingIndicatorTitle(node: JsonSchemaTreeNode): string | undefined {
    const nestedNodes = node.nestedNodes()
    const combinerKind = nestedNodes[0]?.kind
    if (!combinerKind || !this.isNestedKind(combinerKind)) {
      return undefined
    }
    return combinerKind
  }
}

class Display extends JsonSchemaCombinerBase {
  public static resolveBranchValue(
    node: JsonSchemaTreeNode,
  ): JsonSchemaTreeNodeValue | null {
    const directValue = node.value()
    if (directValue !== null) {
      return typeof directValue === "boolean" ? null : directValue
    }

    const fragment = node.meta()?._fragment
    if (!isObject(fragment) || isJsonSchemaComplexValue(fragment)) {
      return null
    }

    return fragment as JsonSchemaTreeNodeValue
  }

  /**
   * `N`'s own `childrenNodes()`/`nestedNodes()` always return nodes of that same concrete type at
   * runtime (a same-kind tree), but `ITreeNode` cannot express "returns `this`'s own type" for
   * these methods - {@link Selection.resolveActiveLeafNode} bridges the same way, for the same
   * reason.
   */
  public static resolveLeafStructuralChildren<N extends JsonSchemaTreeNode>(
    node: N,
  ): N[] {
    if (node.type === TreeNodeComplexityTypes.SIMPLE) {
      return node.childrenNodes() as N[]
    }

    const nestedNodes = node.nestedNodes() as N[]
    if (nestedNodes.length > 0 && nestedNodes.every((nestedNode) => !this.isNestedKind(nestedNode.kind))) {
      return nestedNodes
    }

    return node.childrenNodes() as N[]
  }
}

class Selection extends JsonSchemaCombinerBase {
  private static resolveSelectedNestedNode<N extends JsonSchemaTreeNode>(
    combinerNode: N,
    nestedNodes: N[],
    selections: CombinerSelections,
  ): N | undefined {
    const selectedId = selections.get(combinerNode.id)
    if (selectedId) {
      const explicitMatch = nestedNodes.find((nestedNode) => nestedNode.id === selectedId)
      if (explicitMatch) {
        return explicitMatch
      }
    }
    return nestedNodes[0]
  }

  public static resolveSelectorLevels<N extends JsonSchemaTreeNode>(
    complexNode: N,
    selections: CombinerSelections,
  ): CombinerSelectorLevel<N>[] {
    const levels: CombinerSelectorLevel<N>[] = []
    let currentCombinerNode: N | null = complexNode

    while (currentCombinerNode && this.isOwnerNode(currentCombinerNode)) {
      const nestedNodes = currentCombinerNode.nestedNodes() as N[]
      const selectedNestedNode: N | undefined = this.resolveSelectedNestedNode(
        currentCombinerNode,
        nestedNodes,
        selections,
      )
      if (!selectedNestedNode) {
        break
      }

      const visibility = resolvePlainCombinerNodeVisibility(currentCombinerNode)
      levels.push({
        combinerNode: currentCombinerNode,
        nestedNodes,
        selectedNestedNode,
        showSelector: visibility.showSelector,
        combinerKindLabel: this.resolveNestingIndicatorTitle(currentCombinerNode),
      })

      if (this.isOwnerNode(selectedNestedNode)) {
        currentCombinerNode = selectedNestedNode
        continue
      }

      break
    }

    return levels
  }

  public static resolveActiveLeafNode<N extends JsonSchemaTreeNode>(
    complexNode: N,
    selections: CombinerSelections,
  ): N {
    let current: N = complexNode

    while (this.isOwnerNode(current)) {
      const nestedNodes = current.nestedNodes() as N[]
      const branch: N | undefined = this.resolveSelectedNestedNode(current, nestedNodes, selections)
      if (!branch) {
        break
      }
      current = branch
    }

    return current
  }

  private static readonly EMPTY_SELECTIONS: CombinerSelections = new Map()

  /**
   * The leaf reached from `node` by always taking the first nested-combiner variant at every
   * level (ignoring any live user selection) - i.e. what an as-yet-unselected combiner option's
   * own type value would resolve to, recursively through nested combiners. Reuses
   * {@link resolveActiveLeafNode} with an empty selections map, since `resolveSelectedNestedNode`
   * already falls back to `nestedNodes[0]` when no selection is recorded for a given combiner id.
   */
  public static resolveOptionLeafNode<N extends JsonSchemaTreeNode>(node: N): N {
    return this.resolveActiveLeafNode(node, this.EMPTY_SELECTIONS)
  }

  public static applySelection(
    complexNode: JsonSchemaTreeNode,
    selections: CombinerSelections,
    combinerNodeId: NodeId,
    selectedNestedNodeId: NodeId,
  ): CombinerSelections {
    const nextSelections = new Map(selections)
    nextSelections.set(combinerNodeId, selectedNestedNodeId)

    const activePathCombinerIds = new Set(
      this.resolveSelectorLevels(complexNode, nextSelections).map((level) => level.combinerNode.id),
    )

    for (const combinerId of nextSelections.keys()) {
      if (!activePathCombinerIds.has(combinerId)) {
        nextSelections.delete(combinerId)
      }
    }

    return nextSelections
  }
}

class NodeDiffs extends JsonSchemaCombinerBase {
  /**
   * A combiner variant can itself be a nested combiner (e.g. a `oneOf` branch that is itself
   * `{ oneOf: [...] }`). The plain type-label resolution drills straight through to that nested
   * combiner's own first variant (via `Display.resolveBranchValue`'s `_fragment` proxy), so
   * without this suffix the option button reads as a leaf type when it actually opens another
   * selector. Applies recursively at any nesting depth - each option only reports its own
   * immediate nested-combiner kind, not the kind of combiners further down.
   */
  public static resolveOptionTitleSuffix(
    nestedNode: JsonSchemaTreeNode | JsonSchemaTreeNodeWithDiffs,
  ): string {
    if (!this.isOwnerNode(nestedNode)) {
      return ""
    }
    const nestedCombinerKind = this.resolveNestingIndicatorTitle(nestedNode)
    return nestedCombinerKind ? ` (${nestedCombinerKind})` : ""
  }

  /**
   * `title` defaults to the plain type-label + combiner-kind-suffix string (used as-is by tests
   * and any non-UI caller); the view layer overrides it with a rich, diff-aware render function
   * built from the shared TypeValue component stack - see `CombinerNodeViewer.tsx` and
   * `TypeValue/JsonSchemaCombinerOptionTypeValue[WithDiffs].tsx`.
   */
  public static buildSelectorOption<N extends JsonSchemaTreeNode | JsonSchemaTreeNodeWithDiffs>(
    nestedNode: N,
    index: number,
    title: SelectorOption<N>["title"] = (
      resolveJsonSchemaTypeLabel(
        Display.resolveBranchValue(nestedNode),
        nestedNode.meta(),
      ) + this.resolveOptionTitleSuffix(nestedNode)
    ),
  ): SelectorOption<N> {
    const baseOption: SelectorOption<N> = {
      title,
      node: nestedNode,
      testId: `json-schema-combiner-option-${index}`,
    }

    if (!isJsonSchemaTreeNodeWithDiffs(nestedNode)) {
      return baseOption
    }

    const whollyAddedOrRemoved = JsonSchemaRowDiffs.NodeLevel.isWholePropertyAddOrRemove(nestedNode)

    return {
      ...baseOption,
      diffs: nestedNode.diffs,
      ...(whollyAddedOrRemoved
        ? {}
        : {
          diffsSummary: nestedNode.diffsSummary,
          descendantDiffsSummary: nestedNode.descendantDiffsSummary,
        }),
    }
  }
}

/**
 * Palette of every combiner-domain (`oneOf`/`anyOf`/`allOf`) view helper, grouped two levels
 * deep like `JsonSchemaRowDiffs`: `isOwnerNode`/`isNestedKind` are top-level (inherited from
 * {@link JsonSchemaCombinerBase}, which this class also extends) since they are called directly
 * by `JsonSchemaNodeViewer[WithDiffs]`, while `Display`/`Selection`/`NodeDiffs` scope their own
 * sub-domain (e.g. `JsonSchemaCombiner.Selection.resolveSelectorLevels(...)`).
 */
export class JsonSchemaCombiner extends JsonSchemaCombinerBase {
  public static readonly Display = Display
  public static readonly Selection = Selection
  public static readonly NodeDiffs = NodeDiffs
}
