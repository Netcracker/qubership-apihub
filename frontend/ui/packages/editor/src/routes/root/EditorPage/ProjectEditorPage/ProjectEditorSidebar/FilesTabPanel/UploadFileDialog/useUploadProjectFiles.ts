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
import { useBranchSearchParam } from '../../../../../useBranchSearchParam'
import { useMutation } from '@tanstack/react-query'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { useSetSearchParams } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSetSearchParams'
import { useShowSuccessNotification } from '../../../../../BasePage/Notification'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { editorRequestJson } from '@apihub/utils/requests'

export function useUploadProjectFiles(): [UploadProjectFiles, IsLoading] {
  const { projectId } = useParams()
  const [selectedBranch] = useBranchSearchParam()
  const setSearchParams = useSetSearchParams()

  const showNotification = useShowSuccessNotification()

  const { mutate, isLoading } = useMutation<Key[], Error, UploadProjectFilesInfo>({
    mutationFn: ({ files, path }) => uploadProjectFiles(projectId!, selectedBranch!, files, path),
    onSuccess: fileIds => {
      showNotification({ message: 'Project has been updated' })
      setSearchParams({ file: fileIds[0] })
    },
  })

  return [mutate, isLoading]
}

export async function uploadProjectFiles(
  projectKey: Key,
  branchName: string,
  files: File[],
  path: string,
): Promise<Key[]> {
  const projectId = encodeURIComponent(projectKey)
  const branch = encodeURIComponent(branchName)

  const formData = new FormData()
  formData.set('path', path)

  let index = 0
  for (const file of files) {
    formData.set(index.toString(), file)
    index++
  }

  const { fileIds } = await editorRequestJson<{
    fileIds: Key[]
  }>(`/projects/${projectId}/branches/${branch}/upload`, {
    method: 'POST',
    body: formData,
  })
  return fileIds
}

type UploadProjectFiles = (data: UploadProjectFilesInfo) => void

type UploadProjectFilesInfo = {
  files: File[]
  path: string
}
