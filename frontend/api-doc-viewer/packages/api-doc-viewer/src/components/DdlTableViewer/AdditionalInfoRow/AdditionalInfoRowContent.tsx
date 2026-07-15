import { X_AXIS_PADDING_ROWS_DDL_API_PROPERTIES } from "@apihub/components/shared-styles/tailwind-classnames"
import { useLevelContext } from "@apihub/contexts/LevelContext"
import { FC, memo } from "react"
import { LevelIndicator } from "../../shared-components/LevelIndicator"
import { ATTRIBUTE_DDL_LIST_LAST_ROW, ATTRIBUTE_PRECEDED_BY } from "../../shared-components/WithPrecededByProps"
import '../../shared-styles/preceded-by.css'
import { AdditionalInfoRowContentProps } from "./types"

export const AdditionalInfoRowContent: FC<AdditionalInfoRowContentProps> = memo<AdditionalInfoRowContentProps>((props) => {
  const {
    label,
    subheader,
    layoutSide,
  } = props

  const { [ATTRIBUTE_PRECEDED_BY]: precededBy, [ATTRIBUTE_DDL_LIST_LAST_ROW]: ddlListLastRow } = props
  const level = useLevelContext()

  return (
    <div
      data-testid="additional-info-row-content"
      data-precededby={precededBy}
      data-ddl-list-last-row={ddlListLastRow ? true : undefined}
      className={`additional-info-row-content flex items-stretch h-full ${X_AXIS_PADDING_ROWS_DDL_API_PROPERTIES} min-h-[26px] gap-2`}
    >
      {level > 0 && (
        <div data-precededby={precededBy} className="level-indicator-column flex items-stretch self-stretch">
          <LevelIndicator level={level} />
          <div className="w-4" aria-hidden="true" />
        </div>
      )}
      <div className="ddlapi-property-row-body flex min-w-0 flex-1 items-center gap-2">
        <span className="additional-info-row-label">{`${label}:`}</span>
        {subheader?.(layoutSide)}
      </div>
    </div>
  )
})
