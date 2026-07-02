import { AbstractNodeDescendantsDiffsAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-descendants-diffs-aggregator";
import { DdlApiTreeNodeKind } from "@apihub/next-data-model/model/ddlapi/types/node-kind";
import { DdlApiNodeDescendantDiffsAggregatorKindAny } from "./kind-any";

export class DdlApiNodeDescendantDiffsAggregatorFactory {
  private static readonly instances = new Map<DdlApiTreeNodeKind | null, AbstractNodeDescendantsDiffsAggregator>();

  public static instance(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    kind: DdlApiTreeNodeKind,
  ): AbstractNodeDescendantsDiffsAggregator {
    if (!this.instances.has(null)) {
      this.instances.set(null, new DdlApiNodeDescendantDiffsAggregatorKindAny());
    }
    return this.instances.get(null)!;
  }
}
