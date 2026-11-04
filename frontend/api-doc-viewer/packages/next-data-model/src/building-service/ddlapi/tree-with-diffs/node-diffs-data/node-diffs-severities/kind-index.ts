import { NODE_LEVEL_DIFF_KEY, NodeDiffs, NodeDiffsSeverities, NodeDiffsSeverityPlacemennt } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { DDL_INDEX_FLAG_DIFF_KEYS } from "@apihub/next-data-model/model/ddlapi/tree-with-diffs/property-row-diffs";
import { DdlApiIndexPropertyRowDiffs } from "@apihub/next-data-model/model/ddlapi/tree-with-diffs/property-row-diffs.types";
import { DdlApiTreeNodeKind } from "@apihub/next-data-model/model/ddlapi/types/node-kind";
import { DdlApiTreeNodeValue } from "@apihub/next-data-model/model/ddlapi/tree/node-value";
import { DdlApiNodeDiffsSeveritiesAggregatorKindAny } from "./kind-any";
import { DiffTypeOrder } from "@apihub/next-data-model/model/abstract/tree-with-diffs/diff-type-order";

export class DdlApiNodeDiffsSeveritiesAggregatorKindIndex
  extends DdlApiNodeDiffsSeveritiesAggregatorKindAny {

  public aggregate(
    nodeDiffs: NodeDiffs<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null>,
  ): NodeDiffsSeverities | undefined {
    const wholeNodeDiff = nodeDiffs[NODE_LEVEL_DIFF_KEY]
    const diffsSeverities: NodeDiffsSeverities = {}

    if (wholeNodeDiff) {
      diffsSeverities[NodeDiffsSeverityPlacemennt.TitleRow] = this.buildNodeDiffsSeverity(wholeNodeDiff)
      this.applyRowSeverity(nodeDiffs, 'description', NodeDiffsSeverityPlacemennt.DescriptionRow, diffsSeverities)
      return diffsSeverities
    }

    this.applyMaxRowSeverityFromIndexTitleRowDiffs(nodeDiffs, diffsSeverities)
    this.applyRowSeverity(nodeDiffs, 'description', NodeDiffsSeverityPlacemennt.DescriptionRow, diffsSeverities)

    return Object.keys(diffsSeverities).length > 0 ? diffsSeverities : undefined
  }

  private applyMaxRowSeverityFromIndexTitleRowDiffs(
    nodeDiffs: NodeDiffs<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null>,
    diffsSeverities: NodeDiffsSeverities,
  ): void {
    const indexDiffs = nodeDiffs as DdlApiIndexPropertyRowDiffs
    const titleRowDiffs = [
      indexDiffs.indexName,
      ...DDL_INDEX_FLAG_DIFF_KEYS.map(flagKey => indexDiffs[flagKey]),
      ...Object.values(indexDiffs.partNameDiffs ?? {}),
    ]

    const maxPropertyDiff = DiffTypeOrder.strongestChangedPropertyMetaData(
      ...titleRowDiffs,
    )
    if (!maxPropertyDiff) {
      return
    }

    diffsSeverities[NodeDiffsSeverityPlacemennt.TitleRow] = this.buildNodeDiffsSeverity(maxPropertyDiff)
  }
}
