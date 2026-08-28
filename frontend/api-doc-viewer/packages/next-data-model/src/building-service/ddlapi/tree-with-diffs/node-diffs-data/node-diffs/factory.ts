import { AbstractNodeDiffsAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-aggregator";
import { DdlApiTreeNodeValue } from "@apihub/next-data-model/model/ddlapi/tree/node-value";
import { DdlApiTreeNodeKind, DdlApiTreeNodeKinds } from "@apihub/next-data-model/model/ddlapi/types/node-kind";
import { DdlApiTreeNodeMeta } from "@apihub/next-data-model/model/ddlapi/types/node-meta";
import { DdlApiNodeDiffsAggregatorKindAny } from "./kind-any";
import { DdlApiNodeDiffsAggregatorKindColumn } from "./kind-column";
import { DdlApiNodeDiffsAggregatorKindIndex } from "./kind-index";
import { DdlApiNodeDiffsAggregatorKindPropertyListSection } from "./kind-property-list-section";
import { DdlApiNodeDiffsAggregatorKindTable } from "./kind-table";

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
    if (!this.instances.has(kind)) {
      switch (kind) {
        case DdlApiTreeNodeKinds.COLUMN:
          this.instances.set(kind, new DdlApiNodeDiffsAggregatorKindColumn());
          break;
        case DdlApiTreeNodeKinds.INDEX:
          this.instances.set(kind, new DdlApiNodeDiffsAggregatorKindIndex());
          break;
        case DdlApiTreeNodeKinds.TABLE:
          this.instances.set(kind, new DdlApiNodeDiffsAggregatorKindTable());
          break;
        case DdlApiTreeNodeKinds.COLUMNS:
        case DdlApiTreeNodeKinds.INDEXES:
          this.instances.set(kind, new DdlApiNodeDiffsAggregatorKindPropertyListSection());
          break;
        default:
          if (!this.instances.has(null)) {
            this.instances.set(null, new DdlApiNodeDiffsAggregatorKindAny());
          }
          return this.instances.get(null)!;
      }
    }
    return this.instances.get(kind)!;
  }
}
