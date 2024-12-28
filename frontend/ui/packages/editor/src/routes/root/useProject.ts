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
import { useParams } from 'react-router-dom'
import { toGroup } from './useGroups'
import { useShowSuccessNotification } from './BasePage/Notification'
import { useInvalidateBranches } from './useBranches'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { Project, ProjectDto } from '@apihub/entities/projects'
import { toProjectDto } from '@apihub/entities/projects'
import type { InvalidateQuery, IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { useSetSearchParams } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSetSearchParams'
import { FILES_PROJECT_EDITOR_MODE } from '@apihub/entities/editor-modes'
import { editorRequestJson, editorRequestVoid } from '@apihub/utils/requests'

const PROJECT_QUERY_KEY = 'project-query-key'

export function useProject(projectKey?: Key): [Project | null, IsLoading] {
  const { projectId } = useParams()
  const key = projectKey ?? projectId

  const { data, isLoading } = useQuery<ProjectDto, Error, Project>({
    queryKey: [PROJECT_QUERY_KEY, key],
    queryFn: () => getProject(key!),
    enabled: !!key,
    select: toProject,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  })

  return [data ?? null, isLoading]
}

export function useInvalidateProject(): InvalidateQuery<void> {
  const { projectId } = useParams()
  const client = useQueryClient()
  return () => {
    client.invalidateQueries([PROJECT_QUERY_KEY, projectId]).then()
  }
}

export function useUpdateProject(): [UpdateProject, IsLoading, IsSuccess] {
  const client = useQueryClient()
  const showNotification = useShowSuccessNotification()
  const setSearchParams = useSetSearchParams()
  const invalidateBranches = useInvalidateBranches()

  const { mutate, isLoading, isSuccess } = useMutation<void, Error, UpdateProjectOptions>({
    mutationFn: ({ project }) => updateProject(project),
    onSuccess: (_, { project, withNotification }) => {
      if (withNotification) {
        setSearchParams({
          mode: FILES_PROJECT_EDITOR_MODE,
          change: '',
          branch: project?.integration?.defaultBranch ?? '',
        }, { replace: true })
        showNotification({ message: 'Project has been updated' })
      }
      invalidateBranches()
      return client.invalidateQueries({
        predicate: ({ queryKey: [prefix, suffix] }) => prefix === PROJECT_QUERY_KEY && suffix === project.key,
      })
    },
  })

  return [mutate, isLoading, isSuccess]
}

type UpdateProject = (options: UpdateProjectOptions) => void
type UpdateProjectOptions = {
  project: Project
  withNotification?: boolean
}

export async function getProject(
  projectKey: Key,
): Promise<ProjectDto> {
  const projectId = encodeURIComponent(projectKey)

  return await editorRequestJson<ProjectDto>(`/projects/${projectId}`, {
    method: 'GET',
  })
}

async function updateProject(
  project: Project,
): Promise<void> {
  await editorRequestVoid(`/projects/${project.key}`, {
    method: 'PUT',
    body: JSON.stringify(toProjectDto(project)),
  })
}

export function toProject(value: ProjectDto): Project {
  return {
    key: value.projectId,
    groupKey: value.groupId,
    // TODO: Remove `?` when backend will be updated
    groups: value.groups?.map(toGroup),
    name: value.name,
    alias: value.alias,
    favorite: value.isFavorite,
    packageKey: value.packageId,
    lastVersion: value.lastVersion,
    integration: value.integration && {
      type: value.integration.type,
      repositoryKey: value.integration.repositoryId,
      repositoryName: value.integration.repositoryName,
      repositoryUrl: value.integration.repositoryUrl,
      defaultBranch: value.integration.defaultBranch,
      defaultFolder: value.integration.defaultFolder,
    },
    description: value.description,
  }
}
