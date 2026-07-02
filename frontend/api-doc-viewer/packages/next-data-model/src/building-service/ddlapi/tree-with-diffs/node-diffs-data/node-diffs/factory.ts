import { AbstractNodeDiffsAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-aggregator";
import { DdlApiTreeNodeKind } from "@apihub/next-data-model/model/ddlapi/types/node-kind";
import { DdlApiTreeNodeMeta } from "@apihub/next-data-model/model/ddlapi/types/node-meta";
import { DdlApiTreeNodeValue } from "@apihub/next-data-model/model/ddlapi/tree/node-value";
import { DdlApiNodeDiffsAggregatorKindAny } from "./kind-any";

export class DdlApiNodeDiffsAggregatorFactory {
  private static readonly instances = new Map<
    DdlApiTreeNodeKind | null,
    AbstractNodeDiffsAggregator<
      DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null,
      DdlApiTreeNodeKind,
      DdlApiTreeNodeMeta,
      DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null
    >
  >();

  public static instance(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    kind: DdlApiTreeNodeKind,
  ): AbstractNodeDiffsAggregator<
    DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null,
    DdlApiTreeNodeKind,
    DdlApiTreeNodeMeta,
    DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null
  > {
    if (!this.instances.has(null)) {
      this.instances.set(null, new DdlApiNodeDiffsAggregatorKindAny());
    }
    return this.instances.get(null)!;
  }
}
