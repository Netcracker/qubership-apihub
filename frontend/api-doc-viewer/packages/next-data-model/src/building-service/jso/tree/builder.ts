import { JsoComplexTreeNode } from "@apihub/next-data-model/model/jso/tree/complex-node.impl";
import { JsoTreeNodeValue } from "@apihub/next-data-model/model/jso/tree/node-value";
import { JsoSimpleTreeNode } from "@apihub/next-data-model/model/jso/tree/simple-node.impl";
import { JsoTree } from "@apihub/next-data-model/model/jso/tree/tree.impl";
import { JsoTreeNodeKind, JsoTreeNodeKindsList } from "@apihub/next-data-model/model/jso/types/node-kind";
import { JsoTreeNodeMeta } from "@apihub/next-data-model/model/jso/types/node-meta";
import { JsoPropertyValueTypes } from "@apihub/next-data-model/model/jso/types/node-value-type";
import { JsoTreeBuilderParams } from "@apihub/next-data-model/shared/jso/types/tree-builder-params";
import { BuildingServiceLogger, createBuildingServiceLogger } from "../../../loggers";
import { syncCrawl } from "@netcracker/qubership-apihub-json-crawl";
import { ComplexTreeNodeParams, ITreeNode, SimpleTreeNodeParams, TreeNodeComplexityTypes, TreeNodeParams } from "../../../model/abstract/tree/tree-node.interface";
import { isObject } from "../../../utilities";
import { NodeId, NodeKey } from "../../../utility-types";
import { TreeBuilder } from "../../abstract/tree/builder";
import { getJsoCrawlRules } from "../json-crawl-entities/rules/rules.jso";
import { JsoCrawlRule } from "../json-crawl-entities/rules/types";
import { JsoTreeCrawlState } from "../json-crawl-entities/state/types";
import { createJsoTreeBuildingHooks } from "./building-hooks";
import { JsoNodeDataBuilder } from "./node-data/builder";

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
  private readonly source: unknown;
  private readonly supportJsonSchema: boolean;
  private readonly logger: BuildingServiceLogger;
  private readonly nodeDataBuilder: JsoNodeDataBuilder;

  constructor(params: JsoTreeBuilderParams) {
    const {
      source,
      supportJsonSchema = false,
      logger = createBuildingServiceLogger(),
    } = params

    super()
    this.source = source
    this.supportJsonSchema = supportJsonSchema
    this.logger = logger
    this.tree = new JsoTree();
    this.nodeDataBuilder = new JsoNodeDataBuilder()
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

    const hooks = createJsoTreeBuildingHooks({
      source: this.source,
      tree: this.tree,
      supportedNodeKinds: JsoTreeNodeKindsList,
      createNodeFromRaw: (id, key, kind, complex, params) => this.createNodeFromRaw(id, key, kind, complex, params),
      createNodeParams: (value, parent, container) => ({
        value: value ?? null,
        newDataLevel: true,
        container,
        parent,
      }),
      createStateForSimpleNode: (_state, node, cache) => ({
        parent: node,
        container: null,
        alreadyConvertedValuesCache: cache,
      }),
      createStateForComplexNode: (state, node, cache) => ({
        parent: state.parent,
        container: node,
        alreadyConvertedValuesCache: cache,
      }),
      isSimpleNode: (node): node is JsoSimpleTreeNode => this.isJsoSimpleTreeNode(node),
      isComplexNode: (node): node is JsoComplexTreeNode => this.isJsoComplexTreeNode(node),
      resolveNodeKey: (key, value) => this.resolveNodeKey(key, value),
      isDisallowedValue: (value) => value === undefined,
      shouldStopAfterNodeCreation: (node, value) => {
        if (!isObject(value) && !Array.isArray(value)) {
          // we can't crawl non-object values
          return true
        }
        const nodeValue = node.value()
        if (!nodeValue) { // just a type guard
          return false
        }
        // we should not build-in nodes for json schema or multi-schema values into JSO Tree
        // they will be processed by separate data models
        return this.supportJsonSchema && (
          nodeValue.valueType === JsoPropertyValueTypes.JSON_SCHEMA ||
          nodeValue.valueType === JsoPropertyValueTypes.MULTI_SCHEMA
        )
      },
    })

    syncCrawl<JsoTreeCrawlState, JsoCrawlRule>(
      this.source,
      hooks,
      {
        state: initialState,
        rules: initialRules,
      },
    )

    return this.tree;
  }

  private resolveNodeKey(key: NodeKey, value: unknown): NodeKey {
    void value
    return key
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
    return this.nodeDataBuilder.createNodeMeta(value)
  }

  protected createNodeValue(
    key: NodeKey,
    kind: JsoTreeNodeKind,
    params: TreeNodeParams<object | null, string, object>,
  ): JsoTreeNodeValue | null {
    const { value } = params
    return this.nodeDataBuilder.createNodeValue(
      kind,
      key,
      value,
      (source, keys) => this.pick(source, keys),
    )
  }

  /* Type guards */

  private isJsoSimpleTreeNode(node: ITreeNode<object | null, string, object>): node is JsoSimpleTreeNode {
    return node.type === TreeNodeComplexityTypes.SIMPLE
  }

  private isJsoComplexTreeNode(node: ITreeNode<object | null, string, object>): node is JsoComplexTreeNode {
    return !this.isJsoSimpleTreeNode(node)
  }
}
