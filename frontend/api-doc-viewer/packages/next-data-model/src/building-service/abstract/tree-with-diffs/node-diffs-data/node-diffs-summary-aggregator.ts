import { DiffMetaKeys } from "./diff-meta-keys";
import { NodeDescendantDiffsSummary, NodeDiffs } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";

export abstract class AbstractNodeDiffsSummaryAggregator {
  public abstract aggregate(
    nodeDiffs?: NodeDiffs,
    crawlValue?: object | null,
    diffsMetaKeys?: DiffMetaKeys,
  ): NodeDescendantDiffsSummary | undefined;
}
