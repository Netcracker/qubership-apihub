import {
  ResolveUnchangedBlocksResult,
  UnchangedBlockMembership,
  UnchangedVisibleItem,
  resolveUnchangedBlocks,
} from "@apihub/next-data-model/model/abstract/tree-with-diffs/changed-only/resolve-unchanged-blocks"
import { JsonSchemaTreeNodeWithDiffs } from "@apihub/next-data-model/model/json-schema/types/aliases"
import { isJsonSchemaNodeChanged } from "./is-node-changed"

export type { UnchangedBlockMembership, UnchangedVisibleItem }

export type ResolveJsonSchemaUnchangedBlocksOptions = {
  hideUnchangedNodes?: boolean
}

export function resolveJsonSchemaUnchangedBlocks(
  children: readonly JsonSchemaTreeNodeWithDiffs[],
  options?: ResolveJsonSchemaUnchangedBlocksOptions,
): ResolveUnchangedBlocksResult<JsonSchemaTreeNodeWithDiffs> {
  const hideUnchangedNodes = options?.hideUnchangedNodes !== false

  return resolveUnchangedBlocks(
    children,
    (node) => isJsonSchemaNodeChanged(node),
    hideUnchangedNodes,
  )
}
