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
import type { Key, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { GroupVersionContent, GroupVersionContentDto } from '@apihub/entities/version-contents'
import type { InvalidateQuery, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { editorRequestJson } from '@apihub/utils/requests'
import { toPublishedSpec } from '@apihub/entities/published-specs'
import { toRef } from '@apihub/entities/refs'
import { alphabeticallyBy } from '@netcracker/qubership-apihub-ui-shared/utils/comparers'

const GROUP_VERSION_CONTENT_QUERY_KEY = 'group-version-content-query-key'

export function useGroupVersionContent(options?: {
  groupKey?: Key
  versionKey?: VersionKey
  dependFiles?: boolean
  importFiles?: boolean
}): [GroupVersionContent | null, IsLoading] {
  const { groupId } = useParams()
  const groupKey = options?.groupKey ?? groupId
  const versionKey = options?.versionKey
  const dependFiles = options?.dependFiles ?? false
  const importFiles = options?.importFiles ?? false

  const { data, isLoading } = useQuery<GroupVersionContentDto, Error, GroupVersionContent>({
    queryKey: [GROUP_VERSION_CONTENT_QUERY_KEY, groupKey, versionKey],
    queryFn: () => getGroupVersionContent(groupKey!, versionKey!, dependFiles, importFiles),
    enabled: !!groupKey && !!versionKey,
    select: toGroupVersionContent,
  })

  return [data ?? null, isLoading]
}

export function useInvalidateGroupVersionContent(): InvalidateQuery<void> {
  const client = useQueryClient()
  return () => {
    client.invalidateQueries([GROUP_VERSION_CONTENT_QUERY_KEY]).then()
  }
}

export async function getGroupVersionContent(
  groupKey: Key,
  versionKey: Key,
  dependFiles: boolean = false,
  importFiles: boolean = false,
): Promise<GroupVersionContentDto> {
  const groupId = encodeURIComponent(groupKey)
  const versionId = encodeURIComponent(versionKey)

  const searchParams = optionalSearchParams({
    dependFiles: { value: dependFiles },
    importFiles: { value: importFiles },
  })
  return await editorRequestJson<GroupVersionContentDto>(`/projects/${groupId}/versions/${versionId}?${searchParams}`, {
    method: 'GET',
  })
}

function toGroupVersionContent(value: GroupVersionContentDto): GroupVersionContent {
  return {
    key: crypto.randomUUID(),
    status: value.status,
    publishedAt: new Date(value.publishedAt).toDateString(),
    specs: value.files.map(toPublishedSpec).sort((it, that) => alphabeticallyBy('title', it, that)),
    refs: value.refs.map(toRef),
  }
}
