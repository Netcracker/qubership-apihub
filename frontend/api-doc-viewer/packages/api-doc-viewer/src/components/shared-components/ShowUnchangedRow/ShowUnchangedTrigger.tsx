import { cn } from "@apihub/utils/common/cn"
import { FC, memo, useCallback } from "react"
import { ThreeDotsIcon } from "@apihub/components/kit/icons/ThreeDotsIcon"
import { UxTooltip } from "@apihub/components/kit/ux/UxTooltip/UxTooltip"
import { NodeId } from "@netcracker/qubership-apihub-next-data-model/utility-types"
import "./ShowUnchangedRowContent.css"

export type ShowUnchangedTriggerProps = {
  unchangedBlockId: NodeId
  /** Tooltip and accessible name (`Show 3 unchanged nodes`, `Show 4 unchanged rows`). */
  label: string
  onReveal: (unchangedBlockId: NodeId) => void
}

/**
 * The "three dots" button that reveals one block of unchanged content: an icon button styled by the
 * shared config (shared-styles/colors/icon-buttons.css), like the scroll-strip arrows. Rows place it: the JSON
 * Schema children list in `ShowUnchangedRowContent`, a security scheme card in its own card row.
 */
export const ShowUnchangedTrigger: FC<ShowUnchangedTriggerProps> = memo((props) => {
  const { unchangedBlockId, label, onReveal } = props

  const onClick = useCallback(() => {
    onReveal(unchangedBlockId)
  }, [onReveal, unchangedBlockId])

  return (
    <UxTooltip text={label}>
      <button
        type="button"
        className={cn("icon-button show-unchanged-trigger")}
        aria-label={label}
        onClick={onClick}
      >
        <ThreeDotsIcon />
      </button>
    </UxTooltip>
  )
})
