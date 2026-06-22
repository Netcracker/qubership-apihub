import { AsyncApiComplexTreeNode } from "@apihub/next-data-model/model/async-api/tree/complex-node.impl";
import { AsyncApiSimpleTreeNode } from "@apihub/next-data-model/model/async-api/tree/simple-node.impl";
import { AsyncApiTree } from "@apihub/next-data-model/model/async-api/tree/tree.impl";
import { AsyncApiTreeNodeKind, AsyncApiTreeNodeKinds, AsyncApiTreeNodeKindsList } from "@apihub/next-data-model/model/async-api/types/node-kind";
import { AsyncApiTreeNodeMeta } from "@apihub/next-data-model/model/async-api/types/node-meta";
import { AsyncApiTreeNodeValue } from "@apihub/next-data-model/model/async-api/types/node-value";
import { OperationKeys } from "@apihub/next-data-model/shared/async-api/types/operation-keys";
import { syncCrawl } from "@netcracker/qubership-apihub-json-crawl";
import { ComplexTreeNodeParams, ITreeNode, SimpleTreeNodeParams, TreeNodeComplexityTypes, TreeNodeParams } from "../../../model/abstract/tree/tree-node.interface";
import { isObject } from "../../../utilities";
import { NodeId, NodeKey } from "../../../utility-types";
import { TreeBuilder } from "../../abstract/tree/builder";
import { getAsyncApiCrawlRules } from "../json-crawl-entities/rules/rules";
import { AsyncApiCrawlRule } from "../json-crawl-entities/rules/types";
import { AsyncApiTreeCrawlState } from "../json-crawl-entities/state/types";
import { AsyncApiLogger, createAsyncApiLogger } from "../logging";
import { AsyncApiSpecTransformer } from "../shared/async-api-spec-transformer";
import { createAsyncApiTreeBuildingHooks } from "./building-hooks";
import { AsyncApiNodeDataBuilder } from "./node-data/builder";

type SimpleAsyncApiTreeNodeParams = SimpleTreeNodeParams<
  AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null,
  AsyncApiTreeNodeKind,
  AsyncApiTreeNodeMeta
>

type ComplexAsyncApiTreeNodeParams = ComplexTreeNodeParams<
  AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null,
  AsyncApiTreeNodeKind,
  AsyncApiTreeNodeMeta
>

export class AsyncApiTreeBuilder extends TreeBuilder<
  AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null,
  AsyncApiTreeNodeKind,
  AsyncApiTreeNodeMeta
