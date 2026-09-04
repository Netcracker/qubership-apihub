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
import type { CustomChipProps } from './CustomChip'
import { CustomChip } from './CustomChip'
import type { SemanticChipColor } from './semantic-chip-styles'
import { mergeChipSx, semanticChipSx } from './semantic-chip-styles'
import type { PersonalAccessTokenStatus } from '../types/tokens'
import {
  PERSONAL_ACCESS_TOKEN_STATUS_ACTIVE,
  PERSONAL_ACCESS_TOKEN_STATUS_EXPIRED,
} from '../types/tokens'

export const PERSONAL_ACCESS_TOKEN_STATUS_CHIP_COLORS: Record<PersonalAccessTokenStatus, SemanticChipColor> = {
  [PERSONAL_ACCESS_TOKEN_STATUS_ACTIVE]: {
    main: '#C3F29E',
    contrastText: '#073800',
  },
  [PERSONAL_ACCESS_TOKEN_STATUS_EXPIRED]: {
    main: '#FFB9AB',
    contrastText: '#520100',
  },
}

export type PersonalAccessTokenStatusChipProps = {
  status: PersonalAccessTokenStatus
} & Omit<CustomChipProps, 'value' | 'color'>

export const PersonalAccessTokenStatusChip: FC<PersonalAccessTokenStatusChipProps> = memo<PersonalAccessTokenStatusChipProps>(({
  status,
  sx,
  variant,
  ...props
}) => (
  <CustomChip
    {...props}
    variant={variant}
    value={status}
    sx={mergeChipSx(semanticChipSx(PERSONAL_ACCESS_TOKEN_STATUS_CHIP_COLORS[status], variant === 'outlined' ? 'outlined' : 'filled'), sx)}
  />
))
