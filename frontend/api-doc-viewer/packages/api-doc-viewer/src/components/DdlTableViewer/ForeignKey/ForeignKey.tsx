import { DdlApiForeignKeyTarget } from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/tree/node-value"
import { HighlightVariant } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { DiffsClassesBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities"
import { FC, memo, useMemo } from "react"
import { UxBadge } from "../../kit/ux/UxBadge/UxBadge"
import { useDdlTableViewerContext } from "../DdlTableViewerContext"
import { DDL_API_FOREIGN_KEY_BADGE_COLOR_SCHEMA } from "../consts"
import { formatForeignKeyTarget } from "../formatters"
import './ForeignKey.css'

type ForeignKeyProps = {
  target: DdlApiForeignKeyTarget
  /** When true, only the navigation link is rendered (FK badge supplied by the caller). */
  hideBadge?: boolean
  textHighlighterColor?: Exclude<HighlightVariant, HighlightVariant.Gray>
}

export const ForeignKey: FC<ForeignKeyProps> = memo<ForeignKeyProps>(props => {
  const { target, hideBadge = false, textHighlighterColor } = props
  const { navigationLinkBuilder, navigationLinkComponent: NavigationLinkComponent } = useDdlTableViewerContext()

  const href = useMemo(
    () => navigationLinkBuilder(target.schemaName, target.tableName, target.columnName),
    [navigationLinkBuilder, target],
  )

  const linkClassName = useMemo(
    () => [
      'ddlapi-foreign-key-link',
      DiffsClassesBuilder.highlighter(textHighlighterColor),
    ].filter(Boolean).join(' '),
    [textHighlighterColor],
  )

  const link = (
    <NavigationLinkComponent href={href} className={linkClassName}>
      {formatForeignKeyTarget(target)}
    </NavigationLinkComponent>
  )

  if (hideBadge) {
    return link
  }

  return (
    <div className="ddlapi-foreign-key inline-flex flex-row items-center gap-1">
      <UxBadge text="FK" colorSchema={DDL_API_FOREIGN_KEY_BADGE_COLOR_SCHEMA} inline />
      {link}
    </div>
  )
})