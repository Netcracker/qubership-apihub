import { isArray, isObject } from "../../../../utilities";
import { AsyncApiTreeCrawlState } from "../state/types";
import { UNKNOWN_ADDRESS } from "./constants/constants";
import { SchemaTransformFunc } from "./types/types";

export const defaultChannelAddressTransformer: SchemaTransformFunc<AsyncApiTreeCrawlState> = (key, value) => {
  if (!isObject(value) || isArray(value)) {
    return value
  }
  if (!value.address) {
    return {
      ...value,
      address: UNKNOWN_ADDRESS,
    }
  }
  return value
}