import { AbstractNodeDiffsSummaryAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-summary-aggregator";
import { AsyncApiTreeNodeKind } from "@apihub/next-data-model/model/async-api/types/node-kind";
import { AsyncApiNodeDiffsSummaryKindAny } from "./kind-any";

export class AsyncApiNodeDiffsSummaryAggregatorFactory {

  public static instance(kind: AsyncApiTreeNodeKind): AbstractNodeDiffsSummaryAggregator {
    switch (kind) {
      default:
        return new AsyncApiNodeDiffsSummaryKindAny()
    }
  }
}