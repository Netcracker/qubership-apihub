import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import { Alert, Box, IconButton, styled } from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import { type FC, useState } from 'react'

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
import { HttpError } from '@netcracker/qubership-apihub-ui-shared/utils/responses'

import type { LibraryMemberDto, LibraryMembersDto, MavenLibraryDto } from '@portal/entities/libraries'
import { useEventBus } from '@portal/routes/EventBusProvider'
import {
  useShowErrorNotification,
  useShowInfoNotification,
  useShowSuccessNotification,
} from '@portal/routes/root/BasePage/Notification'
import {
  ADD_CHANGE_ROLE_ACTION,
  type ChangeRoleAction,
  type PackageMember,
  REMOVE_CHANGE_ROLE_ACTION,
} from '@portal/routes/root/PortalPage/PackageSettingsPage/package-settings'
import { UserAccessControlTable } from '@portal/routes/root/PortalPage/PackageSettingsPage/UserPackageAccessControlSettingsTab/UserAccessControlTable'
import { UserRolesDialog } from '@portal/routes/root/PortalPage/PackageSettingsPage/UserPackageAccessControlSettingsTab/UserRolesDialog'
import { useUsers } from '@portal/routes/root/useUsers'
import {
  libraryMembersQueryKey,
  useDeleteLibraryMember,
  useLibraryMembers,
  useUpdateLibraryMember,
} from './useLibraryMembers'

type UserLibraryAccessControlSettingsTabProps = { library: MavenLibraryDto }

