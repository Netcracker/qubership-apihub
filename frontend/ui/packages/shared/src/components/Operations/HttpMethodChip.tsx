import type { FC } from 'react'
import { memo } from 'react'
import type { CustomChipProps } from '../CustomChip'
import { CustomChip } from '../CustomChip'
import { mergeChipSx, semanticChipSx } from '../semantic-chip-styles'
import type { MethodType } from '../../entities/method-types'
import { METHOD_TYPE_COLOR_MAP } from '../../entities/method-types'

export type HttpMethodChipProps = {
  method: MethodType
} & Omit<CustomChipProps, 'value' | 'color'>

export const HttpMethodChip: FC<HttpMethodChipProps> = memo<HttpMethodChipProps>(({
  method,
  variant = 'outlined',
  sx,
  ...props
}) => {
  const color = METHOD_TYPE_COLOR_MAP[method]
  return (
    <CustomChip
      {...props}
      variant={variant}
      value={method}
      sx={mergeChipSx(semanticChipSx({ main: color, contrastText: color }, variant === 'filled' ? 'filled' : 'outlined'), sx)}
    />
  )
})
