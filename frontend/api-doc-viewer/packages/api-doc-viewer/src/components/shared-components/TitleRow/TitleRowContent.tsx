import { X_AXIS_PADDING_ROWS_ASYNC_API, X_AXIS_PADDING_ROWS_JSO } from "@apihub/components/shared-styles/tailwind-classnames"
import { useAsyncLevelContext } from "@apihub/contexts/AsyncLevelContext/AsyncLevelContext"
import { useLevelContext } from "@apihub/contexts/LevelContext"
import { CHANGED_LAYOUT_SIDE, ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide"
import { DiffsClassesBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities"
import { DiffHiglightingApplicationArea, DIFF_HIGHLIGHTING_MODES_DEFAULT } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { FC, memo, useMemo } from "react"
import '../../shared-styles/preceded-by.css'
import { Expander } from "../Expander"
import { LevelIndicator } from "../LevelIndicator"
import { TextValue } from "../TextValue/TextValue"
import { ATTRIBUTE_PRECEDED_BY } from "../WithPrecededByProps"
import { TitleRowContentProps, TitleRowUsage } from "./types"

const TITLE_ROW_X_AXIS_PADDING_BY_USAGE: Partial<Record<TitleRowUsage, string>> = {
  [TitleRowUsage.JsoProperty]: X_AXIS_PADDING_ROWS_JSO,
}

const TITLE_ROW_ADDITIONAL_CLASSES_BY_USAGE: Partial<Record<TitleRowUsage, string[]>> = {
  [TitleRowUsage.JsoProperty]: ['min-h-[26px]'],
}

function getTitleRowClassesByUsage(usage: TitleRowUsage): string {
  const xAxisPaddingClass = TITLE_ROW_X_AXIS_PADDING_BY_USAGE[usage] ?? X_AXIS_PADDING_ROWS_ASYNC_API
  const additionalClasses = TITLE_ROW_ADDITIONAL_CLASSES_BY_USAGE[usage] ?? []
  return [xAxisPaddingClass, ...additionalClasses].join(' ')
}

export const TitleRowContent: FC<TitleRowContentProps> = memo<TitleRowContentProps>((props) => {
  const {
    expandable,
    expanded,
    onClickExpander,
    value,
    variant,
    layoutSide,
    enableHeader = true,
    enableHeaderValue = true,
    subheader,
    usage = TitleRowUsage.Default,
    highlightingMode = DIFF_HIGHLIGHTING_MODES_DEFAULT,
  } = props

  // diffs specific
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { diff, descendantDiffs, diffsSeverities } = props

  // indents specific
  const { [ATTRIBUTE_PRECEDED_BY]: precededBy } = props

  const highlightingModeForKey = useMemo(() => {
    switch (usage) {
      case TitleRowUsage.Default:
        return highlightingMode.get(DiffHiglightingApplicationArea.Default)!
      case TitleRowUsage.AsyncApiJsoSection:
      case TitleRowUsage.JsoProperty:
        return highlightingMode.get(DiffHiglightingApplicationArea.JsoPropertyKey)!
    }
  }, [highlightingMode, usage])

  const syncLevelContext = useLevelContext()
  const asyncLevelContext = useAsyncLevelContext()
  const level = useMemo(() => {
    if (asyncLevelContext) {
      return layoutSide === ORIGIN_LAYOUT_SIDE ? asyncLevelContext.beforeLevel : asyncLevelContext.afterLevel
    }
    return syncLevelContext
  }, [layoutSide, syncLevelContext, asyncLevelContext])

  const diffsStyleClasses = useMemo(() => {
    const diffsStyleClasses: string[] = []
    if (!diff) {
      return diffsStyleClasses
    }
    const { data, styles } = diff
    if (!data) {
      return diffsStyleClasses
    }
    if (layoutSide === ORIGIN_LAYOUT_SIDE) {
      diffsStyleClasses.push(DiffsClassesBuilder.background(styles.before.backgroundColor))
    }
    if (layoutSide === CHANGED_LAYOUT_SIDE) {
      diffsStyleClasses.push(DiffsClassesBuilder.background(styles.after.backgroundColor))
    }
    return diffsStyleClasses
  }, [diff, layoutSide])

  const headerValue = useMemo(() => {
    if (!enableHeaderValue) {
      return null
    }

    return (
      <TextValue
        data-precededby={precededBy}
        value={value}
        variant={variant}
        layoutSide={layoutSide}
        diff={diff}
        usage={usage}
        highlightingMode={highlightingModeForKey}
        onClick={onClickExpander}
      />
    )
  }, [enableHeaderValue, precededBy, value, variant, layoutSide, diff, usage, highlightingModeForKey, onClickExpander])
  const header = useMemo(() => {
    if (!enableHeader) {
      return level > 0 && <LevelIndicator level={level} />
    }
    return <>
      {(expandable || level > 0) && (
        <div data-precededby={precededBy} className="flex items-stretch self-stretch">
          <LevelIndicator level={level} />
          <Expander
            expandable={expandable}
            expanded={expanded}
            onClick={onClickExpander}
            level={level}
          />
        </div>
      )}
      {headerValue}
    </>
  }, [enableHeader, expandable, level, precededBy, expanded, onClickExpander, headerValue])

  const usageDrivenClasses = useMemo(() => {
    return getTitleRowClassesByUsage(usage)
  }, [usage])

  return (
    <div
      data-precededby={precededBy}
      className={`title-row-content flex items-center h-full ${usageDrivenClasses} gap-2 ${diffsStyleClasses.join(' ')}`}
    >
      {header}
      {subheader?.(layoutSide)}
    </div>
  )
})
