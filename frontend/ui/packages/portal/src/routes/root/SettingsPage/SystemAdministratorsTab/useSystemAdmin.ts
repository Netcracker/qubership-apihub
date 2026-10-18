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
  AddSystemAdmin,
  SystemAdmin,
  SystemAdminDto,
  SystemAdmins,
  SystemAdminsDto,
} from '@netcracker/qubership-apihub-ui-shared/types/system-admins'
import type { InvalidateQuery, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { requestJson, requestVoid } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

const SYSTEM_ADMINISTRATORS_QUERY_KEY = 'system-administrators-query-key'

export function useSystemAdmins(): [SystemAdmins | null, IsLoading, Error | null] {
  const { data, isLoading, error } = useQuery<SystemAdminsDto, Error, SystemAdmins>({
    queryKey: [SYSTEM_ADMINISTRATORS_QUERY_KEY],
    queryFn: () => getSystemAdmins(),
    select: toSystemAdmins,
  })

  return [
    useMemo(() => data ?? null, [data]),
    isLoading,
    error,
  ]
}

export function useInvalidateSystemAdmins(): InvalidateQuery<void> {
  const client = useQueryClient()

  return () => client.invalidateQueries({
    queryKey: [SYSTEM_ADMINISTRATORS_QUERY_KEY],
    refetchType: 'all',
  })
}

export function useAddSystemAdmin(): [AddSystemAdminFn, IsLoading, Error | null] {
  const invalidateSystemAdmins = useInvalidateSystemAdmins()

  const { mutate, isLoading, error } = useMutation<SystemAdminsDto, Error, Key>({
    mutationFn: userId => addSystemAdmin(toAddSystemAdminDto(userId)),
    onSuccess: () => {
      invalidateSystemAdmins()
    },
  })

  return [mutate, isLoading, error]
}

export function useDeleteSystemAdmin(): [DeleteSystemAdminFn, IsLoading] {
  const invalidateSystemAdmins = useInvalidateSystemAdmins()

  const { mutate, isLoading } = useMutation<void, Error, Key>({
    mutationFn: userId => deleteSystemAdmin(userId),
    onSuccess: () => {
      invalidateSystemAdmins()
    },
  })

  return [mutate, isLoading]
}

export async function getSystemAdmins(): Promise<SystemAdminsDto> {
  return await requestJson<SystemAdminsDto>('/api/v2/admins', {
    method: 'GET',
  })
}

export async function addSystemAdmin(
  value: AddSystemAdmin,
): Promise<SystemAdminsDto> {
  return await requestJson<SystemAdminsDto>('/api/v2/admins', {
    method: 'POST',
    body: JSON.stringify(value),
  })
}

export async function deleteSystemAdmin(
  userKey: Key,
): Promise<void> {
  const userId = encodeURIComponent(userKey)

  return await requestVoid(`/api/v2/admins/${userId}`, {
    method: 'DELETE',
  })
}

export function toAddSystemAdminDto(userId: Key): AddSystemAdmin {
  return {
    userId: userId,
  }
}

export function toSystemAdmins(value: SystemAdminsDto): SystemAdmins {
  return value?.admins.map(admin => toSystemAdmin(admin))
}

export function toSystemAdmin(value: SystemAdminDto): SystemAdmin {
  return {
    key: value.id,
    name: value?.name,
    email: value?.email,
    avatarUrl: value?.avatarUrl,
  }
}

type AddSystemAdminFn = (userId: Key) => void
type DeleteSystemAdminFn = (userId: Key) => void
