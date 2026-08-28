import { AbstractNodeDiffsSeveritiesAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-severities-aggregator";
import { DdlApiTreeNodeKind, DdlApiTreeNodeKinds } from "@apihub/next-data-model/model/ddlapi/types/node-kind";
import { DdlApiTreeNodeValue } from "@apihub/next-data-model/model/ddlapi/tree/node-value";
import { DdlApiNodeDiffsSeveritiesAggregatorKindAny } from "./kind-any";
import { DdlApiNodeDiffsSeveritiesAggregatorKindColumn } from "./kind-column";
import { DdlApiNodeDiffsSeveritiesAggregatorKindIndex } from "./kind-index";
import { DdlApiNodeDiffsSeveritiesAggregatorKindTable } from "./kind-table";

export class DdlApiNodeDiffsSeveritiesAggregatorFactory {
  private static readonly instances = new Map<
    DdlApiTreeNodeKind | null,
    AbstractNodeDiffsSeveritiesAggregator<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null>
  >();

  public static instance(
    kind: DdlApiTreeNodeKind,
  ): AbstractNodeDiffsSeveritiesAggregator<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null> {
    if (!this.instances.has(kind)) {
      switch (kind) {
        case DdlApiTreeNodeKinds.COLUMN:
          this.instances.set(kind, new DdlApiNodeDiffsSeveritiesAggregatorKindColumn());
          break;
        case DdlApiTreeNodeKinds.INDEX:
          this.instances.set(kind, new DdlApiNodeDiffsSeveritiesAggregatorKindIndex());
          break;
        case DdlApiTreeNodeKinds.TABLE:
          this.instances.set(kind, new DdlApiNodeDiffsSeveritiesAggregatorKindTable());
          break;
        default:
          this.instances.set(null, new DdlApiNodeDiffsSeveritiesAggregatorKindAny());
          return this.instances.get(null)!;
      }
    }
    return this.instances.get(kind)!;
  }
}
