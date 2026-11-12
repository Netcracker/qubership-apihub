import type { FC } from 'react'
import { memo } from 'react'
import type { CustomChipProps } from '../CustomChip'
import { HttpMethodChip } from './HttpMethodChip'
import type { RestOperation } from '../../entities/operations'

export type RestOperationChipProps = {
  operation: RestOperation
} & Omit<CustomChipProps, 'value' | 'color'>

export const RestOperationChip: FC<RestOperationChipProps> = memo<RestOperationChipProps>(({
  operation,
  ...props
}) => (
  <HttpMethodChip {...props} method={operation.method}/>
))
