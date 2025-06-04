import { ModelTreeComplexNode } from './model-tree-complex-node.impl';
import { ModelTreeNode } from './model-tree-node.impl';
import { IModelTree, IModelTreeNode, ModelTreeNodeParams, ModelTreeNodeType } from './types';

export class ModelTree<T, K extends string, M> implements IModelTree<T, K, M> {
  public nodes: Map<string, IModelTreeNode<T, K, M>> = new Map();

  get root() {
    return this.nodes.size ? this.nodes.get('#')! : null;
  }

  public createNode(id: string, kind: K, key: string | number, isCycle: boolean, params?: ModelTreeNodeParams<T, K, M>): ModelTreeNode<T, K, M> {
    const node = new ModelTreeNode<T, K, M>(id, kind, key, isCycle, params);
    this.nodes.set(id, node);
    return node;
  }

  public createComplexNode(id: string, kind: K, key: string | number, isCycle: boolean, params: ModelTreeNodeParams<T, K, M> & {
    type: Exclude<ModelTreeNodeType, 'simple'>;
  }): ModelTreeComplexNode<T, K, M> {
    const node = new ModelTreeComplexNode<T, K, M>(id, kind, key, isCycle, params);
    this.nodes.set(id, node);
    return node;
  }

  public createCycledClone<Node extends IModelTreeNode<T, K, M>>(source: Node, id: string, key: string | number, parent: IModelTreeNode<T, K, M> | null): Node {
    const node = source.createCycledClone(id, key, parent);
    this.nodes.set(node.id, node);
    return node as Node;
  }
}
