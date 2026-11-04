import {
  ResolveUnchangedBlocksResult,
  resolveUnchangedBlocks,
} from "@apihub/next-data-model/model/abstract/tree-with-diffs/changed-only/resolve-unchanged-blocks"
import { JsoTreeNodeWithDiffs } from "@apihub/next-data-model/model/jso/types/aliases"
import { isJsoNodeChanged } from "./is-node-changed"

export function resolveJsoUnchangedBlocks(
  children: readonly JsoTreeNodeWithDiffs[],
  hideUnchangedNodes: boolean,
): ResolveUnchangedBlocksResult<JsoTreeNodeWithDiffs> {
  return resolveUnchangedBlocks(children, isJsoNodeChanged, hideUnchangedNodes)
}
