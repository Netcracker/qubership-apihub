import { ModelTreeComplexNode } from './model-tree-complex-node.impl';
import { LazyBuildingContext, ModelTreeNode } from './model-tree-node.impl';
import { IModelTree, IModelTreeNode, ModelTreeNodeParams, ModelTreeNodeType } from './types';

export class ModelTree<T, K extends string, M> implements IModelTree<T, K, M> {
  public nodes: Map<string, IModelTreeNode<T, K, M>> = new Map();

  get root() {
    return this.nodes.size ? this.nodes.get('#')! : null;
  }

  /**
   * This function adds unique numeric suffix for node ID if such ID is already exists.
   * It is necessary for cases of changes types (e.g. object -> interface),
   * because types may have properties/methods with the same names, and we have to differ them.
   * @param idCandidate build ID from candidate
   * @returns idCandidate with or without numeric suffix
   */
  public nextId(idCandidate: string): string {
    if (!this.nodes.has(idCandidate)) {
      return idCandidate
    }
    for (let i = 1; i < Number.MAX_SAFE_INTEGER; i++) {
      const nextIdCandidate = `${idCandidate}$${i}`
      if (!this.nodes.has(nextIdCandidate)) {
        return nextIdCandidate
      }
    }
    // actually, unreachable, but necessary code
    return idCandidate
  }

  public createNode(
    id: string,
    kind: K,
    key: string | number,
    isCycle: boolean,
    params?: ModelTreeNodeParams<T, K, M>,
    lazyBuildingContext?: LazyBuildingContext<T, K, M>,
  ): ModelTreeNode<T, K, M> {
    const node = new ModelTreeNode<T, K, M>(id, kind, key, isCycle, params, lazyBuildingContext);
    this.nodes.set(id, node);
    return node;
  }

  public createComplexNode(
    id: string,
    kind: K,
    key: string | number,
    isCycle: boolean,
    params: ModelTreeNodeParams<T, K, M> & { type: Exclude<ModelTreeNodeType, 'simple'> },
    lazyBuildingContext?: LazyBuildingContext<T, K, M>,
  ): ModelTreeComplexNode<T, K, M> {
    const node = new ModelTreeComplexNode<T, K, M>(id, kind, key, isCycle, params, lazyBuildingContext);
    this.nodes.set(id, node);
    return node;
  }

  public createCycledClone<Node extends IModelTreeNode<T, K, M>>(source: Node, id: string, key: string | number, parent: IModelTreeNode<T, K, M> | null): Node {
    const node = source.createCycledClone(this, id, key, parent);
    this.nodes.set(node.id, node);
    return node as Node;
  }
}
