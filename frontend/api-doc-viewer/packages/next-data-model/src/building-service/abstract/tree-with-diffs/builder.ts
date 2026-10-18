import { ITreeNodeWithDiffs, NodeDescendantDiffs, NodeDescendantDiffsSummary, NodeDiffs, NodeDiffsSeverities, NodeDiffsSummary, TreeNodeWithDiffsParams } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { ITreeWithDiffs } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree.interface";
import { NodeId, NodeKey } from "@apihub/next-data-model/utility-types";
import { DiffMetaKeys } from "./node-diffs-data/diff-meta-keys";
import { TreeBuilder } from "../tree/builder";

export abstract class TreeWithDiffsBuilder<
  V extends object | null,
  K extends string,
  M extends object,
  D extends object | null,
> extends TreeBuilder<V, K, M> {
  public readonly treeWithDiffs: ITreeWithDiffs<V, K, M, D> | null = null;

  public abstract build(): ITreeWithDiffs<V, K, M, D>;

  protected abstract createNodeFromRaw(
    id: NodeId,
    key: NodeKey,
    kind: K,
    complex: boolean,
    params: TreeNodeWithDiffsParams<V, K, M, D>
  ): ITreeNodeWithDiffs<V, K, M, D> | undefined;

  protected abstract createNodeMeta(
    key: NodeKey,
    params: TreeNodeWithDiffsParams<V, K, M, D>,
  ): M;

  protected abstract createNodeValue(
    key: NodeKey,
    kind: string,
    params: TreeNodeWithDiffsParams<V, K, M, D>,
  ): V | null;

  /* Atomic builders */

  protected abstract createNodeDiffs(
    key: NodeKey,
    kind: string,
    params: TreeNodeWithDiffsParams<V, K, M, D>,
  ): NodeDiffs<D> | undefined;

  protected abstract createNodeDiffsSummary(
    kind: string,
    nodeDiffs: NodeDiffs<D> | undefined,
    crawlValue: object | null | undefined,
    diffsMetaKeys: DiffMetaKeys | undefined,
  ): NodeDiffsSummary | undefined;

  protected abstract createNodeDescendantsDiffs(
    kind: string,
    params: TreeNodeWithDiffsParams<V, K, M, D>,
  ): NodeDescendantDiffs | undefined;

  protected updateNodeDiffsByDescendantDiffs(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    kind: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    crawlValue: object | null | undefined,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    nodeDiffs: NodeDiffs<D> | undefined,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    nodeDescendantDiffs: NodeDescendantDiffs,
  ): NodeDescendantDiffs | undefined {
    return undefined
  }

  protected abstract createNodeDescendantsDiffsSummary(
    kind: string,
    nodeDiffs: NodeDiffs<D> | undefined,
    nodeDescendantDiffs: NodeDescendantDiffs | undefined,
    crawlValue: object | null | undefined,
    diffsMetaKeys: DiffMetaKeys | undefined,
  ): NodeDescendantDiffsSummary | undefined;

  protected abstract createNodeDiffsSeverities(
    kind: string,
    nodeDiffs: NodeDiffs<D> | undefined,
  ): NodeDiffsSeverities | undefined;
}