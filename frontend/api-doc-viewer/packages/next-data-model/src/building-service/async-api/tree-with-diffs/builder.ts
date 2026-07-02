import { ComplexTreeNodeWithDiffsParams, NodeDescendantDiffs, NodeDescendantDiffsSummary, NodeDiffs, NodeDiffsSeverities, NodeDiffsSummary, SimpleTreeNodeWithDiffsParams, TreeNodeWithDiffsParams } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { TreeNodeComplexityTypes } from "@apihub/next-data-model/model/abstract/tree/tree-node.interface";
import { AsyncApiComplexTreeNodeWithDiffs } from "@apihub/next-data-model/model/async-api/tree-with-diffs/complex-node.impl";
import { AsyncApiSimpleTreeNodeWithDiffs } from "@apihub/next-data-model/model/async-api/tree-with-diffs/simple-node.impl";
import { AsyncApiTreeWithDiffs } from "@apihub/next-data-model/model/async-api/tree-with-diffs/tree.impl";
import { AsyncApiTreeNodeWithDiffs } from "@apihub/next-data-model/model/async-api/types/aliases";
import { AsyncApiTreeNodeKind, AsyncApiTreeNodeKinds, AsyncApiTreeNodeKindsList } from "@apihub/next-data-model/model/async-api/types/node-kind";
import { AsyncApiTreeNodeMeta } from "@apihub/next-data-model/model/async-api/types/node-meta";
import { AsyncApiTreeNodeValue } from "@apihub/next-data-model/model/async-api/types/node-value";
import { OperationKeys } from "@apihub/next-data-model/shared/async-api/types/operation-keys";
import { AsyncApiTreeWithDiffsBuilderParams } from "@apihub/next-data-model/shared/async-api/types/tree-builder-params";
import { isObject } from "@apihub/next-data-model/utilities";
import { NodeId, NodeKey } from "@apihub/next-data-model/utility-types";
import { annotation, breaking, deprecated, DiffType, nonBreaking, risky, unclassified } from "@netcracker/qubership-apihub-api-diff";
import { syncCrawl } from "@netcracker/qubership-apihub-json-crawl";
import { TreeWithDiffsBuilder } from "../../abstract/tree-with-diffs/builder";
import { DiffMetaKeys } from "../../abstract/tree-with-diffs/node-diffs-data/diff-meta-keys";
import { getAsyncApiCrawlRules } from "../json-crawl-entities/rules/rules";
import { AsyncApiTreeWithDiffsCrawlRule } from "../json-crawl-entities/rules/types";
import { AsyncApiTreeWithDiffsCrawlState } from "../json-crawl-entities/state/types";
import { BuildingServiceLogger, createBuildingServiceLogger } from "../../../loggers";
import { AsyncApiSpecWithDiffsTransformer } from "../shared/async-api-spec-with-diffs-transformer";
import { createAsyncApiTreeWithDiffsBuildingHooks } from "./building-hooks";
import { AsyncApiNodeDataWithDiffsBuilder } from "./node-data/builder";
import { AsyncApiNodeDescendantDiffsAggregatorFactory as AsyncApiNodeDescendantDiffsSummaryAggregatorFactory } from "./node-diffs-data/node-descendant-diffs-summary/factory";
import { AsyncApiNodeDescendantDiffsAggregatorFactory } from "./node-diffs-data/node-descendant-diffs/factory";
import { AsyncApiNodeDiffsSeveritiesAggregatorFactory } from "./node-diffs-data/node-diffs-severities/factory";
import { AsyncApiNodeDiffsSummaryAggregatorFactory } from "./node-diffs-data/node-diffs-summary/factory";
import { AsyncApiNodeDiffsAggregatorFactory } from "./node-diffs-data/node-diffs/factory";

export class AsyncApiTreeWithDiffsBuilder extends TreeWithDiffsBuilder<
  AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null,
  AsyncApiTreeNodeKind,
  AsyncApiTreeNodeMeta,
  AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null
