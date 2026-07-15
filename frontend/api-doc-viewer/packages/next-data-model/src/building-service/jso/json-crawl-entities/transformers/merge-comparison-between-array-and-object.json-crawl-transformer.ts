import { SchemaTransformFunc } from "@apihub/next-data-model/building-service/async-api/json-crawl-entities/transformers/types/types";
import { JsoTreeWithDiffsCrawlState } from "../state/types";
import { JsoRawValueUtilities } from "./raw-jso-property-to-base-jso-node-value";

export const mergeComparisonBetweenArrayAndObject: SchemaTransformFunc<JsoTreeWithDiffsCrawlState> = (_, value, __, ___, state) => {
  return JsoRawValueUtilities.mergeComparisonBetweenArrayAndObject(value, state.diffMetaKeys.diffsMetaKey)
}
