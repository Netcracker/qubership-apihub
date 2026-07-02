import { DdlApiColumnRowValue } from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/tree/node-value"
import { FC, memo } from "react"
import { UxBadge } from "../kit/ux/UxBadge/UxBadge"
import { DDL_API_GENERATED_BADGE_COLOR_SCHEMA, DDL_API_NOT_NULL_BADGE_COLOR_SCHEMA, DDL_API_PRIMARY_KEY_BADGE_COLOR_SCHEMA, DDL_API_UNIQUE_BADGE_COLOR_SCHEMA } from "./consts"
import { ForeignKey } from "./ForeignKey/ForeignKey"

type ColumnRowBadgesProps = {
  value: DdlApiColumnRowValue
}

export const ColumnRowBadges: FC<ColumnRowBadgesProps> = memo<ColumnRowBadgesProps>(props => {
  const { value } = props

  return (
    <div className="flex flex-wrap items-center gap-2">
      {value.isPrimaryKey && (
        <UxBadge text="PK" colorSchema={DDL_API_PRIMARY_KEY_BADGE_COLOR_SCHEMA} inline />
      )}
      {value.isUnique && (
        <UxBadge text="unique" colorSchema={DDL_API_UNIQUE_BADGE_COLOR_SCHEMA} inline />
      )}
      {value.isNotNull && (
        <UxBadge text="not null" colorSchema={DDL_API_NOT_NULL_BADGE_COLOR_SCHEMA} inline />
      )}
      {value.isGenerated && (
        // Badge label is always "generated". `generatedBy` ('identity' | 'expression') is
        // preserved on the data model for consumers; the viewer does not distinguish them.
        <UxBadge
          text="generated"
          colorSchema={DDL_API_GENERATED_BADGE_COLOR_SCHEMA}
          inline
        />
      )}
      {value.isForeignKey && value.foreignKeyTarget && (
        <ForeignKey target={value.foreignKeyTarget} />
      )}
    </div>
  )
})
