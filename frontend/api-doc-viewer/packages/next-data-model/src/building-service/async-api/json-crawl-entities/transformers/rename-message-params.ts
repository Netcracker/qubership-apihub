import { isArray, isObject } from "../../../../utilities"
import { AsyncApiTreeCrawlState } from "../state/types"
import { SchemaTransformFunc } from "./types/types"

export const renameMessageParams: SchemaTransformFunc<AsyncApiTreeCrawlState> = (key, value) => {
  if (!isObject(value) || isArray(value)) {
    return value
  }
  const { name, ...restValue } = value
  return {
    ...restValue,
    ...(name ? { internalTitle: name } : {}),
  }
}
