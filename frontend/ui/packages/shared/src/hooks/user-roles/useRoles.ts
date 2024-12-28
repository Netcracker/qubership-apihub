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
import { useMemo } from 'react'
import type {
  CreateRoleDto,
  Role,
  RoleDto,
  Roles,
  RolesDto,
  RolesOrder,
  RolesOrderDto,
  UpdateRoleDto,
} from '../../types/roles'
import type { Key } from '../../entities/keys'
import type { InvalidateQuery, IsLoading, IsSuccess } from '../../utils/aliases'
import { requestJson, requestVoid } from '../../utils/requests'

export const ROLES_QUERY_KEY = 'roles-query-key'

export function toRoles(value: RolesDto): Roles {
  return value?.roles.map(role => toRole(role))
}

export function toRole(value: RoleDto): Role {
  return {
    key: value.roleId,
    role: value?.role,
    readOnly: value?.readOnly,
    permissions: value?.permissions,
  }
}

export function toCreateRoleDto(value: Role): CreateRoleDto {
  return {
    role: value.role,
    permissions: value.permissions,
  }
}

export function toUpdateRoleDto(value: Role): UpdateRoleDto {
  return {
    permissions: value.permissions,
  }
}

export function toRolesOrder(value: Roles): RolesOrder {
  return value.map(role => role.key)
}

export function toRolesOrderDto(value: RolesOrder): RolesOrderDto {
  return {
    roles: value,
  }
}

type CreateRole = (role: Role) => void
type UpdateRole = (role: Role) => void
type UpdateRoleOrder = (roleOrder: RolesOrder) => void
type DeleteRole = (role: Role) => void
type OnSuccess = (roleKey: Key) => void
type OnError = (error: Error) => void

type RolesQueryState = {
  data: Roles
  isLoading: IsLoading
  error: Error | null
}

export function useRoles(): RolesQueryState {
  const { data, isLoading, error } = useQuery<RolesDto, Error, Roles>({
    queryKey: [ROLES_QUERY_KEY],
    queryFn: () => getRoles(),
    select: toRoles,
  })

  const result = useMemo(() => {
    return data ?? []
  }, [data])

  return {
    data: result,
    isLoading: isLoading,
    error: error,
  }
}

export function useInvalidateRoles(): InvalidateQuery<void> {
  const client = useQueryClient()

  return () => client.invalidateQueries({
    queryKey: [ROLES_QUERY_KEY],
    refetchType: 'all',
  })
}

export function useCreateRole(onError: OnError, onSuccess: OnSuccess): [CreateRole, IsLoading, IsSuccess, Error | null] {
  const invalidateRoles = useInvalidateRoles()
  const { mutate, isLoading, isSuccess, error } = useMutation<CreateRoleDto, Error, Role>({
    mutationFn: value => createRole(toCreateRoleDto(value)),
    onSuccess: ({ role }) => {
      invalidateRoles()
      onSuccess(role)
    },
    onError: onError,
  })

  return [mutate, isLoading, isSuccess, error]
}

export function useUpdateRole(onError: OnError, onSuccess: OnSuccess): [UpdateRole, IsLoading, IsSuccess, Error | null] {
  const invalidateRoles = useInvalidateRoles()

  const { mutate, isLoading, isSuccess, error } = useMutation<void, Error, Role>({
    mutationFn: role => updateRole(role.key, toUpdateRoleDto(role)),
    onSuccess: (_, { role }) => {
      invalidateRoles()
      onSuccess(role)
    },
    onError: onError,
  })

  return [mutate, isLoading, isSuccess, error]
}

export function useUpdateRolesOrder(): [UpdateRoleOrder, IsLoading, IsSuccess, Error | null] {
  const invalidateRoles = useInvalidateRoles()

  const { mutate, isLoading, isSuccess, error } = useMutation<void, Error, RolesOrder>({
    mutationFn: rolesOrder => updateRoleOrder(toRolesOrderDto(rolesOrder)),
    onSuccess: () => {
      invalidateRoles()
    },
  })
  return [mutate, isLoading, isSuccess, error]
}

export function useDeleteRole(onError: OnError, onSuccess: OnSuccess): [DeleteRole, IsLoading, IsSuccess] {
  const invalidateRoles = useInvalidateRoles()

  const { mutate, isLoading, isSuccess } = useMutation<void, Error, Role>({
    mutationFn: role => deleteRole(role.key),
    onSuccess: (_, { role }) => {
      invalidateRoles()
      onSuccess(role)
    },
    onError: onError,
  })

  return [mutate, isLoading, isSuccess]
}

export async function getRoles(): Promise<RolesDto> {
  return await requestJson<RolesDto>('/api/v2/roles', {
    method: 'GET',
  })
}

export async function createRole(
  value: CreateRoleDto,
): Promise<RoleDto> {
  return await requestJson<RoleDto>('/api/v2/roles', {
    method: 'POST',
    body: JSON.stringify(value),
  })
}

export async function updateRole(
  roleKey: Key,
  value: UpdateRoleDto,
): Promise<void> {
  return await requestVoid(`/api/v2/roles/${roleKey}`, {
    method: 'PATCH',
    body: JSON.stringify(value),
  })
}

export async function updateRoleOrder(
  value: RolesOrderDto,
): Promise<void> {
  await requestVoid('/api/v2/roles/changeOrder', {
    method: 'POST',
    body: JSON.stringify(value),
  })
}

export async function deleteRole(
  roleKey: Key,
): Promise<void> {
  return await requestVoid(`/api/v2/roles/${roleKey}`, {
    method: 'DELETE',
  })
}
