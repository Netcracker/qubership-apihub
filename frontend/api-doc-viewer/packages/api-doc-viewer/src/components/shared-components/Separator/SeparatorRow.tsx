import { cn } from "@apihub/utils/common/cn"
import { useLayoutMode } from "@apihub/contexts/LayoutModeContext"
import { CHANGED_LAYOUT_SIDE, LayoutSide, ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide"
import { SIDE_BY_SIDE_DIFFS_LAYOUT_MODE } from "@apihub/types/LayoutMode"
import { DiffsClassesBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities"
import { LayoutSeparatorRow } from "@netcracker/qubership-apihub-next-data-model/model/abstract/layout"
import { FC, memo, ReactElement } from "react"
import { FramePosition } from "../Frame/types"
import { OneSideLayout } from "../Layout/OneSideLayout"
import { SideBySideLayout } from "../Layout/SideBySideLayout"
import { BadgeStub } from "./BadgeStub"
import "./SeparatorRow.css"

/** Frame segment of a separator per side (inside a card: `middle` where the card exists). */
export type SeparatorFramePositions = {
  readonly before?: FramePosition
  readonly after?: FramePosition
}

type SeparatorRowProps = {
  separator: LayoutSeparatorRow
  framePositions?: SeparatorFramePositions
}

/**
 * A content-less row: per side a stack of bands whose heights and tones come from the layout data
 * (next-data-model `LayoutPlanner`), and in diffs mode a decorative badge stub continuing the
 * neighbouring rows' floating badges. No padding, no margin, no text. Memoised on the separator
 * `signature` and the frame positions.
 * Design: docs/design/openapi/features/vertical-gaps.md
 */
export const SeparatorRow: FC<SeparatorRowProps> = memo<SeparatorRowProps>((props) => {
  const { separator, framePositions } = props
  const layoutMode = useLayoutMode()

  const renderSide = (layoutSide: LayoutSide): ReactElement => {
    const bands = layoutSide === ORIGIN_LAYOUT_SIDE ? separator.before : separator.after
    return (
      <div
        data-testid="layout-separator"
        data-frame-position={layoutSide === ORIGIN_LAYOUT_SIDE ? framePositions?.before : framePositions?.after}
        className={cn("layout-separator flex w-full flex-col")}
      >
        {bands.map((band, index) => (
          <div key={index} className={cn(`layout-separator-band ${DiffsClassesBuilder.background(band.tone)}`)} style={{ height: band.height }} />
        ))}
      </div>
    )
  }

  if (layoutMode === SIDE_BY_SIDE_DIFFS_LAYOUT_MODE) {
    // Same wrapper shape as `DiffFloatingBadgeWrapper`, so the stub sits where the real badges sit.
    return (
      <div className={cn("relative flex w-full flex-row items-stretch")}>
        <BadgeStub segments={separator.badge} />
        <SideBySideLayout left={renderSide(ORIGIN_LAYOUT_SIDE)} right={renderSide(CHANGED_LAYOUT_SIDE)} />
      </div>
    )
  }
  return <OneSideLayout content={renderSide(CHANGED_LAYOUT_SIDE)} />
}, (previous, next) => (
  previous.separator.signature === next.separator.signature
  && previous.framePositions?.before === next.framePositions?.before
  && previous.framePositions?.after === next.framePositions?.after
))
