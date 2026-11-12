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
