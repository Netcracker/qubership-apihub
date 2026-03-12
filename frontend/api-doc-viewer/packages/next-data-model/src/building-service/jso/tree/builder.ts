import { JsoComplexTreeNode } from "@apihub/next-data-model/model/jso/tree/complex-node.impl";
import { JsoSimpleTreeNode } from "@apihub/next-data-model/model/jso/tree/simple-node.impl";
import { JsoTree } from "@apihub/next-data-model/model/jso/tree/tree.impl";
import { JsoTreeNodeKind, JsoTreeNodeKindsList } from "@apihub/next-data-model/model/jso/types/node-kind";
import { JsoTreeNodeMeta } from "@apihub/next-data-model/model/jso/types/node-meta";
import { JsoTreeNodeValue, JsoTreeNodeValueBase } from "@apihub/next-data-model/model/jso/types/node-value";
import { JsoPropertyValueTypes } from "@apihub/next-data-model/model/jso/types/node-value-type";
import { buildPointer } from "@netcracker/qubership-apihub-api-unifier";
import { isArray, syncCrawl, SyncCrawlHook } from "@netcracker/qubership-apihub-json-crawl";
import { ComplexTreeNodeParams, ITreeNode, SimpleTreeNodeParams, TreeNodeComplexityTypes, TreeNodeParams } from "../../../model/abstract/tree/tree-node.interface";
import { isObject } from "../../../utilities";
import { NodeId, NodeKey, UnknownObject } from "../../../utility-types";
import { TreeBuilder } from "../../abstract/tree/builder";
import { SchemaTransformFunc } from "../../async-api/json-crawl-entities/transformers/types/types";
import { getJsoCrawlRules } from "../json-crawl-entities/rules/rules";
import { JsoCrawlRule, SchemaCrawlRule } from "../json-crawl-entities/rules/types";
import { CommonState, JsoTreeCrawlState } from "../json-crawl-entities/state/types";

type SimpleJsoTreeNodeParams = SimpleTreeNodeParams<
  JsoTreeNodeValue | null,
  JsoTreeNodeKind,
  JsoTreeNodeMeta
>

type ComplexJsoTreeNodeParams = ComplexTreeNodeParams<
  JsoTreeNodeValue | null,
  JsoTreeNodeKind,
  JsoTreeNodeMeta
>

export class JsoTreeBuilder extends TreeBuilder<
  JsoTreeNodeValue | null,
  JsoTreeNodeKind,
  JsoTreeNodeMeta
