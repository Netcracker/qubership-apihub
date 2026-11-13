import {
  ITreeNodeWithDiffs,
  NodeDescendantDiffsSummary,
  NodeDiffsSummary,
} from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface"

function hasNonEmptyRecord(record: object | undefined): boolean {
  return !!record && Object.keys(record).length > 0
}

function hasNonEmptySet(set: NodeDiffsSummary | NodeDescendantDiffsSummary | undefined): boolean {
  return !!set && set.size > 0
}

/** The node's own precomputed diff fields carry anything - the spec-agnostic half of an "is changed" predicate. */
export function hasOwnChangeSignals(node: ITreeNodeWithDiffs): boolean {
  return hasNonEmptyRecord(node.diffs)
    || hasNonEmptyRecord(node.descendantDiffs)
    || hasNonEmptySet(node.diffsSummary)
    || hasNonEmptySet(node.descendantDiffsSummary)
    || hasNonEmptyRecord(node.diffsSeverities)
}
