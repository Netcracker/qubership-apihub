import { AbstractNodeDiffsSummaryAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-summary-aggregator";
import { NodeDescendantDiffsSummary, NodeDiffs, NodeDiffsSummary } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { DiffMetaKeys } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/diff-meta-keys";

export class DdlApiNodeDiffsSummaryKindAny extends AbstractNodeDiffsSummaryAggregator {
  public aggregate(
    nodeDiffs?: NodeDiffs,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    crawlValue?: object | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    diffsMetaKeys?: DiffMetaKeys,
  ): NodeDiffsSummary | undefined {
    const summary: NodeDescendantDiffsSummary = new Set();
    if (!nodeDiffs) {
      return summary;
    }
    for (const diff of Object.values(nodeDiffs)) {
      if (!diff) {
        continue;
      }
      summary.add(diff.data.type);
    }
    return summary;
  }
}
