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
import { useParams } from 'react-router-dom'
import type { Key, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { ProjectVersionContent, ProjectVersionContentDto } from '@apihub/entities/version-contents'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { editorRequestJson } from '@apihub/utils/requests'
import { toPublishedSpec } from '@apihub/entities/published-specs'
import { alphabeticallyBy } from '@netcracker/qubership-apihub-ui-shared/utils/comparers'
import { toRef } from '@apihub/entities/refs'

const PROJECT_VERSION_CONTENT_QUERY_KEY = 'project-version-content'

// TODO: Remove
export function useProjectVersionContent(options?: {
  projectKey?: Key
  versionKey?: VersionKey
  dependFiles?: boolean
  importFiles?: boolean
}): [ProjectVersionContent | null, IsLoading] {
  const { projectId } = useParams()
  const projectKey = options?.projectKey ?? projectId
  const versionKey = options?.versionKey
  const dependFiles = options?.dependFiles ?? false
  const importFiles = options?.importFiles ?? false

  const { data, isLoading } = useQuery<ProjectVersionContentDto, Error, ProjectVersionContent>({
    queryKey: [PROJECT_VERSION_CONTENT_QUERY_KEY, projectKey, versionKey],
    queryFn: () => getProjectVersionContent(projectKey!, versionKey!, dependFiles, importFiles),
    enabled: !!projectKey && !!versionKey,
    select: toProjectVersionContent,
  })

  return [data ?? null, isLoading]
}

export async function getProjectVersionContent(
  projectKey: Key,
  versionKey: Key,
  dependFiles: boolean = false,
  importFiles: boolean = false,
): Promise<ProjectVersionContentDto> {
  const projectId = encodeURIComponent(projectKey)
  const versionId = encodeURIComponent(versionKey)

  const searchParams = optionalSearchParams({
    dependFiles: { value: dependFiles },
    importFiles: { value: importFiles },
  })
  return await editorRequestJson<ProjectVersionContentDto>(`/projects/${projectId}/versions/${versionId}?${searchParams}`, {
    method: 'GET',
  })
}

function toProjectVersionContent(value: ProjectVersionContentDto): ProjectVersionContent {
  return {
    key: crypto.randomUUID(),
    status: value.status,
    publishedAt: new Date(value.publishedAt).toDateString(),
    specs: value.files.map(toPublishedSpec).sort((it, that) => alphabeticallyBy('title', it, that)),
    refs: value.refs.map(toRef),
    versionLabels: [],
    previousVersion: '',
    previousVersionPackageId: '',
    publishedBy: '',
  }
}
