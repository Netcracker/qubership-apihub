import { isArray, isObject } from "../../../../utilities"
import { AsyncApiTreeCrawlState } from "../state/types"
import { SchemaTransformFunc } from "./types/types"

export const inlineBindingParameters: SchemaTransformFunc<AsyncApiTreeCrawlState> = (key, value) => {
  if (!isObject(value) || isArray(value)) {
    return value
  }
  const { bindingVersion, ...restValue } = value
  return {
    binding: restValue,
    version: bindingVersion,
    protocol: typeof key === 'symbol' ? key.toString() : `${key}`,
  }
}
