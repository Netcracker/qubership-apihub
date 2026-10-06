import { AbstractNodeDescendantsDiffsSummaryAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-descendants-diffs-summary-aggregator"
import { JsonSchemaTreeNodeKind } from "@apihub/next-data-model/model/json-schema/types/node-kind"
import { JsonSchemaNodeDescendantDiffsSummaryAggregatorKindAny } from "./kind-any"

export class JsonSchemaNodeDescendantDiffsSummaryAggregatorFactory {
  private static readonly kindAnyInstance = new JsonSchemaNodeDescendantDiffsSummaryAggregatorKindAny()

  public static instance(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    kind: JsonSchemaTreeNodeKind,
  ): AbstractNodeDescendantsDiffsSummaryAggregator {
    return this.kindAnyInstance
  }
}
