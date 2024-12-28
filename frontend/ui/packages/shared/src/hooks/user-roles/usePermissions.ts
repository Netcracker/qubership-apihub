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

import { useQuery } from '@tanstack/react-query'
import type { IsLoading } from '../../utils/aliases'
import type { Permissions, PermissionsDto } from '../../types/permissions'
import { requestJson } from '../../utils/requests'

const PERMISSIONS_QUERY_KEY = 'permissions-query-key'

export function usePermissions(): [Permissions, IsLoading, Error | null] {
  const { data, isLoading, error } = useQuery<PermissionsDto, Error, Permissions>({
    queryKey: [PERMISSIONS_QUERY_KEY],
    queryFn: () => getPermissions(),
    select: (value: PermissionsDto) => value.permissions,
  })

  return [data ?? [], isLoading, error]
}

export async function getPermissions(): Promise<PermissionsDto> {
  return await requestJson<PermissionsDto>('/api/v2/permissions', {
    method: 'GET',
  })
}
