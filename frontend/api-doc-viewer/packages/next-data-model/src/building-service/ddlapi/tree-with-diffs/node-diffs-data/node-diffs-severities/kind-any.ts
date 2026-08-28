import { AbstractNodeDiffsSeveritiesAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-severities-aggregator";
import { NODE_LEVEL_DIFF_KEY, NodeDiffs, NodeDiffsSeverities, NodeDiffsSeverity, NodeDiffsSeverityPlacemennt, ChangedPropertyMetaData } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { DdlApiTreeNodeKind } from "@apihub/next-data-model/model/ddlapi/types/node-kind";
import { DdlApiTreeNodeValue } from "@apihub/next-data-model/model/ddlapi/tree/node-value";
import { isDiffAdd, isDiffRemove, isDiffReplace } from "@netcracker/qubership-apihub-api-diff";

export class DdlApiNodeDiffsSeveritiesAggregatorKindAny
  extends AbstractNodeDiffsSeveritiesAggregator<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null> {

  public aggregate(
    nodeDiffs: NodeDiffs<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null>,
  ): NodeDiffsSeverities | undefined {
    const wholeNodeDiff = nodeDiffs[NODE_LEVEL_DIFF_KEY]
    if (wholeNodeDiff) {
      return {
        [NodeDiffsSeverityPlacemennt.TitleRow]: this.buildNodeDiffsSeverity(wholeNodeDiff),
      }
    }

    const diffsSeverities: NodeDiffsSeverities = {}

    this.applyMaxRowSeverityFromPropertyDiffs(
      nodeDiffs,
      ['tableName', 'columnName', 'indexName', 'title'],
      NodeDiffsSeverityPlacemennt.TitleRow,
      diffsSeverities,
    )
    this.applyRowSeverity(nodeDiffs, 'description', NodeDiffsSeverityPlacemennt.DescriptionRow, diffsSeverities)

    return Object.keys(diffsSeverities).length > 0 ? diffsSeverities : undefined
  }

  protected buildNodeDiffsSeverity(
    propertyDiff: ChangedPropertyMetaData,
  ): NodeDiffsSeverity {
    const diff = propertyDiff.data
    const nodeDiffsSeverity: NodeDiffsSeverity = {
      type: diff.type,
      causedAt: [],
    }
    if (isDiffRemove(diff) || isDiffReplace(diff)) {
      nodeDiffsSeverity.causedAt = diff.beforeDeclarationPaths[0]
    } else if (isDiffAdd(diff)) {
      nodeDiffsSeverity.causedAt = diff.afterDeclarationPaths[0]
    }
    return nodeDiffsSeverity
  }

  protected applyMaxRowSeverityFromPropertyDiffs(
    nodeDiffs: NodeDiffs<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null>,
    propertyKeys: readonly string[],
    placement: NodeDiffsSeverityPlacemennt,
    diffsSeverities: NodeDiffsSeverities,
  ): void {
    const propertyDiffs = propertyKeys.map(
      (propertyKey) => (nodeDiffs as Record<string, ChangedPropertyMetaData | undefined>)[propertyKey],
    )
    const maxPropertyDiff = AbstractNodeDiffsSeveritiesAggregator.maxChangedPropertyMetaDataByDiffType(
      ...propertyDiffs,
    )
    if (!maxPropertyDiff) {
      return
    }
    diffsSeverities[placement] = this.buildNodeDiffsSeverity(maxPropertyDiff)
  }

  protected applyRowSeverity(
    nodeDiffs: NodeDiffs<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null>,
    propertyKey: string,
    placement: NodeDiffsSeverityPlacemennt,
    diffsSeverities: NodeDiffsSeverities,
  ): void {
    const propertyDiff = (nodeDiffs as Record<string, ChangedPropertyMetaData | undefined>)[propertyKey]
    if (!propertyDiff) {
      return
    }
    diffsSeverities[placement] = this.buildNodeDiffsSeverity(propertyDiff)
  }
}
