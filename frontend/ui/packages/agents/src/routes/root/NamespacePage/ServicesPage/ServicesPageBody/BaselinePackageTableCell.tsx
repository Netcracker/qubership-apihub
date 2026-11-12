import { Box, styled, Typography } from '@mui/material'
import type { Row } from '@tanstack/react-table'
import { type FC, memo } from 'react'

import { OverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/OverflowTooltip'
import { DisabledWarningIcon, YellowWarningIcon } from '@netcracker/qubership-apihub-ui-shared/icons/WarningIcon'
import { isEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'

import type { Service } from '@agents/entities/services'

export type BaselinePackageTableCellProps = {
  value: Row<CellData>
}

type CellData = Partial<{
  service: Service
}>

export const BaselinePackageTableCell: FC<BaselinePackageTableCellProps> = memo<BaselinePackageTableCellProps>((
  { value: { original: { service } } },
) => {
  if (!service) {
    return null
  }

  // A service without API documents is drawn grey, as its name is
  const disabled = isEmpty(service.specs)
  const color = disabled ? 'action.disabled' : 'inherit'

  if (!service.baseline) {
    return (
      <NoBaselinePackage>
        {disabled ? <DisabledWarningIcon/> : <YellowWarningIcon/>}
        <Typography noWrap variant="inherit" color={color}>No baseline package</Typography>
      </NoBaselinePackage>
    )
  }

  const baselinePackage = `${service.baseline.packageKey} / ${service.baseline.name}`
  return (
    <Box display="flex">
      <OverflowTooltip title={baselinePackage}>
        <Typography noWrap variant="inherit" color={color}>{baselinePackage}</Typography>
      </OverflowTooltip>
    </Box>
  )
})

const NoBaselinePackage = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
}))
