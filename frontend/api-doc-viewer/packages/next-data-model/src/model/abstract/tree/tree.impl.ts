import { NodeId, NodeKey } from "../../../utility-types";
import { ComplexTreeNode } from "./complex-node.impl";
import { SimpleTreeNode } from "./simple-node.impl";
import { ComplexTreeNodeParams, ITreeNode, SimpleTreeNodeParams } from "./tree-node.interface";
import { ITree } from "./tree.interface";

export class Tree<
  V extends object | null,
  K extends string,
  M extends object,
>
  implements ITree<V, K, M> {
  public readonly nodes: Map<NodeId, ITreeNode<V, K, M>> = new Map()

  constructor() {
  }

  public get root(): ITreeNode<V, K, M> | null {
    return this.nodes.get('#') ?? null
  }

  public createSimpleNode(
    id: NodeId,
    key: NodeKey,
    kind: K,
    isCycle: boolean,
    nodeParams: SimpleTreeNodeParams<V, K, M>,
  ): ITreeNode<V, K, M> {
    const node = new SimpleTreeNode(id, key, kind, isCycle, nodeParams)
    this.nodes.set(id, node)
    return node
  }

  public createComplexNode(
    id: NodeId,
    key: NodeKey,
    kind: K,
    isCycle: boolean,
    nodeParams: ComplexTreeNodeParams<V, K, M>,
  ): ITreeNode<V, K, M> {
    const node = new ComplexTreeNode(id, key, kind, isCycle, nodeParams)
    this.nodes.set(id, node)
    return node
  }

  public createCycledClone(
    sourceNode: ITreeNode<V, K, M>,
    cloneId: NodeId,
    cloneKey: NodeKey,
    cloneParent: ITreeNode<V, K, M> | null,
  ): ITreeNode<V, K, M> {
    const node = sourceNode.createCycledClone(cloneId, cloneKey, cloneParent)
    this.nodes.set(cloneId, node)
    return node
  }
}
