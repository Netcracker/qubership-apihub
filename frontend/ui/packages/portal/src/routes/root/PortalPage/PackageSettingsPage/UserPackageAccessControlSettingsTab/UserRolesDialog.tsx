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
import { memo, useCallback } from 'react'
import type { Role } from '@netcracker/qubership-apihub-ui-shared/types/roles'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import type { Permission } from '@netcracker/qubership-apihub-ui-shared/types/permissions'
import { RolesTable } from '@netcracker/qubership-apihub-ui-shared/components/RolesTable'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { Box, Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material'
import { CloseOutlined as CloseOutlinedIcon } from '@mui/icons-material'
import { SHOW_USER_ROLES_DIALOG } from '@netcracker/qubership-apihub-ui-shared/types/dialogs'

export type UserRolesDialogProps = {
  permissions: ReadonlyArray<Permission>
  roles: ReadonlyArray<Role>
  isLoading: boolean
}
export const UserRolesDialog: FC<UserRolesDialogProps> = memo((props) => {
  const {
    permissions,
    roles,
    isLoading,
  } = props

  return (
    <PopupDelegate
      type={SHOW_USER_ROLES_DIALOG}
      render={props => <UserRolesPopup
        {...props}
        permissions={permissions}
        roles={roles}
        isLoading={isLoading}
      />}
    />
  )
})

type UserRolesPopupProps = PopupProps & UserRolesDialogProps

const UserRolesPopup: FC<UserRolesPopupProps> = memo((props) => {
  const {
    open,
    setOpen,
    permissions,
    roles,
    isLoading,
  } = props

  const onClose = useCallback(() => setOpen(false), [setOpen])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={false}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Box>Roles</Box>
        <IconButton
          sx={{ color: '#353C4E' }}
          onClick={onClose}
        >
          <CloseOutlinedIcon/>
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ width: '100%', height: '100%', overflow: 'hidden', paddingBottom: '16px' }}>
        {isLoading
          ? <LoadingIndicator/>
          : <RolesTable
            permissions={permissions}
            roles={roles}
          />
        }
      </DialogContent>
    </Dialog>
  )
})

