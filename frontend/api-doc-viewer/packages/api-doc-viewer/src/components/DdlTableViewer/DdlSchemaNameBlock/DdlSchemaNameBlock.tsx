import { X_AXIS_PADDING_ROWS_ASYNC_API } from "@apihub/components/shared-styles/tailwind-classnames"
import { FC } from "react"
import { ATTRIBUTE_PRECEDED_BY, WithPrecededByProps } from "../../shared-components/WithPrecededByProps"
import { DEFAULT_SCHEMA_NAME } from "../consts"
import '../../shared-styles/preceded-by.css'
import '../../shared-styles/property-table-subheader.css'

type DdlSchemaNameBlockProps = WithPrecededByProps & {
  schemaName: string
}

export const DdlSchemaNameBlock: FC<DdlSchemaNameBlockProps> = (props) => {
  const { schemaName, [ATTRIBUTE_PRECEDED_BY]: precededBy } = props

  if (schemaName === DEFAULT_SCHEMA_NAME) {
    return null
  }

  return (
    <div
      data-precededby={precededBy}
      className={`property-table-subheader-row flex h-full ${X_AXIS_PADDING_ROWS_ASYNC_API}`}
    >
      <span className="property-table-subheader">{schemaName}</span>
    </div>
  )
}
