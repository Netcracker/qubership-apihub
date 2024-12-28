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
import type { Key } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useEventBus } from '../../../../../EventBusProvider'
import { useShowSuccessNotification } from '../../../../BasePage/Notification'
import { useInvalidateBranches } from '../../../../useBranches'
import { FILES_PROJECT_EDITOR_MODE } from '@apihub/entities/editor-modes'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { editorRequestVoid } from '@apihub/utils/requests'

export function useCreateBranch(): [CreateBranch, IsLoading] {
  const { projectId } = useParams()
  const navigate = useNavigate()

  const invalidateBranches = useInvalidateBranches()
  const showNotification = useShowSuccessNotification()

  const { showPublishProjectVersionDialog } = useEventBus()

  const { mutate, isLoading } = useMutation<void, Error, Options>({
    mutationFn: ({ currentBranchName, newBranchName }) => createBranch(projectId!, currentBranchName!, newBranchName),
    onSuccess: (_, { newBranchName, withPublish }) => {
      navigate({
        search: `branch=${encodeURIComponent(newBranchName)}&mode=${FILES_PROJECT_EDITOR_MODE}`,
      }, { replace: true })
      showNotification({ message: `Branch "${newBranchName}" has been created` })
      if (withPublish) {
        setTimeout(() => showPublishProjectVersionDialog({ version: newBranchName }), 50)
      }
      return invalidateBranches()
    },
  })

  return [mutate, isLoading]
}

async function createBranch(
  projectKey: Key,
  branchName: string,
  newBranchName: string,
): Promise<void> {
  const projectId = encodeURIComponent(projectKey)
  const branch = encodeURIComponent(branchName)

  await editorRequestVoid(`/projects/${projectId}/branches/${branch}/clone`, {
    method: 'POST',
    body: JSON.stringify({ branch: newBranchName }),
  })
}

type CreateBranch = (options: Options) => void
type Options = {
  currentBranchName: string
  newBranchName: string
  withPublish: boolean
}
