import {
  ComplexTreeNodeWithDiffsParams,
  NodeDescendantDiffs,
  NodeDescendantDiffsSummary,
  NodeDiffs,
  NodeDiffsSeverities,
  NodeDiffsSummary,
  SimpleTreeNodeWithDiffsParams,
  TreeNodeWithDiffsParams,
} from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { TreeNodeComplexityTypes } from "@apihub/next-data-model/model/abstract/tree/tree-node.interface";
import { DdlApiComplexTreeNodeWithDiffs } from "@apihub/next-data-model/model/ddlapi/tree-with-diffs/complex-node.impl";
import { DdlApiSimpleTreeNodeWithDiffs } from "@apihub/next-data-model/model/ddlapi/tree-with-diffs/simple-node.impl";
import { DdlApiTreeWithDiffs } from "@apihub/next-data-model/model/ddlapi/tree-with-diffs/tree.impl";
import { DdlApiTreeNodeValue } from "@apihub/next-data-model/model/ddlapi/tree/node-value";
import { DdlApiTreeNodeWithDiffs } from "@apihub/next-data-model/model/ddlapi/types/aliases";
import { DdlApiTreeNodeKind, DdlApiTreeNodeKindsList } from "@apihub/next-data-model/model/ddlapi/types/node-kind";
import { DdlApiTreeNodeMeta } from "@apihub/next-data-model/model/ddlapi/types/node-meta";
import { TableKey } from "@apihub/next-data-model/shared/ddlapi/types/table-key";
import { DdlApiTreeWithDiffsBuilderParams } from "@apihub/next-data-model/shared/ddlapi/types/tree-builder-params";
import { isObject } from "@apihub/next-data-model/utilities";
import { NodeId, NodeKey } from "@apihub/next-data-model/utility-types";
import { syncCrawl } from "@netcracker/qubership-apihub-json-crawl";
import { BuildingServiceLogger, createBuildingServiceLogger } from "../../../loggers";
import { TreeWithDiffsBuilder } from "../../abstract/tree-with-diffs/builder";
import { DiffMetaKeys } from "../../abstract/tree-with-diffs/node-diffs-data/diff-meta-keys";
import { getDdlApiCrawlRules } from "../json-crawl-entities/rules/rules";
import { DdlApiTreeWithDiffsCrawlRule } from "../json-crawl-entities/rules/types";
import { DdlApiTreeWithDiffsCrawlState } from "../json-crawl-entities/state/types";
import { DdlApiSpecWithDiffsTransformer } from "../shared/ddlapi-spec-with-diffs-transformer";
import { createDdlApiTreeWithDiffsBuildingHooks } from "./building-hooks";
import { DdlApiNodeDataWithDiffsBuilder } from "./node-data/builder";
import { DdlApiNodeDescendantDiffsSummaryAggregatorFactory } from "./node-diffs-data/node-descendant-diffs-summary/factory";
import { DdlApiNodeDescendantDiffsAggregatorFactory } from "./node-diffs-data/node-descendant-diffs/factory";
import { DdlApiNodeDiffsSeveritiesAggregatorFactory } from "./node-diffs-data/node-diffs-severities/factory";
import { DdlApiNodeDiffsSummaryAggregatorFactory } from "./node-diffs-data/node-diffs-summary/factory";
import { DdlApiNodeDiffsAggregatorFactory } from "./node-diffs-data/node-diffs/factory";

export class DdlApiTreeWithDiffsBuilder extends TreeWithDiffsBuilder<
  DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null,
  DdlApiTreeNodeKind,
  DdlApiTreeNodeMeta,
  DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null
