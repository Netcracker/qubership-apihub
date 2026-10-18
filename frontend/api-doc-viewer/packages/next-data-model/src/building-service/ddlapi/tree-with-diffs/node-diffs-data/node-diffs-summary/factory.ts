import { AbstractNodeDiffsSummaryAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-summary-aggregator";
import { DdlApiTreeNodeKind } from "@apihub/next-data-model/model/ddlapi/types/node-kind";
import { DdlApiNodeDiffsSummaryKindAny } from "./kind-any";

export class DdlApiNodeDiffsSummaryAggregatorFactory {
  public static instance(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    kind: DdlApiTreeNodeKind,
  ): AbstractNodeDiffsSummaryAggregator {
    return new DdlApiNodeDiffsSummaryKindAny()
  }
}
