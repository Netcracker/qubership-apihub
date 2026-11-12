import type { FC } from 'react'
import { memo } from 'react'
import type { CustomChipProps } from '../CustomChip'
import { CustomChip } from '../CustomChip'
import { mergeChipSx, semanticChipSx } from '../semantic-chip-styles'
import type { GraphQlOperationType } from '../../entities/graphql-operation-types'
import { GRAPHQL_OPERATION_TYPE_COLOR_MAP } from '../../entities/graphql-operation-types'

export type GraphQlOperationTypeChipProps = {
  operationType: GraphQlOperationType
} & Omit<CustomChipProps, 'value' | 'color'>

export const GraphQlOperationTypeChip: FC<GraphQlOperationTypeChipProps> = memo<GraphQlOperationTypeChipProps>(({
  operationType,
  variant = 'outlined',
  sx,
  ...props
}) => {
  const color = GRAPHQL_OPERATION_TYPE_COLOR_MAP[operationType]
  return (
    <CustomChip
      {...props}
      variant={variant}
      value={operationType}
      sx={mergeChipSx(semanticChipSx({ main: color, contrastText: color }, variant === 'filled' ? 'filled' : 'outlined'), sx)}
    />
  )
})
