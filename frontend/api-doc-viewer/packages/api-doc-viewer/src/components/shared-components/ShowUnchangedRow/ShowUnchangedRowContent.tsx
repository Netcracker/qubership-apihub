import { cn } from "@apihub/utils/common/cn"
import { FC, memo } from "react"
import { NestingHorizontalIndicator } from "@apihub/components/common/NestingHorizontalIndicator"
import "./ShowUnchangedRowContent.css"
import { LevelIndicator } from "../LevelIndicator"
import { ATTRIBUTE_PRECEDED_BY } from "../WithPrecededByProps"
import type { ShowUnchangedRowProps } from "./ShowUnchangedRow"
import { ShowUnchangedLabels } from "./show-unchanged-labels"
import { ShowUnchangedTrigger } from "./ShowUnchangedTrigger"

type ShowUnchangedRowContentProps = ShowUnchangedRowProps & {
  layoutSide: "before" | "after"
  level: number
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

  return (
    <div
      data-testid="show-unchanged-nodes"
      data-precededby={precededBy}
      data-layout-side={layoutSide}
      className={cn([
        "show-unchanged-row-content flex w-full items-stretch gap-2",
        // X_AXIS_PADDING_ROWS,
      ].join(" "))}
    >
      {level > 0 && (
        <div className={cn("level-indicator-column flex items-stretch self-stretch")}>
          <LevelIndicator level={level} />
          <div className={cn("show-unchanged-connector flex w-4 items-center justify-center")} aria-hidden="true">
            <NestingHorizontalIndicator />
          </div>
        </div>
      )}
      <div className={cn("json-schema-property-row-body flex min-h-[26px] min-w-0 flex-1 items-center")}>
        <ShowUnchangedTrigger
          unchangedBlockId={unchangedBlockId}
          label={ShowUnchangedLabels.nodes(count)}
          onReveal={onReveal}
        />
      </div>
    </div>
  )
})
