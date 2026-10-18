import { NodeId, NodeKey } from "../../../utility-types";
import { SimpleTreeNode } from "./simple-node.impl";
import { ComplexTreeNodeParams, ITreeNode, TreeNodeComplexityTypes } from "./tree-node.interface";

export class ComplexTreeNode<
  V extends object | null,
  K extends string,
  M extends object,
> extends SimpleTreeNode<V, K, M> {

  public readonly type: typeof TreeNodeComplexityTypes.COMPLEX

  constructor(
    public readonly id: NodeId = '#',
    public readonly key: string | number = '',
    public readonly kind: K,
    isCycle: boolean,
    params: ComplexTreeNodeParams<V, K, M>,
  ) {
    super(id, key, kind, isCycle, params);
    this.type = params.type
  }

  public createCycledClone(
    id: NodeId,
    key: NodeKey,
    parent: ITreeNode<V, K, M> | null,
  ): ITreeNode<V, K, M> {
    const result = new ComplexTreeNode<V, K, M>(id, key, this.kind, true, {
      type: this.type,
      parent: parent,
      container: null,
      newDataLevel: this.newDataLevel,
      value: this._value !== null ? { ...this._value } : null,
      meta: { ...this._meta },
    });
    result.setChildrenNodes(this._childrenNodes);
    result.setNestedNodes(this._nestedNodes);
    return result;
  }

  public value(nestedNodeId?: NodeId): V | null {
    const nestedNode = this.findNestedNode(nestedNodeId, true);
    return nestedNode?.value() ?? null;
  }

  public childrenNodes(nestedNodeId?: NodeId) {
    const nestedNode = this.findNestedNode(nestedNodeId, true);
    return nestedNode?.childrenNodes() ?? [];
  }
}