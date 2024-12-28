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
import { useBranchSearchParam } from '../../useBranchSearchParam'
import { useInvalidateBranches } from '../../useBranches'
import type { IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { useSetSearchParams } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSetSearchParams'
import { FILES_PROJECT_EDITOR_MODE } from '@apihub/entities/editor-modes'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { editorRequestVoid } from '@apihub/utils/requests'

export function useSaveChanges(): [SaveChanges, IsLoading, IsSuccess] {
  const { projectId } = useParams()
  const [selectedBranch] = useBranchSearchParam()
  const setSearchParams = useSetSearchParams()

  const invalidateBranches = useInvalidateBranches()

  const { mutateAsync, isLoading, isSuccess } = useMutation<void, Error, SaveChangesDetail>({
    mutationFn: detail => saveChanges(projectId!, selectedBranch!, detail),
    onSuccess: (_, { newBranchName }) => {
      newBranchName
        ? setSearchParams({ mode: FILES_PROJECT_EDITOR_MODE, change: '', branch: newBranchName }, { replace: true })
        : setSearchParams({ mode: FILES_PROJECT_EDITOR_MODE, change: '' }, { replace: true })

      return invalidateBranches()
    },
  })

  return [mutateAsync, isLoading, isSuccess]
}

async function saveChanges(
  projectKey: Key,
  branchName: string,
  detail: SaveChangesDetail,
): Promise<void> {
  const projectId = encodeURIComponent(projectKey)
  const branch = encodeURIComponent(branchName)

  const body = {
    comment: detail.message,
    branch: detail.newBranchName,
    createMergeRequest: detail.createMergeRequest,
  }
  await editorRequestVoid(`/projects/${projectId}/branches/${branch}/save`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export type SaveChanges = (detail: SaveChangesDetail) => Promise<unknown>

export type SaveChangesDetail = {
  message: string
  newBranchName?: string
  createMergeRequest?: boolean
}
