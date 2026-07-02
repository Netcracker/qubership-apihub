import { DdlApiForeignKeyTarget } from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/tree/node-value"
import { FC, memo, useMemo } from "react"
import { UxBadge } from "../../kit/ux/UxBadge/UxBadge"
import { useDdlTableViewerContext } from "../DdlTableViewerContext"
import { DDL_API_FOREIGN_KEY_BADGE_COLOR_SCHEMA } from "../consts"
import { formatForeignKeyTarget } from "../formatters"
import './ForeignKey.css'

type ForeignKeyProps = {
  target: DdlApiForeignKeyTarget
}

export const ForeignKey: FC<ForeignKeyProps> = memo<ForeignKeyProps>(props => {
  const { target } = props
  const { navigationLinkBuilder, navigationLinkComponent: NavigationLinkComponent } = useDdlTableViewerContext()

  const href = useMemo(
    () => navigationLinkBuilder(target.schemaName, target.tableName, target.columnName),
    [navigationLinkBuilder, target],
  )

  return (
    <div className="ddlapi-foreign-key inline-flex flex-row items-center gap-1">
      <UxBadge text="FK" colorSchema={DDL_API_FOREIGN_KEY_BADGE_COLOR_SCHEMA} inline />
      <NavigationLinkComponent href={href} className="ddlapi-foreign-key-link">
        {formatForeignKeyTarget(target)}
      </NavigationLinkComponent>
    </div>
  )
})
