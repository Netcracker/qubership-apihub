import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import { Alert, Box, IconButton } from '@mui/material'
import { type FC, memo, useCallback, useMemo, useState } from 'react'

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

import { useEventBus } from '@portal/routes/EventBusProvider'
import type {
  ChangeRoleAction,
  PackageMember,
} from '@portal/routes/root/PortalPage/PackageSettingsPage/package-settings'
import { UserAccessControlTable } from '@portal/routes/root/PortalPage/PackageSettingsPage/UserPackageAccessControlSettingsTab/UserAccessControlTable'
import { UserRolesDialog } from '@portal/routes/root/PortalPage/PackageSettingsPage/UserPackageAccessControlSettingsTab/UserRolesDialog'
import { useUsers } from '@portal/routes/root/useUsers'
import type { LibrarySettingsTabProps } from '../library-settings'
import {
  useAddLibraryMembers,
  useChangeLibraryMemberRole,
  useDeleteLibraryMember,
  useLibraryMembers,
} from './useLibraryMembers'

export const UserLibraryAccessControlSettingsTab: FC<LibrarySettingsTabProps> = memo<LibrarySettingsTabProps>(
  ({ library }) => {
    const { showAddUserDialog, showUserRolesDialog } = useEventBus()

    const hasUserAccessManagementPermission = useMemo(
      () => !!library.permissions?.includes(USER_ACCESS_MANAGEMENT_PERMISSION),
      [library],
    )

    const [searchValue, setSearchValue] = useState('')
    const onChangeSearchValue = useCallback((value: string) => {
      setSearchValue(value)
    }, [])

    const [user] = useUser()
    const [availableRoles, isAvailableRolesLoading, availableRolesError] = useAvailablePackageRoles(
      library.parentPackageId ?? '',
      user?.key ?? '',
      !!library.parentPackageId && hasUserAccessManagementPermission,
    )
    const [members, isMembersLoading, membersError, isMembersFetching] = useLibraryMembers(
      library.libraryId,
      hasUserAccessManagementPermission,
    )

    const { data: roles, isLoading: isRolesLoading, error: rolesError } = useRoles(hasUserAccessManagementPermission)
    const [permissions, isPermissionsLoading, permissionsError] = usePermissions(hasUserAccessManagementPermission)
    const isLoading = useMemo(
      () => isMembersLoading || isAvailableRolesLoading || isRolesLoading,
      [isMembersLoading, isAvailableRolesLoading, isRolesLoading],
    )
    const error = membersError ?? availableRolesError ?? rolesError ?? permissionsError

    const [usersSearch, setUsersSearch] = useState('')
    const [usersData, isUsersLoading] = useUsers({
      searchValue: usersSearch,
      enabled: hasUserAccessManagementPermission,
    })
    const handleSetUserSearch = useCallback((search: string) => {
      setUsersSearch(search)
    }, [])

    const [addLibraryMembers, isAddingMembers] = useAddLibraryMembers()
    const [deleteLibraryMember, isDeletingLibraryMember] = useDeleteLibraryMember()
    const [changeLibraryMemberRole, isChangingRole] = useChangeLibraryMemberRole()
    const handleDeleteMember = useCallback((member: PackageMember) => {
      deleteLibraryMember({
        libraryId: library.libraryId,
        userId: member.user.id,
        userName: member.user.name ?? '',
      })
    }, [deleteLibraryMember, library.libraryId])
    const handleChangeRole = useCallback((member: PackageMember, role: Role, action: ChangeRoleAction) => {
      changeLibraryMemberRole({
        libraryId: library.libraryId,
        userId: member.user.id,
        roleId: role.key,
        action: action,
      })
    }, [changeLibraryMemberRole, library.libraryId])
    const handleAddLibraryMembers = useCallback((users: User[], roles: Role[]) => {
      addLibraryMembers({
        libraryId: library.libraryId,
        userIds: users.map(user => user.key),
        roleIds: roles.map(role => role.key),
      })
    }, [addLibraryMembers, library.libraryId])

    const isMembersSettled = !membersError && !isMembersFetching && !isChangingRole && !isAddingMembers &&
      !isDeletingLibraryMember
    const canAddMember = hasUserAccessManagementPermission && isMembersSettled && !!library.parentPackageId &&
      availableRoles.length > 0
    const addMemberHint = library.parentPackageId
      ? 'You do not have an assignable role in the parent package'
      : 'A parent package is required to assign library roles'

    return (
      <Box height="100%" data-testid="UserLibraryAccessControlSettingsTab">
        <BodyCard
          header={
            <Box display="flex" alignItems="center">
              Access Control
              <IconButton
                onClick={showUserRolesDialog}
                disabled={!hasUserAccessManagementPermission}
                aria-label="View roles"
                data-testid="AcHelpButton"
              >
                <HelpOutlineIcon fontSize="small" color="action" />
              </IconButton>
            </Box>
          }
          action={
            <Box sx={{ display: 'flex', mb: 2, gap: 2, order: 1 }}>
              <ButtonWithHint
                variant="contained"
                disabled={!canAddMember}
                disableHint={canAddMember}
                hint={addMemberHint}
                startIcon={<AddIcon />}
                title="Add User"
                onClick={showAddUserDialog}
                data-testid="AddUserButton"
              />
              <Box sx={{ flex: 1, maxWidth: 240 }}>
                <SearchBar
                  placeholder="Search"
                  onValueChange={onChangeSearchValue}
                  disabled={!hasUserAccessManagementPermission}
                  data-testid="SearchUser"
                />
              </Box>
            </Box>
          }
          body={
            <>
              {error && <Alert severity="error">{error.message}</Alert>}
              {isLoading
                ? <LoadingIndicator />
                : (
                  <Box marginTop="8px" marginBottom="16px" overflow="hidden" height="100%">
                    <UserAccessControlTable
                      onDeleteMember={handleDeleteMember}
                      onChangeRole={handleChangeRole}
                      isDeletingMember={isDeletingLibraryMember}
                      roles={roles}
                      availablePackageRoles={availableRoles}
                      packageMembers={members}
                      hasUserAccessManagementPermission={hasUserAccessManagementPermission && isMembersSettled}
                      isLoading={isLoading}
                      searchValue={searchValue}
                      resourceName="library"
                    />
                  </Box>
                )}
            </>
          }
        />
        {hasUserAccessManagementPermission && (
          <>
            <AddUserDialog
              users={usersData?.users}
              roles={availableRoles}
              onConfirm={handleAddLibraryMembers}
              setUserSearch={handleSetUserSearch}
              isUsersLoading={isUsersLoading}
            />
            <UserRolesDialog
              permissions={permissions}
              roles={roles}
              isLoading={isRolesLoading || isPermissionsLoading}
            />
          </>
        )}
      </Box>
    )
  },
)
UserLibraryAccessControlSettingsTab.displayName = 'UserLibraryAccessControlSettingsTab'
