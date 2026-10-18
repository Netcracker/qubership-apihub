import { AbstractNodeDiffsAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-aggregator";
import { JsoTreeNodeDiffsSource } from "@apihub/next-data-model/model/jso/tree-with-diffs/node-diffs-source";
import { JsoTreeNodeValueWithDiffs } from "@apihub/next-data-model/model/jso/tree-with-diffs/node-value";
import { JsoTreeNodeKind } from "@apihub/next-data-model/model/jso/types/node-kind";
import { JsoTreeNodeMeta } from "@apihub/next-data-model/model/jso/types/node-meta";
import { JsoNodeDiffsAggregatorKindAny } from "./kind-any";

export class JsoNodeDiffsAggregatorFactory {
  private static readonly instances = new Map<
    JsoTreeNodeKind | null,
    AbstractNodeDiffsAggregator<JsoTreeNodeValueWithDiffs | null, JsoTreeNodeKind, JsoTreeNodeMeta, JsoTreeNodeDiffsSource>
  >();

  public static instance(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    kind: JsoTreeNodeKind,
  ): AbstractNodeDiffsAggregator<JsoTreeNodeValueWithDiffs | null, JsoTreeNodeKind, JsoTreeNodeMeta, JsoTreeNodeDiffsSource> {
    if (!this.instances.has(null)) {
      this.instances.set(null, new JsoNodeDiffsAggregatorKindAny());
    }
    return this.instances.get(null)!;
  }
}
