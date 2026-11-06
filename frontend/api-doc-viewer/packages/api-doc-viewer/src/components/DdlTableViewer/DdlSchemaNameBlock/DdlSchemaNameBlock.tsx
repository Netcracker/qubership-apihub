import { cn } from '@apihub/utils/common/cn'
import { X_AXIS_PADDING_ROWS } from "@apihub/components/shared-styles/tailwind-classnames"
import { FC } from "react"
import { ATTRIBUTE_PRECEDED_BY, WithPrecededByProps } from "../../shared-components/WithPrecededByProps"
import { DEFAULT_SCHEMA_NAME } from "../consts"
import '../../shared-styles/preceded-by.css'
import './DdlSchemaNameBlock.css'

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
      className={cn(`ddl-schema-name-block-row flex w-full h-full ${X_AXIS_PADDING_ROWS}`)}
    >
      <span className={cn("ddl-schema-name-block")}>{schemaName}</span>
    </div>
  )
}