> {
  public readonly tree: JsoTree;

  private static readonly JSO_TREE_NODE_VALUE_PROPS: (keyof JsoTreeNodeValueBase)[] = [
    'title', 'value', 'valueType', 'isPrimitive', 'isArrayItem', 'isPredefinedValueSet'
  ]

  constructor(
    private readonly source: unknown,
    private readonly supportJsonSchema: boolean = false,
  ) {
    super()
    this.tree = new JsoTree();
  }

  public build(): JsoTree {
    if (!isObject(this.source)) {
      return this.tree;
    }

    const initialState: JsoTreeCrawlState = {
      parent: null,
      container: null,
      alreadyConvertedValuesCache: new Map(),
    }

    const initialRules: JsoCrawlRule = getJsoCrawlRules()

    syncCrawl<JsoTreeCrawlState, JsoCrawlRule>(
      this.source,
      [
        this.instantiateHookPreventingTreeBuildingProcessFromInfiniteLoop(),
        this.instantiateHookUnifyingValue(this.source),
        this.instantiateHookCreatingJsoTreeNodes(),
      ],
      {
        state: initialState,
        rules: initialRules,
      },
    )

    return this.tree;
  }

  /* Crawlhooks-builders */

  private instantiateHookPreventingTreeBuildingProcessFromInfiniteLoop<
    V extends UnknownObject | null,
    K extends string,
    M extends UnknownObject,
  >(): SyncCrawlHook<
    CommonState<V, K, M>,
    SchemaCrawlRule<K, CommonState<V, K, M>>
  > {
    return ({ value, state, key, path }) => {
      if (typeof key === 'symbol') {
        return;
      }

      const {
        alreadyConvertedValuesCache,
        parent,
        container,
      } = state
      const alreadyExisted: ITreeNode<V, K, M> | undefined = alreadyConvertedValuesCache.get(value)

      if (
        !alreadyExisted || (
          !this.isJsoSimpleTreeNode(alreadyExisted) &&
          !this.isJsoComplexTreeNode(alreadyExisted)
        )
      ) {
        return { value }
      }

      if (!parent || !this.isJsoSimpleTreeNode(parent)) {
        return { value }
      }

      const id = '#' + buildPointer(path)
      const cycledClone = this.tree.createCycledClone(alreadyExisted, id, key, parent)
      if (container) {
        container.addNestedNode(cycledClone)
      }
      if (parent) {
        parent.addChildNode(cycledClone)
      }
      return { done: true }
    }
  }

  private instantiateHookUnifyingValue<
    V extends UnknownObject | null,
    K extends string,
    M extends UnknownObject
  >(
    source: unknown
  ): SyncCrawlHook<
    CommonState<V, K, M>,
    SchemaCrawlRule<K, CommonState<V, K, M>>
  > {
    return ({ key, value, path, state, rules }) => {
      if (!rules || !Array.isArray(rules.transformers)) {
        return
      }

      const transformers: SchemaTransformFunc<CommonState<V, K, M>>[] = rules.transformers ?? []
      const transformedValue = transformers.reduce(
        (accumulatedTransformedValue, transform) => transform(key, accumulatedTransformedValue, source, path, state),
        value
      )

      return { value: transformedValue }
    }
  }

  private instantiateHookCreatingJsoTreeNodes(): SyncCrawlHook<JsoTreeCrawlState, JsoCrawlRule> {
    return ({ key, value, path, rules, state }) => {
      if (!rules) {
        return { done: true };
      }
      if (typeof key === 'symbol') {
        return { done: true };
      }
      if (value === undefined || value === null || !isObject(value) && !isArray(value)) {
        return { done: true };
      }
      if (!rules.kind || !JsoTreeNodeKindsList.includes(rules.kind)) {
        // equivalent to "continue" operator within loop operators
        // means "keep going deeper in the original object"
        return;
      }

      const { parent, container } = state;
      const id = '#' + buildPointer(path);
      const { kind, complex = false } = rules;

      const params = container
        ? { value: Array.isArray(value) ? null : value, newDataLevel: true, container: container, parent: container.parent }
        : { value: Array.isArray(value) ? null : value, newDataLevel: true, container: null, parent: parent }

      const treeNode = this.createNodeFromRaw(id, key, kind, complex, params)

      if (!treeNode) {
        return;
      }

      if (container) {
        container.addNestedNode(treeNode);
      } else if (parent) {
        parent.addChildNode(treeNode);
      }

      if (isObject(value) && (value.isPrimitive || this.supportJsonSchema && value.valueType === JsoPropertyValueTypes.JSON_SCHEMA)) {
        // Prevent from falling into infinite loop due to transformed primitives into objects
        return { done: true };
      }

      const newCache = new Map(state.alreadyConvertedValuesCache);
      newCache.set(value, treeNode);

      let newState: JsoTreeCrawlState | undefined;
      if (this.isJsoSimpleTreeNode(treeNode)) {
        newState = {
          parent: treeNode,
          container: null,
          alreadyConvertedValuesCache: newCache,
        }
      }
      if (this.isJsoComplexTreeNode(treeNode)) {
        newState = {
          parent: parent,
          container: treeNode,
          alreadyConvertedValuesCache: newCache,
        }
      }

      return { value: value, state: newState };
    };
  }

  /* Atomic builders */

  protected createNodeFromRaw(
    id: NodeId,
    key: NodeKey,
    kind: JsoTreeNodeKind,
    complex: boolean,
    params: TreeNodeParams<object | null, string, object>
  ): JsoSimpleTreeNode | JsoComplexTreeNode | undefined {
    const { parent, container, newDataLevel } = params

    if (complex) {
      const nodeMeta = this.createNodeMeta(key, params)
      const extendedParams: ComplexJsoTreeNodeParams = {
        type: TreeNodeComplexityTypes.COMPLEX,
        parent: parent && this.isJsoSimpleTreeNode(parent) ? parent : null, // just type guard
        container: container && this.isJsoComplexTreeNode(container) ? container : null,
        value: null,
        meta: nodeMeta,
        newDataLevel: newDataLevel,
      }
      return this.tree.createComplexNode(id, key, kind, false, extendedParams)
    }

    const nodeValue = this.createNodeValue(key, kind, {
      ...params,
      parent: parent,
      container: container,
    })
    const nodeMeta = this.createNodeMeta(key, params)
    const extendedParams: SimpleJsoTreeNodeParams = {
      type: TreeNodeComplexityTypes.SIMPLE,
      parent: parent && this.isJsoSimpleTreeNode(parent) ? parent : null, // just type guard
      container: container && this.isJsoComplexTreeNode(container) ? container : null,
      value: nodeValue,
      meta: nodeMeta,
      newDataLevel: newDataLevel,
    }
    return this.tree.createSimpleNode(id, key, kind, false, extendedParams)
  }

  protected createNodeMeta(
    key: NodeKey,
    params: TreeNodeParams<object | null, string, object>,
  ): JsoTreeNodeMeta {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { value, parent = null } = params

    return {
      _fragment: value,
    }
  }

  protected createNodeValue(
    key: NodeKey,
    kind: JsoTreeNodeKind,
    params: TreeNodeParams<object | null, string, object>,
  ): JsoTreeNodeValue | null {
    const { value } = params

    if (value === undefined || value === null) {
      return null
    }

    if (!isObject(value)) {
      return null
    }

    if (!this.isJsoTreeNodeValue(value)) {
      return null
    }

    return value
  }

  /* Type guards */

  private isJsoTreeNodeValue(value: unknown): value is JsoTreeNodeValue {
    return isObject(value) && Object.keys(value).every(key => JsoTreeBuilder.JSO_TREE_NODE_VALUE_PROPS.includes(key as keyof JsoTreeNodeValueBase))
  }

  private isJsoSimpleTreeNode(node: ITreeNode<object | null, string, object>): node is JsoSimpleTreeNode {
    return node.type === TreeNodeComplexityTypes.SIMPLE
  }

  private isJsoComplexTreeNode(node: ITreeNode<object | null, string, object>): node is JsoComplexTreeNode {
    return !this.isJsoSimpleTreeNode(node)
  }
}
