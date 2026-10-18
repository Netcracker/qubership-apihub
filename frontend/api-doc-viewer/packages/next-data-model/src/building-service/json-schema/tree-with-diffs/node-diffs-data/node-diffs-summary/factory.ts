import { AbstractNodeDiffsSummaryAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-summary-aggregator"
import { JsonSchemaTreeNodeKind } from "@apihub/next-data-model/model/json-schema/types/node-kind"
import { JsonSchemaNodeDiffsSummaryKindAny } from "./kind-any"

export class JsonSchemaNodeDiffsSummaryAggregatorFactory {
  private static readonly kindAnyInstance = new JsonSchemaNodeDiffsSummaryKindAny()

  public static instance(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    kind: JsonSchemaTreeNodeKind,
  ): AbstractNodeDiffsSummaryAggregator {
    return this.kindAnyInstance
  }
}
