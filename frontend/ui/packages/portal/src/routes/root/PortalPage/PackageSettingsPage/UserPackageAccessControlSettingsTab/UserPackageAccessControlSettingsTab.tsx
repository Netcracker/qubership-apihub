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
import React, { memo, useCallback, useMemo, useState } from 'react'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import { Box, IconButton } from '@mui/material'
import type { PackageSettingsTabProps } from '../package-settings'
import { USER_ACCESS_MANAGEMENT_PERMISSION } from '@netcracker/qubership-apihub-ui-shared/entities/package-permissions'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { useAuthorization } from '@netcracker/qubership-apihub-ui-shared/hooks/authorization'
import { useAvailablePackageRoles } from '@netcracker/qubership-apihub-ui-shared/hooks/tokens/useTokens'
import {
  useAddPackageMember,
  usePackageMembers,
} from '@apihub/routes/root/PortalPage/PackageSettingsPage/UserPackageAccessControlSettingsTab/useUserPackageAccess'
import {
  UserAccessControlTable,
} from '@apihub/routes/root/PortalPage/PackageSettingsPage/UserPackageAccessControlSettingsTab/UserAccessControlTable'
import { AddIcon } from '@netcracker/qubership-apihub-ui-shared/icons/AddIcon'
import { ButtonWithHint } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ButtonWithHint'
import { SearchBar } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'
import { useEventBus } from '@apihub/routes/EventBusProvider'
import { AddUserDialog } from '@netcracker/qubership-apihub-ui-shared/components/Users/AddUserDialog'
import { useUsers } from '@apihub/routes/root/useUsers'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import {
  UserRolesDialog,
} from '@apihub/routes/root/PortalPage/PackageSettingsPage/UserPackageAccessControlSettingsTab/UserRolesDialog'
import { useRoles } from '@netcracker/qubership-apihub-ui-shared/hooks/user-roles/useRoles'
import { usePermissions } from '@netcracker/qubership-apihub-ui-shared/hooks/user-roles/usePermissions'
import type { User } from '@netcracker/qubership-apihub-ui-shared/types/user'
import type { Role } from '@netcracker/qubership-apihub-ui-shared/types/roles'

export const UserPackageAccessControlSettingsTab: FC<PackageSettingsTabProps> = memo<PackageSettingsTabProps>(({ packageObject }) => {
  const { showAddUserDialog, showUserRolesDialog } = useEventBus()

  const hasUserAccessManagementPermission = useMemo(
    () => !!packageObject.permissions?.includes(USER_ACCESS_MANAGEMENT_PERMISSION),
    [packageObject],
  )

  const [searchValue, setSearchValue] = useState('')
  const onChangeSearchValue = useCallback((value: string) => {
    setSearchValue(value)
  }, [])

  const [authorization] = useAuthorization()
  const [availablePackageRoles, isRolesPackageLoading] = useAvailablePackageRoles(packageObject.key, authorization?.user.key ?? '')
  const [packageMembers, isPackageMembersLoading] = usePackageMembers(packageObject.key)

  const isLoading = useMemo(() => isRolesPackageLoading && isPackageMembersLoading, [isRolesPackageLoading, isPackageMembersLoading])

  const { data: roles, isLoading: isRolesLoading } = useRoles()
  const [permissions, isPermissionsLoading] = usePermissions()

  const [usersSearch, setUsersSearch] = useState('')
  const [usersData, isUsersDataLoading] = useUsers(usersSearch, packageObject.key)
  const handleSetUserSearch = useCallback((search: string) => {
    setUsersSearch(search)
  }, [])

  const [addPackageMemberRole] = useAddPackageMember()
  const handleAddPackageMemberRole = useCallback((users: User[], roles: Role[]) => {
    const emails = users.map(user => user.email ?? '')
    const roleKeys = roles.map(role => role.key)
    addPackageMemberRole({
      packageKey: packageObject.key,
      value: {
        emails: emails,
        roleKeys: roleKeys,
      },
    })
  }, [addPackageMemberRole, packageObject.key])

  return (
    <Box height="100%">
      <BodyCard
        header={
          <Box display="flex" alignItems="center">
            Access Control
            <IconButton onClick={showUserRolesDialog} data-testid="AcHelpButton">
              <HelpOutlineIcon sx={{ color: '#626D82', width: '16px', height: '16px' }}/>
            </IconButton>
          </Box>
        }
        action={
          <Box sx={{ display: 'flex', mb: 2, gap: 2, order: 1 }}>
            <ButtonWithHint
              variant="contained"
              disabled={!hasUserAccessManagementPermission}
              disableHint={hasUserAccessManagementPermission}
              hint="You do not have permission to add member"
              startIcon={<AddIcon/>}
              title="Add User"
              onClick={showAddUserDialog}
              testId="AddUserButton"
            />
            <Box sx={{ flex: 1, maxWidth: 240 }}>
              <SearchBar
                placeholder="Search"
                onValueChange={onChangeSearchValue}
                data-testid="SearchUser"
              />
            </Box>
          </Box>
        }
        body={isLoading ? (
          <LoadingIndicator/>
        ) : (
          <Box marginTop="8px" marginBottom="16px" overflow="hidden" height="100%">
            <UserAccessControlTable
              packageKey={packageObject.key}
              roles={roles}
              availablePackageRoles={availablePackageRoles}
              packageMembers={packageMembers}
              hasUserAccessManagementPermission={hasUserAccessManagementPermission}
              isLoading={isLoading}
              searchValue={searchValue}
            />
          </Box>
        )}
      />
      <AddUserDialog
        users={usersData?.users}
        roles={availablePackageRoles}
        onConfirm={(emails, roleKeys) => handleAddPackageMemberRole(emails, roleKeys)}
        setUserSearch={handleSetUserSearch}
        isUsersLoading={isUsersDataLoading}
      />
      <UserRolesDialog
        permissions={permissions}
        roles={roles}
        isLoading={isRolesLoading || isPermissionsLoading}
      />
    </Box>
  )
})
