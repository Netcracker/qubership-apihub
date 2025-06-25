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
import type { User, UserDto } from '../../types/user'
import { toUser } from '../../types/user'
import type { IsLoading } from '../../utils/aliases'
import { API_V1, requestJson } from '../../utils/requests'

const QUERY_KEY_USER = 'user-query-key'

export function useUser(enabled: boolean = true): [User | undefined, IsLoading, Error | null] {
  const { data, isLoading, error } = useQuery<UserDto, Error, User>({
    queryKey: [QUERY_KEY_USER],
    queryFn: getUser,
    select: toUser,
    refetchOnWindowFocus: true,
    enabled: enabled,
  })

  return [data, isLoading, error]
}

async function getUser(): Promise<UserDto> {
  return requestJson<UserDto>(
    '/user',
    { method: 'GET' },
    { basePath: API_V1 },
  )
}
