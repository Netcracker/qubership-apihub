import {
  NodeDescendantDiffs,
  NodeDescendantDiffsSummary,
  NodeDiffs,
  NodeDiffsSeverities,
  NodeDiffsSummary,
} from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { AsyncApiTreeWithDiffs } from "@apihub/next-data-model/model/async-api/tree-with-diffs/tree.impl";
import { AsyncApiTreeNode, AsyncApiTreeNodeWithDiffs } from "@apihub/next-data-model/model/async-api/types/aliases";
import { AsyncApiTreeNodeKind, AsyncApiTreeNodeKindsList } from "@apihub/next-data-model/model/async-api/types/node-kind";
import { AsyncApiTreeNodeValue } from "@apihub/next-data-model/model/async-api/types/node-value";
import { isAsyncApiTreeNodeWithDiffs } from "@apihub/next-data-model/shared/async-api/guards/tree-node";
import { AsyncApiTreeWithDiffsBuilderParams } from "@apihub/next-data-model/shared/async-api/types/tree-builder-params";
import { isObjective } from "@apihub/next-data-model/utilities";
import { NodeId, NodeKey } from "@apihub/next-data-model/utility-types";
import { DiffMetaKeys } from "../../abstract/tree-with-diffs/node-diffs-data/diff-meta-keys";
import { mergeAggregatedDiffTypesIntoDescendantSummary } from "../../abstract/tree-with-diffs/node-diffs-data/aggregated-diff-types";
import {
  AsyncApiMessageOrientedSpecWithDiffs,
  AsyncApiSpecWithDiffsTransformer,
} from "../shared/async-api-spec-with-diffs-transformer";
import { AsyncApiTreeBuildingNodeParams } from "../tree/building-hooks";
import { AsyncApiTreeBuilder } from "../tree/builder";
import { AsyncApiNodeDataBuilder } from "../tree/node-data/builder";
import { AsyncApiNodeDataWithDiffsBuilder } from "./node-data/builder";
import { AsyncApiNodeDescendantDiffsAggregatorFactory as AsyncApiNodeDescendantDiffsSummaryAggregatorFactory } from "./node-diffs-data/node-descendant-diffs-summary/factory";
import { AsyncApiNodeDescendantDiffsAggregatorFactory } from "./node-diffs-data/node-descendant-diffs/factory";
import { AsyncApiNodeDiffsSeveritiesAggregatorFactory } from "./node-diffs-data/node-diffs-severities/factory";
import { AsyncApiNodeDiffsSummaryAggregatorFactory } from "./node-diffs-data/node-diffs-summary/factory";
import { AsyncApiNodeDiffsAggregatorFactory } from "./node-diffs-data/node-diffs/factory";

const ASYNC_API_WITH_DIFFS_LOG_PREFIX = '[AsyncAPI][WithDiffs]'

export class AsyncApiTreeWithDiffsBuilder extends AsyncApiTreeBuilder {
  public declare readonly tree: AsyncApiTreeWithDiffs;
  private readonly diffsMetaKeys: DiffMetaKeys;

  constructor(params: AsyncApiTreeWithDiffsBuilderParams) {
    super(params)
    this.diffsMetaKeys = params.diffsMetaKeys
  }

  public override build(): AsyncApiTreeWithDiffs {
    super.build()
    return this.tree
  }

  protected override get logPrefix(): string {
    return ASYNC_API_WITH_DIFFS_LOG_PREFIX
  }

  protected override createTree(): AsyncApiTreeWithDiffs {
    return new AsyncApiTreeWithDiffs()
  }

  protected override createNodeDataBuilder(): AsyncApiNodeDataBuilder {
    return new AsyncApiNodeDataWithDiffsBuilder()
  }

  protected override prepareSource(): AsyncApiMessageOrientedSpecWithDiffs | null {
    const specificationTransformer = new AsyncApiSpecWithDiffsTransformer(
      this.referenceNamePropertyKey,
      this.logger,
      this.diffsMetaKeys,
    )
    return specificationTransformer.transformOperationOrientedSpecToMessageOrientedSpec(
      this.source,
      this.operationKeys,
    )
  }

  /* Arrays are kept here, unlike in the plain tree: aggregators of list-like kinds
    (servers, bindings) read diff metadata from the array itself. */
  protected override takeCrawlValue(value: unknown): object | null {
    return isObjective(value) ? value : null
  }

  protected override createNodeFromRaw(
    id: NodeId,
    key: NodeKey,
    kind: AsyncApiTreeNodeKind,
    complex: boolean,
    params: AsyncApiTreeBuildingNodeParams,
  ): AsyncApiTreeNode | undefined {
    const treeNode = super.createNodeFromRaw(id, key, kind, complex, params)
    if (!treeNode || !isAsyncApiTreeNodeWithDiffs(treeNode)) {
      return treeNode
    }

    this.assignNodeDiffs(treeNode, kind, params)
    return treeNode
  }

  /* Atomic diffs builders */

  protected createNodeDiffs(
    key: NodeKey,
    kind: string,
    params: AsyncApiTreeBuildingNodeParams,
  ): NodeDiffs<AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null> | undefined {
    if (!this.isAsyncApiTreeNodeKind(kind)) {
      return undefined
    }
    const parentNode = this.takeSimpleTreeNodeWithDiffs(params.parent)
    const containerNode = this.takeComplexTreeNodeWithDiffs(params.container)
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
    params: AsyncApiTreeBuildingNodeParams,
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
    params: AsyncApiTreeBuildingNodeParams,
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
      /* Seed from local aggregation + document rollup (read-down). No bubble-up to parent. */
      node.addDescendantDiffsSummary(descendantDiffsSummary)
    }
    mergeAggregatedDiffTypesIntoDescendantSummary(
      node.descendantDiffsSummary,
      node.diffs,
      params.value,
      this.diffsMetaKeys,
    )

    const diffsSeverities = this.createNodeDiffsSeverities(kind, node.diffs)
    diffsSeverities && Object.assign(node.diffsSeverities, diffsSeverities)
  }

  /* Type guards */

  private isAsyncApiTreeNodeKind(kind: string): kind is AsyncApiTreeNodeKind {
    return AsyncApiTreeNodeKindsList.some(asyncApiKind => asyncApiKind === kind)
  }

  private takeTreeNodeWithDiffs(node: AsyncApiTreeNode | null): AsyncApiTreeNodeWithDiffs | undefined {
    return node && isAsyncApiTreeNodeWithDiffs(node) ? node : undefined
  }

  private takeSimpleTreeNodeWithDiffs(node: AsyncApiTreeNode | null): AsyncApiTreeNodeWithDiffs | undefined {
    const nodeWithDiffs = this.takeTreeNodeWithDiffs(node)
    return nodeWithDiffs && this.isSimpleTreeNode(nodeWithDiffs) ? nodeWithDiffs : undefined
  }

  private takeComplexTreeNodeWithDiffs(node: AsyncApiTreeNode | null): AsyncApiTreeNodeWithDiffs | undefined {
    const nodeWithDiffs = this.takeTreeNodeWithDiffs(node)
    return nodeWithDiffs && this.isComplexTreeNode(nodeWithDiffs) ? nodeWithDiffs : undefined
  }
}
