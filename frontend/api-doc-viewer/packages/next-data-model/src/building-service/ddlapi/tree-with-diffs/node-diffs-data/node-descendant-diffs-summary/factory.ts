import { AbstractNodeDescendantsDiffsSummaryAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-descendants-diffs-summary-aggregator";
import { DdlApiTreeNodeKind } from "@apihub/next-data-model/model/ddlapi/types/node-kind";
import { DdlApiNodeDescendantDiffsSummaryAggregatorKindAny } from "./kind-any";

export class DdlApiNodeDescendantDiffsSummaryAggregatorFactory {
  private static readonly instances = new Map<DdlApiTreeNodeKind | null, AbstractNodeDescendantsDiffsSummaryAggregator>();

  public static instance(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    kind: DdlApiTreeNodeKind,
  ): AbstractNodeDescendantsDiffsSummaryAggregator {
    if (!this.instances.has(null)) {
      this.instances.set(null, new DdlApiNodeDescendantDiffsSummaryAggregatorKindAny());
    }
    return this.instances.get(null)!;
  }
}
