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
