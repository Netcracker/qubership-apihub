import { isObject } from "../../../../utilities"
import { AsyncApiTreeCrawlState } from "../state/types"
import { SchemaTransformFunc } from "./types/types"

export const unifyParamsWithSchema: SchemaTransformFunc<AsyncApiTreeCrawlState> = (key, value) => {
  if (!isObject(value)) {
    return null
  }

  return {
    schema: value.schema ?? value,
    schemaFormat: value.schemaFormat ?? null,
  }
}
