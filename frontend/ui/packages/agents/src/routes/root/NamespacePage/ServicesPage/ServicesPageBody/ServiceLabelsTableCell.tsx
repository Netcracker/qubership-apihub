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
import type { Row } from '@tanstack/react-table'
import type { Service } from '@apihub/entities/services'
import { Box } from '@mui/material'
import { OverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/OverflowTooltip'
import { CustomChip } from '@netcracker/qubership-apihub-ui-shared/components/CustomChip'
import { getFormattedLabel } from '../services'

export type ServiceLabelsTableCellProps = {
  value: Row<CellData>
}

type CellData = Partial<{
  service: Service
}>

export const ServiceLabelsTableCell: FC<ServiceLabelsTableCellProps> = memo<ServiceLabelsTableCellProps>(({ value: { original: { service } } }) => {
  if (service && service.labels) {
    const labels = Object.entries(service.labels)

    return (
        <Box>
          {labels.map(([key, value]) => (
            <Box
              key={getFormattedLabel(key, value)}
              sx={{ mr: 1, mb: 0.5 }}
            >
              <CustomChip
                value={getFormattedLabel(key, value)}
                label={
                  <OverflowTooltip title={getFormattedLabel(key, value)}>
                    <Box sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {getFormattedLabel(key, value)}
                    </Box>
                  </OverflowTooltip>
                }
              />
            </Box>
          ))}
        </Box>
    )
  }

  return null
})
