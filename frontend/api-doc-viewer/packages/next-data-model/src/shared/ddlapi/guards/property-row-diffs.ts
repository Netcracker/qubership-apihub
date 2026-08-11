import { AbstractNodeDiffsAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-aggregator";
import {
  ChangedPropertyMetaData,
} from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import {
  DDL_PROPERTY_TITLE_ROW_DIFF_KEY,
} from "@apihub/next-data-model/model/ddlapi/tree-with-diffs/property-row-diffs.types";
import { isObject } from "@apihub/next-data-model/utilities";

export function isChangedPropertyMetaData(value: unknown): value is ChangedPropertyMetaData {
  if (!isObject(value)) {
    return false
  }

  if (!("data" in value) || !("styles" in value) || !("flags" in value) || !("highlightingMode" in value)) {
    return false
  }

  const { data, styles } = value
  if (!isObject(styles) || !("before" in styles) || !("after" in styles)) {
    return false
  }

  return AbstractNodeDiffsAggregator.isDiff(data)
}

export function hasDdlPropertyTitleRowDiff(
  nodeDiffs: Partial<Record<string, ChangedPropertyMetaData>>,
): nodeDiffs is Partial<Record<string, ChangedPropertyMetaData>> &
  Record<typeof DDL_PROPERTY_TITLE_ROW_DIFF_KEY, ChangedPropertyMetaData> {
  return isChangedPropertyMetaData(nodeDiffs[DDL_PROPERTY_TITLE_ROW_DIFF_KEY])
}
