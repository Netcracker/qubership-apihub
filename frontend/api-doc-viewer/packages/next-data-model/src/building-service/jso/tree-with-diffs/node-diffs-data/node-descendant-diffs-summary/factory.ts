import { AbstractNodeDescendantsDiffsSummaryAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-descendants-diffs-summary-aggregator";
import { JsoTreeNodeKind } from "@apihub/next-data-model/model/jso/types/node-kind";
import { JsoNodeDescendantDiffsSummaryAggregatorKindAny } from "./kind-any";

export class JsoNodeDescendantDiffsSummaryAggregatorFactory {
  private static readonly instances = new Map<JsoTreeNodeKind | null, AbstractNodeDescendantsDiffsSummaryAggregator>();

  public static instance(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    kind: JsoTreeNodeKind,
  ): AbstractNodeDescendantsDiffsSummaryAggregator {
    if (!this.instances.has(null)) {
      const instance = new JsoNodeDescendantDiffsSummaryAggregatorKindAny();
      this.instances.set(null, instance);
    }
    return this.instances.get(null)!;
  }
}
