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
