/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { ElementType, FC, ReactNode } from 'react'
import React, { memo, useMemo } from 'react'
import Chip from '@mui/material/Chip'
import type { ChipProps, ChipPropsColorOverrides } from '@mui/material/Chip/Chip'
import type { OverridableStringUnion } from '@mui/types'
import { CHIP_COLOR_OVERRIDES } from '../themes/palette'

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
  const isCustomColor = useMemo(() => Object.keys(CHIP_COLOR_OVERRIDES).includes(value), [value])

  //to support many usages in UI
  const sxOverrides = useMemo(() => (isExtraSmall
      ? {
        ...sx,
        ...extraSmallStyles,
      }
      : sx
  ), [isExtraSmall, sx])

  return (
    <Chip
      {...props}
      sx={sxOverrides}
      size="small"
      label={label ?? value}
      component={component}
      color={isCustomColor ? value as ChipColor : 'default'}
    />
  )
})

type ChipColor = OverridableStringUnion<'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning', ChipPropsColorOverrides>

const extraSmallStyles = {
  height: '14px',
  px: '4px',
  '> span': {
    px: '4px',
    fontSize: '11px',
  },
}
