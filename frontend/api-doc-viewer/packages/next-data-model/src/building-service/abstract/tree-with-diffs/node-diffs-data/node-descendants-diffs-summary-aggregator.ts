import { DiffMetaKeys } from "./diff-meta-keys";
import { NodeDescendantDiffs, NodeDescendantDiffsSummary, NodeDiffs } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { Diff, DiffType, isDiffAdd, isDiffRemove, isDiffRename, isDiffReplace } from "@netcracker/qubership-apihub-api-diff";

export abstract class AbstractNodeDescendantsDiffsSummaryAggregator {
  public abstract aggregate(
    nodeDiffs?: NodeDiffs,
    nodeDescendantDiffs?: NodeDescendantDiffs,
    crawlValue?: object | null,
    diffsMetaKeys?: DiffMetaKeys,
  ): NodeDescendantDiffsSummary | undefined;

  protected isDiffsSet(value: unknown): value is Set<Diff<DiffType>> {
    if (!value) {
      return false;
    }
    if (!(value instanceof Set)) {
      return false;
    }
    for (const item of value) {
      if (typeof item !== "object") {
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
