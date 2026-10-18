import { X_AXIS_PADDING_ROWS_ASYNC_API, X_AXIS_PADDING_ROWS_JSO } from "@apihub/components/shared-styles/tailwind-classnames"
import { useEffectiveLevel } from "@apihub/contexts/AsyncLevelContext/useEffectiveLevel"
import { applyLevelReduction } from "@apihub/contexts/AsyncLevelContext/applyLevelReduction"
import { CHANGED_LAYOUT_SIDE, ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide"
import { DiffsClassesBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities"
import { isDiffAdd, isDiffRemove } from "@netcracker/qubership-apihub-api-diff"
import { FC, memo, useMemo } from "react"
import "../../shared-styles/preceded-by.css"
import { LevelIndicator } from "../LevelIndicator"
import { ATTRIBUTE_PRECEDED_BY } from "../WithPrecededByProps"
import { NestingIndicatorTitleLabel } from "./NestingIndicatorTitleLabel"
import { NestingIndicatorTitleRowContentProps, NestingIndicatorTitleRowUsage } from "./types"

const NESTING_INDICATOR_TITLE_ROW_X_AXIS_PADDING_BY_USAGE: Partial<Record<NestingIndicatorTitleRowUsage, string>> = {
  [NestingIndicatorTitleRowUsage.JsonSchema]: X_AXIS_PADDING_ROWS_JSO,
}

function getNestingIndicatorTitleRowClassesByUsage(usage: NestingIndicatorTitleRowUsage): string {
  return NESTING_INDICATOR_TITLE_ROW_X_AXIS_PADDING_BY_USAGE[usage] ?? X_AXIS_PADDING_ROWS_ASYNC_API
}

export const NestingIndicatorTitleRowContent: FC<NestingIndicatorTitleRowContentProps> = memo<NestingIndicatorTitleRowContentProps>((props) => {
  const {
    title,
    layoutSide,
    usage = NestingIndicatorTitleRowUsage.Default,
    lastInvisible = false,
    diff,
    levelReductionAction,
  } = props

  const { [ATTRIBUTE_PRECEDED_BY]: precededBy } = props

  const baseLevel = useEffectiveLevel(layoutSide)
  const level = useMemo(
    () => applyLevelReduction(baseLevel, layoutSide, levelReductionAction),
    [baseLevel, layoutSide, levelReductionAction],
  )
  const usageDrivenClasses = useMemo(() => getNestingIndicatorTitleRowClassesByUsage(usage), [usage])

  const diffsStyleClasses = useMemo(() => {
    if (!diff?.data) {
      return []
    }
    const { styles } = diff
    const classes: string[] = []
    if (layoutSide === ORIGIN_LAYOUT_SIDE) {
      classes.push(DiffsClassesBuilder.background(styles.before.backgroundColor))
    }
    if (layoutSide === CHANGED_LAYOUT_SIDE) {
      classes.push(DiffsClassesBuilder.background(styles.after.backgroundColor))
    }
    return classes
  }, [diff, layoutSide])

  const isLabelVisible = useMemo(() => {
    const diffData = diff?.data
    if (!diffData) {
      return true
    }
    if (isDiffAdd(diffData)) {
      return layoutSide === CHANGED_LAYOUT_SIDE
    }
    if (isDiffRemove(diffData)) {
      return layoutSide === ORIGIN_LAYOUT_SIDE
    }
    return true
  }, [diff, layoutSide])

  const isJsonSchemaUsage = usage === NestingIndicatorTitleRowUsage.JsonSchema
  const resolvedTitle = typeof title === "function" ? title(layoutSide) : title
  const isTitleVisible = isLabelVisible && resolvedTitle != null

  return (
    <div
      data-testid="nesting-indicator-title-row-content"
      data-precededby={precededBy}
      className={[
        "nesting-indicator-title-row-content flex w-full h-full",
        isJsonSchemaUsage ? "items-stretch" : "",
        usageDrivenClasses,
        ...diffsStyleClasses,
      ].filter(Boolean).join(" ")}
    >
      <div data-precededby={precededBy} className="level-indicator-column flex items-stretch self-stretch">
        <LevelIndicator level={level} lastInvisible={lastInvisible && isLabelVisible} />
      </div>
      {isTitleVisible && <NestingIndicatorTitleLabel title={resolvedTitle} />}
    </div>
  )
})
