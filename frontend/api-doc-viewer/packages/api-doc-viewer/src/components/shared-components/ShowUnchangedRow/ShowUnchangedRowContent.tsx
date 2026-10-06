import { FC, memo, useCallback } from "react"
import { NestingHorizontalIndicator } from "@apihub/components/common/NestingHorizontalIndicator"
import { ThreeDotsIcon } from "@apihub/components/kit/icons/ThreeDotsIcon"
import { UxTooltip } from "@apihub/components/kit/ux/UxTooltip/UxTooltip"
import "./ShowUnchangedRowContent.css"
import { LevelIndicator } from "../LevelIndicator"
import { ATTRIBUTE_PRECEDED_BY } from "../WithPrecededByProps"
import type { ShowUnchangedRowProps } from "./ShowUnchangedRow"

type ShowUnchangedRowContentProps = ShowUnchangedRowProps & {
  layoutSide: "before" | "after"
  level: number
}

function formatShowUnchangedLabel(count: number): string {
  return count === 1 ? "Show 1 unchanged node" : `Show ${count} unchanged nodes`
}

export const ShowUnchangedRowContent: FC<ShowUnchangedRowContentProps> = memo((props) => {
  const {
    unchangedBlockId,
    count,
    onReveal,
    layoutSide,
    level,
    [ATTRIBUTE_PRECEDED_BY]: precededBy,
  } = props

  const onClick = useCallback(() => {
    onReveal(unchangedBlockId)
  }, [onReveal, unchangedBlockId])

  return (
    <div
      data-testid="show-unchanged-nodes"
      data-precededby={precededBy}
      data-layout-side={layoutSide}
      className={[
        "show-unchanged-row-content flex w-full items-stretch gap-2",
        // X_AXIS_PADDING_ROWS_ASYNC_API,
      ].join(" ")}
    >
      {level > 0 && (
        <div className="level-indicator-column flex items-stretch self-stretch">
          <LevelIndicator level={level} />
          <div className="show-unchanged-connector flex w-4 items-center justify-center" aria-hidden="true">
            <NestingHorizontalIndicator />
          </div>
        </div>
      )}
      <div className="json-schema-property-row-body flex min-h-[26px] min-w-0 flex-1 items-center">
        <UxTooltip text={formatShowUnchangedLabel(count)}>
          <button
            type="button"
            className="show-unchanged-trigger"
            aria-label={formatShowUnchangedLabel(count)}
            onClick={onClick}
          >
            <ThreeDotsIcon />
          </button>
        </UxTooltip>
      </div>
    </div>
  )
})
