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
import { useBranchSearchParam } from '../../../../useBranchSearchParam'
import { useChangeSearchParam } from '../../../../useChangeSearchParam'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { useShowSuccessNotification } from '../../../../BasePage/Notification'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { editorRequestVoid } from '@apihub/utils/requests'

export function useResetFile(): [ResetFile, IsLoading] {
  const { projectId } = useParams()
  const [selectedBranch] = useBranchSearchParam()
  const [, setChange] = useChangeSearchParam()

  const showNotification = useShowSuccessNotification()

  const { mutate, isLoading } = useMutation<void, Error, Key>({
    mutationFn: fileKey => resetFile(projectId!, selectedBranch!, fileKey),
    onSuccess: () => {
      setChange(undefined)
      showNotification({ message: 'File has been reset' })
    },
  })

  return [mutate, isLoading]
}

async function resetFile(
  projectKey: Key,
  branchName: string,
  fileKey: Key,
): Promise<void> {
  const projectId = encodeURIComponent(projectKey)
  const branch = encodeURIComponent(branchName)
  const fileId = encodeURIComponent(fileKey)

  await editorRequestVoid(`/projects/${projectId}/branches/${branch}/files/${fileId}/reset`, {
    method: 'POST',
  })
}

type ResetFile = (fileKey: Key) => void