> {
  public readonly tree: DdlApiTreeWithDiffs;
  private readonly source: unknown;
  private readonly tableKey: TableKey;
  private readonly diffsMetaKeys: DiffMetaKeys;
  private readonly logger: BuildingServiceLogger;
  private readonly specificationTransformer: DdlApiSpecWithDiffsTransformer;
  private readonly nodeDataBuilder: DdlApiNodeDataWithDiffsBuilder;

  constructor(params: DdlApiTreeWithDiffsBuilderParams) {
    const {
      source,
      tableKey,
      diffsMetaKeys,
      logger = createBuildingServiceLogger(),
    } = params

    super()
    this.source = source
    this.tableKey = tableKey
    this.diffsMetaKeys = diffsMetaKeys
    this.logger = logger
    this.tree = new DdlApiTreeWithDiffs()
    this.specificationTransformer = new DdlApiSpecWithDiffsTransformer(
      this.logger,
      this.diffsMetaKeys,
    )
    this.nodeDataBuilder = new DdlApiNodeDataWithDiffsBuilder()
  }

  public build(): DdlApiTreeWithDiffs {
    const preparedSource = this.specificationTransformer.transformSourceToTableOrientedSpecWithDiffs(
      this.source,
      this.tableKey,
    )

    if (!preparedSource) {
      return this.tree
    }

    const initialState: DdlApiTreeWithDiffsCrawlState = {
      parent: null,
      container: null,
      alreadyConvertedValuesCache: new Map(),
    }

    const initialRules: DdlApiTreeWithDiffsCrawlRule = getDdlApiCrawlRules<DdlApiTreeWithDiffsCrawlState>()

    this.logger.debug('[DDL API][WithDiffs] Prepared Source:', preparedSource)

    const hooks = createDdlApiTreeWithDiffsBuildingHooks({
      source: preparedSource,
      tree: this.tree,
      supportedNodeKinds: DdlApiTreeNodeKindsList,
      // @ts-expect-error - TODO: align TreeBuildingHooksFactoryParams with TreeNodeWithDiffsParams
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
      isSimpleNode: (node) => node.type === TreeNodeComplexityTypes.SIMPLE,
      isComplexNode: (node) => node.type === TreeNodeComplexityTypes.COMPLEX,
      resolveNodeKey: (key, value) => this.resolveNodeKey(key, value),
    })

    syncCrawl<DdlApiTreeWithDiffsCrawlState, DdlApiTreeWithDiffsCrawlRule>(
      preparedSource,
      hooks,
      {
        state: initialState,
        rules: initialRules,
      },
    )

    return this.tree
  }

  private resolveNodeKey(key: NodeKey, value: unknown): NodeKey {
    if (!isObject(value)) {
      return key
    }
    if ('columnName' in value && typeof value.columnName === 'string') {
      return value.columnName
    }
    if ('indexName' in value && typeof value.indexName === 'string') {
      return value.indexName
    }
    return key
  }

  protected createNodeFromRaw(
    id: NodeId,
    key: NodeKey,
    kind: DdlApiTreeNodeKind,
    complex: boolean,
    params: TreeNodeWithDiffsParams<
      DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null,
      DdlApiTreeNodeKind,
      DdlApiTreeNodeMeta,
      DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null
    >,
  ): DdlApiTreeNodeWithDiffs | undefined {
    const { parent = null, container = null, newDataLevel } = params

    if (complex) {
      const nodeMeta = this.createNodeMeta(key, params)
      const complexParams: ComplexTreeNodeWithDiffsParams<
        DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null,
        DdlApiTreeNodeKind,
        DdlApiTreeNodeMeta,
        DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null
      > = {
        type: TreeNodeComplexityTypes.COMPLEX,
        parent: parent && this.isDdlApiSimpleTreeNodeWithDiffs(parent) ? parent : null,
        container: container && this.isDdlApiComplexTreeNodeWithDiffs(container) ? container : null,
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
      DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null,
      DdlApiTreeNodeKind,
      DdlApiTreeNodeMeta,
      DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null
    > = {
      type: TreeNodeComplexityTypes.SIMPLE,
      parent: parent && this.isDdlApiSimpleTreeNodeWithDiffs(parent) ? parent : null,
      container: container && this.isDdlApiComplexTreeNodeWithDiffs(container) ? container : null,
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
      DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null,
      DdlApiTreeNodeKind,
      DdlApiTreeNodeMeta,
      DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null
    >,
  ): DdlApiTreeNodeMeta {
    const { value } = params
    return this.nodeDataBuilder.createNodeMeta(value)
  }

  protected createNodeValue(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    key: NodeKey,
    kind: string,
    params: TreeNodeWithDiffsParams<
      DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null,
      DdlApiTreeNodeKind,
      DdlApiTreeNodeMeta,
      DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null
    >,
  ): DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null {
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
      DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null,
      DdlApiTreeNodeKind,
      DdlApiTreeNodeMeta,
      DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null
    >,
  ): NodeDiffs<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null> | undefined {
    if (!this.isDdlApiTreeNodeKind(kind)) {
      return undefined
    }
    const parentNode = params.parent && this.isDdlApiSimpleTreeNodeWithDiffs(params.parent) ? params.parent : undefined
    const containerNode = params.container && this.isDdlApiComplexTreeNodeWithDiffs(params.container) ? params.container : undefined
    return DdlApiNodeDiffsAggregatorFactory
      .instance(kind)
      .aggregate(params.value, this.diffsMetaKeys, key, parentNode, containerNode)
  }

  protected createNodeDiffsSummary(
    kind: string,
    nodeDiffs: NodeDiffs<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null> | undefined,
    crawlValue: object | null | undefined,
    diffsMetaKeys: DiffMetaKeys | undefined,
  ): NodeDiffsSummary | undefined {
    if (!this.isDdlApiTreeNodeKind(kind)) {
      return undefined
    }
    return DdlApiNodeDiffsSummaryAggregatorFactory
      .instance(kind)
      .aggregate(nodeDiffs, crawlValue, diffsMetaKeys)
  }

  protected createNodeDescendantsDiffs(
    kind: string,
    params: TreeNodeWithDiffsParams<
      DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null,
      DdlApiTreeNodeKind,
      DdlApiTreeNodeMeta,
      DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null
    >,
  ): NodeDescendantDiffs | undefined {
    if (!this.isDdlApiTreeNodeKind(kind)) {
      return undefined
    }
    return DdlApiNodeDescendantDiffsAggregatorFactory
      .instance(kind)
      .aggregate(params.value, this.diffsMetaKeys)
  }

  protected updateNodeDiffsByDescendantDiffs(
    kind: string,
    crawlValue: object | null | undefined,
    nodeDiffs: NodeDiffs<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null>,
    nodeDescendantDiffs: NodeDescendantDiffs,
  ): NodeDiffs<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null> | undefined {
    if (!this.isDdlApiTreeNodeKind(kind)) {
      return undefined
    }
    if (!crawlValue) {
      return undefined
    }
    return DdlApiNodeDiffsAggregatorFactory
      .instance(kind)
      .aggregateByDescendantDiffs(crawlValue, nodeDiffs, nodeDescendantDiffs, this.diffsMetaKeys)
  }

  protected createNodeDescendantsDiffsSummary(
    kind: string,
    nodeDiffs: NodeDiffs<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null> | undefined,
    nodeDescendantDiffs: NodeDescendantDiffs | undefined,
    crawlValue: object | null | undefined,
    diffsMetaKeys: DiffMetaKeys | undefined,
  ): NodeDescendantDiffsSummary | undefined {
    if (!this.isDdlApiTreeNodeKind(kind)) {
      return undefined
    }
    if (!nodeDescendantDiffs) {
      return undefined
    }
    return DdlApiNodeDescendantDiffsSummaryAggregatorFactory
      .instance(kind)
      .aggregate(nodeDiffs, nodeDescendantDiffs, crawlValue, diffsMetaKeys)
  }

  protected createNodeDiffsSeverities(
    kind: string,
    nodeDiffs: NodeDiffs<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null> | undefined,
  ): NodeDiffsSeverities | undefined {
    if (!this.isDdlApiTreeNodeKind(kind)) {
      return undefined
    }
    if (!nodeDiffs) {
      return undefined
    }
    return DdlApiNodeDiffsSeveritiesAggregatorFactory
      .instance(kind)
      .aggregate(nodeDiffs)
  }

  private assignNodeDiffs(
    node: DdlApiTreeNodeWithDiffs,
    kind: DdlApiTreeNodeKind,
    params: TreeNodeWithDiffsParams<
      DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null,
      DdlApiTreeNodeKind,
      DdlApiTreeNodeMeta,
      DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null
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

    const descendantDiffsSummary = this.createNodeDescendantsDiffsSummary(
      kind,
      node.diffs,
      node.descendantDiffs,
      params.value,
      this.diffsMetaKeys,
    )
    if (descendantDiffsSummary) {
      node.descendantDiffsSummary.clear()
      node.addDescendantDiffsSummary(descendantDiffsSummary)
    }

    const diffsSeverities = this.createNodeDiffsSeverities(kind, node.diffs)
    diffsSeverities && Object.assign(node.diffsSeverities, diffsSeverities)
  }

  private isDdlApiTreeNodeKind(kind: string): kind is DdlApiTreeNodeKind {
    return DdlApiTreeNodeKindsList.some(ddlApiKind => ddlApiKind === kind)
  }

  private isDdlApiSimpleTreeNodeWithDiffs(
    node: DdlApiTreeNodeWithDiffs,
  ): node is DdlApiSimpleTreeNodeWithDiffs {
    return node.type === TreeNodeComplexityTypes.SIMPLE
  }

  private isDdlApiComplexTreeNodeWithDiffs(
    node: DdlApiTreeNodeWithDiffs,
  ): node is DdlApiComplexTreeNodeWithDiffs {
    return node.type === TreeNodeComplexityTypes.COMPLEX
  }
}
