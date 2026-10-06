import { AbstractNodeDiffsAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-aggregator"
import { isObject } from "@apihub/next-data-model/utilities"
import { ChangedPropertyMetaData } from "./tree-node.interface"

/** Spec-agnostic structural guard for {@link ChangedPropertyMetaData} - shared by every spec's
 * diff aggregators/accessors that need to distinguish a diff wrapper from a nested record of
 * them (e.g. walking `node.diffs` when some entries are themselves maps of diffs). */
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
