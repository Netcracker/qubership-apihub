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
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { useSetSearchParams } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSetSearchParams'
import { useShowSuccessNotification } from '../../../../BasePage/Notification'
import { FILES_PROJECT_EDITOR_MODE } from '@apihub/entities/editor-modes'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { editorRequestVoid } from '@apihub/utils/requests'

export function useResetBranch(): [ResetBranch, IsLoading] {
  const { projectId } = useParams()
  const [selectedBranch] = useBranchSearchParam()
  const setSearchParams = useSetSearchParams()

  const showNotification = useShowSuccessNotification()

  const { mutate, isLoading } = useMutation<void, Error>({
    mutationFn: () => resetBranch(projectId!, selectedBranch!),
    onSuccess: () => {
      setSearchParams({ mode: FILES_PROJECT_EDITOR_MODE, change: '', file: '' }, { replace: true })
      showNotification({ message: 'Branch has been reset' })
    },
  })

  return [mutate, isLoading]
}

async function resetBranch(
  projectKey: Key,
  branchName: string,
): Promise<void> {
  const projectId = encodeURIComponent(projectKey)
  const branch = encodeURIComponent(branchName)

  await editorRequestVoid(`/projects/${projectId}/branches/${branch}/reset`, {
    method: 'POST',
  })
}

type ResetBranch = () => void
