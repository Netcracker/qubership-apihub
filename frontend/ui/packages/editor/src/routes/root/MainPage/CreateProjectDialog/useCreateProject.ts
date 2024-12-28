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

import { useShowSuccessNotification } from '../../BasePage/Notification'
import { useMutation } from '@tanstack/react-query'
import { useInvalidateProjects } from '../../useProjects'
import { toProject, useUpdateProject } from '../../useProject'
import { useNavigation } from '../../../NavigationProvider'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type { Project, ProjectDto } from '@apihub/entities/projects'
import { toProjectDto } from '@apihub/entities/projects'
import { BRANCH_SEARCH_PARAM, MODE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { FILES_PROJECT_EDITOR_MODE } from '@apihub/entities/editor-modes'
import { editorRequestJson } from '@apihub/utils/requests'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

export function useCreateProject(): [CreateProject, IsLoading, Error | null] {
  const invalidateProjects = useInvalidateProjects()
  const showNotification = useShowSuccessNotification()

  const [updateProject] = useUpdateProject()
  const { navigateToProject } = useNavigation()

  const { mutate, isLoading, error } = useMutation<Project, Error, CreateProjectOptions>({
    mutationFn: ({ project }) => createProject(project),
    onSuccess: (data, { packageKey }) => {
      showNotification({ message: 'Project has been created' })
      if (packageKey) {
        updateProject({ project: { ...data, packageKey }, withNotification: false })
      }
      navigateToProject({
        projectKey: data.key,
        search: {
          [BRANCH_SEARCH_PARAM]: { value: data.integration?.defaultBranch },
          [MODE_SEARCH_PARAM]: { value: FILES_PROJECT_EDITOR_MODE },
        },
      })
      return invalidateProjects()
    },
  })

  return [mutate, isLoading, error]
}

async function createProject(
  project: Project,
): Promise<Project> {
  const data = await editorRequestJson<ProjectDto>('/projects', {
    method: 'POST',
    body: JSON.stringify(toProjectDto(project)),
  })
  return toProject(data)
}

type CreateProject = (options: CreateProjectOptions) => void
type CreateProjectOptions = {
  project: Project
  packageKey?: Key
}
