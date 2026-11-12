import type { ElementType, FC, ReactNode } from 'react'
import React, { memo, useMemo } from 'react'
import Chip from '@mui/material/Chip'
import type { ChipProps } from '@mui/material/Chip/Chip'

export type CustomChipProps = {
  value: string
  label?: ReactNode | string
  component?: ElementType
  isExtraSmall?: boolean
} & ChipProps

export const CustomChip: FC<CustomChipProps> = memo<CustomChipProps>(({
  value,
  label,
  component = 'div',
  isExtraSmall = false,
  sx,
  ...props
}) => {
  const sxOverrides = useMemo(
    () => (isExtraSmall
      ? [...(Array.isArray(sx) ? sx : [sx]), extraSmallStyles]
      : sx),
    [isExtraSmall, sx],
  )

  return (
    <Chip
      {...props}
      sx={sxOverrides}
      size="small"
      label={label ?? value}
      component={component}
    />
  )
})

const extraSmallStyles = {
  height: '14px',
  px: '4px',
  '> span': {
    px: '4px',
    fontSize: '11px',
  },
}
