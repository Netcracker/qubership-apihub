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
import * as React from 'react'
import { memo, useCallback, useMemo } from 'react'
import { Button, DialogActions, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import type { PopupProps } from './PopupDelegate'
import { PopupDelegate } from './PopupDelegate'
import { DialogForm } from './DialogForm'
import type { Role } from '../types/roles'

export const DeleteRoleDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_DELETE_ROLE_DIALOG}
      render={props => <DeleteRolePopup {...props}/>}
    />
  )
})

export const SHOW_DELETE_ROLE_DIALOG = 'show-delete-role-dialog'

export type ShowDeleteRoleDetail = {
  role: Role
  onConfirm: (role: Role) => void
}

export const DeleteRolePopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen, detail }) => {
  const [role, onConfirm] = useMemo(() => {
    const { role, onConfirm } = detail as ShowDeleteRoleDetail
    return [role, onConfirm]
  }, [detail])

  const onConfirmCallback = useCallback((): void => {
    setOpen(false)
    onConfirm(role)
  }, [onConfirm, role, setOpen])

  const onClose = useCallback(() => {
    setOpen(false)
  }, [setOpen])

  return (
    <DialogForm
      open={open}
      onClose={onClose}
      width="352px"
    >
      <DialogTitle>
        Delete {role.role} role?
        <IconButton
          sx={{ position: 'absolute', right: 8, top: 8, color: '#626D82' }}
          onClick={onClose}
        >
          <CloseOutlinedIcon fontSize="small"/>
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{
        width: 'auto',
        minWidth: 'unset',
      }}>
        <Typography variant="body2" fontSize={13} sx={{ pl: 0 }}>
          If you delete the role, all users with that role will be removed from packages.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirmCallback}
          data-testid="DeleteButton"
        >
          Delete
        </Button>
        <Button
          variant="outlined"
          onClick={onClose}
          data-testid="CancelButton"
        >
          Cancel
        </Button>
      </DialogActions>
    </DialogForm>
  )
})
