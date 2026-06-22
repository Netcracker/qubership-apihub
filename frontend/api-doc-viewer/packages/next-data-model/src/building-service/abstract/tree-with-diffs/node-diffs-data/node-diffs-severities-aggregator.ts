import { ChangedPropertyMetaData, NodeDiffs, NodeDiffsSeverities } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { annotation, breaking, deprecated, Diff, DiffType, nonBreaking, risky, unclassified } from "@netcracker/qubership-apihub-api-diff";

export abstract class AbstractNodeDiffsSeveritiesAggregator<
  V extends object | null = object | null,
> {
  public abstract aggregate(
    nodeDiffs: NodeDiffs<V>,
  ): NodeDiffsSeverities | undefined;

  public static readonly DIFF_TYPE_SEVERITIES: Record<DiffType, number> = {
    [breaking]: 6,
    [risky]: 5,
    [deprecated]: 4,
    [nonBreaking]: 3,
    [annotation]: 2,
    [unclassified]: 1,
  }

  public static maxDiffByDiffType(...diffs: (Diff | undefined)[]): Diff | undefined {
    let maxDiff: Diff | undefined
    for (const diff of diffs) {
      if (!diff) {
        continue
      }
      if (AbstractNodeDiffsSeveritiesAggregator.compareDiffTypes(diff.type, maxDiff?.type) > 0) {
        maxDiff = diff
      }
    }
    return maxDiff
  }

  public static maxChangedPropertyMetaDataByDiffType(...changedPropertyMetaDatas: (ChangedPropertyMetaData | undefined)[]): ChangedPropertyMetaData | undefined {
    const filteredChangedPropertyMetaDatas: ChangedPropertyMetaData[] =
      changedPropertyMetaDatas.filter((value): value is ChangedPropertyMetaData => !!value)
    let maxChangedPropertyMetaData: ChangedPropertyMetaData | undefined
    for (const changedPropertyMetaData of filteredChangedPropertyMetaDatas) {
      if (AbstractNodeDiffsSeveritiesAggregator.compareDiffTypes(changedPropertyMetaData.data.type, maxChangedPropertyMetaData?.data.type) > 0) {
        maxChangedPropertyMetaData = changedPropertyMetaData
      }
    }
    return maxChangedPropertyMetaData
  }

  public static compareDiffTypes(a: DiffType | undefined, b: DiffType | undefined): number {
    if (!a && !b) {
      return 0
    }
    if (!a && b) {
      return AbstractNodeDiffsSeveritiesAggregator.DIFF_TYPE_SEVERITIES[b]
    }
    if (a && !b) {
      return AbstractNodeDiffsSeveritiesAggregator.DIFF_TYPE_SEVERITIES[a]
    }
    return AbstractNodeDiffsSeveritiesAggregator.DIFF_TYPE_SEVERITIES[a!] - AbstractNodeDiffsSeveritiesAggregator.DIFF_TYPE_SEVERITIES[b!]
  }
}
