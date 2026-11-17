import { NodeDiffs, NodeDiffsSeverities } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";

/** Diff-type ordering for every severity computation: `DiffTypeOrder` (model/abstract/tree-with-diffs/diff-type-order). */
export abstract class AbstractNodeDiffsSeveritiesAggregator<
  V extends object | boolean | null = object | boolean | null,
> {
  public abstract aggregate(
    nodeDiffs: NodeDiffs<V>,
  ): NodeDiffsSeverities | undefined;
}
