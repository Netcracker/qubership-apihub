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
import * as React from 'react'
import { memo } from 'react'
import { OverflowTooltip } from './OverflowTooltip'
import { Box } from '@mui/material'
import { CustomChip } from './CustomChip'

export type LabelsTableCellProps = {
  labels: string[]
}

export const LabelsTableCell: FC<LabelsTableCellProps> = memo<LabelsTableCellProps>(({ labels }) => {
  return (
    <OverflowTooltip title={labels.map(((label, index) => <Box key={index}>{label}</Box>))}>
      <Box sx={{ display: 'flex', overflow: 'hidden' }}>
        {labels?.map((label, index) =>
          <CustomChip
            key={index}
            sx={{ mr: 1 }}
            value={label}
          />,
        )}
      </Box>
    </OverflowTooltip>
  )
})
