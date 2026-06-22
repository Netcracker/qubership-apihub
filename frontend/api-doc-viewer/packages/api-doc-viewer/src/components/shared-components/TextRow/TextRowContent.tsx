import { X_AXIS_PADDING_ROWS_ASYNC_API } from "@apihub/components/shared-styles/tailwind-classnames"
import { CHANGED_LAYOUT_SIDE, ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide"
import { DiffsClassesBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities"
import { FC, memo, useMemo } from "react"
import '../../shared-styles/preceded-by.css'
import { TextValue } from "../TextValue/TextValue"
import { ATTRIBUTE_PRECEDED_BY } from "../WithPrecededByProps"
import type { TextRowContentProps } from "./types"

export const TextRowContent: FC<TextRowContentProps> = memo<TextRowContentProps>((props) => {
  const { value, variant, layoutSide } = props

  // value/font specific
  const { label, labelFontWeight, textFontWeight, labelColor, textColor } = props

  // indents specific
  const { [ATTRIBUTE_PRECEDED_BY]: precededBy } = props

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { diff, descendantDiffs, diffsSeverities } = props

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

  return (
    <div
      data-precededby={precededBy}
      className={`text-row-content flex h-full ${X_AXIS_PADDING_ROWS_ASYNC_API} gap-2 ${diffsStyleClasses.join(' ')}`}
    >
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
    </div>
  )
})
