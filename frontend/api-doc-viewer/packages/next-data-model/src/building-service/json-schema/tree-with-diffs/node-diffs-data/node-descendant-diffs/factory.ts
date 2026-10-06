import { AbstractNodeDescendantsDiffsAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-descendants-diffs-aggregator"
import { JsonSchemaTreeNodeKind } from "@apihub/next-data-model/model/json-schema/types/node-kind"
import { JsonSchemaNodeDescendantDiffsAggregatorKindAny } from "./kind-any"

export class JsonSchemaNodeDescendantDiffsAggregatorFactory {
  private static readonly kindAnyInstance = new JsonSchemaNodeDescendantDiffsAggregatorKindAny()

  public static instance(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    kind: JsonSchemaTreeNodeKind,
  ): AbstractNodeDescendantsDiffsAggregator {
    return this.kindAnyInstance
  }
}
