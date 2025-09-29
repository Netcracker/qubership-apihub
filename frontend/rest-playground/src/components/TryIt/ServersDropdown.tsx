import AddIcon from '@mui/icons-material/Add'
import { Box, Button, MenuItem } from '@mui/material'
import FormControl from '@mui/material/FormControl'
import Select from '@mui/material/Select'
import React, { useCallback, useState } from 'react'

import { useServerSelection } from '../../hooks/useServerSelection'
import { DeleteIcon } from '../../icons/DeleteIcon'
import { COLOR_TEXT_PRIMARY, COLOR_TEXT_SECONDARY } from '../../themes/colors'
import type { IServer } from '../../utils/http-spec/IServer'
import { ButtonWithHint } from '../ButtonWithHint'
import { createCustomServer, deleteCustomServer } from '../events'
import { MenuItemContent } from '../MenuItemContent'
import { OverflowTooltip } from '../OverflowTooltip'

const MENU_ITEM_MAX_WIDTH = 400

const STYLE_SELECT_VALUE = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontWeight: 500,
  fontSize: 12,
  color: COLOR_TEXT_PRIMARY,
}

const STYLE_MENU_ITEM = {
  display: 'flex',
  gap: 2,
  alignItems: 'center',
  justifyContent: 'space-between',
  '&:hover .MuiButtonBase-root': {
    visibility: 'visible',
  },
}

const STYLE_DELETE_BUTTON = {
  visibility: 'hidden',
  p: 0,
}

const selectInputProps = { sx: { py: '1px' } } // align input and button height

export type ServersDropdownProps = {
  servers: IServer[]
  operationPath: string
}

export const ServersDropdown = ({ servers, operationPath }: ServersDropdownProps) => {
  const { chosenServer, selectServer } = useServerSelection(servers)
  const [open, setOpen] = useState(false)

  const handleServerChange = useCallback(
    (event) => {
      selectServer(event.target.value || '')
    },
    [selectServer],
  )

  const handleServerAdd = useCallback(() => {
    setOpen(false)
    document.dispatchEvent(createCustomServer)
  }, [])

  const handleServerDelete = useCallback((server: IServer) => (event: React.MouseEvent) => {
    event.stopPropagation()
    if (server.custom) {
      setOpen(false)
      document.dispatchEvent(deleteCustomServer({ url: server.url }))
    }
  }, [])

  const handleClose = () => {
    setOpen(false)
  }
  const handleOpen = () => {
    setOpen(true)
  }

  return (
    <FormControl size="small" fullWidth>
      <Select
        open={open}
        onClose={handleClose}
        onOpen={handleOpen}
        onChange={handleServerChange}
        value={chosenServer?.url ?? ''}
        renderValue={(url) => {
          const cleanUrl = url.replace(/\/$/, '')
          return (
            <OverflowTooltip title={cleanUrl + operationPath}>
              <Box sx={STYLE_SELECT_VALUE}>
                {cleanUrl}
                <Box component="span" sx={{ color: COLOR_TEXT_SECONDARY }}>
                  {operationPath}
                </Box>
              </Box>
            </OverflowTooltip>
          )
        }}
        inputProps={selectInputProps}
        aria-label="Server"
        data-testid="ServerSelect"
      >
        {servers.map((server) => {
          const { url, description, custom } = server
          return (
            <MenuItem
              key={server.url}
              value={server.url}
              selected={server.url === chosenServer?.url}
              sx={STYLE_MENU_ITEM}
            >
              <MenuItemContent title={url} subtitle={description} maxWidth={MENU_ITEM_MAX_WIDTH} />

              <ButtonWithHint
                startIcon={<DeleteIcon fontSize="small" />}
                sx={STYLE_DELETE_BUTTON}
                onClick={handleServerDelete(server)}
                disabled={!custom}
                hint={!custom ? 'Server from API specification cannot be deleted' : undefined}
                hintMaxWidth={320}
                aria-label="Delete Server"
                data-testid="DeleteButton"
              />
            </MenuItem>
          )
        })}

        <Button
          startIcon={<AddIcon />}
          onClick={handleServerAdd}
          aria-label="Add Server"
          data-testid="AddCustomServerButton"
        >
          Add Custom Server
        </Button>
      </Select>
    </FormControl>
  )
}

ServersDropdown.displayName = 'ServersDropdown'
