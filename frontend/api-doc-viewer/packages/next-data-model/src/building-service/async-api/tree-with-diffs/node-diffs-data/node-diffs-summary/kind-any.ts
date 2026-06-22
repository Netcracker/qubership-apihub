import { AbstractNodeDiffsSummaryAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-summary-aggregator";
import { NodeDescendantDiffsSummary, NodeDiffs, NodeDiffsSummary } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { Diff, DiffType, isDiffAdd, isDiffRemove, isDiffRename, isDiffReplace } from "@netcracker/qubership-apihub-api-diff";
import { DiffMetaKeys } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/diff-meta-keys";

export class AsyncApiNodeDiffsSummaryKindAny extends AbstractNodeDiffsSummaryAggregator {
  public aggregate(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      const diffType = diff.data.type;
      summary.add(diffType);
    }
    return summary;
  }

  // TODO 22.05.26 // Move to shared utils
  protected isDiffsSet(value: unknown): value is Set<Diff<DiffType>> {
    if (!value) {
      return false;
    }
    if (!(value instanceof Set)) {
      return false;
    }
    for (const item of value) {
      if (typeof item !== 'object') {
        return false;
      }
      if (
        !isDiffAdd(item) &&
        !isDiffRemove(item) &&
        !isDiffReplace(item) &&
        !isDiffRename(item)
      ) {
        return false;
      }
    }
    return true;
  }
}