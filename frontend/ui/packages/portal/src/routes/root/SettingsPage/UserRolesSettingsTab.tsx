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

import { Box, Button } from '@mui/material'
import type { FC } from 'react'
import * as React from 'react'
import { memo, useCallback } from 'react'
import { useEventBus } from '@apihub/routes/EventBusProvider'
import { useShowErrorNotification, useShowSuccessNotification } from '@apihub/routes/root/BasePage/Notification'
import {
  useCreateRole,
  useDeleteRole,
  useRoles,
  useUpdateRole,
} from '@netcracker/qubership-apihub-ui-shared/hooks/user-roles/useRoles'
import { usePermissions } from '@netcracker/qubership-apihub-ui-shared/hooks/user-roles/usePermissions'
import type { Role } from '@netcracker/qubership-apihub-ui-shared/types/roles'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { RolesTable } from '@netcracker/qubership-apihub-ui-shared/components/RolesTable'
import { DeleteRoleDialog } from '@netcracker/qubership-apihub-ui-shared/components/DeleteRoleDialog'
import { EditRoleDialog } from '@netcracker/qubership-apihub-ui-shared/components/EditRoleDialog'

export const UserRolesSettingsTab: FC = memo(() => {
  const { showDeleteRoleDialog, showEditRoleDialog } = useEventBus()
  const showNotification = useShowSuccessNotification()
  const showErrorNotification = useShowErrorNotification()

  const onError = useCallback((error: Error) => {
    showErrorNotification({ message: error?.message })
  }, [showErrorNotification])

  const onRoleCreated = useCallback((roleName: string) => {
    showNotification({ message: `Role ${roleName} has been created` })
  }, [showNotification])

  const onRoleUpdated = useCallback((roleName: string) => {
    showNotification({ message: `Role ${roleName} has been updated` })
  }, [showNotification])

  const onRoleDeleted = useCallback((roleName: string) => {
    showNotification({ message: `Role ${roleName} has been deleted` })
  }, [showNotification])

  const { data: roles, isLoading: isRolesLoading } = useRoles()
  const [permissions, isPermissionsLoading] = usePermissions()
  const [createRole] = useCreateRole(onError, onRoleCreated)
  const [updateRole] = useUpdateRole(onError, onRoleUpdated)
  const [deleteRole] = useDeleteRole(onError, onRoleDeleted)

  const handleCreateRole = useCallback(() => showEditRoleDialog({
    permissions: permissions,
    onConfirm: (role) => createRole(role),
    isRoleUnique: (roleName) => !roles?.some(({ role }) => role.toLowerCase() === roleName.toLowerCase()),
  }), [showEditRoleDialog, permissions, createRole, roles])

  const handleEditRole = useCallback((role: Role) => {
    showEditRoleDialog({
      permissions: permissions,
      role: role,
      onConfirm: (role) => updateRole(role),
    })
  }, [permissions, showEditRoleDialog, updateRole])

  const handleDeleteRole = useCallback((role: Role) => showDeleteRoleDialog({
    role: role,
    onConfirm: (role) => deleteRole(role),
  }), [deleteRole, showDeleteRoleDialog])

  return <>
    <BodyCard
      header="User Roles"
      action={
        <Button
          variant="contained"
          onClick={handleCreateRole}
          data-testid="CreateRoleButton"
        >
          Create Role
        </Button>
      }
      body={isRolesLoading || isPermissionsLoading ? (
        <LoadingIndicator/>
      ) : (
        <Box overflow="hidden">
          <Box marginTop="8px" height="100%" overflow="hidden">
            <RolesTable
              permissions={permissions}
              roles={roles}
              onDelete={handleDeleteRole}
              onEdit={handleEditRole}
            />
          </Box>
        </Box>
      )}
    />
    <DeleteRoleDialog/>
    <EditRoleDialog/>
  </>
})
