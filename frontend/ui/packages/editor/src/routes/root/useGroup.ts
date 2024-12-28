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

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { toGroup } from './useGroups'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { Group, GroupDto } from '@apihub/entities/groups'
import type { InvalidateQuery, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { editorRequestJson } from '@apihub/utils/requests'

const GROUP_QUERY_KEY = 'group-query-key'

export function useGroup(groupKey?: Key): [Group | null, IsLoading] {
  const { groupId } = useParams()
  const key = groupKey ?? groupId

  const { data, isLoading } = useQuery<GroupDto, Error, Group>({
    queryKey: [GROUP_QUERY_KEY, key],
    queryFn: () => getGroup(key!),
    enabled: !!key,
    select: toGroup,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  })

  return [data ?? null, isLoading]
}

export function useInvalidateGroup(): InvalidateQuery<void> {
  const { groupId } = useParams()
  const client = useQueryClient()
  return () => {
    client.invalidateQueries([GROUP_QUERY_KEY, groupId]).then()
  }
}

export async function getGroup(
  groupKey: Key,
): Promise<GroupDto> {
  const groupId = encodeURIComponent(groupKey)

  return await editorRequestJson<GroupDto>(`/groups/${groupId}`, {
    method: 'GET',
  })
}
