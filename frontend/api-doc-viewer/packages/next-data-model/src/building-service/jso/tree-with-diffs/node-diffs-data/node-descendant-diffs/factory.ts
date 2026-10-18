import { AbstractNodeDescendantsDiffsAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-descendants-diffs-aggregator";
import { JsoTreeNodeKind } from "@apihub/next-data-model/model/jso/types/node-kind";
import { JsoNodeDescendantDiffsAggregatorKindAny } from "./kind-any";

export class JsoNodeDescendantDiffsAggregatorFactory {
  private static readonly instances = new Map<JsoTreeNodeKind | null, AbstractNodeDescendantsDiffsAggregator>();

  public static instance(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    kind: JsoTreeNodeKind,
  ): AbstractNodeDescendantsDiffsAggregator {
    if (!this.instances.has(null)) {
      const instance = new JsoNodeDescendantDiffsAggregatorKindAny();
      this.instances.set(null, instance);
    }
    return this.instances.get(null)!;
  }
}
