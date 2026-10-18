import { AbstractNodeDiffsSeveritiesAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-severities-aggregator";
import {
  NODE_LEVEL_DIFF_KEY,
  NodeDiffs,
  NodeDiffsSeverities,
  NodeDiffsSeverityPlacemennt,
} from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { DdlApiTreeNodeKind } from "@apihub/next-data-model/model/ddlapi/types/node-kind";
import { DdlApiTreeNodeValue } from "@apihub/next-data-model/model/ddlapi/tree/node-value";
import { DdlApiNodeDiffsSeveritiesAggregatorKindAny } from "./kind-any";

export class DdlApiNodeDiffsSeveritiesAggregatorKindTable
  extends DdlApiNodeDiffsSeveritiesAggregatorKindAny {

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
      ['tableName'],
      NodeDiffsSeverityPlacemennt.TitleRow,
      diffsSeverities,
    )
    this.applyMaxRowSeverityFromPropertyDiffs(
      nodeDiffs,
      ['schemaName', 'description'],
      NodeDiffsSeverityPlacemennt.DescriptionRow,
      diffsSeverities,
    )

    return Object.keys(diffsSeverities).length > 0 ? diffsSeverities : undefined
  }
}
