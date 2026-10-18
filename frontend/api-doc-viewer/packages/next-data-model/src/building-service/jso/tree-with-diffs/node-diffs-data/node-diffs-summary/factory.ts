import { AbstractNodeDiffsSummaryAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-summary-aggregator";
import { JsoTreeNodeKind } from "@apihub/next-data-model/model/jso/types/node-kind";
import { JsoNodeDiffsSummaryKindAny } from "./kind-any";

export class JsoNodeDiffsSummaryAggregatorFactory {
  public static instance(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    kind: JsoTreeNodeKind
  ): AbstractNodeDiffsSummaryAggregator {
    return new JsoNodeDiffsSummaryKindAny()
  }
}
