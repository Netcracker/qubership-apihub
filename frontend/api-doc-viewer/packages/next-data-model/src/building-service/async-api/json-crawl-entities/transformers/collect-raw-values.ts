import { isArray, isObject } from "../../../../utilities"
import { AsyncApiTreeCrawlState } from "../state/types"
import { SchemaTransformFunc } from "./types/types"

export const collectRawValues: SchemaTransformFunc<AsyncApiTreeCrawlState> = (key, value) => {
  if (!isObject(value) || isArray(value)) {
    return value
  }
  return {
    rawValues: value,
  }
}
