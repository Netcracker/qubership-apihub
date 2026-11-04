import { isArray, isObject } from "@apihub/next-data-model/utilities"
import { SchemaTransformFunc } from "../rules/types"
import { JsonSchemaTreeCrawlState } from "../state/types"

/**
 * Set on an `examples` list that {@link transformExample} derived from the `example` keyword. The
 * list is new, so it has no diffs record: the with-diffs aggregator reads the `example` diff for it
 * instead (`JsonSchemaNodeDiffsAggregatorKindProperty`).
 */
export const EXAMPLES_FROM_EXAMPLE_KEYWORD = Symbol("examples-from-example-keyword")

export function isExamplesFromExampleKeyword(value: unknown): value is unknown[] {
  return Array.isArray(value) && Reflect.get(value, EXAMPLES_FROM_EXAMPLE_KEYWORD) === true
}

export const transformExample: SchemaTransformFunc<JsonSchemaTreeCrawlState> = (_key, value) => {
  if (!isObject(value) || isArray(value)) {
    return value
  }
  if ("example" in value && !("examples" in value)) {
    const { example } = value
    const examples = [example]
    // Non-enumerable: the marker must not show up when the node value is compared or copied.
    Object.defineProperty(examples, EXAMPLES_FROM_EXAMPLE_KEYWORD, { value: true })
    value["examples"] = examples
    return value
  }
  return value
}
