import { AbstractNodeDescendantsDiffsSummaryAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-descendants-diffs-summary-aggregator";
import { NodeDescendantDiffs, NodeDescendantDiffsSummary, NodeDiffs } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { isDiffAdd, isDiffRemove } from "@netcracker/qubership-apihub-api-diff";
import { DiffMetaKeys } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/diff-meta-keys";

export class JsoNodeDescendantDiffsSummaryAggregatorKindAny extends AbstractNodeDescendantsDiffsSummaryAggregator {
  public aggregate(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    nodeDiffs?: NodeDiffs,
    nodeDescendantDiffs?: NodeDescendantDiffs,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    crawlValue?: object | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    diffsMetaKeys?: DiffMetaKeys,
  ): NodeDescendantDiffsSummary | undefined {
    const summary: NodeDescendantDiffsSummary = new Set();
    if (!nodeDescendantDiffs) {
      return summary;
    }
    for (const diff of Object.values(nodeDescendantDiffs)) {
      if (!diff) {
        continue;
      }
      if (!isDiffAdd(diff.data) && !isDiffRemove(diff.data)) {
        continue;
      }
      summary.add(diff.data.type);
    }
    return summary;
  }
}
