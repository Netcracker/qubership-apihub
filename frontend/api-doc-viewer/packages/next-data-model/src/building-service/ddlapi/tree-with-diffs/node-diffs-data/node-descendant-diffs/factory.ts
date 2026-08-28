import { AbstractNodeDescendantsDiffsAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-descendants-diffs-aggregator";
import { resolveDdlApiIndexDescendantDiffKey } from "@apihub/next-data-model/shared/ddlapi/index-title";
import { DdlApiTreeNodeKind, DdlApiTreeNodeKinds } from "@apihub/next-data-model/model/ddlapi/types/node-kind";
import { DdlApiNodeDescendantDiffsAggregatorKindAny } from "./kind-any";
import { DdlApiNodeDescendantDiffsAggregatorKindPropertyListSection } from "./kind-property-list-section";
import { DdlApiNodeDescendantDiffsAggregatorKindTable } from "./kind-table";

export class DdlApiNodeDescendantDiffsAggregatorFactory {
  private static readonly instances = new Map<DdlApiTreeNodeKind | null, AbstractNodeDescendantsDiffsAggregator>();

  public static instance(
    kind: DdlApiTreeNodeKind,
  ): AbstractNodeDescendantsDiffsAggregator {
    if (!this.instances.has(kind)) {
      switch (kind) {
        case DdlApiTreeNodeKinds.TABLE:
          this.instances.set(kind, new DdlApiNodeDescendantDiffsAggregatorKindTable());
          break;
        case DdlApiTreeNodeKinds.COLUMNS:
          this.instances.set(kind, new DdlApiNodeDescendantDiffsAggregatorKindPropertyListSection(
            (_arrayIndex, itemRow) => itemRow.columnName,
          ));
          break;
        case DdlApiTreeNodeKinds.INDEXES:
          this.instances.set(kind, new DdlApiNodeDescendantDiffsAggregatorKindPropertyListSection(
            (arrayIndex, itemRow) => resolveDdlApiIndexDescendantDiffKey(
              arrayIndex,
              itemRow,
              itemRow.indexName,
            ),
          ));
          break;
        default:
          if (!this.instances.has(null)) {
            this.instances.set(null, new DdlApiNodeDescendantDiffsAggregatorKindAny());
          }
          return this.instances.get(null)!;
      }
    }
    return this.instances.get(kind)!;
  }
}
