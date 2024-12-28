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
import { toProject } from './useProject'
import type { Projects, ProjectsDto } from '@apihub/entities/projects'
import type { InvalidateQuery, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { editorRequestJson } from '@apihub/utils/requests'

const PROJECTS_QUERY_KEY = 'projects-query-key'

export function useProjects(
  textFilter: string | null = null,
  onlyFavorite: boolean = false,
): [Projects, IsLoading] {
  const onlyPublished = false

  const { data, isLoading } = useQuery<ProjectsDto, Error, Projects>({
    queryKey: [PROJECTS_QUERY_KEY, onlyPublished, onlyFavorite, textFilter],
    queryFn: () => getProjects(onlyPublished, null, onlyFavorite, textFilter),
    select: toProjects,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  })

  return [data ?? [], isLoading]
}

export function useInvalidateProjects(): InvalidateQuery<void> {
  const client = useQueryClient()
  return () => {
    client.invalidateQueries([PROJECTS_QUERY_KEY]).then()
  }
}

export function useProjectsByGroup(
  groupKey: Key,
  enabled = true,
): Projects {
  const onlyPublished = false

  const { data } = useQuery<ProjectsDto, Error, Projects>({
    queryKey: [PROJECTS_QUERY_KEY, onlyPublished, groupKey],
    queryFn: () => getProjects(onlyPublished, groupKey),
    enabled: enabled,
    select: toProjects,
  })

  return data ?? []
}

async function getProjects(
  onlyPublished = false,
  groupKey: Key | null = null,
  onlyFavorite = false,
  textFilter: string | null = null,
): Promise<ProjectsDto> {
  const searchParams = optionalSearchParams({
    groupId: { value: groupKey },
    onlyFavorite: { value: onlyFavorite },
    onlyPublished: { value: onlyPublished },
    textFilter: { value: textFilter },
  })
  return await editorRequestJson<ProjectsDto>(`/projects?${searchParams}`, {
    method: 'GET',
  })
}

export function toProjects({ projects }: ProjectsDto): Projects {
  return projects.map(toProject)
}
