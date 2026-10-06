import { AbstractNodeDiffsAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-aggregator"
import { JsonSchemaTreeNodeKind } from "@apihub/next-data-model/model/json-schema/types/node-kind"
import { JsonSchemaTreeNodeMeta } from "@apihub/next-data-model/model/json-schema/types/node-meta"
import { JsonSchemaTreeNodeStoredValue } from "@apihub/next-data-model/model/json-schema/types/node-value"
import { JsonSchemaNodeDiffsAggregatorKindProperty } from "./kind-property"

export class JsonSchemaNodeDiffsAggregatorFactory {
  private static readonly kindPropertyInstance = new JsonSchemaNodeDiffsAggregatorKindProperty()

  /**
   * Every JSON Schema node kind gets the same aggregator. `JsonSchemaNodeDiffsAggregatorKindProperty`
   * extends `JsonSchemaNodeDiffsAggregatorKindAny` (calling `super.aggregate()` first) and layers
   * on `default`/`enum`/`examples`/`required` aggregation - none of which is actually
   * PROPERTY/ROOT-specific: it reads a node's own `default`/`enum`/`examples` crawl fields
   * generically, and `required` resolution safely no-ops for node kinds that aren't named
   * properties of a parent object (additionalProperties, items, combiner variants, ...) since
   * their key never appears in a parent's `required` array. A dedicated kind-any-only path isn't
   * needed - using the property aggregator everywhere is a strict superset of its behavior.
   */
  public static instance(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for API stability / future per-kind dispatch
    kind: JsonSchemaTreeNodeKind,
  ): AbstractNodeDiffsAggregator<
    JsonSchemaTreeNodeStoredValue | null,
    JsonSchemaTreeNodeKind,
    JsonSchemaTreeNodeMeta,
    JsonSchemaTreeNodeStoredValue | null
  > {
    return this.kindPropertyInstance
  }
}
