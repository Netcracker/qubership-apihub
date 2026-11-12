import type { FC } from 'react'
import { memo } from 'react'
import type { CustomChipProps } from '../CustomChip'
import { CustomChip } from '../CustomChip'
import type { GraphQlOperation } from '../../entities/operations'

export type GraphQlOperationChipProps = {
  operation: GraphQlOperation
} & Omit<CustomChipProps, 'value' | 'color'>

export const GraphQlOperationChip: FC<GraphQlOperationChipProps> = memo<GraphQlOperationChipProps>(({
  operation,
  variant = 'outlined',
  ...props
}) => (
  <CustomChip {...props} variant={variant} value={operation.method}/>
))
