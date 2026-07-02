import { AbstractNodeDiffsSeveritiesAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-severities-aggregator";
import { DdlApiTreeNodeKind } from "@apihub/next-data-model/model/ddlapi/types/node-kind";
import { DdlApiTreeNodeValue } from "@apihub/next-data-model/model/ddlapi/tree/node-value";
import { DdlApiNodeDiffsSeveritiesAggregatorKindAny } from "./kind-any";

export class DdlApiNodeDiffsSeveritiesAggregatorFactory {
  public static instance(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    kind: DdlApiTreeNodeKind,
  ): AbstractNodeDiffsSeveritiesAggregator<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null> {
    return new DdlApiNodeDiffsSeveritiesAggregatorKindAny();
  }
}
