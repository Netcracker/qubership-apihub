import { CrawlRules, isObject, JsonPath, syncCrawl, SyncCrawlHook } from '@netcracker/qubership-apihub-json-crawl';
import { modelTreeNodeType } from "../constants";
import { ModelTreeComplexNode } from './model-tree-complex-node.impl';
import { FilterChildrenByCondition, IModelTree, IModelTreeNode, ModelTreeNodeParams, ModelTreeNodeType } from './types';
import { ExpandingCallback, SchemaCrawlRule } from "../types";
import { ModelTree } from './model-tree.impl';

/* Feature "Lazy Tree Building" */
type CrawlValue = unknown

type LazyBuildingCrawlRule<T, K extends string, M> = SchemaCrawlRule<K, LazyBuildingCrawlState<T, K, M>>

export type LazyBuildingContext<T, K extends string, M> = {
  tree: ModelTree<T, K, M>
  crawlValue: CrawlValue,
  crawlHooks: SyncCrawlHook<any, any> | SyncCrawlHook<any, any>[]
  crawlRules: CrawlRules<LazyBuildingCrawlRule<T, K, M>> | undefined
  alreadyConvertedMappingStack: Map<CrawlValue, ModelTreeNode<T, K, M> | ModelTreeComplexNode<T, K, M> | null>,
  nodeIdPrefix: string,
  nextLevel: number,
  nextMaxLevel: number,
}

type LazyBuildingCrawlState<T, K extends string, M> = {
  parent: IModelTreeNode<T, K, M> | null
  container?: IModelTreeNode<T, K, M>
  alreadyConvertedMappingStack: Map<unknown, IModelTreeNode<T, K, M> | null>,
  nodeIdPrefix: string,
  treeLevel: number, // current tree level
  maxTreeLevel: number, // this level will have no children/nested nodes until they're lazy-built
}
/* --- */

export class ModelTreeNode<T, K extends string, M> implements IModelTreeNode<T, K, M> {
  public nested: IModelTreeNode<T, K, M>[] = [];
  protected readonly _value: T | null = null;
  public readonly parent: IModelTreeNode<T, K, M> | null = null;
  public readonly container: IModelTreeNode<T, K, M> | null = null;
  public readonly meta: M = {} as M;
  public readonly newDataLevel: boolean;

  public readonly type: ModelTreeNodeType = modelTreeNodeType.simple;

  /* Feature "Lazy Tree Building" */
  private readonly _expandingCallback: ExpandingCallback | null = null;

  public expand() {
    if (this._children.length > 0) {
      return this
    }
    if (this.type === 'simple') {
      this._expandingCallback?.()
    } else {
      this.nested.forEach(nestedNode => nestedNode.expand())
    }
    return this
  }

  public collapse() {
    this._children.length = 0
    return this
  }

  public removeChildrenByCondition(filter: FilterChildrenByCondition<T, K, M>): void {
    if (this.type === 'simple' && this._children.length) {
      const newChildren = this._children.filter(filter)
      this._children.splice(0, this._children.length)
      this._children.push(...newChildren)
    }
  }
  /* --- */

  constructor(
    public readonly id: string = '#',
    public readonly kind: K,
    public readonly key: string | number = '',
    public readonly isCycle: boolean,
    params?: ModelTreeNodeParams<T, K, M>,
    /* Feature "Lazy Tree Building" */
    lazyBuildingContext?: LazyBuildingContext<T, K, M>,
    /* --- */
    protected readonly _children: IModelTreeNode<T, K, M>[] = []
  ) {
    const {
      type = modelTreeNodeType.simple,
      value = null,
      parent = null,
      container = null,
      newDataLevel = true,
      meta,
    } = params ?? {};
    this._value = value;
    this.type = type;
    this.parent = parent;
    this.container = container;
    this.newDataLevel = newDataLevel;
    this.meta = meta as M;
    /* Feature "Lazy Tree Building" */
    const isSimpleNode = this.type === 'simple'
    if (lazyBuildingContext) {
      const {
        crawlValue,
        crawlHooks,
        crawlRules,
        alreadyConvertedMappingStack,
        nodeIdPrefix,
        nextLevel,
        nextMaxLevel,
      } = lazyBuildingContext
      if (isObject(crawlValue)) {
        this._expandingCallback = () => {
          syncCrawl<
            LazyBuildingCrawlState<T, K, M>,
            LazyBuildingCrawlRule<T, K, M>
          >(
            crawlValue,
            crawlHooks,
            {
              state: {
                parent: isSimpleNode ? this : this.parent,
                container: !isSimpleNode ? this : undefined,
                alreadyConvertedMappingStack: alreadyConvertedMappingStack,
                nodeIdPrefix: nodeIdPrefix,
                treeLevel: nextLevel + 1,
                maxTreeLevel: nextMaxLevel + 1,
              },
              rules: crawlRules,
            },
            true, // enable "skip root level" mode
          )
        };
      }
    }
    /* --- */
  }

  public createCycledClone(
    tree: IModelTree<T, K, M>,
    id: string,
    key: string | number,
    parent: IModelTreeNode<T, K, M> | null,
  ): IModelTreeNode<T, K, M> {
    const result = new ModelTreeNode(id, this.kind, key, true, {
      type: this.type,
      value: this._value ?? undefined,
      parent: parent,
      newDataLevel: this.newDataLevel,
      meta: { ...this.meta },
    }, undefined, this._children);
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
