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

import { useParams } from 'react-router-dom'

import { useMutation } from '@tanstack/react-query'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { useBranchSearchParam } from '../../../../../useBranchSearchParam'
import { useShowSuccessNotification } from '../../../../../BasePage/Notification'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { editorRequestVoid } from '@apihub/utils/requests'

export function useDeleteProjectContent(): [DeleteProjectContent, IsLoading] {
  const { projectId } = useParams()
  const [selectedBranch] = useBranchSearchParam()

  const showNotification = useShowSuccessNotification()

  const { mutate, isLoading } = useMutation<void, Error, DeleteContentInfo>({
    mutationFn: ({ key, deleteFromGit }) => deleteProjectContent(projectId!, selectedBranch!, key, deleteFromGit),
    onSuccess: () => {
      showNotification({ message: 'File has been deleted' })
    },
  })

  return [mutate, isLoading]
}

async function deleteProjectContent(
  projectKey: string,
  branchName: string,
  key: Key,
  deleteFromGit: boolean,
): Promise<void> {
  const projectId = encodeURIComponent(projectKey)
  const branch = encodeURIComponent(branchName)
  const fileId = encodeURIComponent(key)

  const searchParams = optionalSearchParams({
    delete: { value: deleteFromGit },
  })
  await editorRequestVoid(`/projects/${projectId}/branches/${branch}/files/${fileId}?${searchParams}`, {
    method: 'DELETE',
  })
}

type DeleteProjectContent = (data: DeleteContentInfo) => void

type DeleteContentInfo = {
  key: Key
  deleteFromGit: boolean
}
