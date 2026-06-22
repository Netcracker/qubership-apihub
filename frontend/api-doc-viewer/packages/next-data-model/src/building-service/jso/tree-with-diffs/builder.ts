import { NODE_LEVEL_DIFF_KEY, NodeDescendantDiffs, NodeDescendantDiffsSummary, NodeDiffs, NodeDiffsSeverities, NodeDiffsSummary, SimpleTreeNodeWithDiffsParams, TreeNodeWithDiffsParams } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { TreeNodeComplexityTypes } from "@apihub/next-data-model/model/abstract/tree/tree-node.interface";
import { JsoComplexTreeNodeWithDiffs } from "@apihub/next-data-model/model/jso/tree-with-diffs/complex-node.impl";
import { JsoTreeNodeDiffsSource } from "@apihub/next-data-model/model/jso/tree-with-diffs/node-diffs-source";
import { JsoTreeNodeValueWithDiffs } from "@apihub/next-data-model/model/jso/tree-with-diffs/node-value";
import { JsoSimpleTreeNodeWithDiffs } from "@apihub/next-data-model/model/jso/tree-with-diffs/simple-node.impl";
import { JsoTreeWithDiffs } from "@apihub/next-data-model/model/jso/tree-with-diffs/tree.impl";
import { JsoTreeNodeKind, JsoTreeNodeKindsList } from "@apihub/next-data-model/model/jso/types/node-kind";
import { JsoTreeNodeMeta } from "@apihub/next-data-model/model/jso/types/node-meta";
import { JsoPropertyValueTypes } from "@apihub/next-data-model/model/jso/types/node-value-type";
import { isObject } from "@apihub/next-data-model/utilities";
import { NodeId, NodeKey } from "@apihub/next-data-model/utility-types";
import { annotation, breaking, deprecated, DiffType, isDiffAdd, isDiffRemove, isDiffReplace, nonBreaking, risky, unclassified } from "@netcracker/qubership-apihub-api-diff";
import { syncCrawl } from "@netcracker/qubership-apihub-json-crawl";
import { TreeWithDiffsBuilder } from "../../abstract/tree-with-diffs/builder";
import { DiffMetaKeys } from "../../abstract/tree-with-diffs/node-diffs-data/diff-meta-keys";
import { AsyncApiLogger, createAsyncApiLogger } from "../../async-api/logging";
import { getJsoWithDiffsCrawlRules } from "../json-crawl-entities/rules/rules.jso-with-diffs";
import { JsoWithDiffsCrawlRule } from "../json-crawl-entities/rules/types";
import { JsoTreeWithDiffsCrawlState } from "../json-crawl-entities/state/types";
import { JsoRawValueUtilities } from "../json-crawl-entities/transformers/raw-jso-property-to-base-jso-node-value";
import { createJsoTreeWithDiffsBuildingHooks } from "./building-hooks";
import { JsoNodeDataWithDiffsBuilder } from "./node-data/builder";
import { JsoNodeDescendantDiffsSummaryAggregatorFactory } from "./node-diffs-data/node-descendant-diffs-summary/factory";
import { JsoNodeDescendantDiffsAggregatorFactory } from "./node-diffs-data/node-descendant-diffs/factory";
import { JsoNodeDiffsSeveritiesAggregatorFactory } from "./node-diffs-data/node-diffs-severities/factory";
import { JsoNodeDiffsSummaryAggregatorFactory } from "./node-diffs-data/node-diffs-summary/factory";
import { JsoNodeDiffsAggregatorFactory } from "./node-diffs-data/node-diffs/factory";

export class JsoTreeWithDiffsBuilder extends TreeWithDiffsBuilder<
  JsoTreeNodeValueWithDiffs | null,
  JsoTreeNodeKind,
  JsoTreeNodeMeta,
  JsoTreeNodeDiffsSource
