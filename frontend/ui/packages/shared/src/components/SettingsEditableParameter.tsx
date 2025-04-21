import React, { memo, useCallback, useMemo } from 'react'
import { Box, IconButton, type SxProps, type Theme, Tooltip, Typography } from '@mui/material'
import { DISABLED_BUTTON_COLOR, ENABLED_BUTTON_COLOR } from '../entities/operation-groups'
import { CREATE_AND_UPDATE_PACKAGE_PERMISSION, NO_PERMISSION_TO_EDIT_PACKAGE } from '../entities/package-permissions'
import { EditIcon } from '../icons/EditIcon'
import type { BoxProps } from '@mui/system/Box/Box'
import type { Package } from '../entities/packages'

export type SettingsEditableParameterProps = {
  title: string
  packageObject: Package
  onEdit: () => void
  isLoading?: boolean
} & BoxProps

const TITLE_SX: SxProps<Theme> = {
  mb: 1,
}

const CONTENT_CONTAINER_SX: SxProps<Theme> = {
  '&:hover': {
    '& .hoverable': {
      visibility: 'visible',
    },
  },
  display: 'flex',
}

const CONTENT_SX: SxProps<Theme> = {
  width: '100%',
  maxHeight: 140,
  display: 'flex',
  flexWrap: 'wrap',
  columnGap: 1,
  rowGap: 0.5,
  overflow: 'auto',
  paddingRight: 1,
  '&::-webkit-scrollbar': {
    width: '4px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#D5DCE3',
  },
  '& .MuiChip-root': {
    height: 24,
  },
}

const BUTTON_SX: SxProps<Theme> = {
  visibility: 'hidden',
  height: '20px',
}

export const SettingsEditableParameter = memo<SettingsEditableParameterProps>(({
  title,
  packageObject,
  onEdit,
  isLoading,
  children,
  ...props
}) => {
  const canEditPackage = useMemo(
    () => !!packageObject.permissions?.includes(CREATE_AND_UPDATE_PACKAGE_PERMISSION),
    [packageObject],
  )

  const onClick = useCallback(() => {
    if (!canEditPackage || isLoading) {
      return
    }
    onEdit()
  }, [canEditPackage, isLoading, onEdit])

  return (
    <Box data-testid={'SettingsParameter'} width="100%" {...props}>
      <Typography variant="subtitle2" sx={TITLE_SX} data-testid="SettingsParameterTitle">{title}</Typography>
      <Box sx={CONTENT_CONTAINER_SX}>
        <Box
          sx={CONTENT_SX}
          data-testid="SettingsParameterContent"
        >
          {children}
        </Box>
        <Tooltip
          title={!canEditPackage ? NO_PERMISSION_TO_EDIT_PACKAGE : ''}
          placement="top"
        >
          <IconButton
            sx={BUTTON_SX}
            className="hoverable"
            onClick={onClick}
            data-testid="EditButton"
          >
            <EditIcon
              color={!canEditPackage || isLoading ? DISABLED_BUTTON_COLOR : ENABLED_BUTTON_COLOR}
            />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
})

SettingsEditableParameter.displayName = 'SettingsEditableParameter'
