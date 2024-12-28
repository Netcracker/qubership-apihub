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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  useShowErrorNotification,
  useShowInfoNotification,
  useShowSuccessNotification,
} from '../../../BasePage/Notification'
import type {
  AddPackageMemberProps,
  AddPackageMemberPropsDto,
  ChangePackageMemberDto,
  ChangeRoleAction,
  PackageMembers,
  PackageMembersDto,
} from '../package-settings'
import { ADD_CHANGE_ROLE_ACTION, REMOVE_CHANGE_ROLE_ACTION, toPackageMembers } from '../package-settings'
import { generatePath } from 'react-router-dom'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { IsError, IsLoading, IsSuccess, OptionInvalidateQuery } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { portalRequestJson, portalRequestVoid } from '@apihub/utils/requests'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'
import { useInvalidatePackage } from '@apihub/routes/root/usePackage'

const USER_PACKAGE_ACCESS_QUERY_KEY = 'user-package-access-query-key'

type DeletePackageMember = (data: DeletePackageMemberData) => void
type ChangePackageMemberRole = (data: ChangePackageMemberRoleData) => void
type AddPackageMemberRole = (data: AddPackageMemberRoleData) => void

type DeletePackageMemberData = {
  packageKey: Key
  userId: Key
  userName: string
}

type ChangePackageMemberRoleData = {
  packageKey: Key
  userId: Key
  roleId: Key
  action: ChangeRoleAction
}

type AddPackageMemberRoleData = {
  packageKey: Key
  value: AddPackageMemberProps
}

export function usePackageMembers(packageKey: Key): [PackageMembers, IsLoading, Error | null] {
  const { data, isLoading, error } = useQuery<PackageMembersDto, Error, PackageMembers>({
    queryKey: [USER_PACKAGE_ACCESS_QUERY_KEY, packageKey],
    queryFn: () => getPackageMembers(packageKey!),
    enabled: !!packageKey,
    select: toPackageMembers,
  })

  return [
    data ?? [],
    isLoading,
    error,
  ]
}

export function useInvalidatePackageMembers(): OptionInvalidateQuery<Key | undefined> {

  const client = useQueryClient()
  return () => {
    client.refetchQueries({
      queryKey: [USER_PACKAGE_ACCESS_QUERY_KEY],
    }).then()
  }
}

export async function getPackageMembers(
  packageKey: Key,
): Promise<PackageMembersDto> {
  const packageId = encodeURIComponent(packageKey)
  const pathPattern = '/packages/:packageId/members'
  return await portalRequestJson<PackageMembersDto>(generatePath(pathPattern, { packageId }), {
    method: 'GET',
  }, {
    customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
  })
}

export function useDeletePackageMember(): [DeletePackageMember, IsLoading] {
  const client = useQueryClient()
  const showNotification = useShowSuccessNotification()
  const showErrorNotification = useShowErrorNotification()

  const { mutate, isLoading } = useMutation<void, Error, DeletePackageMemberData>({
    mutationFn: ({ packageKey, userId }) => deletePackageMember(packageKey, userId),
    onSuccess: (_, { packageKey, userName }) => {
      showNotification({ message: `Package member ${userName} has been deleted` })
      return client.invalidateQueries({
        queryKey: [USER_PACKAGE_ACCESS_QUERY_KEY, packageKey],
        refetchType: 'all',
      })
    },
    onError: (error) => {
      showErrorNotification({ message: error?.message })
    },
  })
  return [mutate, isLoading]
}

export async function deletePackageMember(
  packageKey: Key,
  userId: Key,
): Promise<void> {
  const packageId = encodeURIComponent(packageKey)
  const pathPattern = '/packages/:packageId/members/:userId'
  return await portalRequestVoid(generatePath(pathPattern, { packageId, userId }), {
    method: 'DELETE',
  }, {
    customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
  })
}

export function useChangePackageMemberRole(): [ChangePackageMemberRole, IsLoading, IsSuccess] {
  const showNotification = useShowInfoNotification()
  const showErrorNotification = useShowErrorNotification()
  const invalidatePackage = useInvalidatePackage()
  const invalidatePackageMembers = useInvalidatePackageMembers()

  const { mutate, isLoading, isSuccess } = useMutation<void, Error, ChangePackageMemberRoleData>({
      mutationFn: ({ packageKey, userId, roleId, action }) =>
        changePackageMemberRole(packageKey, userId, toChangePackageMemberDto(roleId, action)),
      onSuccess: async (_, { packageKey, userId, roleId, action }) => {
        const oppositeAction = action === ADD_CHANGE_ROLE_ACTION ? REMOVE_CHANGE_ROLE_ACTION : ADD_CHANGE_ROLE_ACTION
        showNotification({
          message: 'The change has been saved',
          button: {
            title: 'Undo',
            onClick: async () => {
              await changePackageMemberRole(packageKey, userId, toChangePackageMemberDto(roleId, oppositeAction))
              invalidatePackage()
              invalidatePackageMembers()
            },
          },
        })
        invalidatePackage()
        invalidatePackageMembers()
      },
      onError: (error) => {
        showErrorNotification({ message: error?.message })
      },
    },
  )

  return [mutate, isLoading, isSuccess]
}

export async function changePackageMemberRole(
  packageKey: Key,
  userId: Key,
  value: ChangePackageMemberDto,
): Promise<void> {
  const packageId = encodeURIComponent(packageKey)
  const pathPattern = '/packages/:packageId/members/:userId'
  return await portalRequestVoid(generatePath(pathPattern, { packageId, userId }), {
    method: 'PATCH',
    body: JSON.stringify(value),
  }, {
    customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
  })
}

export function useAddPackageMember(): [AddPackageMemberRole, IsLoading, IsSuccess, IsError] {
  const showNotification = useShowSuccessNotification()
  const invalidatePackageMembers = useInvalidatePackageMembers()

  const { mutate, isLoading, isSuccess, isError } = useMutation<void, Error, AddPackageMemberRoleData>({
    mutationFn: ({ packageKey, value }) => addPackageMember(packageKey, toAddPackageMemberDto(value)),
    onSuccess: () => {
      showNotification({ message: 'New package members has been added' })
      invalidatePackageMembers()
    },
  })

  return [
    mutate,
    isLoading,
    isSuccess,
    isError,
  ]
}

export async function addPackageMember(
  packageKey: Key,
  value: AddPackageMemberPropsDto,
): Promise<void> {
  const packageId = encodeURIComponent(packageKey)
  const pathPattern = '/packages/:packageId/members/'
  return await portalRequestVoid(generatePath(pathPattern, { packageId }), {
    method: 'POST',
    body: JSON.stringify(value),
  }, {
    customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
  })
}

function toAddPackageMemberDto({ emails, roleKeys }: AddPackageMemberProps): AddPackageMemberPropsDto {
  return {
    emails: emails,
    roleIds: roleKeys,
  }
}

function toChangePackageMemberDto(roleId: Key, action: ChangeRoleAction): ChangePackageMemberDto {
  return { roleId: roleId, action: action }
}
