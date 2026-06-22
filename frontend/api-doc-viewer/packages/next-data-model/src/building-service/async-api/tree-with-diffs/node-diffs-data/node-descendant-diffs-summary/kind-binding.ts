import { AbstractNodeDescendantsDiffsSummaryAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-descendants-diffs-summary-aggregator";
import { NodeDescendantDiffs, NodeDescendantDiffsSummary, NodeDiffs } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { getValueByPath } from "@apihub/next-data-model/utilities";
import { DiffMetaKeys } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/diff-meta-keys";

/**
 * Forward collecting diffs summary for BINDING node.
 * This is necessary because some fields under the node in renderred view are not direct descendants of the node.
 * It means that such descendants can't be reached by the backward propagation of diffs summary to parent/container nodes
 * in common mechanism and we have to collect the summary here.
 */
export class AsyncApiNodeDescendantDiffsSummaryAggregatorKindBinding extends AbstractNodeDescendantsDiffsSummaryAggregator {
  public aggregate(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    nodeDiffs?: NodeDiffs,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    nodeDescendantDiffs?: NodeDescendantDiffs,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    crawlValue?: object | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    diffsMetaKeys?: DiffMetaKeys,
  ): NodeDescendantDiffsSummary | undefined {
    const summary: NodeDescendantDiffsSummary = new Set();

    if (!crawlValue || !diffsMetaKeys) {
      return summary;
    }
    const { aggregatedDiffsMetaKey } = diffsMetaKeys

    const aggregatedDiffTypesBinding = getValueByPath(crawlValue, ['binding', aggregatedDiffsMetaKey])
    if (this.isDiffsSet(aggregatedDiffTypesBinding)) {
      for (const diff of aggregatedDiffTypesBinding) {
        if (!diff) { continue; }
        summary.add(diff.type);
      }
    }

    return summary;
  }
}