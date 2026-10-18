import { AbstractNodeDiffsSeveritiesAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-severities-aggregator";
import { NODE_LEVEL_DIFF_KEY, NodeDiffs, NodeDiffsSeverities, NodeDiffsSeverity, NodeDiffsSeverityPlacemennt } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { JsoTreeNodeDiffsSource } from "@apihub/next-data-model/model/jso/tree-with-diffs/node-diffs-source";
import { isDiffAdd, isDiffRemove, isDiffReplace } from "@netcracker/qubership-apihub-api-diff";

export class JsoNodeDiffsSeveritiesAggregatorKindAny extends AbstractNodeDiffsSeveritiesAggregator<JsoTreeNodeDiffsSource> {
  public aggregate(
    nodeDiffs: NodeDiffs<JsoTreeNodeDiffsSource>,
  ): NodeDiffsSeverities | undefined {
    const wholeNodeDiff = nodeDiffs[NODE_LEVEL_DIFF_KEY];
    if (wholeNodeDiff) {
      const diff = wholeNodeDiff.data;
      const nodeDiffsSeverity: NodeDiffsSeverity = {
        type: diff.type,
        causedAt: [],
      };
      if (isDiffReplace(diff) || isDiffRemove(diff)) {
        nodeDiffsSeverity.causedAt = diff.beforeDeclarationPaths[0];
      } else if (isDiffAdd(diff)) {
        nodeDiffsSeverity.causedAt = diff.afterDeclarationPaths[0];
      }
      return {
        [NodeDiffsSeverityPlacemennt.TitleRow]: nodeDiffsSeverity,
      };
    }

    const valueDiff = nodeDiffs["value"];
    if (!valueDiff) {
      return undefined;
    }
    const diff = valueDiff.data;
    const nodeDiffsSeverity: NodeDiffsSeverity = {
      type: diff.type,
      causedAt: [],
    };
    if (isDiffReplace(diff) || isDiffRemove(diff)) {
      nodeDiffsSeverity.causedAt = diff.beforeDeclarationPaths[0];
    } else if (isDiffAdd(diff)) {
      nodeDiffsSeverity.causedAt = diff.afterDeclarationPaths[0];
    }
    return {
      [NodeDiffsSeverityPlacemennt.TitleRow]: nodeDiffsSeverity,
    };
  }
}
