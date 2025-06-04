import { JsonPath } from '@netcracker/qubership-apihub-json-crawl';
import { modelTreeNodeType } from "../constants";
import { ModelTreeComplexNode } from './model-tree-complex-node.impl';
import { IModelTreeNode, ModelTreeNodeType, ModelTreeNodeParams } from './types';


export class ModelTreeNode<T, K extends string, M> implements IModelTreeNode<T, K, M> {
  public nested: IModelTreeNode<T, K, M>[] = [];
  protected readonly _value: T | null = null;
  public readonly parent: IModelTreeNode<T, K, M> | null = null;
  public readonly container: IModelTreeNode<T, K, M> | null = null;
  public readonly meta: M = {} as M;
  public readonly newDataLevel: boolean;

  public readonly type: ModelTreeNodeType = modelTreeNodeType.simple;

  constructor(
    public readonly id: string = '#',
    public readonly kind: K,
    public readonly key: string | number = '',
    public readonly isCycle: boolean,
    params?: ModelTreeNodeParams<T, K, M>,
    protected readonly _children: IModelTreeNode<T, K, M>[] = []
  ) {
    const {
      type = modelTreeNodeType.simple, value = null, parent = null, container = null, newDataLevel = true, meta
    } = params ?? {};
    this._value = value;
    this.type = type;
    this.parent = parent;
    this.container = container;
    this.newDataLevel = newDataLevel;
    this.meta = meta as M;
  }

  public createCycledClone(id: string, key: string | number, parent: IModelTreeNode<T, K, M> | null): IModelTreeNode<T, K, M> {
    const result = new ModelTreeNode(id, this.kind, key, true, {
      type: this.type,
      value: this._value ?? undefined,
      parent: parent,
      newDataLevel: this.newDataLevel,
      meta: { ...this.meta },
    }, this._children);
    result.nested = this.nested;
    return result;
  }

  public get path(): JsonPath {
    return this.parent === null ? [] : [...this.parent.path, this.key];
  }

  public get depth(): number {
    return this.parent === null ? 0 : this.parent.depth + (this.newDataLevel ? 1 : 0);
  }

  public nestedNode(nestedId?: string, deep = false): IModelTreeNode<T, K, M> | null {
    if (!nestedId && this.nested.length) {
      return this.nested[0];
    }

    for (const nested of this.nested) {
      if (nested.id === nestedId) {
        return nested;
      }
      if (deep && nested instanceof ModelTreeComplexNode) {
        const node = nested.nestedNode(nestedId, deep);
        if (node) {
          return node;
        }
      }
    }

    return null;
  }

  public value(nestedId?: string): T | null {
    return nestedId ? null : this._value;
  }

  public children(nestedId?: string) {
    return nestedId ? [] : this._children;
  }

  public addChild(node: IModelTreeNode<T, K, M>) {
    this._children.push(node);
  }

  public addNestedNode(node: IModelTreeNode<T, K, M>) {
    this.nested.push(node);
  }
}
