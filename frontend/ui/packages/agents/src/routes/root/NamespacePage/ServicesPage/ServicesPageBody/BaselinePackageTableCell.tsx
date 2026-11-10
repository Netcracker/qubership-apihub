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

import { Box, styled, Typography } from '@mui/material'
import type { Row } from '@tanstack/react-table'
import { type FC, memo } from 'react'

import { OverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/OverflowTooltip'
import { MutedWarningIcon, YellowWarningIcon } from '@netcracker/qubership-apihub-ui-shared/icons/WarningIcon'
import { MUTED_TEXT_COLOR } from '@netcracker/qubership-apihub-ui-shared/themes/colors'
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
  const isMuted = isEmpty(service.specs)
  const color = isMuted ? MUTED_TEXT_COLOR : 'inherit'

  if (!service.baseline) {
    return (
      <NoBaselinePackage>
        {isMuted ? <MutedWarningIcon/> : <YellowWarningIcon/>}
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
