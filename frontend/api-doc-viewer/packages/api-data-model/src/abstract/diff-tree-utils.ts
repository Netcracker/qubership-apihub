import { DiffType } from '@netcracker/qubership-apihub-api-diff';
import { calcChanges, isCombinerNode, isEqualSets, mergeSets } from '../utils';
import { DiffNodeMeta, DiffNodeValue, NodeChangesSummary } from './diff';
import { IModelTreeNode } from './model/types';

// Diff Tree Utils

export class DiffTreeUtils {

  public changesSummary(node: IModelTreeNode<DiffNodeValue | null, string, DiffNodeMeta>, summary: NodeChangesSummary) {
    calcChanges(summary, node.meta.$metaChanges)
    calcChanges(summary, node.meta.$childrenChanges)
    calcChanges(summary, node.meta.$nestedChanges)

    if (node.type === 'simple') {
      // skip required changes
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
