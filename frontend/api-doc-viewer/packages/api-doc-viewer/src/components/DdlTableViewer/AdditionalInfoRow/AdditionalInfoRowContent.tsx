import { X_AXIS_PADDING_ROWS_DDL_API_PROPERTIES } from "@apihub/components/shared-styles/tailwind-classnames"
import { useLevelContext } from "@apihub/contexts/LevelContext"
import { ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide"
import { DiffsClassesBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities"
import { isDiffAdd, isDiffRemove } from "@netcracker/qubership-apihub-api-diff"
import { FC, memo, useMemo } from "react"
import { LevelIndicator } from "../../shared-components/LevelIndicator"
import { ATTRIBUTE_DDL_LIST_LAST_ROW, ATTRIBUTE_PRECEDED_BY } from "../../shared-components/WithPrecededByProps"
import '../../shared-styles/preceded-by.css'
import { AdditionalInfoRowContentProps } from "./types"

export const AdditionalInfoRowContent: FC<AdditionalInfoRowContentProps> = memo<AdditionalInfoRowContentProps>((props) => {
  const {
    label,
    subheader,
    layoutSide,
    diff,
    colorizingDiff,
    hideLevelIndicatorWhenSideEmpty = false,
  } = props

  const { [ATTRIBUTE_PRECEDED_BY]: precededBy, [ATTRIBUTE_DDL_LIST_LAST_ROW]: ddlListLastRow } = props
  const level = useLevelContext()
  const diffStyles = layoutSide === ORIGIN_LAYOUT_SIDE
    ? diff?.styles.before
    : diff?.styles.after
  const colorizingDiffStyles = layoutSide === ORIGIN_LAYOUT_SIDE
    ? colorizingDiff?.styles.before
    : colorizingDiff?.styles.after
  const backgroundColor = (colorizingDiffStyles ?? diffStyles)?.backgroundColor
  const diffsStyleClasses = useMemo(
    () => backgroundColor
      ? [DiffsClassesBuilder.background(backgroundColor)]
      : [],
    [backgroundColor],
  )
  const isContentVisible = useMemo(() => {
    const colorizingDiffData = colorizingDiff?.data
    if (colorizingDiffData) {
      if (isDiffAdd(colorizingDiffData)) {
        return layoutSide !== ORIGIN_LAYOUT_SIDE
      }
      if (isDiffRemove(colorizingDiffData)) {
        return layoutSide === ORIGIN_LAYOUT_SIDE
      }
    }
    return diffStyles?.isContentVisible ?? true
  }, [colorizingDiff, diffStyles?.isContentVisible, layoutSide])

  const showsLevelIndicator = level > 0 && (!hideLevelIndicatorWhenSideEmpty || isContentVisible)

  return (
    <div
      data-testid="additional-info-row-content"
      data-precededby={precededBy}
      data-ddl-list-last-row={ddlListLastRow ? true : undefined}
      className={`additional-info-row-content flex w-full items-stretch h-full ${X_AXIS_PADDING_ROWS_DDL_API_PROPERTIES} min-h-[26px] gap-2 ${diffsStyleClasses.join(' ')}`}
    >
      {showsLevelIndicator && (
        <div data-precededby={precededBy} className="level-indicator-column flex items-stretch self-stretch">
          <LevelIndicator level={level} />
          <div className="w-4" aria-hidden="true" />
        </div>
      )}
      {isContentVisible && (
        <div className="ddlapi-property-row-body flex min-w-0 flex-1 items-center gap-2">
          <span className="additional-info-row-label">{`${label}:`}</span>
          {subheader?.(layoutSide)}
        </div>
      )}
    </div>
  )
})
