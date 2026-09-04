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
import type { VersionStatus } from '../entities/version-status'
import { ARCHIVED_VERSION_STATUS, DRAFT_VERSION_STATUS, RELEASE_VERSION_STATUS } from '../entities/version-status'

export const VERSION_STATUS_CHIP_COLORS: Record<VersionStatus, SemanticChipColor> = {
  [DRAFT_VERSION_STATUS]: {
    main: '#D6EDFF',
    contrastText: '#004EAE',
  },
  [RELEASE_VERSION_STATUS]: {
    main: '#D0FAD4',
    contrastText: '#026104',
  },
  [ARCHIVED_VERSION_STATUS]: {
    main: '#F2F3F5',
    contrastText: '#0C1E36',
  },
}

export type VersionStatusChipProps = {
  status: VersionStatus
} & Omit<CustomChipProps, 'value' | 'color'>

export const VersionStatusChip: FC<VersionStatusChipProps> = memo<VersionStatusChipProps>(({
  status,
  sx,
  variant,
  ...props
}) => (
  <CustomChip
    {...props}
    variant={variant}
    value={status}
    sx={mergeChipSx(semanticChipSx(VERSION_STATUS_CHIP_COLORS[status], variant === 'outlined' ? 'outlined' : 'filled'), sx)}
  />
))
