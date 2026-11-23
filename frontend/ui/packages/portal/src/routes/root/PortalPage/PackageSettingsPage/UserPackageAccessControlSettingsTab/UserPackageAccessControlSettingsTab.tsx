import { useEventBus } from '@portal/routes/EventBusProvider'
import {
  UserAccessControlTable,
} from '@portal/routes/root/PortalPage/PackageSettingsPage/UserPackageAccessControlSettingsTab/UserAccessControlTable'
import {
  UserRolesDialog,
} from '@portal/routes/root/PortalPage/PackageSettingsPage/UserPackageAccessControlSettingsTab/UserRolesDialog'
import {
  useAddPackageMember,
  useChangePackageMemberRole,
  useDeletePackageMember,
  usePackageMembers,
} from '@portal/routes/root/PortalPage/PackageSettingsPage/UserPackageAccessControlSettingsTab/useUserPackageAccess'
import { useUsers } from '@portal/routes/root/useUsers'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import { Box, IconButton } from '@mui/material'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { ButtonWithHint } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ButtonWithHint'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { SearchBar } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'
import { AddUserDialog } from '@netcracker/qubership-apihub-ui-shared/components/Users/AddUserDialog'
import { USER_ACCESS_MANAGEMENT_PERMISSION } from '@netcracker/qubership-apihub-ui-shared/entities/package-permissions'
import { useUser } from '@netcracker/qubership-apihub-ui-shared/hooks/authorization/useUser'
import { useAvailablePackageRoles } from '@netcracker/qubership-apihub-ui-shared/hooks/tokens/useTokens'
import { usePermissions } from '@netcracker/qubership-apihub-ui-shared/hooks/user-roles/usePermissions'
import { useRoles } from '@netcracker/qubership-apihub-ui-shared/hooks/user-roles/useRoles'
import { AddIcon } from '@netcracker/qubership-apihub-ui-shared/icons/AddIcon'
import type { Role } from '@netcracker/qubership-apihub-ui-shared/types/roles'
import type { User } from '@netcracker/qubership-apihub-ui-shared/types/user'
import type { FC } from 'react'
import { memo, useCallback, useMemo, useState } from 'react'
import type { ChangeRoleAction, PackageMember, PackageSettingsTabProps } from '../package-settings'

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

  const [user] = useUser()
  const [availablePackageRoles, isRolesPackageLoading] = useAvailablePackageRoles(packageObject.key, user?.key ?? '')
  const [packageMembers, isPackageMembersLoading] = usePackageMembers(packageObject.key, hasUserAccessManagementPermission)

  const isLoading = useMemo(() => isRolesPackageLoading && isPackageMembersLoading, [isRolesPackageLoading, isPackageMembersLoading])

  const { data: roles, isLoading: isRolesLoading } = useRoles(hasUserAccessManagementPermission)
  const [permissions, isPermissionsLoading] = usePermissions(hasUserAccessManagementPermission)

  const [usersSearch, setUsersSearch] = useState('')
  const [usersData, isUsersDataLoading] = useUsers({
    searchValue: usersSearch,
    packageKey: packageObject.key,
    enabled: hasUserAccessManagementPermission,
  })
  const handleSetUserSearch = useCallback((search: string) => {
    setUsersSearch(search)
  }, [])

  const [addPackageMemberRole] = useAddPackageMember()
  const [deletePackageMember, isDeletingPackageMember] = useDeletePackageMember()
  const [changePackageMemberRole] = useChangePackageMemberRole()
  const handleDeleteMember = useCallback((member: PackageMember) => {
    deletePackageMember({
      packageKey: packageObject.key,
      userId: member.user.id,
      userName: member.user.name ?? '',
    })
  }, [deletePackageMember, packageObject.key])
  const handleChangeRole = useCallback((member: PackageMember, role: Role, action: ChangeRoleAction) => {
    changePackageMemberRole({
      packageKey: packageObject.key,
      userId: member.user.id,
      roleId: role.key,
      action: action,
    })
  }, [changePackageMemberRole, packageObject.key])
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
              data-testid="AddUserButton"
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
              onDeleteMember={handleDeleteMember}
              onChangeRole={handleChangeRole}
              isDeletingMember={isDeletingPackageMember}
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