> {
  public readonly tree: JsoTreeWithDiffs;
  private readonly nodeDataBuilder: JsoNodeDataWithDiffsBuilder;

  constructor(
    private readonly source: unknown,
    private readonly supportJsonSchema: boolean = false,
    private readonly referenceNamePropertyKey: symbol,
    private readonly diffsMetaKeys: DiffMetaKeys,
    private readonly logger: AsyncApiLogger = createAsyncApiLogger(),
  ) {
    super()
    this.tree = new JsoTreeWithDiffs()
    this.nodeDataBuilder = new JsoNodeDataWithDiffsBuilder()
  }

  public build(): JsoTreeWithDiffs {
    if (!isObject(this.source)) {
      return this.tree
    }

    const initialState: JsoTreeWithDiffsCrawlState = {
      parent: null,
      container: null,
      alreadyConvertedValuesCache: new Map(),
      diffMetaKeys: this.diffsMetaKeys,
    }

    const initialRules: JsoWithDiffsCrawlRule = getJsoWithDiffsCrawlRules()

    const hooks = createJsoTreeWithDiffsBuildingHooks({
      source: this.source,
      tree: this.tree,
      supportedNodeKinds: JsoTreeNodeKindsList,
      // @ts-expect-error - TODO 19.05.26 // Fix type mismatch for `params`
      createNodeFromRaw: (id, key, kind, complex, params) => this.createNodeFromRaw(id, key, kind, complex, params),
      createNodeParams: (value, parent) => ({
        value: value ?? null,
        newDataLevel: true,
        container: null,
        parent: parent,
      }),
      createStateForSimpleNode: (_state, node, cache) => ({
        parent: node,
        container: null,
        alreadyConvertedValuesCache: cache,
        diffMetaKeys: this.diffsMetaKeys,
      }),
      createStateForComplexNode: (state, node, cache) => ({
        parent: state.parent,
        container: node,
        alreadyConvertedValuesCache: cache,
        diffMetaKeys: this.diffsMetaKeys,
      }),
      isSimpleNode: (node) => node.type === TreeNodeComplexityTypes.SIMPLE,
      isComplexNode: (node) => node.type === TreeNodeComplexityTypes.COMPLEX,
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
          nodeValue.before.valueType === JsoPropertyValueTypes.JSON_SCHEMA ||
          nodeValue.after.valueType === JsoPropertyValueTypes.JSON_SCHEMA ||
          nodeValue.before.valueType === JsoPropertyValueTypes.MULTI_SCHEMA ||
          nodeValue.after.valueType === JsoPropertyValueTypes.MULTI_SCHEMA
        )
      },
    })

    syncCrawl<JsoTreeWithDiffsCrawlState, JsoWithDiffsCrawlRule>(
      this.source,
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

    if ('id' in value && typeof value.id === 'string') {
      return value.id
    }
    return key
  }

  protected createNodeFromRaw(
    id: NodeId,
    key: NodeKey,
    kind: JsoTreeNodeKind,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    complex: boolean,
    params: TreeNodeWithDiffsParams<JsoTreeNodeValueWithDiffs | null, JsoTreeNodeKind, JsoTreeNodeMeta, JsoTreeNodeDiffsSource>,
  ): JsoSimpleTreeNodeWithDiffs | JsoComplexTreeNodeWithDiffs | undefined {
    const { parent = null, newDataLevel } = params

    const nodeValue = this.createNodeValue(key, kind, params)
    const nodeMeta = this.createNodeMeta(key, params)
    const simpleParams: SimpleTreeNodeWithDiffsParams<JsoTreeNodeValueWithDiffs | null, JsoTreeNodeKind, JsoTreeNodeMeta, JsoTreeNodeDiffsSource> = {
      type: TreeNodeComplexityTypes.SIMPLE,
      parent: parent && this.isJsoSimpleTreeNodeWithDiffs(parent) ? parent : null,
      container: null,
      value: nodeValue,
      meta: nodeMeta,
      newDataLevel,
    }
    const treeNode = this.tree.createSimpleNode(id, key, kind, false, simpleParams)
    this.assignNodeDiffs(treeNode, kind, params)

    const nodeDiffs = treeNode.diffs
    const nodeChangePropertyMetdata = nodeDiffs[NODE_LEVEL_DIFF_KEY]
    if (nodeChangePropertyMetdata) {
      const { data: diff } = nodeChangePropertyMetdata
      if (isDiffAdd(diff)) {
        nodeValue && (nodeValue.before = JsoRawValueUtilities.DEFAULT_BASE_JSO_NODE_VALUE)
      }
      if (isDiffRemove(diff)) {
        nodeValue && (nodeValue.after = JsoRawValueUtilities.DEFAULT_BASE_JSO_NODE_VALUE)
      }
      if (isDiffReplace(diff)) {
        const { beforeValue } = diff
        const transformedBeforeValue = JsoRawValueUtilities.transformRawJsoPropertyToBaseJsoNodeValue(key, beforeValue)
        nodeValue && (nodeValue.before = transformedBeforeValue)
      }
    }

    return treeNode
  }

  protected createNodeMeta(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    key: NodeKey,
    params: TreeNodeWithDiffsParams<JsoTreeNodeValueWithDiffs | null, JsoTreeNodeKind, JsoTreeNodeMeta, JsoTreeNodeDiffsSource>,
  ): JsoTreeNodeMeta {
    const { value } = params
    return this.nodeDataBuilder.createNodeMeta(value)
  }

  protected createNodeValue(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    key: NodeKey,
    kind: string,
    params: TreeNodeWithDiffsParams<JsoTreeNodeValueWithDiffs | null, JsoTreeNodeKind, JsoTreeNodeMeta, JsoTreeNodeDiffsSource>,
  ): JsoTreeNodeValueWithDiffs | null {
    const { value } = params
    return this.nodeDataBuilder.createNodeValue(kind, key, value, () => null)
  }

  protected createNodeDiffs(
    key: NodeKey,
    kind: string,
    params: TreeNodeWithDiffsParams<JsoTreeNodeValueWithDiffs | null, JsoTreeNodeKind, JsoTreeNodeMeta, JsoTreeNodeDiffsSource>,
  ): NodeDiffs<JsoTreeNodeDiffsSource> | undefined {
    if (!this.isJsoTreeNodeKind(kind)) {
      return undefined
    }
    const parentNode = params.parent && this.isJsoSimpleTreeNodeWithDiffs(params.parent) ? params.parent : undefined
    const containerNode = params.container && this.isJsoComplexTreeNodeWithDiffs(params.container) ? params.container : undefined
    return JsoNodeDiffsAggregatorFactory
      .instance(kind)
      .aggregate(params.value, this.diffsMetaKeys, key, parentNode, containerNode)
  }

  protected createNodeDiffsSummary(
    kind: string,
    nodeDiffs: NodeDiffs<JsoTreeNodeDiffsSource> | undefined,
    crawlValue: object | null | undefined,
    diffsMetaKeys: DiffMetaKeys | undefined,
  ): NodeDiffsSummary | undefined {
    if (!this.isJsoTreeNodeKind(kind)) {
      return undefined
    }
    return JsoNodeDiffsSummaryAggregatorFactory
      .instance(kind)
      .aggregate(nodeDiffs, crawlValue, diffsMetaKeys)
  }

  protected createNodeDescendantsDiffs(
    kind: string,
    params: TreeNodeWithDiffsParams<JsoTreeNodeValueWithDiffs | null, JsoTreeNodeKind, JsoTreeNodeMeta, JsoTreeNodeDiffsSource>,
  ): NodeDescendantDiffs | undefined {
    if (!this.isJsoTreeNodeKind(kind)) {
      return undefined
    }
    return JsoNodeDescendantDiffsAggregatorFactory
      .instance(kind)
      .aggregate(params.value, this.diffsMetaKeys, this.referenceNamePropertyKey)
  }

  protected createNodeDescendantsDiffsSummary(
    kind: string,
    nodeDiffs: NodeDiffs<JsoTreeNodeDiffsSource> | undefined,
    nodeDescendantDiffs: NodeDescendantDiffs | undefined,
    crawlValue: object | null | undefined,
    diffsMetaKeys: DiffMetaKeys | undefined,
  ): NodeDescendantDiffsSummary | undefined {
    if (!this.isJsoTreeNodeKind(kind)) {
      return undefined
    }
    if (!nodeDescendantDiffs) {
      return undefined
    }
    return JsoNodeDescendantDiffsSummaryAggregatorFactory
      .instance(kind)
      .aggregate(nodeDiffs, nodeDescendantDiffs, crawlValue, diffsMetaKeys)
  }

  protected createNodeDiffsSeverities(
    kind: string,
    nodeDiffs: NodeDiffs<JsoTreeNodeDiffsSource> | undefined,
  ): NodeDiffsSeverities | undefined {
    if (!this.isJsoTreeNodeKind(kind)) {
      return undefined
    }
    if (!nodeDiffs) {
      return undefined
    }
    return JsoNodeDiffsSeveritiesAggregatorFactory
      .instance(kind)
      .aggregate(nodeDiffs)
  }

  private assignNodeDiffs(
    node: JsoSimpleTreeNodeWithDiffs | JsoComplexTreeNodeWithDiffs,
    kind: JsoTreeNodeKind,
    params: TreeNodeWithDiffsParams<JsoTreeNodeValueWithDiffs | null, JsoTreeNodeKind, JsoTreeNodeMeta, JsoTreeNodeDiffsSource>,
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

    const descendantDiffsSummary = this.createNodeDescendantsDiffsSummary(kind, node.diffs, node.descendantDiffs, params.value, this.diffsMetaKeys)
    if (descendantDiffsSummary) {
      node.descendantDiffsSummary.clear()
      node.addDescendantDiffsSummary(descendantDiffsSummary)
    }

    const diffsSeverities = this.createNodeDiffsSeverities(kind, node.diffs)
    diffsSeverities && Object.assign(node.diffsSeverities, diffsSeverities)

    const propagatedDiffsSeverities = node.diffsSeverities["title-row"]
      ? undefined
      : this.createPropagatedNodeDiffsSeverities(params)
    propagatedDiffsSeverities && Object.assign(node.diffsSeverities, propagatedDiffsSeverities)
  }

  private createPropagatedNodeDiffsSeverities(
    params: TreeNodeWithDiffsParams<JsoTreeNodeValueWithDiffs | null, JsoTreeNodeKind, JsoTreeNodeMeta, JsoTreeNodeDiffsSource>,
  ): NodeDiffsSeverities | undefined {
    const sourceNode = this.resolveDiffsSeverityPropagationSourceNode(params)
    if (!sourceNode) {
      return undefined
    }
    const propagatedTitleRowSeverity = sourceNode.diffsSeverities["title-row"]
    if (!propagatedTitleRowSeverity) {
      return undefined
    }
    return {
      "title-row": propagatedTitleRowSeverity,
    }
  }

  private resolveDiffsSeverityPropagationSourceNode(
    params: TreeNodeWithDiffsParams<JsoTreeNodeValueWithDiffs | null, JsoTreeNodeKind, JsoTreeNodeMeta, JsoTreeNodeDiffsSource>,
  ): JsoSimpleTreeNodeWithDiffs | JsoComplexTreeNodeWithDiffs | undefined {
    if (params.parent && this.isJsoTreeNodeWithDiffs(params.parent)) {
      const parentSourceNode = this.resolveEligibleDiffsSeveritySourceNode(params.parent, new Set<NodeId>())
      if (parentSourceNode) {
        return parentSourceNode
      }
    }
    if (params.container && this.isJsoTreeNodeWithDiffs(params.container)) {
      const containerSourceNode = this.resolveEligibleDiffsSeveritySourceNode(params.container, new Set<NodeId>())
      if (containerSourceNode) {
        return containerSourceNode
      }
    }
    return undefined
  }

  private isComplexTypeTransitionReplaceDiffNode(
    node: JsoSimpleTreeNodeWithDiffs | JsoComplexTreeNodeWithDiffs,
  ): boolean {
    const candidateDiff = node.diffs["value"] ?? node.diffs[NODE_LEVEL_DIFF_KEY]
    if (!candidateDiff || !isDiffReplace(candidateDiff.data)) {
      return false
    }
    const beforeType = JsoRawValueUtilities.getValueType(candidateDiff.data.beforeValue)
    const afterType = JsoRawValueUtilities.getValueType(candidateDiff.data.afterValue)
    const beforeIsComplex = this.isJsoComplexValueType(beforeType)
    const afterIsComplex = this.isJsoComplexValueType(afterType)
    return beforeIsComplex !== afterIsComplex
  }

  private isJsoComplexValueType(valueType: string): boolean {
    return valueType === JsoPropertyValueTypes.OBJECT || valueType === JsoPropertyValueTypes.ARRAY
  }

  private isInheritedComplexTransitionSeverityNode(
    node: JsoSimpleTreeNodeWithDiffs | JsoComplexTreeNodeWithDiffs,
  ): boolean {
    return Boolean(
      node.diffsSeverities["title-row"] &&
      !node.diffs[NODE_LEVEL_DIFF_KEY] &&
      !node.diffs["value"],
    )
  }

  private resolveEligibleDiffsSeveritySourceNode(
    node: JsoSimpleTreeNodeWithDiffs | JsoComplexTreeNodeWithDiffs,
    visitedNodeIds: Set<NodeId>,
  ): JsoSimpleTreeNodeWithDiffs | JsoComplexTreeNodeWithDiffs | undefined {
    if (visitedNodeIds.has(node.id)) {
      return undefined
    }
    visitedNodeIds.add(node.id)

    if (
      node.diffsSeverities["title-row"] &&
      (this.isComplexTypeTransitionReplaceDiffNode(node) || this.isInheritedComplexTransitionSeverityNode(node))
    ) {
      return node
    }

    if (node.parent && this.isJsoTreeNodeWithDiffs(node.parent)) {
      const sourceFromParent = this.resolveEligibleDiffsSeveritySourceNode(node.parent, visitedNodeIds)
      if (sourceFromParent) {
        return sourceFromParent
      }
    }
    if (node.container && this.isJsoTreeNodeWithDiffs(node.container)) {
      return this.resolveEligibleDiffsSeveritySourceNode(node.container, visitedNodeIds)
    }
    return undefined
  }

  private isJsoTreeNodeWithDiffs(
    node: unknown,
  ): node is JsoSimpleTreeNodeWithDiffs | JsoComplexTreeNodeWithDiffs {
    return Boolean(
      node &&
      typeof node === 'object' &&
      'type' in node &&
      ((node as JsoSimpleTreeNodeWithDiffs | JsoComplexTreeNodeWithDiffs).type === TreeNodeComplexityTypes.SIMPLE ||
        (node as JsoSimpleTreeNodeWithDiffs | JsoComplexTreeNodeWithDiffs).type === TreeNodeComplexityTypes.COMPLEX)
    )
  }

  private isJsoTreeNodeKind(kind: string): kind is JsoTreeNodeKind {
    return JsoTreeNodeKindsList.some(jsoKind => jsoKind === kind)
  }

  private isJsoSimpleTreeNodeWithDiffs(
    node: JsoSimpleTreeNodeWithDiffs | JsoComplexTreeNodeWithDiffs,
  ): node is JsoSimpleTreeNodeWithDiffs {
    return node.type === TreeNodeComplexityTypes.SIMPLE
  }

  private isJsoComplexTreeNodeWithDiffs(
    node: JsoSimpleTreeNodeWithDiffs | JsoComplexTreeNodeWithDiffs,
  ): node is JsoComplexTreeNodeWithDiffs {
    return node.type === TreeNodeComplexityTypes.COMPLEX
  }

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