import { cn } from "@apihub/utils/common/cn"
import { LayoutBadgeSegment } from "@netcracker/qubership-apihub-next-data-model/model/abstract/layout"
import { FC, ReactElement } from "react"
import { DIFF_TYPE_COLORS } from "../../kit/ux/UxMarker/consts"

type BadgeStubProps = {
  /** Stacked segments from the layout data; a segment without a type leaves a gap. */
  segments: readonly LayoutBadgeSegment[]
}

/**
 * A decorative stand-in for the diffs floating badge on a synthetic row (separator, card frame row):
 * the same 4px bar at the same place (`UxDiffFloatingBadge`), coloured like the neighbouring row's
 * badge, but not hoverable and without text. Renders nothing when no segment has a type.
 * Design: docs/design/openapi/features/block-separators.md -> §9.2.
 */
export const BadgeStub: FC<BadgeStubProps> = ({ segments }) => {
  if (segments.every(segment => segment.type === undefined)) {
    return null
  }
  return (
    <div data-testid="badge-stub" className={cn("badge-stub pointer-events-none absolute left-0 top-0 z-10 flex h-full w-1 flex-col")} aria-hidden="true">
      {segments.map((segment, index): ReactElement => (
        <div
          key={index}
          className={cn("flex-none")}
          style={{ height: segment.height, backgroundColor: segment.type ? DIFF_TYPE_COLORS[segment.type] : undefined }}
        />
      ))}
    </div>
  )
}
