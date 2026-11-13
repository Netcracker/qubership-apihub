import { NodeDescendantDiffs, NodeDiffs } from "../../../model/abstract/tree-with-diffs/tree-node.interface"
import { OpenApiTreeWithDiffs } from "../../../model/openapi/tree-with-diffs/tree.impl"
import { OpenApiTreeNode, OpenApiTreeNodeWithDiffs } from "../../../model/openapi/types/aliases"
import { OpenApiTreeNodeKind } from "../../../model/openapi/types/node-kind"
import { OpenApiTreeNodeMeta } from "../../../model/openapi/types/node-meta"
import { OpenApiAnyTreeNodeValue } from "../../../model/openapi/types/node-value"
import { isOpenApiTreeNodeWithDiffs } from "../../../shared/openapi/guards/tree-node"
import { OpenApiTreeWithDiffsBuilderParams } from "../../../shared/openapi/types/tree-builder-params"
import { isObjective } from "../../../utilities"
import { NodeId, NodeKey } from "../../../utility-types"
import { DiffMetaKeys } from "../../abstract/tree-with-diffs/node-diffs-data/diff-meta-keys"
import { RecordDrivenAggregatorRegistry } from "../../abstract/tree-with-diffs/node-diffs-data/record-driven-aggregators"
import { OpenApiOperationOrientedSpec } from "../shared/openapi-spec-transformer"
import { OpenApiSpecWithDiffsTransformer } from "../shared/openapi-spec-with-diffs-transformer"
import { OpenApiTreeBuildingNodeParams } from "../tree/building-hooks"
import { OpenApiTreeBuilder } from "../tree/builder"
import { OpenApiNodeDataBuilder } from "../tree/node-data/builder"
import { OPENAPI_AGGREGATION_TABLES } from "./aggregation-tables"

const OPENAPI_WITH_DIFFS_LOG_PREFIX = '[OpenAPI][WithDiffs]'

type OpenApiNodeDiffs = NodeDiffs<OpenApiAnyTreeNodeValue | null>

/** The record-driven aggregators of every OpenAPI kind, built from the OpenAPI tables. */
const OPENAPI_AGGREGATORS = new RecordDrivenAggregatorRegistry<
  OpenApiAnyTreeNodeValue | null,
  OpenApiTreeNodeKind,
  OpenApiTreeNodeMeta,
  OpenApiTreeNodeKind
>(OPENAPI_AGGREGATION_TABLES)

/**
 * Merged `apiDiff` document -> tree with precomputed diffs.
 * Design: docs/design/openapi/architecture/data-model-with-diffs.md
 */
export class OpenApiTreeWithDiffsBuilder extends OpenApiTreeBuilder {
  public declare readonly tree: OpenApiTreeWithDiffs
  private readonly diffsMetaKeys: DiffMetaKeys

  constructor(params: OpenApiTreeWithDiffsBuilderParams) {
    super(params)
    this.diffsMetaKeys = params.diffsMetaKeys
  }

  public override build(): OpenApiTreeWithDiffs {
    super.build()
    return this.tree
  }

  protected override get logPrefix(): string {
    return OPENAPI_WITH_DIFFS_LOG_PREFIX
  }

  protected override createTree(): OpenApiTreeWithDiffs {
    return new OpenApiTreeWithDiffs()
  }

  protected override createNodeDataBuilder(): OpenApiNodeDataBuilder {
    return new OpenApiNodeDataBuilder()
  }

  protected override prepareSource(): OpenApiOperationOrientedSpec | null {
    return new OpenApiSpecWithDiffsTransformer(this.logger, this.diffsMetaKeys).transform(this.source, this.operationKeys)
  }

  /* Arrays are kept: records of lists (alternatives) live on the arrays themselves. */
  protected override takeCrawlValue(value: unknown): object | null {
    return isObjective(value) ? value : null
  }

  protected override createNodeFromRaw(
    id: NodeId,
    key: NodeKey,
    kind: OpenApiTreeNodeKind,
    complex: boolean,
    params: OpenApiTreeBuildingNodeParams,
  ): OpenApiTreeNode | undefined {
    const node = super.createNodeFromRaw(id, key, kind, complex, params)
    if (!node || !isOpenApiTreeNodeWithDiffs(node)) {
      return node
    }
    this.assignNodeDiffs(node, kind, params)
    return node
  }

  private assignNodeDiffs(node: OpenApiTreeNodeWithDiffs, kind: OpenApiTreeNodeKind, params: OpenApiTreeBuildingNodeParams): void {
    const parent = this.takeNodeWithDiffs(params.parent)
    const container = this.takeNodeWithDiffs(params.container)

    const nodeDiffs: OpenApiNodeDiffs | undefined = OPENAPI_AGGREGATORS
      .nodeDiffs(kind)
      .aggregate(params.value, this.diffsMetaKeys, node.key, parent, container)
    if (nodeDiffs) {
      Object.assign(node.diffs, nodeDiffs)
    }

    const diffsSummary = OPENAPI_AGGREGATORS.diffsSummary().aggregate(node.diffs)
    if (diffsSummary) {
      node.diffsSummary.clear()
      node.addDiffsSummary(diffsSummary)
    }

    const descendantDiffs: NodeDescendantDiffs | undefined = OPENAPI_AGGREGATORS
      .descendantDiffs()
      .aggregate(params.value, this.diffsMetaKeys)
    if (descendantDiffs) {
      Object.assign(node.descendantDiffs, descendantDiffs)
    }

    // The forward summary reads the document rollup itself, including the node's own field diffs;
    // `mergeAggregatedDiffTypesIntoDescendantSummary` is deliberately not called (it would re-add
    // diffs stamped by the synthesizer onto a wholly added / removed node).
    const descendantDiffsSummary = OPENAPI_AGGREGATORS
      .descendantDiffsSummary()
      .aggregate(node.diffs, node.descendantDiffs, params.value, this.diffsMetaKeys)
    if (descendantDiffsSummary) {
      node.descendantDiffsSummary.clear()
      node.addDescendantDiffsSummary(descendantDiffsSummary)
    }

    const severities = OPENAPI_AGGREGATORS.severities(kind).aggregate(node.diffs)
    if (severities) {
      Object.assign(node.diffsSeverities, severities)
    }
  }

  private takeNodeWithDiffs(node: OpenApiTreeNode | null): OpenApiTreeNodeWithDiffs | undefined {
    return node && isOpenApiTreeNodeWithDiffs(node) ? node : undefined
  }
}
