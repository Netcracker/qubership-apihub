import { NodeId, NodeKey } from "../../../utility-types";
import { ComplexTreeNodeWithDiffs } from "./complex-node.impl";
import { SimpleTreeNodeWithDiffs } from "./simple-node.impl";
import { ComplexTreeNodeWithDiffsParams, ITreeNodeWithDiffs, SimpleTreeNodeWithDiffsParams } from "./tree-node.interface";
import { ITreeWithDiffs } from "./tree.interface";

export class TreeWithDiffs<
  V extends object | null,
  K extends string,
  M extends object,
  D extends object | null,
>
  implements ITreeWithDiffs<V, K, M, D> {
  public readonly nodes: Map<NodeId, ITreeNodeWithDiffs<V, K, M, D>> = new Map()

  constructor() {
  }

  public get root(): ITreeNodeWithDiffs<V, K, M, D> | null {
    return this.nodes.get('#') ?? null
  }

  public createSimpleNode(
    id: NodeId,
    key: NodeKey,
    kind: K,
    isCycle: boolean,
    nodeParams: SimpleTreeNodeWithDiffsParams<V, K, M, D>,
  ): ITreeNodeWithDiffs<V, K, M, D> {
    const node = new SimpleTreeNodeWithDiffs(id, key, kind, isCycle, nodeParams)
    this.nodes.set(id, node)
    return node
  }

  public createComplexNode(
    id: NodeId,
    key: NodeKey,
    kind: K,
    isCycle: boolean,
    nodeParams: ComplexTreeNodeWithDiffsParams<V, K, M, D>,
  ): ITreeNodeWithDiffs<V, K, M, D> {
    const node = new ComplexTreeNodeWithDiffs(id, key, kind, isCycle, nodeParams)
    this.nodes.set(id, node)
    return node
  }

  public createCycledClone(
    sourceNode: ITreeNodeWithDiffs<V, K, M, D>,
    cloneId: NodeId,
    cloneKey: NodeKey,
    cloneParent: ITreeNodeWithDiffs<V, K, M, D> | null,
  ): ITreeNodeWithDiffs<V, K, M, D> {
    const node = sourceNode.createCycledClone(cloneId, cloneKey, cloneParent)
    this.nodes.set(cloneId, node)
    return node
  }
}
