import { ModelTreeNode } from './model-tree-node.impl';
import { IModelTree, IModelTreeNode, ModelTreeNodeParams, ModelTreeNodeType } from './types';


export class ModelTreeComplexNode<T, K extends string, M> extends ModelTreeNode<T, K, M> {

  constructor(
    public readonly tree: IModelTree<T, K, M>,
    public readonly id: string = '#',
    public readonly kind: K,
    public readonly key: string | number = '',
    isCycle: boolean,
    params: ModelTreeNodeParams<T, K, M> & { type: Exclude<ModelTreeNodeType, 'simple'>; },
    children?: IModelTreeNode<T, K, M>[]
  ) {
    super(tree, id, kind, key, isCycle, params, children);
  }

  public createCycledClone(tree: IModelTree<T, K, M>, id: string, key: string | number, parent: IModelTreeNode<T, K, M> | null): IModelTreeNode<T, K, M> {
    const result = new ModelTreeComplexNode(tree, id, this.kind, key, true, {
      type: this.type as Exclude<ModelTreeNodeType, 'simple'>,
      value: this._value ?? undefined,
      parent: parent,
      newDataLevel: this.newDataLevel,
      // should be overriden in diff tree
      meta: this.meta,
    },
      this._children
    );
    result.nested = this.nested;
    return result;
  }

  public value(nestedId?: string): T | null {
    const nested = this.nestedNode(nestedId, true);
    return nested?.value() ?? null;
  }

  public children(nestedId?: string) {
    const nested = this.nestedNode(nestedId, true);
    return nested?.children() || [];
  }
}
