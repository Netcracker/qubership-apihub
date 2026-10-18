import {
  NodeDescendantDiffs,
  NodeDescendantDiffsSummary,
  NodeDiffs,
  NodeDiffsSeverities,
  NodeDiffsSummary,
} from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { DdlApiTreeWithDiffs } from "@apihub/next-data-model/model/ddlapi/tree-with-diffs/tree.impl";
import { DdlApiTreeNodeValue } from "@apihub/next-data-model/model/ddlapi/tree/node-value";
import { DdlApiTreeNode, DdlApiTreeNodeWithDiffs } from "@apihub/next-data-model/model/ddlapi/types/aliases";
import { DdlApiTreeNodeKind, DdlApiTreeNodeKindsList } from "@apihub/next-data-model/model/ddlapi/types/node-kind";
import { isDdlApiTreeNodeWithDiffs } from "@apihub/next-data-model/shared/ddlapi/guards/tree-node";
import { DdlApiTreeWithDiffsBuilderParams } from "@apihub/next-data-model/shared/ddlapi/types/tree-builder-params";
import { NodeId, NodeKey } from "@apihub/next-data-model/utility-types";
import { DiffMetaKeys } from "../../abstract/tree-with-diffs/node-diffs-data/diff-meta-keys";
import { mergeAggregatedDiffTypesIntoDescendantSummary } from "../../abstract/tree-with-diffs/node-diffs-data/aggregated-diff-types";
import {
  DdlApiSpecWithDiffsTransformer,
  DdlApiTableOrientedSpecWithDiffs,
} from "../shared/ddlapi-spec-with-diffs-transformer";
import { DdlApiTreeBuildingNodeParams } from "../tree/building-hooks";
import { DdlApiTreeBuilder } from "../tree/builder";
import { DdlApiNodeDataBuilder } from "../tree/node-data/builder";
import { DdlApiNodeDataWithDiffsBuilder } from "./node-data/builder";
import { DdlApiNodeDescendantDiffsSummaryAggregatorFactory } from "./node-diffs-data/node-descendant-diffs-summary/factory";
import { DdlApiNodeDescendantDiffsAggregatorFactory } from "./node-diffs-data/node-descendant-diffs/factory";
import { DdlApiNodeDiffsSeveritiesAggregatorFactory } from "./node-diffs-data/node-diffs-severities/factory";
import { DdlApiNodeDiffsSummaryAggregatorFactory } from "./node-diffs-data/node-diffs-summary/factory";
import { DdlApiNodeDiffsAggregatorFactory } from "./node-diffs-data/node-diffs/factory";

const DDL_API_WITH_DIFFS_LOG_PREFIX = '[DDL API][WithDiffs]'

export class DdlApiTreeWithDiffsBuilder extends DdlApiTreeBuilder {
  public declare readonly tree: DdlApiTreeWithDiffs;
  private readonly diffsMetaKeys: DiffMetaKeys;

  constructor(params: DdlApiTreeWithDiffsBuilderParams) {
    super(params)
    this.diffsMetaKeys = params.diffsMetaKeys
  }

  public override build(): DdlApiTreeWithDiffs {
    super.build()
    return this.tree
  }

  protected override get logPrefix(): string {
    return DDL_API_WITH_DIFFS_LOG_PREFIX
  }

  protected override createTree(): DdlApiTreeWithDiffs {
    return new DdlApiTreeWithDiffs()
  }

  protected override createNodeDataBuilder(): DdlApiNodeDataBuilder {
    return new DdlApiNodeDataWithDiffsBuilder()
  }

  protected override prepareSource(): DdlApiTableOrientedSpecWithDiffs | null {
    const specificationTransformer = new DdlApiSpecWithDiffsTransformer(this.logger, this.diffsMetaKeys)
    return specificationTransformer.transformSourceToTableOrientedSpecWithDiffs(this.source, this.tableKey)
  }

  protected override createNodeFromRaw(
    id: NodeId,
    key: NodeKey,
    kind: DdlApiTreeNodeKind,
    complex: boolean,
    params: DdlApiTreeBuildingNodeParams,
  ): DdlApiTreeNode | undefined {
    const treeNode = super.createNodeFromRaw(id, key, kind, complex, params)
    if (!treeNode || !isDdlApiTreeNodeWithDiffs(treeNode)) {
      return treeNode
    }

    this.assignNodeDiffs(treeNode, kind, params)
    return treeNode
  }

  /* Atomic diffs builders */

  protected createNodeDiffs(
    key: NodeKey,
    kind: string,
    params: DdlApiTreeBuildingNodeParams,
  ): NodeDiffs<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null> | undefined {
    if (!this.isDdlApiTreeNodeKind(kind)) {
      return undefined
    }
    const parentNode = this.takeTreeNodeWithDiffs(params.parent)
    const containerNode = this.takeComplexTreeNodeWithDiffs(params.container)
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
    params: DdlApiTreeBuildingNodeParams,
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
    params: DdlApiTreeBuildingNodeParams,
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

  private isDdlApiTreeNodeKind(kind: string): kind is DdlApiTreeNodeKind {
    return DdlApiTreeNodeKindsList.some(ddlApiKind => ddlApiKind === kind)
  }

  private takeTreeNodeWithDiffs(node: DdlApiTreeNode | null): DdlApiTreeNodeWithDiffs | undefined {
    return node && isDdlApiTreeNodeWithDiffs(node) ? node : undefined
  }

  private takeComplexTreeNodeWithDiffs(node: DdlApiTreeNode | null): DdlApiTreeNodeWithDiffs | undefined {
    const nodeWithDiffs = this.takeTreeNodeWithDiffs(node)
    return nodeWithDiffs && this.isComplexTreeNode(nodeWithDiffs) ? nodeWithDiffs : undefined
  }
}
