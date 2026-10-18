import { Diff, DiffType } from '@netcracker/qubership-apihub-api-diff'
import { calcChanges, isCombinerNode, isDiff, isEqualSets, isObject, mergeSets } from '../utils'
import { DiffNodeMeta, DiffNodeValue, NodeChangesSummary } from './diff'
import { LazyBuildingContext } from './model/model-tree-node.impl'
import { IModelTreeNode } from './model/types'

// Diff Tree Utils

export class DiffTreeUtils {

  public changesSummary(node: IModelTreeNode<DiffNodeValue | null, string, DiffNodeMeta>, summary: NodeChangesSummary) {
    calcChanges(summary, node.meta.$metaChanges)
    calcChanges(summary, node.meta.$childrenChanges)
    calcChanges(summary, node.meta.$nestedChanges)

    if (node.type === 'simple') {
      // skip required changes
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { required, ...rest } = node.value()?.$changes ?? {}
      calcChanges(summary, rest)
    }
  }

  public totalChangesSummary(node: IModelTreeNode<DiffNodeValue | null, string, DiffNodeMeta>): NodeChangesSummary {
    const nodeChangesSummary = new Set<DiffType>()
    if (node.isCycle) {
      return nodeChangesSummary
    }
    this.changesSummary(node, nodeChangesSummary)
    if (!nodeChangesSummary.size) {
      return nodeChangesSummary
    }
    this.updateParentNodesChangesSummary(node, nodeChangesSummary)
    return nodeChangesSummary
  }

  public updateParentNodesChangesSummary(node: IModelTreeNode<DiffNodeValue | null, string, DiffNodeMeta>, summary: Set<DiffType>) {
    const parentNode = isCombinerNode(node) ? node.container : node.parent
    if (!parentNode) {
      return
    }
    if (isEqualSets(summary, parentNode.meta.$nodeChangesSummary)) {
      return
    }
    parentNode.meta.$nodeChangesSummary = mergeSets(summary, parentNode.meta.$nodeChangesSummary)
    this.updateParentNodesChangesSummary(parentNode, summary)
  }
}

export const DIFF_TREE_UTILS: DiffTreeUtils = new DiffTreeUtils()

/**
 * TODO 14.10.25
 *
 * New changes summary utils based on new approach of aggregating diffs
 * for the whole original specification.
 * 
 * Later when we will have only children diffs, we can use it as-is.
 * 
 * Now we can't differ between children diffs and the fragment own diffs.
 */

export class ChangesSummaryUtils {
  public static calculateNodeChangesSummary(
    node: IModelTreeNode<DiffNodeValue | null, string, DiffNodeMeta>,
    metaKey: symbol,
    lazyBuildingContext?: LazyBuildingContext<DiffNodeValue | null, string, DiffNodeMeta>,
  ): void {
    if (!lazyBuildingContext) {
      return
    }
    const { crawlValue } = lazyBuildingContext
    if (!hasAggregatedChildrenDiffs(crawlValue, metaKey)) {
      return
    }
    const aggregatedChildrenDiffs = crawlValue[metaKey]
    node.meta.$nodeChangesSummary = new Set<DiffType>(
      Array.from(aggregatedChildrenDiffs).map<DiffType>(diff => diff.type)
    )
  }
}

// Service type that only allows the specific symbolic key provided as generic parameter
type ValueWithAggregatedChildrenDiffs<SymbolKey extends symbol> = {
  [K in SymbolKey]: Set<Diff>
}

function hasAggregatedChildrenDiffs<S extends symbol>(
  value: unknown,
  metaKey: S,
): value is ValueWithAggregatedChildrenDiffs<S> {
  if (!isObject(value) || !value[metaKey]) {
    return false
  }
  const maybeAggregatedDiffs = value[metaKey]
  return isDiffsSet(maybeAggregatedDiffs)
}

function isDiffsSet(value: unknown): value is Set<Diff> {
  if (!(value instanceof Set)) {
    return false
  }
  for (const maybeDiff of (value as Set<unknown>)) {
    if (!maybeDiff || !isDiff(maybeDiff)) {
      return false
    }
  }
  return true
}
