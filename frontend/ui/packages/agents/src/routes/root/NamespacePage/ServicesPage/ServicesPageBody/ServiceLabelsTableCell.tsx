import type { FC } from 'react'
import { memo } from 'react'
import type { Row } from '@tanstack/react-table'
import type { Service } from '@agents/entities/services'
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
