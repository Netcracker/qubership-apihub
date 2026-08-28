import { AsyncApiTree } from "@apihub/next-data-model/model/async-api/tree/tree.impl";
import { AsyncApiTreeNode } from "@apihub/next-data-model/model/async-api/types/aliases";
import { AsyncApiTreeNodeKind, AsyncApiTreeNodeKinds, AsyncApiTreeNodeKindsList } from "@apihub/next-data-model/model/async-api/types/node-kind";
import { AsyncApiTreeNodeMeta } from "@apihub/next-data-model/model/async-api/types/node-meta";
import { AsyncApiTreeNodeValue } from "@apihub/next-data-model/model/async-api/types/node-value";
import { OperationKeys } from "@apihub/next-data-model/shared/async-api/types/operation-keys";
import { AsyncApiTreeBuilderParams } from "@apihub/next-data-model/shared/async-api/types/tree-builder-params";
import { syncCrawl } from "@netcracker/qubership-apihub-json-crawl";
import { ComplexTreeNodeParams, SimpleTreeNodeParams, TreeNodeComplexityTypes } from "../../../model/abstract/tree/tree-node.interface";
import { isObject } from "../../../utilities";
import { NodeId, NodeKey } from "../../../utility-types";
import { TreeBuilder } from "../../abstract/tree/builder";
import { NodeDataPickFunction } from "../../abstract/tree/node-data/builder";
import { getAsyncApiCrawlRules } from "../json-crawl-entities/rules/rules";
import { AsyncApiCrawlRule } from "../json-crawl-entities/rules/types";
import { AsyncApiTreeCrawlState } from "../json-crawl-entities/state/types";
import { BuildingServiceLogger, createBuildingServiceLogger } from "../../../loggers";
import { AsyncApiMessageOrientedSpec, AsyncApiSpecTransformer } from "../shared/async-api-spec-transformer";
import { AsyncApiTreeBuildingNodeParams, createAsyncApiTreeBuildingHooks } from "./building-hooks";
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

const ASYNC_API_LOG_PREFIX = '[AsyncAPI]'

export class AsyncApiTreeBuilder extends TreeBuilder<
  AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null,
  AsyncApiTreeNodeKind,
  AsyncApiTreeNodeMeta
