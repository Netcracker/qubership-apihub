import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { API_V1 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

import type { LibraryMembersDto, LibraryMemberUpdateDto } from '@portal/entities/libraries'
import type { PackageMembers } from '@portal/routes/root/PortalPage/PackageSettingsPage/package-settings'
import { portalRequestJson, portalRequestVoid } from '@portal/utils/requests'

type LibraryMembersResult = { members: PackageMembers; isLoading: boolean; isFetching: boolean; error: Error | null }
type UpdateMember = (userId: Key, value: LibraryMemberUpdateDto) => Promise<void>
type DeleteMember = (userId: Key) => Promise<void>
type UpdateMemberResult = { updateMember: UpdateMember; isLoading: boolean }
type DeleteMemberResult = { deleteMember: DeleteMember; isLoading: boolean }

export const libraryMembersQueryKey = (
  libraryId: Key,
): readonly ['library-members', Key] => ['library-members', libraryId]

export function useLibraryMembers(libraryId: Key, enabled = true): LibraryMembersResult {
  const { data, isInitialLoading, isFetching, error } = useQuery<LibraryMembersDto, Error, PackageMembers>({
    queryKey: libraryMembersQueryKey(libraryId),
    queryFn: ({ signal }) =>
      portalRequestJson<LibraryMembersDto>(
        `/libraries/${encodeURIComponent(libraryId)}/members`,
        { method: 'GET' },
        { basePath: API_V1 },
        signal,
      ),
    select: toLibraryMembers,
    enabled: enabled,
    refetchOnMount: 'always',
  })
  return { members: data ?? [], isLoading: isInitialLoading, isFetching: isFetching, error: error }
}

export function useUpdateLibraryMember(libraryId: Key): UpdateMemberResult {
  const client = useQueryClient()
  const { mutateAsync, isLoading } = useMutation<void, Error, { userId: Key; value: LibraryMemberUpdateDto }>({
    mutationKey: libraryMembersQueryKey(libraryId),
    mutationFn: ({ userId, value }) =>
      portalRequestVoid(
        `/libraries/${encodeURIComponent(libraryId)}/members/${encodeURIComponent(userId)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(value),
        },
        { basePath: API_V1 },
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: libraryMembersQueryKey(libraryId), refetchType: 'all' }),
  })
  return {
    updateMember: (userId, value) => mutateAsync({ userId: userId, value: value }),
    isLoading: isLoading,
  }
}

export function useDeleteLibraryMember(libraryId: Key): DeleteMemberResult {
  const client = useQueryClient()
  const { mutateAsync, isLoading } = useMutation<void, Error, Key>({
    mutationKey: libraryMembersQueryKey(libraryId),
    mutationFn: userId =>
      portalRequestVoid(
        `/libraries/${encodeURIComponent(libraryId)}/members/${encodeURIComponent(userId)}`,
        { method: 'DELETE' },
        { basePath: API_V1 },
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: libraryMembersQueryKey(libraryId), refetchType: 'all' }),
  })
  return { deleteMember: mutateAsync, isLoading: isLoading }
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
    roles: [...roles.filter(role => !role.inheritedFrom), ...roles.filter(role => role.inheritedFrom)].map(
      ({ roleId, role, inheritedFrom }) => ({
        roleId: roleId,
        role: role,
        inheritance: inheritedFrom,
      }),
    ),
  }))
}
