import { isArray, isObject } from "../../../../utilities"
import { AsyncApiTreeCrawlState } from "../state/types"
import { UNKNOWN_ADDRESS } from "./constants/constants"
import { SchemaTransformFunc } from "./types/types"

export const liftAddressTransformer: SchemaTransformFunc<AsyncApiTreeCrawlState> = (key, value) => {
  if (!isObject(value) || isArray(value)) {
    return value
  }
  if (isObject(value.channel)) {
    return {
      ...value,
      address: value.channel.address
        ? value.channel.address
        : UNKNOWN_ADDRESS,
    }
  }
  return value
}