> {
  public readonly tree: AsyncApiTree;
  protected readonly source: unknown;
  protected readonly referenceNamePropertyKey: symbol;
  protected readonly operationKeys?: OperationKeys;
  protected readonly logger: BuildingServiceLogger;
  private readonly nodeDataBuilder: AsyncApiNodeDataBuilder;

  constructor(params: AsyncApiTreeBuilderParams) {
    const {
      source,
      referenceNamePropertyKey,
      operationKeys,
      logger = createBuildingServiceLogger(),
    } = params

    super()
    this.source = source
    this.referenceNamePropertyKey = referenceNamePropertyKey
    this.operationKeys = operationKeys
    this.logger = logger
    this.tree = this.createTree()
    this.nodeDataBuilder = this.createNodeDataBuilder()
  }

  public build(): AsyncApiTree {
    if (!isObject(this.source)) {
      return this.tree;
    }

    const preparedSource = this.prepareSource()

    this.logger.debug(`${this.logPrefix} Prepared Source:`, preparedSource)

    const initialState: AsyncApiTreeCrawlState = {
      parent: null,
      container: null,
      alreadyConvertedValuesCache: new Map(),
    }

    // TODO: Encapsulate this
    const initialRules: AsyncApiCrawlRule = getAsyncApiCrawlRules(AsyncApiTreeNodeKinds.MESSAGE)

    const hooks = createAsyncApiTreeBuildingHooks({
      source: preparedSource,
      tree: this.tree,
      supportedNodeKinds: AsyncApiTreeNodeKindsList,
      createNodeFromRaw: (id, key, kind, complex, params) => this.createNodeFromRaw(id, key, kind, complex, params),
      createNodeParams: (value, parent, container) => ({
        value: this.takeCrawlValue(value),
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
      isSimpleNode: (node) => this.isSimpleTreeNode(node),
      isComplexNode: (node) => this.isComplexTreeNode(node),
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

  /* Extension points for descendant builders */

  protected get logPrefix(): string {
    return ASYNC_API_LOG_PREFIX
  }

  protected createTree(): AsyncApiTree {
    return new AsyncApiTree()
  }

  protected createNodeDataBuilder(): AsyncApiNodeDataBuilder {
    return new AsyncApiNodeDataBuilder()
  }

  protected prepareSource(): AsyncApiMessageOrientedSpec | null {
    const specificationTransformer = new AsyncApiSpecTransformer(this.referenceNamePropertyKey, this.logger)
    return specificationTransformer.transformOperationOrientedSpecToMessageOrientedSpec(this.source, this.operationKeys)
  }

  /**
   * Narrows a raw crawl value down to the value carried by node building params.
   * @param value - crawl hook value.
   * @returns value kept on the node building params.
   */
  protected takeCrawlValue(value: unknown): object | null {
    return isObject(value) ? value : null
  }

  /**
   * Picks up the node key found in the reference if mapping is provided.
   * Otherwise, returns the original key.
   * @param key - crawl hook key.
   * @param value - crawl hook value.
   * @returns resolved node key.
   */
  protected resolveNodeKey(key: NodeKey, value: unknown): NodeKey {
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
    params: AsyncApiTreeBuildingNodeParams,
  ): AsyncApiTreeNode | undefined {
    const { parent, container, newDataLevel } = params

    if (complex) {
      const nodeMeta = this.createNodeMeta(key, params)
      const extendedParams: ComplexAsyncApiTreeNodeParams = {
        type: TreeNodeComplexityTypes.COMPLEX,
        parent: this.takeSimpleTreeNode(parent),
        container: this.takeComplexTreeNode(container),
        value: null,
        meta: nodeMeta,
        newDataLevel: newDataLevel,
      }
      return this.tree.createComplexNode(id, key, kind, false, extendedParams)
    }

    const nodeValue = this.createNodeValue(key, kind, params)
    const nodeMeta = this.createNodeMeta(key, params)
    const extendedParams: SimpleAsyncApiTreeNodeParams = {
      type: TreeNodeComplexityTypes.SIMPLE,
      parent: this.takeSimpleTreeNode(parent),
      container: this.takeComplexTreeNode(container),
      value: nodeValue,
      meta: nodeMeta,
      newDataLevel: newDataLevel,
    }
    return this.tree.createSimpleNode(id, key, kind, false, extendedParams)
  }

  protected createNodeMeta(
    key: NodeKey,
    params: AsyncApiTreeBuildingNodeParams,
  ): AsyncApiTreeNodeMeta {
    const { value } = params
    return this.nodeDataBuilder.createNodeMeta(value)
  }

  protected createNodeValue(
    key: NodeKey,
    kind: AsyncApiTreeNodeKind,
    params: AsyncApiTreeBuildingNodeParams,
  ): AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null {
    const { value } = params

    return this.nodeDataBuilder.createNodeValue(
      kind,
      key,
      value,
      ((source, keys) => this.pick(source, keys)) satisfies NodeDataPickFunction,
    )
  }

  /* Node complexity checks */

  protected isSimpleTreeNode(node: AsyncApiTreeNode): boolean {
    return node.type === TreeNodeComplexityTypes.SIMPLE
  }

  protected isComplexTreeNode(node: AsyncApiTreeNode): boolean {
    return node.type === TreeNodeComplexityTypes.COMPLEX
  }

  private takeSimpleTreeNode(node: AsyncApiTreeNode | null): AsyncApiTreeNode | null {
    return node && this.isSimpleTreeNode(node) ? node : null
  }

  private takeComplexTreeNode(node: AsyncApiTreeNode | null): AsyncApiTreeNode | null {
    return node && this.isComplexTreeNode(node) ? node : null
  }
}
