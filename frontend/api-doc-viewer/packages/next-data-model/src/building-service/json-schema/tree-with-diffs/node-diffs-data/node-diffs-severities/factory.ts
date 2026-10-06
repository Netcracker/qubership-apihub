import { AbstractNodeDiffsSeveritiesAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-severities-aggregator"
import { JsonSchemaTreeNodeKind } from "@apihub/next-data-model/model/json-schema/types/node-kind"
import { JsonSchemaTreeNodeStoredValue } from "@apihub/next-data-model/model/json-schema/types/node-value"
import { JsonSchemaNodeDiffsSeveritiesAggregatorKindProperty } from "./kind-property"

export class JsonSchemaNodeDiffsSeveritiesAggregatorFactory {
  private static readonly kindPropertyInstance = new JsonSchemaNodeDiffsSeveritiesAggregatorKindProperty()

  /**
   * Every JSON Schema node kind gets the same severities aggregator - mirrors
   * `JsonSchemaNodeDiffsAggregatorFactory` (node-diffs/factory.ts), which already dispatches
   * every kind through `KindProperty` on the same "strict superset, calls `super.aggregate()`
   * first" reasoning. This factory used to route only ROOT/PROPERTY through `KindProperty` and
   * everything else through the bare `KindAny` aggregator, which silently dropped
   * `DefaultRow`/`EnumRow`/`ExamplesRow`/`AllowedAdditionalPropertyNamesRow` severities (no
   * floating diff badge) for every other schema-bearing kind (`additionalProperties`, `items`,
   * combiner variants, ...) even though `node-diffs/factory.ts` was already computing those
   * diffs for them - found via the `propertyNames.enum` diff never showing a badge on an
   * `additionalProperties` node in Storybook despite `node.diffs` being populated correctly.
   */
  public static instance(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for API stability / future per-kind dispatch
    kind: JsonSchemaTreeNodeKind,
  ): AbstractNodeDiffsSeveritiesAggregator<JsonSchemaTreeNodeStoredValue | null> {
    return this.kindPropertyInstance
  }
}