> {
  public readonly tree: AsyncApiTree;
  private readonly specificationTransformer: AsyncApiSpecTransformer;
  private readonly nodeDataBuilder: AsyncApiNodeDataBuilder;

  constructor(
    private readonly source: unknown,
    private readonly referenceNamePropertyKey: symbol,
    private readonly operationKeys?: OperationKeys,
    private readonly logger: AsyncApiLogger = createAsyncApiLogger(),
  ) {
    super()
    this.tree = new AsyncApiTree();
    this.specificationTransformer = new AsyncApiSpecTransformer(this.referenceNamePropertyKey, this.logger)
    this.nodeDataBuilder = new AsyncApiNodeDataBuilder()
  }

  public build(): AsyncApiTree {
    if (!isObject(this.source)) {
      return this.tree;
    }

    const initialState: AsyncApiTreeCrawlState = {
      parent: null,
      container: null,
      alreadyConvertedValuesCache: new Map(),
    }

    // TODO: Encapsulate this
    const initialRules: AsyncApiCrawlRule = getAsyncApiCrawlRules(AsyncApiTreeNodeKinds.MESSAGE)

    // TODO: Encapsulate this
    const preparedSource = this.specificationTransformer.transformOperationOrientedSpecToMessageOrientedSpec(this.source, this.operationKeys)

    this.logger.debug('[AsyncAPI] Prepared Source:', preparedSource)

    const hooks = createAsyncApiTreeBuildingHooks({
      source: preparedSource,
      tree: this.tree,
      supportedNodeKinds: AsyncApiTreeNodeKindsList,
      createNodeFromRaw: (id, key, kind, complex, params) => this.createNodeFromRaw(id, key, kind, complex, params),
      createNodeParams: (value, parent, container) => ({
        value: isObject(value) && !Array.isArray(value) ? value : null,
        newDataLevel: true,
        parent,
        container,
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
      isSimpleNode: (node): node is AsyncApiSimpleTreeNode => this.isAsyncApiSimpleTreeNode(node),
      isComplexNode: (node): node is AsyncApiComplexTreeNode => this.isAsyncApiComplexTreeNode(node),
      resolveNodeKey: (key, value) => this.resolveNodeKey(key, value),
      shouldStopAfterNodeCreation: (_, value) => isObject(value) && Boolean(value.isPrimitive),
    })

    syncCrawl<AsyncApiTreeCrawlState, AsyncApiCrawlRule>(
      preparedSource,
      hooks,
      {
        state: initialState,
        rules: initialRules,
      },
    )

    return this.tree;
  }

  /**
   * Picks up the node key found in the reference if mapping is provided.
   * Otherwise, returns the original key.
   * @param key - crawl hook key.
   * @param value - crawl hook value.
   * @returns resolved node key.
   */
  private resolveNodeKey(key: NodeKey, value: unknown): NodeKey {
    if (!isObject(value)) {
      return key
    }
    if (this.referenceNamePropertyKey && value[this.referenceNamePropertyKey]) {
      const nodeKeyCandidate = value[this.referenceNamePropertyKey]
      if (typeof nodeKeyCandidate === 'string' || typeof nodeKeyCandidate === 'number') {
        return nodeKeyCandidate
      }
    }
    if ('id' in value && typeof value.id === 'string') {
      return value.id
    }
    return key
  }

  /* Atomic builders */

  protected createNodeFromRaw(
    id: NodeId,
    key: NodeKey,
    kind: AsyncApiTreeNodeKind,
    complex: boolean,
    params: TreeNodeParams<object | null, string, object>
  ): AsyncApiSimpleTreeNode | AsyncApiComplexTreeNode | undefined {
    const { parent, container, newDataLevel } = params

    if (complex) {
      const nodeMeta = this.createNodeMeta(key, params)
      const extendedParams: ComplexAsyncApiTreeNodeParams = {
        type: TreeNodeComplexityTypes.COMPLEX,
        parent: parent && this.isAsyncApiSimpleTreeNode(parent) ? parent : null, // just type guard
        container: container && this.isAsyncApiComplexTreeNode(container) ? container : null,
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
    const extendedParams: SimpleAsyncApiTreeNodeParams = {
      type: TreeNodeComplexityTypes.SIMPLE,
      parent: parent && this.isAsyncApiSimpleTreeNode(parent) ? parent : null, // just type guard
      container: container && this.isAsyncApiComplexTreeNode(container) ? container : null,
      value: nodeValue,
      meta: nodeMeta,
      newDataLevel: newDataLevel,
    }
    return this.tree.createSimpleNode(id, key, kind, false, extendedParams)
  }

  protected createNodeMeta(
    key: NodeKey,
    params: TreeNodeParams<object | null, string, object>,
  ): AsyncApiTreeNodeMeta {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { value, parent = null } = params
    return this.nodeDataBuilder.createNodeMeta(value)
  }

  protected createNodeValue(
    key: NodeKey,
    kind: AsyncApiTreeNodeKind,
    params: TreeNodeParams<object | null, string, object>,
  ): AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null {
    const { value } = params

    return this.nodeDataBuilder.createNodeValue(
      kind,
      key,
      value,
      (source, keys) => this.pick(source, keys),
    )
  }

  /* Type guards */

  private isAsyncApiSimpleTreeNode(node: ITreeNode<object | null, string, object>): node is AsyncApiSimpleTreeNode {
    return node.type === TreeNodeComplexityTypes.SIMPLE
  }

  private isAsyncApiComplexTreeNode(node: ITreeNode<object | null, string, object>): node is AsyncApiComplexTreeNode {
    return !this.isAsyncApiSimpleTreeNode(node)
  }

}
