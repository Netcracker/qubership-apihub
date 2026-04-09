import { NodeId, NodeKey } from "../../../utility-types";
import { ComplexTreeNodeParams, ITreeNode, SimpleTreeNodeParams } from "./tree-node.interface";

export interface ITree<
  V extends object | null,
  K extends string,
  M extends object,
> {
  root: ITreeNode<V, K, M> | null;
  nodes: Map<NodeId, ITreeNode<V, K, M>>;

  createSimpleNode(
    id: NodeId,
    key: NodeKey,
    kind: K,
    isCycle: boolean,
    nodeParams: SimpleTreeNodeParams<V, K, M>,
  ): ITreeNode<V, K, M>

  createComplexNode(
    id: NodeId,
    key: NodeKey,
    kind: K,
    isCycle: boolean,
    nodeParams: ComplexTreeNodeParams<V, K, M>,
  ): ITreeNode<V, K, M>

  createCycledClone(
    sourceNode: ITreeNode<V, K, M>,
    cloneId: NodeId,
    cloneKey: NodeKey,
    cloneParent: ITreeNode<V, K, M> | null,
  ): ITreeNode<V, K, M>
}