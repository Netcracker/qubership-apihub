import { useAtom } from 'jotai'
import * as React from 'react'
import { useCallback, useState } from 'react'
import type { IServer } from '../../../utils/http-spec/IServer'
import { chosenServerAtom } from '../chosenServer'
import FormControl from '@mui/material/FormControl'
import Select from '@mui/material/Select'
import { Box, Button, MenuItem } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { nanoid } from 'nanoid'
import { MenuItemContent } from '../MenuItemConten'
import { createCustomService } from '../../events'

export type ServersDropdownProps = {
  servers: IServer[];
};

export const ServersDropdown = ({ servers }: ServersDropdownProps) => {
  const [chosenServer, setChosenServer] = useAtom(chosenServerAtom)

  const serverItems: IServer[] = servers.map(server => ({
    url: server.url,
    name: server.name || server.description,
  }))

  const onChange = useCallback(
    event => {
      const server = servers.find(server => server.url === event.target.value)
      setChosenServer(server)
    },
    [servers, setChosenServer],
  )

  const defaultValue = serverItems[0]?.url ?? ''

  const [open, setOpen] = useState(false)

  const handleClose = () => {
    setOpen(false)
  }
  const handleOpen = () => {
    setOpen(true)
  }

  return (
    <Box>
      <FormControl size="small" fullWidth>
        <Select
          open={open}
          onClose={handleClose}
          onOpen={handleOpen}
          onChange={onChange}
          value={chosenServer?.url ?? ''}
          defaultValue={defaultValue}
          renderValue={p => p}
          className="MuiInputBase-root MuiSelect-select custom"
        >
          {serverItems.map((server, index) => {
            const { url, name } = server
            return (
              <MenuItem
                key={nanoid(8)}
                style={{ width: '100%', display: 'flex', alignItems: 'center' }}
                value={url}
                disableRipple
                onClick={onChange}
                selected={index === serverItems.indexOf(chosenServer!)}
              >
                <MenuItemContent title={name} subtitle={url} maxWidth="400px"/>
              </MenuItem>
            )
          })}

          <Button
            disableRipple
            startIcon={<AddIcon/>}
            className="MuiButtonBase-root custom iconButton"
            style={{ marginTop: '8px', color: '#0068FF', paddingLeft: '16px' }}
            onClick={() => {
              setOpen(false)
              document.dispatchEvent(createCustomService)
            }}
          >
            Add Custom Server
          </Button>
        </Select>
      </FormControl>
    </Box>
  )
}

ServersDropdown.displayName = 'ServersDropdown'
