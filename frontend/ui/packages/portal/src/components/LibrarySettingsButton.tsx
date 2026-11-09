import { Button, IconButton, Tooltip } from '@mui/material'
import type { FC } from 'react'
import { generatePath, NavLink, useLocation } from 'react-router-dom'

import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { SettingIcon } from '@netcracker/qubership-apihub-ui-shared/icons/SettingIcon'

import { LIBRARY_SETTINGS_PAGE_PATH_PATTERN } from '../routes'
import { useSetBackwardLocationContext } from '../routes/BackwardLocationProvider'

type LibrarySettingsButtonProps = { libraryId: Key; visible?: boolean }

export const LibrarySettingsButton: FC<LibrarySettingsButtonProps> = ({ libraryId, visible = false }) => {
  const { pathname, search } = useLocation()
  const setBackwardLocation = useSetBackwardLocationContext()
  const settingsPath = generatePath(`${LIBRARY_SETTINGS_PAGE_PATH_PATTERN}general`, {
    libraryId: encodeURIComponent(libraryId),
  })
  const rememberLocation = (): void =>
    setBackwardLocation(previous => ({ ...previous, fromLibrarySettings: { pathname, search } }))

  if (visible) {
    return (
      <Tooltip title="Manage Library">
        <Button
          component={NavLink}
          to={settingsPath}
          onClick={rememberLocation}
          variant="outlined"
          sx={{ padding: theme => theme.spacing(1, 0.625), minWidth: 10 }}
          aria-label="Library settings"
          data-testid="LibrarySettingsButton"
        >
          <SettingIcon color="currentColor" />
        </Button>
      </Tooltip>
    )
  }

  return (
    <IconButton
      component={NavLink}
      to={settingsPath}
      onClick={rememberLocation}
      className="hoverable"
      sx={{ visibility: 'hidden', ml: 0.625 }}
      size="small"
      aria-label="Library settings"
      data-testid="LibrarySettingsButton"
    >
      <SettingIcon color="currentColor" />
    </IconButton>
  )
}
LibrarySettingsButton.displayName = 'LibrarySettingsButton'
