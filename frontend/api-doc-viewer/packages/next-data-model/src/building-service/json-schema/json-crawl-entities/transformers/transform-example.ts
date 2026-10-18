import { isArray, isObject } from "@apihub/next-data-model/utilities"
import { SchemaTransformFunc } from "../rules/types"
import { JsonSchemaTreeCrawlState } from "../state/types"

export const transformExample: SchemaTransformFunc<JsonSchemaTreeCrawlState> = (_key, value) => {
  if (!isObject(value) || isArray(value)) {
    return value
  }
  if ("example" in value && !("examples" in value)) {
    const { example } = value
    value["examples"] = [example]
    return value
  }
  return value
}
