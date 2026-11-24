import { useLayoutSpacing } from "@apihub/contexts/LayoutSpacingContext"
import { LayoutBlock, LayoutPlanner } from "@netcracker/qubership-apihub-next-data-model/model/abstract/layout"
import { FC, Fragment, ReactElement, useMemo } from "react"
import { SeparatorFramePositions, SeparatorRow } from "../Separator/SeparatorRow"

/** A block of layout elements: its edges (from next-data-model `BlockEdges` and its subclasses) and how to render it. */
export type StackBlock = LayoutBlock<() => ReactElement>

type StackLayoutProps = {
  blocks: readonly StackBlock[]
  /** The container level (a shared `SharedLayoutLevel` or one of the API type's own): its level gap (config `levelGap`). */
  level: string
  /** Also the first element's upper half and the last element's lower half (viewer edges, inside a card). */
  outerHalves?: boolean
  /** Frame segment of the separators per side (inside a card: `middle` where the card exists). */
  separatorFramePositions?: SeparatorFramePositions
}

/**
 * One container level: the blocks in the given order with the separator rows the planner puts
 * between them. All colours and heights come from the plan; nothing is decided here. Spacing comes
 * from `LayoutSpacingContext`. `SeparatorRow` is memoised on the separator signature, so an unchanged
 * separator is skipped on re-render.
 * Design: docs/design/openapi/features/vertical-gaps.md -> "Algorithm".
 */
export const StackLayout: FC<StackLayoutProps> = ({ blocks, level, outerHalves = false, separatorFramePositions }) => {
  const spacing = useLayoutSpacing()
  const items = useMemo(() => LayoutPlanner.plan(blocks, level, spacing, { outerHalves }), [blocks, level, spacing, outerHalves])
  return (
    <>
      {items.map(item => item.type === 'block'
        ? <Fragment key={item.block.id}>{item.block.payload()}</Fragment>
        : <SeparatorRow key={item.id} separator={item.separator} framePositions={separatorFramePositions} />)}
    </>
  )
}
