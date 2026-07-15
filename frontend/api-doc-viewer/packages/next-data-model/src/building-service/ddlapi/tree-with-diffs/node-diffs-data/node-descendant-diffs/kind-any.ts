import { AbstractNodeDescendantsDiffsAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-descendants-diffs-aggregator";
import { NodeDescendantDiffs } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { DiffMetaKeys } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/diff-meta-keys";

export class DdlApiNodeDescendantDiffsAggregatorKindAny extends AbstractNodeDescendantsDiffsAggregator {
  public aggregate(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    value: object | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    diffsMetaKeys: DiffMetaKeys,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    referenceNamePropertyKey: symbol,
  ): NodeDescendantDiffs | undefined {
    return undefined;
  }
}
