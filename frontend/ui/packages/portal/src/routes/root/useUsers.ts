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
import { portalRequestJson } from '@apihub/utils/requests'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { Users, UsersDto } from '@netcracker/qubership-apihub-ui-shared/types/user'
import { toUsers } from '@netcracker/qubership-apihub-ui-shared/types/user'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'

const USERS_QUERY_KEY = 'users-query-key'

export function useUsers(searchValue: string, packageKey?: Key, limit?: number, page?: number): [Users | null, IsLoading, Error | null] {
  const { data, isLoading, error } = useQuery<UsersDto, Error, Users>({
    queryKey: [USERS_QUERY_KEY, packageKey, searchValue],
    queryFn: () => getUsersByFilter(searchValue, limit, page),
    select: toUsers,
  })

  return [data ?? null, isLoading, error]
}

export async function getUsersByFilter(
  searchValue: string,
  limit: number = 10,
  page: number = 0,
): Promise<UsersDto> {
  const searchParams = optionalSearchParams({
    filter: { value: searchValue },
    limit: { value: limit },
    page: { value: page },
  })

  return await portalRequestJson<UsersDto>(`/users?${searchParams}`, {
    method: 'GET',
  })
}
