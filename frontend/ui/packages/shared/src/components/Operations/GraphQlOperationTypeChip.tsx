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
