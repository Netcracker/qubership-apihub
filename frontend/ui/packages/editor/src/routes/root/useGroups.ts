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

import { useShowSuccessNotification } from './BasePage/Notification'
import type { Group, GroupDto, Groups, GroupsDto } from '@apihub/entities/groups'
import { toGroupDto } from '@apihub/entities/groups'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { InvalidateQuery, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { editorRequestJson, editorRequestVoid } from '@apihub/utils/requests'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'

const GROUPS_QUERY_KEY = 'groups-query-key'

export function useChildGroups(
  groupKey: Key = ROOT_GROUP_KEY,
  enabled = true,
): Groups {
  const { data } = useQuery<GroupsDto, Error, Groups>({
    queryKey: [GROUPS_QUERY_KEY, groupKey],
    queryFn: () => getNotEmptyGroups(1, groupKey),
    enabled: enabled,
    select: toGroups,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  })

  return data ?? []
}

export function useCreateGroup(): [CreateGroup, IsLoading, Error | null] {
  const client = useQueryClient()
  const showNotification = useShowSuccessNotification()

  const { mutate, isLoading, error } = useMutation<void, Error, Group>({
    mutationFn: group => createGroup(group),
    onSuccess: () => {
      showNotification({ message: 'Group has been created' })
      return client.invalidateQueries([GROUPS_QUERY_KEY])
    },
  })

  return [mutate, isLoading, error]
}

export function useInvalidateGroups(): InvalidateQuery<void> {
  const client = useQueryClient()
  return () => {
    client.invalidateQueries([GROUPS_QUERY_KEY]).then()
  }
}

async function createGroup(
  group: Group,
): Promise<void> {
  await editorRequestVoid('/groups', {
    method: 'POST',
    body: JSON.stringify(toGroupDto(group)),
  })
}

type CreateGroup = (group: Group) => void

const ROOT_GROUP_KEY = ''

async function getNotEmptyGroups(
  depth = 0,
  groupKey: Key = ROOT_GROUP_KEY,
): Promise<GroupsDto> {
  const searchParams = optionalSearchParams({
    depth: { value: depth },
    groupId: { value: groupKey },
  })
  return await editorRequestJson<GroupsDto>(`/groups?${searchParams}`, {
    method: 'GET',
  })
}

function toGroups(value: GroupsDto): Groups {
  return value.groups.map(group => ({
    ...toGroup(group),
    path: calculateGroupPath(value, group.groupId),
  }))
}

export function toGroup(value: GroupDto): Group {
  return {
    key: value.groupId,
    alias: value.alias,
    name: value.name,
    parentKey: value.parentId,
    description: value.description,
    favorite: value.isFavorite,
    lastVersion: value.lastVersion,
    path: '',
  }
}

function calculateGroupPath(
  { groups }: GroupsDto,
  groupId: string,
): string {
  const findName = (id: string): string => {
    const [currentGroup] = groups.filter(({ groupId }) => groupId === id)
    let value = ''
    groups.forEach(({ parentId }) => {
      if (currentGroup?.parentId && parentId === currentGroup.parentId) {
        value = findName(currentGroup.parentId)
      }
    })
    return `${value}${value ? ' / ' : ''}${currentGroup?.name}`
  }
  return findName(groupId)
}
