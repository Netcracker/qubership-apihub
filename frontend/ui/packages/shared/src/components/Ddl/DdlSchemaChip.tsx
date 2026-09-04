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

export const DDL_SCHEMA_CHIP_COLOR: SemanticChipColor = {
  main: '#EAE0D5',
  contrastText: '#0C1E36',
}

export type DdlSchemaChipProps = Omit<CustomChipProps, 'value' | 'color'>

export const DdlSchemaChip: FC<DdlSchemaChipProps> = memo<DdlSchemaChipProps>(({
  sx,
  ...props
}) => (
  <CustomChip
    {...props}
    value="ddlSchema"
    sx={mergeChipSx(semanticChipSx(DDL_SCHEMA_CHIP_COLOR), sx)}
  />
))
