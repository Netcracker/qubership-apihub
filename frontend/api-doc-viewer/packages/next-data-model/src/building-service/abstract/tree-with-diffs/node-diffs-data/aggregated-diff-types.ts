import { Diff, DiffType, isDiffAdd, isDiffRemove, isDiffRename, isDiffReplace } from "@netcracker/qubership-apihub-api-diff"
import { isObject } from "../../../../utilities"
import { DiffMetaKeys } from "./diff-meta-keys"
import {
  NodeDescendantDiffsSummary,
  NodeDiffs,
} from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface"

function isUnknownSet(value: unknown): value is Set<unknown> {
  return value instanceof Set
}

function isDiffLike(value: unknown): value is Diff<DiffType> {
  return isObject(value) && "action" in value && "type" in value
}

function isDiffsSet(value: unknown): value is Set<Diff<DiffType>> {
  if (!isUnknownSet(value)) {
    return false
  }
  for (const item of value) {
    if (!isDiffLike(item)) {
      return false
    }
    if (isDiffAdd(item)) {
      continue
    }
    if (isDiffRemove(item)) {
      continue
    }
    if (isDiffRename(item)) {
      continue
    } 
    if (isDiffReplace(item)) {
      continue
    }
    return false
  }
  return true
}

/**
 * Reads Diff objects from document-level rollup (`aggregateDiffsWithRollup`).
 */
export function takeAggregatedDiffs(
  crawlValue: object | boolean | null | undefined,
  diffsMetaKeys: DiffMetaKeys | undefined,
): ReadonlySet<Diff<DiffType>> {
  if (!isObject(crawlValue) || !diffsMetaKeys) {
    return new Set()
  }
  const aggregated = (crawlValue as Record<PropertyKey, unknown>)[diffsMetaKeys.aggregatedDiffsMetaKey]
  if (!isDiffsSet(aggregated)) {
    return new Set()
  }
  return aggregated
}

export function takeAggregatedDiffTypes(
  crawlValue: object | boolean | null | undefined,
  diffsMetaKeys: DiffMetaKeys | undefined,
): ReadonlySet<DiffType> {
  const types = new Set<DiffType>()
  for (const diff of takeAggregatedDiffs(crawlValue, diffsMetaKeys)) {
    if (diff?.type) {
      types.add(diff.type)
    }
  }
  return types
}

/**
 * Merges nested DiffTypes from document rollup into descendantDiffsSummary.
 * Own-node Diff objects (same references as in `node.diffs`) are excluded.
 */
export function mergeAggregatedDiffTypesIntoDescendantSummary(
  descendantDiffsSummary: NodeDescendantDiffsSummary,
  nodeDiffs: NodeDiffs | undefined,
  crawlValue: object | boolean | null | undefined,
  diffsMetaKeys: DiffMetaKeys | undefined,
): void {
  const ownDiffData = new Set<Diff<DiffType>>()
  if (nodeDiffs) {
    for (const changed of Object.values(nodeDiffs)) {
      if (changed?.data) {
        ownDiffData.add(changed.data)
      }
    }
  }
  for (const diff of takeAggregatedDiffs(crawlValue, diffsMetaKeys)) {
    if (ownDiffData.has(diff)) {
      continue
    }
    if (diff?.type) {
      descendantDiffsSummary.add(diff.type)
    }
  }
}