export const UserLibraryAccessControlSettingsTab: FC<UserLibraryAccessControlSettingsTabProps> = ({ library }) => {
  const hasPermission = !!library.permissions?.includes(USER_ACCESS_MANAGEMENT_PERMISSION)
  const queryClient = useQueryClient()
  const membersQueryKey = libraryMembersQueryKey(library.libraryId)
  const { showAddUserDialog, showUserRolesDialog } = useEventBus()
  const showSuccessNotification = useShowSuccessNotification()
  const showErrorNotification = useShowErrorNotification()
  const showInfoNotification = useShowInfoNotification()
  const [user] = useUser()
  const [searchValue, setSearchValue] = useState('')
  const [usersSearch, setUsersSearch] = useState('')
  const { members, isLoading: isMembersLoading, isFetching: isMembersFetching, error: membersError } =
    useLibraryMembers(
      library.libraryId,
      hasPermission,
    )
  const [availableRoles, isAvailableRolesLoading, availableRolesError] = useAvailablePackageRoles(
    library.parentPackageId ?? '',
    user?.key ?? '',
    !!library.parentPackageId && hasPermission,
  )
  const { data: roles, isLoading: isRolesLoading, error: rolesError } = useRoles(hasPermission)
  const [permissions, isPermissionsLoading, permissionsError] = usePermissions(hasPermission)
  const [usersData, isUsersLoading] = useUsers({ searchValue: usersSearch, enabled: hasPermission })
  const { updateMember, isLoading: isUpdating } = useUpdateLibraryMember(library.libraryId)
  const { deleteMember, isLoading: isDeleting } = useDeleteLibraryMember(library.libraryId)
  const isLoading = isMembersLoading || isAvailableRolesLoading || isRolesLoading
  const isMutating = isUpdating || isDeleting
  const error = membersError ?? availableRolesError ?? rolesError ?? permissionsError
  const canAddMember = hasPermission && !!library.parentPackageId && !!availableRoles.length && !isLoading &&
    !isMutating && !isMembersFetching && !error
  const addMemberHint = library.parentPackageId
    ? 'You do not have an assignable role in the parent package'
    : 'A parent package is required to assign library roles'

  // A failed request already shows its own snackbar, and a 401 rejects with no error at all;
  // notify only about the errors the request helpers do not report, such as a network failure
  const notifyError = (error: unknown): void => {
    if (!(error instanceof Error) || error instanceof HttpError) return
    showErrorNotification({ message: error.message })
  }

  const canWrite = (): boolean => {
    const queryState = queryClient.getQueryState(membersQueryKey)
    return hasPermission && queryState?.status === 'success' && queryState.fetchStatus === 'idle' &&
      queryClient.isMutating({ mutationKey: membersQueryKey }) === 0
  }

  const getCurrentMember = (userId: string): LibraryMemberDto | undefined => {
    return queryClient.getQueryData<LibraryMembersDto>(membersQueryKey)?.members.find(member =>
      member.user.userId === userId,
    )
  }

  const saveRole = async (userId: string, roleId: string, action: ChangeRoleAction): Promise<void> => {
    const directRoles = getDirectRoleIds(getCurrentMember(userId))
    const roleIds = action === ADD_CHANGE_ROLE_ACTION
      ? [...new Set([...directRoles, roleId])]
      : directRoles.filter(key => key !== roleId)
    await updateMember(userId, { roleIds: roleIds })
  }

  const handleChangeRole = async (member: PackageMember, role: Role, action: ChangeRoleAction): Promise<void> => {
    if (!canWrite()) return
    try {
      await saveRole(member.user.id, role.key, action)
      showInfoNotification({
        message: 'The change has been saved',
        button: {
          title: 'Undo',
          onClick: async () => {
            if (!canWrite()) return
            try {
              const oppositeAction = action === ADD_CHANGE_ROLE_ACTION
                ? REMOVE_CHANGE_ROLE_ACTION
                : ADD_CHANGE_ROLE_ACTION
              await saveRole(member.user.id, role.key, oppositeAction)
            } catch (error) {
              notifyError(error)
            }
          },
        },
      })
    } catch (error) {
      notifyError(error)
    }
  }

  const handleDeleteMember = async (member: PackageMember): Promise<void> => {
    if (!canWrite()) return
    try {
      await deleteMember(member.user.id)
      showSuccessNotification({ message: `Library member ${member.user.name} has been deleted` })
    } catch (error) {
      notifyError(error)
    }
  }

  const handleAddMembers = async (users: User[], selectedRoles: Role[]): Promise<void> => {
    if (!canAddMember || !canWrite()) return
    try {
      for (const user of users) {
        if (!canWrite()) return
        const member = getCurrentMember(user.key)
        const roleIds = [...new Set([...getDirectRoleIds(member), ...selectedRoles.map(role => role.key)])]
        await updateMember(user.key, { roleIds: roleIds })
      }
      showSuccessNotification({ message: 'Library members have been added' })
    } catch (error) {
      notifyError(error)
    }
  }

  return (
    <Box height="100%" data-testid="UserLibraryAccessControlSettingsTab">
      <BodyCard
        header={
          <AccessHeader>
            Access Control
            <IconButton
              onClick={showUserRolesDialog}
              disabled={!hasPermission}
              aria-label="View roles"
              data-testid="AcHelpButton"
            >
              <HelpOutlineIcon fontSize="small" color="action" />
            </IconButton>
          </AccessHeader>
        }
        action={
          <AccessActions>
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
            <SearchContainer>
              <SearchBar
                placeholder="Search"
                onValueChange={setSearchValue}
                disabled={!hasPermission}
                data-testid="SearchUser"
              />
            </SearchContainer>
          </AccessActions>
        }
        body={
          <>
            {error && <Alert severity="error">{error.message}</Alert>}
            {isLoading ? <LoadingIndicator /> : (
              <MembersContainer>
                <UserAccessControlTable
                  roles={roles}
                  availablePackageRoles={availableRoles}
                  packageMembers={members}
                  hasUserAccessManagementPermission={hasPermission && !isMutating && !isMembersFetching && !error}
                  isLoading={isLoading}
                  searchValue={searchValue}
                  onDeleteMember={handleDeleteMember}
                  onChangeRole={handleChangeRole}
                  isDeletingMember={isMutating || isMembersFetching}
                  resourceName="library"
                />
              </MembersContainer>
            )}
          </>
        }
      />
      {hasPermission && (
        <>
          <AddUserDialog
            users={usersData?.users}
            roles={availableRoles}
            onConfirm={handleAddMembers}
            setUserSearch={setUsersSearch}
            isUsersLoading={isUsersLoading}
          />
          <UserRolesDialog permissions={permissions} roles={roles} isLoading={isRolesLoading || isPermissionsLoading} />
        </>
      )}
    </Box>
  )
}
UserLibraryAccessControlSettingsTab.displayName = 'UserLibraryAccessControlSettingsTab'

const AccessHeader = styled(Box)({ display: 'flex', alignItems: 'center' })
const AccessActions = styled(Box)(({ theme }) => ({
  display: 'flex',
  marginBottom: theme.spacing(2),
  gap: theme.spacing(2),
  order: 1,
}))
const SearchContainer = styled(Box)({ flex: 1, maxWidth: 240 })
const MembersContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(2),
  overflow: 'hidden',
  height: '100%',
}))

function getDirectRoleIds(member: LibraryMemberDto | undefined): string[] {
  return member?.roles.filter(role => !role.inheritedFrom).map(role => role.roleId) ?? []
}
