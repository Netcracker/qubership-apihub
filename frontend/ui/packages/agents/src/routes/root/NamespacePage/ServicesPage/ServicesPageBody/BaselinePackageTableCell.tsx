import type { FC } from 'react'
import { memo } from 'react'
import type { Row } from '@tanstack/react-table'
import { Box, Typography } from '@mui/material'
import type { Service } from '@agents/entities/services'
import { OverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/OverflowTooltip'

export type BaselinePackageTableCellProps = {
  value: Row<CellData>
}

type CellData = Partial<{
  service: Service
}>

export const BaselinePackageTableCell: FC<BaselinePackageTableCellProps> = memo<BaselinePackageTableCellProps>(({ value: { original: { service } } }) => {
  if (service && service.baseline) {
    const baselinePackage = `${service.baseline.packageKey} / ${service.baseline.name}`
    return (
      <Box display="flex">
        <OverflowTooltip title={baselinePackage}>
          <Typography noWrap variant="inherit">{baselinePackage}</Typography>
        </OverflowTooltip>
      </Box>
    )
  }

  return null
})
