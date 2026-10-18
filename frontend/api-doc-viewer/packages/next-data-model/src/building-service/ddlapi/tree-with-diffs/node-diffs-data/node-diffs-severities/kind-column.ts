import { AbstractNodeDiffsSeveritiesAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-severities-aggregator";
import { NODE_LEVEL_DIFF_KEY, NodeDiffs, NodeDiffsSeverities, NodeDiffsSeverityPlacemennt } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { DDL_COLUMN_FLAG_DIFF_KEYS } from "@apihub/next-data-model/model/ddlapi/tree-with-diffs/property-row-diffs";
import { DdlApiColumnPropertyRowDiffs } from "@apihub/next-data-model/model/ddlapi/tree-with-diffs/property-row-diffs.types";
import { DdlApiTreeNodeKind } from "@apihub/next-data-model/model/ddlapi/types/node-kind";
import { DdlApiTreeNodeValue } from "@apihub/next-data-model/model/ddlapi/tree/node-value";
import { DdlApiNodeDiffsSeveritiesAggregatorKindAny } from "./kind-any";

export class DdlApiNodeDiffsSeveritiesAggregatorKindColumn
  extends DdlApiNodeDiffsSeveritiesAggregatorKindAny {

  public aggregate(
    nodeDiffs: NodeDiffs<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null>,
  ): NodeDiffsSeverities | undefined {
    const wholeNodeDiff = nodeDiffs[NODE_LEVEL_DIFF_KEY]
    const diffsSeverities: NodeDiffsSeverities = {}

    if (wholeNodeDiff) {
      diffsSeverities[NodeDiffsSeverityPlacemennt.TitleRow] = this.buildNodeDiffsSeverity(wholeNodeDiff)
      this.applyRowSeverity(nodeDiffs, 'description', NodeDiffsSeverityPlacemennt.DescriptionRow, diffsSeverities)
    } else {
      this.applyMaxRowSeverityFromColumnTitleRowDiffs(nodeDiffs, diffsSeverities)
      this.applyRowSeverity(nodeDiffs, 'description', NodeDiffsSeverityPlacemennt.DescriptionRow, diffsSeverities)
    }

    this.applyMaxAdditionalInfoRowSeverity(nodeDiffs, diffsSeverities)

    return Object.keys(diffsSeverities).length > 0 ? diffsSeverities : undefined
  }

  private applyMaxAdditionalInfoRowSeverity(
    nodeDiffs: NodeDiffs<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null>,
    diffsSeverities: NodeDiffsSeverities,
  ): void {
    const columnDiffs = nodeDiffs as DdlApiColumnPropertyRowDiffs
    const maxPropertyDiff = AbstractNodeDiffsSeveritiesAggregator.maxChangedPropertyMetaDataByDiffType(
      columnDiffs[NODE_LEVEL_DIFF_KEY],
      columnDiffs.isGenerated,
      columnDiffs.generatedExpression,
      columnDiffs.defaultValue,
      columnDiffs.defaultValueRowColorizingDiff,
      columnDiffs.enumValuesRowColorizingDiff,
      ...Object.values(columnDiffs.enumValueDiffs ?? {}),
    )
    if (!maxPropertyDiff) {
      return
    }

    diffsSeverities[NodeDiffsSeverityPlacemennt.AdditionalInfoRow] = this.buildNodeDiffsSeverity(maxPropertyDiff)
  }

  private applyMaxRowSeverityFromColumnTitleRowDiffs(
    nodeDiffs: NodeDiffs<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null>,
    diffsSeverities: NodeDiffsSeverities,
  ): void {
    const columnDiffs = nodeDiffs as DdlApiColumnPropertyRowDiffs
    const titleRowDiffs = [
      columnDiffs.columnName,
      ...DDL_COLUMN_FLAG_DIFF_KEYS.map(flagKey => columnDiffs[flagKey]),
      ...Object.values(columnDiffs.foreignKeyTargetDiffs ?? {}),
      ...Object.values(columnDiffs.columnTypeFieldDiffs ?? {}),
    ]

    const maxPropertyDiff = AbstractNodeDiffsSeveritiesAggregator.maxChangedPropertyMetaDataByDiffType(
      ...titleRowDiffs,
    )
    if (!maxPropertyDiff) {
      return
    }

    diffsSeverities[NodeDiffsSeverityPlacemennt.TitleRow] = this.buildNodeDiffsSeverity(maxPropertyDiff)
  }
}
