import type { FC } from 'react'
import { memo } from 'react'
import type { CustomChipProps } from '../CustomChip'
import { CustomChip } from '../CustomChip'
import { mergeChipSx, semanticChipSx } from '../semantic-chip-styles'
import type { AsyncApiOperationType } from '../../entities/asyncapi-operation-types'
import { ASYNCAPI_OPERATION_TYPE_COLOR_MAP } from '../../entities/asyncapi-operation-types'

export type AsyncApiActionChipProps = {
  action: AsyncApiOperationType
} & Omit<CustomChipProps, 'value' | 'color'>

export const AsyncApiActionChip: FC<AsyncApiActionChipProps> = memo<AsyncApiActionChipProps>(({
  action,
  variant = 'outlined',
  sx,
  ...props
}) => {
  const color = ASYNCAPI_OPERATION_TYPE_COLOR_MAP[action]
  return (
    <CustomChip
      {...props}
      variant={variant}
      value={action}
      sx={mergeChipSx(semanticChipSx({ main: color, contrastText: color }, variant === 'filled' ? 'filled' : 'outlined'), sx)}
    />
  )
})
