import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { generatePath } from 'react-router-dom'

import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { IsError, IsFetching, IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'

import type { LibraryMembersDto, LibraryMemberUpdateDto } from '@portal/entities/libraries'
import {
  useShowErrorNotification,
  useShowInfoNotification,
  useShowSuccessNotification,
} from '@portal/routes/root/BasePage/Notification'
import {
  ADD_CHANGE_ROLE_ACTION,
  type ChangeRoleAction,
  type PackageMembers,
  REMOVE_CHANGE_ROLE_ACTION,
} from '@portal/routes/root/PortalPage/PackageSettingsPage/package-settings'
import { LIBRARIES_API_BASE_PATH, portalRequestJson, portalRequestVoid } from '@portal/utils/requests'

const LIBRARY_MEMBERS_QUERY_KEY = 'library-members-query-key'

type DeleteLibraryMember = (data: DeleteLibraryMemberData) => void
type ChangeLibraryMemberRole = (data: ChangeLibraryMemberRoleData) => void
type AddLibraryMembers = (data: AddLibraryMembersData) => void

type DeleteLibraryMemberData = {
  libraryId: Key
  userId: Key
  userName: string
}

type ChangeLibraryMemberRoleData = {
  libraryId: Key
  userId: Key
  roleId: Key
  action: ChangeRoleAction
}

type AddLibraryMembersData = {
  libraryId: Key
  userIds: Key[]
  roleIds: Key[]
}

export function useLibraryMembers(
  libraryId: Key,
  enabled = true,
): [PackageMembers, IsLoading, Error | null, IsFetching] {
  const { data, isInitialLoading, error, isFetching } = useQuery<LibraryMembersDto, Error, PackageMembers>({
    queryKey: [LIBRARY_MEMBERS_QUERY_KEY, libraryId],
    queryFn: () => getLibraryMembers(libraryId),
    enabled: !!libraryId && enabled,
    select: toLibraryMembers,
  })

  return [
    data ?? [],
    isInitialLoading,
    error,
    isFetching,
  ]
}

export async function getLibraryMembers(
  libraryId: Key,
): Promise<LibraryMembersDto> {
  const pathPattern = '/libraries/:libraryId/members'
  return await portalRequestJson<LibraryMembersDto>(
    generatePath(pathPattern, {
      libraryId: encodeURIComponent(libraryId),
    }),
    {
      method: 'GET',
    },
    {
      basePath: LIBRARIES_API_BASE_PATH,
    },
  )
}

export function useDeleteLibraryMember(): [DeleteLibraryMember, IsLoading] {
  const client = useQueryClient()
  const showNotification = useShowSuccessNotification()
  const showErrorNotification = useShowErrorNotification()

  const { mutate, isLoading } = useMutation<void, Error, DeleteLibraryMemberData>({
    mutationFn: ({ libraryId, userId }) => deleteLibraryMember(libraryId, userId),
    onSuccess: (_, { libraryId, userName }) => {
      showNotification({ message: `Library member ${userName} has been deleted` })
      return client.invalidateQueries({
        queryKey: [LIBRARY_MEMBERS_QUERY_KEY, libraryId],
        refetchType: 'all',
      })
    },
    onError: (error) => {
      showErrorNotification({ message: error?.message })
    },
  })
  return [mutate, isLoading]
}

export async function deleteLibraryMember(
  libraryId: Key,
  userId: Key,
): Promise<void> {
  const pathPattern = '/libraries/:libraryId/members/:userId'
  return await portalRequestVoid(
    generatePath(pathPattern, {
      libraryId: encodeURIComponent(libraryId),
      userId: encodeURIComponent(userId),
    }),
    {
      method: 'DELETE',
    },
    {
      basePath: LIBRARIES_API_BASE_PATH,
    },
  )
}

export function useChangeLibraryMemberRole(): [ChangeLibraryMemberRole, IsLoading, IsSuccess] {
  const client = useQueryClient()
  const showInfoNotification = useShowInfoNotification()
  const showErrorNotification = useShowErrorNotification()

  const { mutate, isLoading, isSuccess } = useMutation<void, Error, ChangeLibraryMemberRoleData>({
    mutationFn: ({ libraryId, userId, roleId, action }) =>
      updateLibraryMember(libraryId, userId, {
        roleIds: getLibraryMemberRoleIds(client, libraryId, userId, [roleId], action),
      }),
    onSuccess: async (_, { libraryId, userId, roleId, action }) => {
      const oppositeAction = action === ADD_CHANGE_ROLE_ACTION ? REMOVE_CHANGE_ROLE_ACTION : ADD_CHANGE_ROLE_ACTION
      showInfoNotification({
        message: 'The change has been saved',
        button: {
          title: 'Undo',
          onClick: async () => {
            await updateLibraryMember(libraryId, userId, {
              roleIds: getLibraryMemberRoleIds(client, libraryId, userId, [roleId], oppositeAction),
            })
            await client.invalidateQueries({
              queryKey: [LIBRARY_MEMBERS_QUERY_KEY, libraryId],
              refetchType: 'all',
            })
          },
        },
      })
      return client.invalidateQueries({
        queryKey: [LIBRARY_MEMBERS_QUERY_KEY, libraryId],
        refetchType: 'all',
      })
    },
    onError: (error) => {
      showErrorNotification({ message: error?.message })
    },
  })

  return [mutate, isLoading, isSuccess]
}

export async function updateLibraryMember(
  libraryId: Key,
  userId: Key,
  value: LibraryMemberUpdateDto,
): Promise<void> {
  const pathPattern = '/libraries/:libraryId/members/:userId'
  return await portalRequestVoid(
    generatePath(pathPattern, {
      libraryId: encodeURIComponent(libraryId),
      userId: encodeURIComponent(userId),
    }),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
    },
    {
      basePath: LIBRARIES_API_BASE_PATH,
    },
  )
}

