import {
  NodeDescendantDiffs,
  NodeDescendantDiffsSummary,
  NodeDiffs,
  NodeDiffsSeverities,
  NodeDiffsSummary,
} from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { JsonSchemaTreeWithDiffs } from "@apihub/next-data-model/model/json-schema/tree-with-diffs/tree.impl"
import { JsonSchemaTreeNode, JsonSchemaTreeNodeWithDiffs } from "@apihub/next-data-model/model/json-schema/types/aliases"
import { JsonSchemaTreeNodeKind, JsonSchemaTreeNodeKindsList } from "@apihub/next-data-model/model/json-schema/types/node-kind"
import { JsonSchemaTreeNodeStoredValue } from "@apihub/next-data-model/model/json-schema/types/node-value"
import { isJsonSchemaTreeNodeWithDiffs } from "@apihub/next-data-model/shared/json-schema/guards/tree-node"
import { JsonSchemaTreeWithDiffsBuilderParams } from "@apihub/next-data-model/shared/json-schema/types/tree-builder-params"
import { NodeId, NodeKey } from "@apihub/next-data-model/utility-types"
import { mergeAggregatedDiffTypesIntoDescendantSummary } from "../../abstract/tree-with-diffs/node-diffs-data/aggregated-diff-types"
import { DiffMetaKeys } from "../../abstract/tree-with-diffs/node-diffs-data/diff-meta-keys"
import {
  JsonSchemaSpecWithDiffsTransformer,
  JsonSchemaWithDiffs,
} from "../shared/json-schema-spec-with-diffs-transformer"
import { JsonSchemaTreeBuilder } from "../tree/builder"
import { JsonSchemaTreeBuildingNodeParams } from "../tree/building-hooks"
import { JsonSchemaNodeDataBuilder } from "../tree/node-data/builder"
import { JsonSchemaNodeDataWithDiffsBuilder } from "./node-data/builder"
import { JsonSchemaNodeDescendantDiffsSummaryAggregatorFactory } from "./node-diffs-data/node-descendant-diffs-summary/factory"
import { JsonSchemaNodeDescendantDiffsAggregatorFactory } from "./node-diffs-data/node-descendant-diffs/factory"
import { JsonSchemaNodeDiffsSeveritiesAggregatorFactory } from "./node-diffs-data/node-diffs-severities/factory"
import { JsonSchemaNodeDiffsSummaryAggregatorFactory } from "./node-diffs-data/node-diffs-summary/factory"
import { JsonSchemaNodeDiffsAggregatorFactory } from "./node-diffs-data/node-diffs/factory"

const JSON_SCHEMA_WITH_DIFFS_LOG_PREFIX = "[JSON Schema][WithDiffs]"

export class JsonSchemaTreeWithDiffsBuilder extends JsonSchemaTreeBuilder {
  public declare readonly tree: JsonSchemaTreeWithDiffs
  private readonly diffsMetaKeys: DiffMetaKeys

  constructor(params: JsonSchemaTreeWithDiffsBuilderParams) {
    super(params)
    this.diffsMetaKeys = params.diffsMetaKeys
  }

  public override build(): JsonSchemaTreeWithDiffs {
    super.build()
    return this.tree
  }

  protected override get logPrefix(): string {
    return JSON_SCHEMA_WITH_DIFFS_LOG_PREFIX
  }

  protected override createTree(): JsonSchemaTreeWithDiffs {
    return new JsonSchemaTreeWithDiffs()
  }

  protected override createNodeDataBuilder(): JsonSchemaNodeDataBuilder {
    return new JsonSchemaNodeDataWithDiffsBuilder((source, keys) => this.pick(source, keys))
  }

  protected override prepareSource(): JsonSchemaWithDiffs | null {
    const specificationTransformer = new JsonSchemaSpecWithDiffsTransformer(this.logger, this.diffsMetaKeys)
    return specificationTransformer.transformSourceToSchemaWithDiffs(this.source)
  }

  protected override createNodeFromRaw(
    id: NodeId,
    key: NodeKey,
    kind: JsonSchemaTreeNodeKind,
    complex: boolean,
    params: JsonSchemaTreeBuildingNodeParams,
  ): JsonSchemaTreeNode | undefined {
    const treeNode = super.createNodeFromRaw(id, key, kind, complex, params)
    if (!treeNode || !isJsonSchemaTreeNodeWithDiffs(treeNode)) {
      return treeNode
    }

    this.assignNodeDiffs(treeNode, kind, params)
    return treeNode
  }

