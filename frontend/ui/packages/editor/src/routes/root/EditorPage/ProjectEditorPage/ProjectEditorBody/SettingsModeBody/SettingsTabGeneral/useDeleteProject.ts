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

import { useMutation } from '@tanstack/react-query'
import { useInvalidateProjects } from '../../../../../useProjects'
import { useNavigation } from '../../../../../../NavigationProvider'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { editorRequestVoid } from '@apihub/utils/requests'
import { useShowSuccessNotification } from '../../../../../BasePage/Notification'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'

export function useDeleteProject(): [DeleteProject, IsLoading] {
  const invalidateProjects = useInvalidateProjects()
  const showNotification = useShowSuccessNotification()
  const { navigateToEditor } = useNavigation()

  const { mutate, isLoading } = useMutation<void, Error, Key>({
    mutationFn: projectKey => deleteProject(projectKey),
    onSuccess: () => {
      navigateToEditor()
      showNotification({ message: 'Project has been deleted' })
      return invalidateProjects()
    },
  })

  return [mutate, isLoading]
}

async function deleteProject(
  projectKey: Key,
): Promise<void> {
  await editorRequestVoid(`/projects/${projectKey}`, {
    method: 'DELETE',
  })
}

type DeleteProject = (projectKey: Key) => void
