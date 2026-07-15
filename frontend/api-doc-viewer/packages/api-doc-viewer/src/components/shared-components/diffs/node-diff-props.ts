import {
  ChangedPropertyMetaData,
  NODE_LEVEL_DIFF_KEY,
  NodeDescendantDiffs,
  NodeDiffs,
  NodeDiffsSeverities,
  NodeDiffsSeverityPlacemennt,
} from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { useMemo } from "react"

type NodeWithDiffState<V extends object = object> = {
  diffs: NodeDiffs<V>
  descendantDiffs: NodeDescendantDiffs
  diffsSeverities: NodeDiffsSeverities
}

export type NodeDiffState<V extends object = object> = {
  nodeDiffs?: NodeDiffs<V>
  nodeDescendantDiffs?: NodeDescendantDiffs
  nodeDiffsSeverities?: NodeDiffsSeverities
}

type BuildRowDiffPropsConfig<V extends object = object> = {
  diffKey?: keyof V
  fallbackToNodeDiff?: boolean
  includeDescendantDiffs?: boolean
  diffsSeverityPlacement?: NodeDiffsSeverityPlacemennt
  resolveDiff?: (
    diffs: NodeDiffs<V>,
    getDiffByKey: (key: keyof V) => ChangedPropertyMetaData | undefined,
  ) => ChangedPropertyMetaData | undefined
}

export type RowDiffProps = {
  diff?: ChangedPropertyMetaData
  descendantDiffs?: NodeDescendantDiffs
  diffsSeverities?: NodeDiffsSeverities
  diffsSeverityPlacement?: NodeDiffsSeverityPlacemennt
}

export function useNodeDiffState<V extends object, N = unknown>(
  node: N,
  isNodeWithDiffs: (node: N) => node is N & NodeWithDiffState<V>,
): NodeDiffState<V> {
  return useMemo(
    () => !isNodeWithDiffs(node) ? {} : toNodeDiffState<V>(node),
    [isNodeWithDiffs, node]
  )
}

export function toNodeDiffState<V extends object>(node: NodeWithDiffState<V>): NodeDiffState<V> {
  return {
    nodeDiffs: node.diffs,
    nodeDescendantDiffs: node.descendantDiffs,
    nodeDiffsSeverities: node.diffsSeverities,
  }
}

export function buildRowDiffProps<V extends object = object>(
  state: NodeDiffState<V>,
  config: BuildRowDiffPropsConfig<V> = {},
): RowDiffProps {
  const {
    diffKey,
    fallbackToNodeDiff = true,
    includeDescendantDiffs = true,
    diffsSeverityPlacement,
    resolveDiff,
  } = config
  const { nodeDiffs, nodeDescendantDiffs, nodeDiffsSeverities } = state
  if (!nodeDiffs) {
    return {}
  }

  const diffEntries = Object.entries(nodeDiffs)
  const getDiffByKey = (key: keyof V): ChangedPropertyMetaData | undefined => {
    const matchedDiff = diffEntries.find(([entryKey]) => entryKey === String(key))
    return matchedDiff?.[1]
  }
  const keyedDiff = diffKey ? getDiffByKey(diffKey) : undefined
  const diff = resolveDiff
    ? resolveDiff(nodeDiffs, getDiffByKey)
    : (fallbackToNodeDiff ? nodeDiffs[NODE_LEVEL_DIFF_KEY] ?? keyedDiff : keyedDiff)

  return {
    diff,
    ...(includeDescendantDiffs ? { descendantDiffs: nodeDescendantDiffs } : {}),
    diffsSeverities: nodeDiffsSeverities,
    ...(diffsSeverityPlacement ? { diffsSeverityPlacement } : {}),
  }
}
