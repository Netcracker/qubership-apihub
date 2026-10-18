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
import React, { memo } from 'react'
import { Box, MenuItem, Tooltip, Typography } from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { MenuButton } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/MenuButton'
import { YellowWarningIcon } from '@netcracker/qubership-apihub-ui-shared/icons/WarningIcon'

export type ModelLabelProps = {
  title: string
  onModelUsagesClick: () => void
}

// First Order Component //
export const ModelLabel: FC<ModelLabelProps> = memo<ModelLabelProps>(({
  title,
  onModelUsagesClick,
}) => {
  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      justifyContent: 'space-between',
      width: '100%',
      '&:hover': {
        '& .hoverable': {
          visibility: 'visible',
        },
      },
    }}>
      <Typography noWrap variant="body2">{title}</Typography>
      <MenuButton
        sx={{
          visibility: 'hidden',
          padding: 0,
          marginLeft: 0,
          ml: 1,
          mr: 1,
          width: 24,
          minWidth: 24,
          height: 24,
        }}
        className="hoverable"
        size="small"
        icon={<MoreVertIcon sx={{ color: '#626D82' }} fontSize="small"/>}
        onClick={event => event.stopPropagation()}
        data-testid="ActionMenuButton"
      >
        <MenuItem onClick={onModelUsagesClick} data-testid="DependantOperationsMenuItem">
          Dependant operations
        </MenuItem>
      </MenuButton>
    </Box>
  )
})

export type ErrorModelLabelProps = {
  title: string
  error: string
}

// First Order Component //
export const ErrorModelLabel: FC<ErrorModelLabelProps> = memo<ErrorModelLabelProps>(({
  title,
  error,
}) => {
  return (
    <Box sx={{
      cursor: 'default',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    }}>
      <Typography noWrap variant="body2">{title}</Typography>
      <Tooltip title={error}>
        <Box sx={{ cursor: 'pointer' }}>
          <YellowWarningIcon/>
        </Box>
      </Tooltip>
    </Box>
  )
})
