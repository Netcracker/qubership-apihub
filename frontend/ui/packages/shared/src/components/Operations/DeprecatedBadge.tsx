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
import type { SemanticChipColor } from '../semantic-chip-styles'
import { mergeChipSx, semanticChipSx } from '../semantic-chip-styles'

export const DEPRECATED_BADGE_COLOR: SemanticChipColor = {
  main: '#EF9206',
  contrastText: '#FFFFFF',
}

export const DEPRECATED_BADGE_LABEL = 'Deprecated'

export type DeprecatedBadgeProps = Omit<CustomChipProps, 'value' | 'color'>

export const DeprecatedBadge: FC<DeprecatedBadgeProps> = memo<DeprecatedBadgeProps>(({
  label = DEPRECATED_BADGE_LABEL,
  isExtraSmall = true,
  sx,
  ...props
}) => (
  <CustomChip
    {...props}
    value={DEPRECATED_BADGE_LABEL.toLowerCase()}
    label={label}
    isExtraSmall={isExtraSmall}
    sx={mergeChipSx(semanticChipSx(DEPRECATED_BADGE_COLOR), sx)}
  />
))
