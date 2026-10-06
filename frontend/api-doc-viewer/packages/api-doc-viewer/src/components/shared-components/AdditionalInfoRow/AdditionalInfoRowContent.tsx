import { useEffectiveLevel } from "@apihub/contexts/AsyncLevelContext/useEffectiveLevel"
import { ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide"
import { DiffsClassesBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities"
import { isDiffAdd, isDiffRemove } from "@netcracker/qubership-apihub-api-diff"
import { FC, memo, useMemo } from "react"
import { LevelIndicator } from "../LevelIndicator"
import { JsonSchemaRootExpanderOffset } from "../JsonSchemaExpanderColumn/JsonSchemaExpanderColumn"
import { ATTRIBUTE_DDL_LIST_LAST_ROW, ATTRIBUTE_PRECEDED_BY } from "../WithPrecededByProps"
import '../../shared-styles/preceded-by.css'
import { resolveAdditionalInfoRowLayout } from "./layout-classes"
import { AdditionalInfoRowContentProps, AdditionalInfoRowUsage } from "./types"

export const AdditionalInfoRowContent: FC<AdditionalInfoRowContentProps> = memo<AdditionalInfoRowContentProps>((props) => {
  const {
    label,
    subheader,
    layoutSide,
    diff,
    colorizingDiff,
    hideLevelIndicatorWhenSideEmpty = false,
    usage = AdditionalInfoRowUsage.Default,
    xPaddingClass,
    bodyClass,
    minHeightClass,
  } = props

  const { [ATTRIBUTE_PRECEDED_BY]: precededBy, [ATTRIBUTE_DDL_LIST_LAST_ROW]: listLastRow } = props
  const level = useEffectiveLevel(layoutSide)
  const layout = useMemo(
    () => resolveAdditionalInfoRowLayout(usage, { xPaddingClass, bodyClass, minHeightClass }),
    [usage, xPaddingClass, bodyClass, minHeightClass],
  )

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

  const showsJsonSchemaRootExpanderOffset = usage === AdditionalInfoRowUsage.JsonSchemaValidation && level === 0
  const showsLevelIndicator = level > 0 && (!hideLevelIndicatorWhenSideEmpty || isContentVisible)

  return (
    <div
      data-testid="additional-info-row-content"
      data-precededby={precededBy}
      data-ddl-list-last-row={listLastRow ? true : undefined}
      className={[
        'additional-info-row-content flex w-full items-stretch h-full gap-2',
        layout.xPaddingClass,
        layout.minHeightClass,
        layout.stretchLevelIndicator ? 'items-stretch' : '',
        diffsStyleClasses.join(' '),
      ].filter(Boolean).join(' ')}
    >
      {showsJsonSchemaRootExpanderOffset && <JsonSchemaRootExpanderOffset />}
      {showsLevelIndicator && (
        <div data-precededby={precededBy} className="level-indicator-column flex items-stretch self-stretch">
          <LevelIndicator level={level} />
          <div className="w-4" aria-hidden="true" />
        </div>
      )}
      {isContentVisible && (
        <div className={`${layout.bodyClass} flex min-w-0 flex-1 items-center gap-2`}>
          <div className="additional-info-row-label">{`${label}:`}</div>
          {subheader?.(layoutSide)}
        </div>
      )}
    </div>
  )
})
