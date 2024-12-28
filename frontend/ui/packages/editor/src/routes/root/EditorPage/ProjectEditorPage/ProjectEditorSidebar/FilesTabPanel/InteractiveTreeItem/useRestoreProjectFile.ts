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

import { useParams } from 'react-router-dom'
import { useBranchSearchParam } from '../../../../../useBranchSearchParam'
import { useShowSuccessNotification } from '../../../../../BasePage/Notification'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { editorRequestVoid } from '@apihub/utils/requests'

export function useRestoreProjectFile(): [RestoreProjectFile, IsLoading] {
  const { projectId } = useParams()
  const [selectedBranch] = useBranchSearchParam()

  const showNotification = useShowSuccessNotification()

  const { mutate, isLoading } = useMutation<void, Error, Key>({
    mutationFn: fileId => restoreProjectFile(projectId!, selectedBranch!, fileId),
    onSuccess: () => {
      showNotification({ message: 'File has been restored' })
    },
  })

  return [mutate, isLoading]
}

async function restoreProjectFile(
  projectKey: string,
  branchName: string,
  fileKey: Key,
): Promise<void> {
  const projectId = encodeURIComponent(projectKey)
  const branch = encodeURIComponent(branchName)
  const fileId = encodeURIComponent(fileKey)

  await editorRequestVoid(`/projects/${projectId}/branches/${branch}/files/${fileId}/restore`, {
    method: 'POST',
  })
}

type RestoreProjectFile = (fileKey: Key) => void