export function useAddLibraryMembers(): [AddLibraryMembers, IsLoading, IsSuccess, IsError] {
  const client = useQueryClient()
  const showNotification = useShowSuccessNotification()

  const { mutate, isLoading, isSuccess, isError } = useMutation<void, Error, AddLibraryMembersData>({
    mutationFn: async ({ libraryId, userIds, roleIds }) => {
      for (const userId of userIds) {
        await updateLibraryMember(libraryId, userId, {
          roleIds: getLibraryMemberRoleIds(client, libraryId, userId, roleIds),
        })
      }
    },
    onSuccess: () => {
      showNotification({ message: 'Library members have been added' })
    },
    onSettled: (_, __, { libraryId }) =>
      client.invalidateQueries({
        queryKey: [LIBRARY_MEMBERS_QUERY_KEY, libraryId],
        refetchType: 'all',
      }),
  })

  return [
    mutate,
    isLoading,
    isSuccess,
    isError,
  ]
}

// TODO(libraries-backend): The service replaces a member's whole role list (PUT roleIds), so the UI rebuilds it
// from the cached members and the tab blocks edits while that cache is not settled. Replace with add/remove-role
// PATCH and an additive POST, as for package members, then mirror useUserPackageAccess.ts without the guard.
function getLibraryMemberRoleIds(
  client: QueryClient,
  libraryId: Key,
  userId: Key,
  roleIds: Key[],
  action: ChangeRoleAction = ADD_CHANGE_ROLE_ACTION,
): Key[] {
  const members = client.getQueryData<LibraryMembersDto>([LIBRARY_MEMBERS_QUERY_KEY, libraryId])
  const directRoleIds = members?.members.find(member => member.user.userId === userId)?.roles
    .filter(role => !role.inheritedFrom)
    .map(role => role.roleId) ?? []

  return action === ADD_CHANGE_ROLE_ACTION
    ? [...new Set([...directRoleIds, ...roleIds])]
    : directRoleIds.filter(roleId => !roleIds.includes(roleId))
}

function toLibraryMembers(value: LibraryMembersDto): PackageMembers {
  return value.members.map(({ user, roles }) => ({
    user: {
      id: user.userId,
      name: user.name,
      gitIntegrationStatus: false,
      systemRole: '',
      accessTokenTTLSeconds: null,
    },
    // TODO(libraries-backend): The service lists direct members only, without roles inherited from the parent package.
    // It keeps members with empty roles and returns 204 when deleting a missing member; the mock behaves differently.
    roles: [...roles.filter(role => !role.inheritedFrom), ...roles.filter(role => role.inheritedFrom)].map(
      ({ roleId, role, inheritedFrom }) => ({
        roleId: roleId,
        role: role,
        inheritance: inheritedFrom,
      }),
    ),
  }))
}
