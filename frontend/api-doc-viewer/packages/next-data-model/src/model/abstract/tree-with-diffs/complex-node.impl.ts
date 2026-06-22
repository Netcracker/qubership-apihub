import { NodeId, NodeKey } from "../../../utility-types";
import { TreeNodeComplexityTypes } from "../tree/tree-node.interface";
import { SimpleTreeNodeWithDiffs } from "./simple-node.impl";
import { ComplexTreeNodeWithDiffsParams, ITreeNodeWithDiffs } from "./tree-node.interface";

export class ComplexTreeNodeWithDiffs<
  V extends object | null,
  K extends string,
  M extends object,
  D extends object | null,
> extends SimpleTreeNodeWithDiffs<V, K, M, D> {

  public readonly type: typeof TreeNodeComplexityTypes.COMPLEX

  constructor(
    public readonly id: NodeId = '#',
    public readonly key: string | number = '',
    public readonly kind: K,
    isCycle: boolean,
    params: ComplexTreeNodeWithDiffsParams<V, K, M, D>,
  ) {
    super(id, key, kind, isCycle, params);
    this.type = params.type
  }

  public createCycledClone(
    id: NodeId,
    key: NodeKey,
    parent: ITreeNodeWithDiffs<V, K, M, D> | null,
  ): ITreeNodeWithDiffs<V, K, M, D> {
    const result = new ComplexTreeNodeWithDiffs<V, K, M, D>(id, key, this.kind, true, {
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