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