> {
  public readonly tree: AsyncApiTreeWithDiffs;
  private readonly source: unknown;
  private readonly referenceNamePropertyKey: symbol;
  private readonly diffsMetaKeys: DiffMetaKeys;
  private readonly operationKeys?: OperationKeys;
  private readonly logger: BuildingServiceLogger;
  private readonly specificationTransformer: AsyncApiSpecWithDiffsTransformer;
  private readonly nodeDataBuilder: AsyncApiNodeDataWithDiffsBuilder;

  constructor(params: AsyncApiTreeWithDiffsBuilderParams) {
    const {
      source,
      referenceNamePropertyKey,
      diffsMetaKeys,
      operationKeys,
      logger = createBuildingServiceLogger(),
    } = params

    super()
    this.source = source
    this.referenceNamePropertyKey = referenceNamePropertyKey
    this.diffsMetaKeys = diffsMetaKeys
    this.operationKeys = operationKeys
    this.logger = logger
    this.tree = new AsyncApiTreeWithDiffs()
    this.specificationTransformer = new AsyncApiSpecWithDiffsTransformer(
      this.referenceNamePropertyKey,
      this.logger,
      this.diffsMetaKeys,
    )
    this.nodeDataBuilder = new AsyncApiNodeDataWithDiffsBuilder()
  }

  public build(): AsyncApiTreeWithDiffs {
    if (!isObject(this.source)) {
      return this.tree
    }

    const initialState: AsyncApiTreeWithDiffsCrawlState = {
      parent: null,
      container: null,
      alreadyConvertedValuesCache: new Map(),
    }

    const initialRules: AsyncApiTreeWithDiffsCrawlRule = getAsyncApiCrawlRules<AsyncApiTreeWithDiffsCrawlState>(AsyncApiTreeNodeKinds.MESSAGE)

    const preparedSource = this.specificationTransformer.transformOperationOrientedSpecToMessageOrientedSpec(
      this.source,
      this.operationKeys,
    )
    this.logger.debug("[AsyncAPI][WithDiffs] Prepared Source:", preparedSource)

    const hooks = createAsyncApiTreeWithDiffsBuildingHooks({
      source: preparedSource,
      tree: this.tree,
      supportedNodeKinds: AsyncApiTreeNodeKindsList,
      createNodeFromRaw: (id, key, kind, complex, params) => this.createNodeFromRaw(id, key, kind, complex, params),
      createNodeParams: (value, parent, container) => ({
        value: typeof value === 'object' ? value : null,
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
      // TODO 26.03.26 // Share with regular tree builder and actually other builders in future
      isSimpleNode: (node) => node.type === TreeNodeComplexityTypes.SIMPLE,
      // TODO 26.03.26 // Share with regular tree builder and actually other builders in future
      isComplexNode: (node) => node.type === TreeNodeComplexityTypes.COMPLEX,
      resolveNodeKey: (key, value) => this.resolveNodeKey(key, value),
      shouldStopAfterNodeCreation: (_, value) => isObject(value) && Boolean(value.isPrimitive),
    })

    syncCrawl<AsyncApiTreeWithDiffsCrawlState, AsyncApiTreeWithDiffsCrawlRule>(
      preparedSource,
      hooks,
      {
        state: initialState,
        rules: initialRules,
      },
    )

    return this.tree
  }

  // TODO 26.03.26 // Share with regular tree builder and actually other builders in future
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

  protected createNodeFromRaw(
    id: NodeId,
    key: NodeKey,
    kind: AsyncApiTreeNodeKind,
    complex: boolean,
    params: TreeNodeWithDiffsParams<
      AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null,
      AsyncApiTreeNodeKind,
      AsyncApiTreeNodeMeta,
      AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null
    >,
  ): AsyncApiTreeNodeWithDiffs | undefined {
    const { parent = null, container = null, newDataLevel } = params

    if (complex) {
      const nodeMeta = this.createNodeMeta(key, params)
      const complexParams: ComplexTreeNodeWithDiffsParams<
        AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null,
        AsyncApiTreeNodeKind,
        AsyncApiTreeNodeMeta,
        AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null
      > = {
        type: TreeNodeComplexityTypes.COMPLEX,
        parent: parent && this.isAsyncApiSimpleTreeNodeWithDiffs(parent) ? parent : null,
        container: container && this.isAsyncApiComplexTreeNodeWithDiffs(container) ? container : null,
        value: null,
        meta: nodeMeta,
        newDataLevel,
      }
      const treeNode = this.tree.createComplexNode(id, key, kind, false, complexParams)
      this.assignNodeDiffs(treeNode, kind, params)
      return treeNode
    }

    const nodeValue = this.createNodeValue(key, kind, params)
    const nodeMeta = this.createNodeMeta(key, params)
    const simpleParams: SimpleTreeNodeWithDiffsParams<
      AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null,
      AsyncApiTreeNodeKind,
      AsyncApiTreeNodeMeta,
      AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null
    > = {
      type: TreeNodeComplexityTypes.SIMPLE,
      parent: parent && this.isAsyncApiSimpleTreeNodeWithDiffs(parent) ? parent : null,
      container: container && this.isAsyncApiComplexTreeNodeWithDiffs(container) ? container : null,
      value: nodeValue,
      meta: nodeMeta,
      newDataLevel,
    }
    const treeNode = this.tree.createSimpleNode(id, key, kind, false, simpleParams)
    this.assignNodeDiffs(treeNode, kind, params)
    return treeNode
  }

  protected createNodeMeta(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    key: NodeKey,
    params: TreeNodeWithDiffsParams<
      AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null,
      AsyncApiTreeNodeKind,
      AsyncApiTreeNodeMeta,
      AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null
    >,
  ): AsyncApiTreeNodeMeta {
    const { value } = params
    return this.nodeDataBuilder.createNodeMeta(value)
  }

  protected createNodeValue(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    key: NodeKey,
    kind: string,
    params: TreeNodeWithDiffsParams<
      AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null,
      AsyncApiTreeNodeKind,
      AsyncApiTreeNodeMeta,
      AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null
    >,
  ): AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null {
    const { value } = params

    return this.nodeDataBuilder.createNodeValue(
      kind,
      key,
      value,
      (source, keys) => this.pick(source, keys),
    )
  }

  protected createNodeDiffs(
    key: NodeKey,
    kind: string,
    params: TreeNodeWithDiffsParams<
      AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null,
      AsyncApiTreeNodeKind,
      AsyncApiTreeNodeMeta,
      AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null
    >,
  ): NodeDiffs<AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null> | undefined {
    if (!this.isAsyncApiTreeNodeKind(kind)) {
      return undefined
    }
    const parentNode = params.parent && this.isAsyncApiSimpleTreeNodeWithDiffs(params.parent) ? params.parent : undefined
    const containerNode = params.container && this.isAsyncApiComplexTreeNodeWithDiffs(params.container) ? params.container : undefined
    return AsyncApiNodeDiffsAggregatorFactory
      .instance(kind)
      .aggregate(params.value, this.diffsMetaKeys, key, parentNode, containerNode)
  }

  protected createNodeDiffsSummary(
    kind: string,
    nodeDiffs: NodeDiffs<AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null> | undefined,
    crawlValue: object | null | undefined,
    diffsMetaKeys: DiffMetaKeys | undefined,
  ): NodeDiffsSummary | undefined {
    if (!this.isAsyncApiTreeNodeKind(kind)) {
      return undefined
    }
    return AsyncApiNodeDiffsSummaryAggregatorFactory
      .instance(kind)
      .aggregate(nodeDiffs, crawlValue, diffsMetaKeys)
  }

  protected createNodeDescendantsDiffs(
    kind: string,
    params: TreeNodeWithDiffsParams<
      AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null,
      AsyncApiTreeNodeKind,
      AsyncApiTreeNodeMeta,
      AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null
    >,
  ): NodeDescendantDiffs | undefined {
    if (!this.isAsyncApiTreeNodeKind(kind)) {
      return undefined
    }
    return AsyncApiNodeDescendantDiffsAggregatorFactory
      .instance(kind)
      .aggregate(params.value, this.diffsMetaKeys, this.referenceNamePropertyKey)
  }

  protected updateNodeDiffsByDescendantDiffs(
    kind: string,
    crawlValue: object | null | undefined,
    nodeDiffs: NodeDiffs<AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null>,
    nodeDescendantDiffs: NodeDescendantDiffs,
  ): NodeDiffs<AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null> | undefined {
    if (!this.isAsyncApiTreeNodeKind(kind)) {
      return undefined
    }
    if (!crawlValue) {
      return undefined
    }
    return AsyncApiNodeDiffsAggregatorFactory
      .instance(kind)
      .aggregateByDescendantDiffs(crawlValue, nodeDiffs, nodeDescendantDiffs, this.diffsMetaKeys)
  }

  protected createNodeDescendantsDiffsSummary(
    kind: string,
    nodeDiffs: NodeDiffs<AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null> | undefined,
    nodeDescendantDiffs: NodeDescendantDiffs | undefined,
    crawlValue: object | null | undefined,
    diffsMetaKeys: DiffMetaKeys | undefined,
  ): NodeDescendantDiffsSummary | undefined {
    if (!this.isAsyncApiTreeNodeKind(kind)) {
      return undefined
    }
    if (!nodeDescendantDiffs) {
      return undefined
    }
    return AsyncApiNodeDescendantDiffsSummaryAggregatorFactory
      .instance(kind)
      .aggregate(nodeDiffs, nodeDescendantDiffs, crawlValue, diffsMetaKeys)
  }

  protected createNodeDiffsSeverities(
    kind: string,
    nodeDiffs: NodeDiffs<AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null> | undefined,
  ): NodeDiffsSeverities | undefined {
    if (!this.isAsyncApiTreeNodeKind(kind)) {
      return undefined
    }
    if (!nodeDiffs) {
      return undefined
    }
    return AsyncApiNodeDiffsSeveritiesAggregatorFactory
      .instance(kind)
      .aggregate(nodeDiffs)
  }

  private assignNodeDiffs(
    node: AsyncApiTreeNodeWithDiffs,
    kind: AsyncApiTreeNodeKind,
    params: TreeNodeWithDiffsParams<
      AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null,
      AsyncApiTreeNodeKind,
      AsyncApiTreeNodeMeta,
      AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null
    >,
  ): void {
    const nodeDiffs = this.createNodeDiffs(node.key, kind, params)
    nodeDiffs && Object.assign(node.diffs, nodeDiffs)

    const nodeDiffsSummary = this.createNodeDiffsSummary(kind, node.diffs, params.value, this.diffsMetaKeys)
    if (nodeDiffsSummary) {
      node.diffsSummary.clear()
      node.addDiffsSummary(nodeDiffsSummary)
    }

    const descendantDiffs = this.createNodeDescendantsDiffs(kind, params)
    descendantDiffs && Object.assign(node.descendantDiffs, descendantDiffs)

    this.updateNodeDiffsByDescendantDiffs(kind, params.value, node.diffs, node.descendantDiffs)

    const descendantDiffsSummary = this.createNodeDescendantsDiffsSummary(kind, node.diffs, node.descendantDiffs, params.value, this.diffsMetaKeys)
    if (descendantDiffsSummary) {
      node.descendantDiffsSummary.clear()
      /* Backward propagation of summary to parent/container nodes.
        Works for cases when the node is a direct hierarchical descendant at the same tree.
        The tricky moment here is that visually AsyncAPI Document is the one entity, but
        actually there are at least 3 different trees: AsyncAPI, JSO, JSON Schema.
        So, for example, nodes from JSON Schema Tree can't reach their "visual parents" in AsyncAPI Tree. */
      node.addDescendantDiffsSummary(descendantDiffsSummary)
    }

    const diffsSeverities = this.createNodeDiffsSeverities(kind, node.diffs)
    diffsSeverities && Object.assign(node.diffsSeverities, diffsSeverities)
  }

  private isAsyncApiTreeNodeKind(kind: string): kind is AsyncApiTreeNodeKind {
    return AsyncApiTreeNodeKindsList.some(asyncApiKind => asyncApiKind === kind)
  }

  private isAsyncApiSimpleTreeNodeWithDiffs(
    node: AsyncApiTreeNodeWithDiffs,
  ): node is AsyncApiSimpleTreeNodeWithDiffs {
    return node.type === TreeNodeComplexityTypes.SIMPLE
  }

  private isAsyncApiComplexTreeNodeWithDiffs(
    node: AsyncApiTreeNodeWithDiffs,
  ): node is AsyncApiComplexTreeNodeWithDiffs {
    return node.type === TreeNodeComplexityTypes.COMPLEX
  }

  // TODO 30.03.26 // REFACTOR THIS ASAP!!!

  private maxDiffType(diffTypes: Set<DiffType> | DiffType[]): DiffType | undefined {
    let diffType: DiffType | undefined
    for (const currentDiffType of diffTypes) {
      if (this.compareDiffTypes(currentDiffType, diffType) > 0) {
        diffType = currentDiffType
      }
    }
    return diffType
  }

  private compareDiffTypes(a: DiffType | undefined, b: DiffType | undefined): number {
    if (!a && !b) {
      return 0
    }
    if (!a && b) {
      return this.CHANGE_SEVERITIES[b]
    }
    if (a && !b) {
      return this.CHANGE_SEVERITIES[a]
    }
    return this.CHANGE_SEVERITIES[a!] - this.CHANGE_SEVERITIES[b!]
  }

  private readonly CHANGE_SEVERITIES: Record<DiffType, number> = {
    [breaking]: 6,
    [risky]: 5,
    [deprecated]: 4,
    [nonBreaking]: 3,
    [annotation]: 2,
    [unclassified]: 1,
  }
}