import { ChangedPropertyMetaData } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"

export type LevelPair = { beforeLevel: number; afterLevel: number }

export class JsonSchemaNestingLevel {
  /**
   * Next per-side nesting level for a node's children, given the current per-side level and this
   * node's own "whole node / uniformly-changed children" colorizing diff
   * (`takeJsonSchemaNestingIndicatorRowColorizingDiff`). Simply reads the pre-computed
   * `flags.before/after.increaseLevel` off that diff (set in next-data-model's
   * `JsonSchemaNodeDiffsAggregatorKindAny.withNestingLevelFlags`) - mirrors exactly how
   * `JsoPropertyNodeViewerWithDiffs` reads the same field for the same purpose. No
   * `undefined`/add/remove/replace branching here: the data layer already resolved that into a
   * plain boolean per side (increment vs. stay flat), including the "no diff at all" case
   * (`increaseLevel` absent -> treated as "increment", via `?? true`).
   */
  public static resolveNextLevelPair(
    currentBeforeLevel: number,
    currentAfterLevel: number,
    colorizingDiff: ChangedPropertyMetaData | undefined,
  ): LevelPair {
    const increaseBefore = colorizingDiff?.flags.before.increaseLevel ?? true
    const increaseAfter = colorizingDiff?.flags.after.increaseLevel ?? true
    return {
      beforeLevel: Math.max(increaseBefore ? currentBeforeLevel + 1 : currentBeforeLevel, 0),
      afterLevel: Math.max(increaseAfter ? currentAfterLevel + 1 : currentAfterLevel, 0),
    }
  }
}
