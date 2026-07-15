import { X_AXIS_PADDING_ROWS_ASYNC_API, X_AXIS_PADDING_ROWS_DDL_API_PROPERTIES } from "@apihub/components/shared-styles/tailwind-classnames"
import { useLevelContext } from "@apihub/contexts/LevelContext"
import { CHANGED_LAYOUT_SIDE, ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide"
import { DiffsClassesBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities"
import { FC, memo, useMemo } from "react"
import '../../shared-styles/preceded-by.css'
import { LevelIndicator } from "../LevelIndicator"
import { TextValue } from "../TextValue/TextValue"
import { ATTRIBUTE_PRECEDED_BY } from "../WithPrecededByProps"
import { TextRowUsage, type TextRowContentProps } from "./types"

const TEXT_ROW_X_AXIS_PADDING_BY_USAGE: Partial<Record<TextRowUsage, string>> = {
  [TextRowUsage.DdlApiProperty]: X_AXIS_PADDING_ROWS_DDL_API_PROPERTIES,
}

const TEXT_ROW_ADDITIONAL_CLASSES_BY_USAGE: Partial<Record<TextRowUsage, string[]>> = {
  [TextRowUsage.DdlApiProperty]: ['min-h-[26px]'],
}

function getTextRowClassesByUsage(usage: TextRowUsage): string {
  const xAxisPaddingClass = TEXT_ROW_X_AXIS_PADDING_BY_USAGE[usage] ?? X_AXIS_PADDING_ROWS_ASYNC_API
  const additionalClasses = TEXT_ROW_ADDITIONAL_CLASSES_BY_USAGE[usage] ?? []
  return [xAxisPaddingClass, ...additionalClasses].join(' ')
}

export const TextRowContent: FC<TextRowContentProps> = memo<TextRowContentProps>((props) => {
  const { value, variant, layoutSide, usage = TextRowUsage.Default } = props

  // value/font specific
  const { label, labelFontWeight, textFontWeight, labelColor, textColor } = props

  // indents specific
  const { [ATTRIBUTE_PRECEDED_BY]: precededBy } = props

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { diff, descendantDiffs, diffsSeverities } = props

  const level = useLevelContext()
  const isDdlApiPropertyRow = usage === TextRowUsage.DdlApiProperty
  const showsLevelIndent = isDdlApiPropertyRow && level > 0

  const diffsStyleClasses = useMemo(() => {
    if (!diff) {
      return []
    }
    const { data, styles } = diff
    if (!data) {
      return []
    }
    const diffsStyleClasses: string[] = []
    if (layoutSide === ORIGIN_LAYOUT_SIDE) {
      diffsStyleClasses.push(DiffsClassesBuilder.background(styles.before.backgroundColor))
    }
    if (layoutSide === CHANGED_LAYOUT_SIDE) {
      diffsStyleClasses.push(DiffsClassesBuilder.background(styles.after.backgroundColor))
    }
    return diffsStyleClasses
  }, [diff, layoutSide])

  const usageDrivenClasses = useMemo(() => {
    return getTextRowClassesByUsage(usage)
  }, [usage])

  const textValue = (
    <TextValue
      label={label}
      labelFontWeight={labelFontWeight}
      textFontWeight={textFontWeight}
      labelColor={labelColor}
      textColor={textColor}
      value={value}
      variant={variant}
      layoutSide={layoutSide}
      diff={diff}
    />
  )

  return (
    <div
      data-precededby={precededBy}
      className={`text-row-content flex h-full ${isDdlApiPropertyRow ? 'items-stretch' : ''} ${usageDrivenClasses} gap-2 ${diffsStyleClasses.join(' ')}`}
    >
      {showsLevelIndent && (
        <div data-precededby={precededBy} className="level-indicator-column flex items-stretch self-stretch">
          <LevelIndicator level={level} />
          <div className="w-4" aria-hidden="true" />
        </div>
      )}
      {isDdlApiPropertyRow ? (
        <div className="ddlapi-property-row-body flex min-w-0 flex-1 items-center gap-2">
          {textValue}
        </div>
      ) : (
        textValue
      )}
    </div>
  )
})
