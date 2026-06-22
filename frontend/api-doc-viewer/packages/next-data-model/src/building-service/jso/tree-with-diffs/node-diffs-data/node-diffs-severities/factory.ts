import { AbstractNodeDiffsSeveritiesAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-severities-aggregator";
import { JsoTreeNodeDiffsSource } from "@apihub/next-data-model/model/jso/tree-with-diffs/node-diffs-source";
import { JsoTreeNodeKind } from "@apihub/next-data-model/model/jso/types/node-kind";
import { JsoNodeDiffsSeveritiesAggregatorKindAny } from "./kind-any";

export class JsoNodeDiffsSeveritiesAggregatorFactory {
  private static readonly instances = new Map<JsoTreeNodeKind | null, AbstractNodeDiffsSeveritiesAggregator<JsoTreeNodeDiffsSource>>();

  public static instance(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    kind: JsoTreeNodeKind,
  ): AbstractNodeDiffsSeveritiesAggregator<JsoTreeNodeDiffsSource> {
    if (!this.instances.has(null)) {
      this.instances.set(null, new JsoNodeDiffsSeveritiesAggregatorKindAny());
    }
    return this.instances.get(null)!;
  }
}
