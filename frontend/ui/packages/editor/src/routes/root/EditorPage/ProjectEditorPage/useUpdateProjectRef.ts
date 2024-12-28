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
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { editorRequestVoid } from '@apihub/utils/requests'
import type { ChangeStatus } from '@netcracker/qubership-apihub-ui-shared/entities/change-statuses'

export function useUpdateProjectRef(): [UpdateProjectRef, IsLoading] {
  const { projectId } = useParams()
  const [selectedBranch] = useBranchSearchParam()

  const { mutate, isLoading } = useMutation<void, Error, RefData>({
    mutationFn: ref => updateProjectRef(projectId!, selectedBranch!, ref),
  })

  return [mutate, isLoading]
}

async function updateProjectRef(
  projectKey: Key,
  branchName: string,
  refData: RefData,
): Promise<void> {
  const projectId = encodeURIComponent(projectKey)
  const branch = encodeURIComponent(branchName)

  await editorRequestVoid(`/projects/${projectId}/branches/${branch}/refs`, {
    method: 'PATCH',
    body: JSON.stringify(refData),
  })
}

type UpdateProjectRef = (ref: RefData) => void

type RefData = {
  refId: Key
  version: string
  status: ChangeStatus
  data?: {
    refId: Key
    version: string
  }
}