  protected createNodeDiffs(
    key: NodeKey,
    kind: string,
    params: JsonSchemaTreeBuildingNodeParams,
  ): NodeDiffs<JsonSchemaTreeNodeStoredValue | null> | undefined {
    if (!this.isJsonSchemaTreeNodeKind(kind)) {
      return undefined
    }
    const parentNode = this.takeTreeNodeWithDiffs(params.parent)
    const containerNode = this.takeComplexTreeNodeWithDiffs(params.container)
    return JsonSchemaNodeDiffsAggregatorFactory
      .instance(kind)
      .aggregate(params.value, this.diffsMetaKeys, key, parentNode, containerNode)
  }

  protected createNodeDiffsSummary(
    kind: string,
    nodeDiffs: NodeDiffs<JsonSchemaTreeNodeStoredValue | null> | undefined,
    crawlValue: object | boolean | null | undefined,
    diffsMetaKeys: DiffMetaKeys | undefined,
  ): NodeDiffsSummary | undefined {
    if (!this.isJsonSchemaTreeNodeKind(kind)) {
      return undefined
    }
    return JsonSchemaNodeDiffsSummaryAggregatorFactory
      .instance(kind)
      .aggregate(nodeDiffs, crawlValue, diffsMetaKeys)
  }

  protected createNodeDescendantsDiffs(
    kind: string,
    params: JsonSchemaTreeBuildingNodeParams,
  ): NodeDescendantDiffs | undefined {
    if (!this.isJsonSchemaTreeNodeKind(kind)) {
      return undefined
    }
    return JsonSchemaNodeDescendantDiffsAggregatorFactory
      .instance(kind)
      .aggregate(params.value, this.diffsMetaKeys)
  }

  protected updateNodeDiffsByDescendantDiffs(
    kind: string,
    crawlValue: object | boolean | null | undefined,
    nodeDiffs: NodeDiffs<JsonSchemaTreeNodeStoredValue | null>,
    nodeDescendantDiffs: NodeDescendantDiffs,
  ): NodeDiffs<JsonSchemaTreeNodeStoredValue | null> | undefined {
    if (!this.isJsonSchemaTreeNodeKind(kind)) {
      return undefined
    }
    if (crawlValue === null || crawlValue === undefined) {
      return undefined
    }
    return JsonSchemaNodeDiffsAggregatorFactory
      .instance(kind)
      .aggregateByDescendantDiffs(crawlValue, nodeDiffs, nodeDescendantDiffs, this.diffsMetaKeys)
  }

  protected createNodeDescendantsDiffsSummary(
    kind: string,
    nodeDiffs: NodeDiffs<JsonSchemaTreeNodeStoredValue | null> | undefined,
    nodeDescendantDiffs: NodeDescendantDiffs | undefined,
    crawlValue: object | boolean | null | undefined,
    diffsMetaKeys: DiffMetaKeys | undefined,
  ): NodeDescendantDiffsSummary | undefined {
    if (!this.isJsonSchemaTreeNodeKind(kind)) {
      return undefined
    }
    if (!nodeDescendantDiffs) {
      return undefined
    }
    return JsonSchemaNodeDescendantDiffsSummaryAggregatorFactory
      .instance(kind)
      .aggregate(nodeDiffs, nodeDescendantDiffs, crawlValue, diffsMetaKeys)
  }

  protected createNodeDiffsSeverities(
    kind: string,
    nodeDiffs: NodeDiffs<JsonSchemaTreeNodeStoredValue | null> | undefined,
  ): NodeDiffsSeverities | undefined {
    if (!this.isJsonSchemaTreeNodeKind(kind)) {
      return undefined
    }
    if (!nodeDiffs) {
      return undefined
    }
    return JsonSchemaNodeDiffsSeveritiesAggregatorFactory
      .instance(kind)
      .aggregate(nodeDiffs)
  }

  private assignNodeDiffs(
    node: JsonSchemaTreeNodeWithDiffs,
    kind: JsonSchemaTreeNodeKind,
    params: JsonSchemaTreeBuildingNodeParams,
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

  private isJsonSchemaTreeNodeKind(kind: string): kind is JsonSchemaTreeNodeKind {
    return JsonSchemaTreeNodeKindsList.some(jsonSchemaKind => jsonSchemaKind === kind)
  }

  private takeTreeNodeWithDiffs(node: JsonSchemaTreeNode | null): JsonSchemaTreeNodeWithDiffs | undefined {
    return node && isJsonSchemaTreeNodeWithDiffs(node) ? node : undefined
  }

  private takeComplexTreeNodeWithDiffs(node: JsonSchemaTreeNode | null): JsonSchemaTreeNodeWithDiffs | undefined {
    const nodeWithDiffs = this.takeTreeNodeWithDiffs(node)
    return nodeWithDiffs && this.isComplexTreeNode(nodeWithDiffs) ? nodeWithDiffs : undefined
  }
}
