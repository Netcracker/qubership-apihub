import { isArray, isObject } from "../../../../utilities"
import { OpenApiSchemaTransformFunc } from "../rules/types"
import { OpenApiTreeCrawlState } from "../state/types"

/** Wraps an extensions map as `{ rawValues }`; the map keeps its own diff records. */
export const collectOpenApiRawValues: OpenApiSchemaTransformFunc<OpenApiTreeCrawlState> = (_key, value) => {
  if (!isObject(value) || isArray(value)) {
    return value
  }
  return { rawValues: value }
}
