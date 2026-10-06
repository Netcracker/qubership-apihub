import { NodeId } from "@netcracker/qubership-apihub-next-data-model/utility-types"
import { createContext, useCallback, useContext, useMemo, useState } from "react"
import { isHideUnchangedNodesMode, JsonSchemaDiffsNodesVisibilityMode } from "./JsonSchemaDiffsNodesVisibilityMode"

export type UnchangedBlocksContextValue = {
  /** Source of truth - see JsonSchemaDiffsNodesVisibilityMode.ts for why this is a mode, not a bare boolean. */
  mode: JsonSchemaDiffsNodesVisibilityMode
  /** Derived from `mode` (`mode !== "show-all"`) - kept as a plain boolean for the existing
   * consumers (SchemaNodeViewer, CombinerNodeViewer, SchemaNodeChildrenListWithDiffs) that only
   * ever needed the binary "collapse unchanged content or not" answer, and for the next-data-model
   * calls that still take a boolean. Stays correct without touching those call sites once a third
   * mode is added, since every non-"show-all" mode collapses unchanged content the same way. */
  hideUnchangedNodes: boolean
  revealedBlockIds: ReadonlySet<NodeId>
  revealBlock: (unchangedBlockId: NodeId) => void
}

export const UnchangedBlocksContext = createContext<UnchangedBlocksContextValue | null>(null)

export function useUnchangedBlocksContext(): UnchangedBlocksContextValue {
  const context = useContext(UnchangedBlocksContext)
  if (!context) {
    throw new Error("useUnchangedBlocksContext must be used within JsonSchemaDiffsViewer")
  }
  return context
}

export function useOptionalUnchangedBlocksContext(): UnchangedBlocksContextValue | null {
  return useContext(UnchangedBlocksContext)
}

export function useUnchangedBlocksContextValue(
  mode: JsonSchemaDiffsNodesVisibilityMode,
): UnchangedBlocksContextValue {
  const [revealedBlockIds, setRevealedBlockIds] = useState<ReadonlySet<NodeId>>(() => new Set())

  const revealBlock = useCallback((unchangedBlockId: NodeId) => {
    setRevealedBlockIds((previous) => {
      if (previous.has(unchangedBlockId)) {
        return previous
      }
      const next = new Set(previous)
      next.add(unchangedBlockId)
      return next
    })
  }, [])

  return useMemo(
    () => ({
      mode,
      hideUnchangedNodes: isHideUnchangedNodesMode(mode),
      revealedBlockIds,
      revealBlock,
    }),
    [mode, revealedBlockIds, revealBlock],
  )
}
