import { NodeId, NodeKey } from "@apihub/next-data-model/utility-types"
import { ITree } from "../tree/tree.interface"
import { ComplexTreeNodeWithDiffsParams, ITreeNodeWithDiffs, SimpleTreeNodeWithDiffsParams } from "./tree-node.interface"

export interface ITreeWithDiffs<
  V extends object | null,
  K extends string,
  M extends object,
  D extends object | null,
> extends ITree<V, K, M> {
  root: ITreeNodeWithDiffs<V, K, M, D> | null
  nodes: Map<NodeId, ITreeNodeWithDiffs<V, K, M, D>>

  createSimpleNode(
    id: NodeId,
    key: NodeKey,
    kind: K,
    isCycle: boolean,
    nodeParams: SimpleTreeNodeWithDiffsParams<V, K, M, D>,
  ): ITreeNodeWithDiffs<V, K, M, D>

  createComplexNode(
    id: NodeId,
    key: NodeKey,
    kind: K,
    isCycle: boolean,
    nodeParams: ComplexTreeNodeWithDiffsParams<V, K, M, D>,
  ): ITreeNodeWithDiffs<V, K, M, D>

  createCycledClone(
    sourceNode: ITreeNodeWithDiffs<V, K, M, D>,
    cloneId: NodeId,
    cloneKey: NodeKey,
    cloneParent: ITreeNodeWithDiffs<V, K, M, D> | null,
  ): ITreeNodeWithDiffs<V, K, M, D>
}
