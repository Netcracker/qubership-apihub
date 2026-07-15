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
      const diff = wholeNodeDiff.data
      const nodeDiffsSeverity: NodeDiffsSeverity = {
        type: diff.type,
        causedAt: [],
      }
      if (isDiffReplace(diff) || isDiffRemove(diff)) {
        nodeDiffsSeverity.causedAt = diff.beforeDeclarationPaths[0]
      } else if (isDiffAdd(diff)) {
        nodeDiffsSeverity.causedAt = diff.afterDeclarationPaths[0]
      }
      return {
        [NodeDiffsSeverityPlacemennt.TitleRow]: nodeDiffsSeverity,
      }
    }

    const diffsSeverities: NodeDiffsSeverities = {}

    this.applyRowSeverity(nodeDiffs, 'tableName', NodeDiffsSeverityPlacemennt.TitleRow, diffsSeverities)
    this.applyRowSeverity(nodeDiffs, 'columnName', NodeDiffsSeverityPlacemennt.TitleRow, diffsSeverities)
    this.applyRowSeverity(nodeDiffs, 'indexName', NodeDiffsSeverityPlacemennt.TitleRow, diffsSeverities)
    this.applyRowSeverity(nodeDiffs, 'title', NodeDiffsSeverityPlacemennt.TitleRow, diffsSeverities)
    this.applyRowSeverity(nodeDiffs, 'description', NodeDiffsSeverityPlacemennt.DescriptionRow, diffsSeverities)

    return Object.keys(diffsSeverities).length > 0 ? diffsSeverities : undefined
  }

  private applyRowSeverity(
    nodeDiffs: NodeDiffs<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null>,
    propertyKey: string,
    placement: NodeDiffsSeverityPlacemennt,
    diffsSeverities: NodeDiffsSeverities,
  ): void {
    const propertyDiff = (nodeDiffs as Record<string, ChangedPropertyMetaData | undefined>)[propertyKey]
    if (!propertyDiff) {
      return
    }
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
    diffsSeverities[placement] = nodeDiffsSeverity
  }
}
