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

import { useMemo } from 'react'
import { useBranchConfig } from './useBranchConfig'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { NONE_CHANGE_TYPE } from '@apihub/entities/branches'
import type { BranchFilesContent } from '@apihub/entities/ws-branch-events'

export function useBranchChanges(): [BranchChanges, IsLoading] {
  const [branchConfig, isBranchConfigLoading] = useBranchConfig()

  const changes = useMemo(
    () => branchConfig?.files
      .filter(({ changeType, movedFrom }) => changeType && changeType !== NONE_CHANGE_TYPE || movedFrom)
      .map(({ changeType, blobKey, conflictedBlobKey, key, labels, movedFrom, publish, status }) => ({
        fileId: key,
        publish: publish,
        labels: labels,
        status: status,
        blobId: blobKey,
        changeType: changeType,
        movedFrom: movedFrom,
        conflictedBlobId: conflictedBlobKey,
      })) ?? [],
    [branchConfig?.files],
  )

  return [
    changes,
    isBranchConfigLoading,
  ]
}

type BranchChanges = BranchFilesContent[]

export function useBranchChangeCount(): number {
  const [branchChanges] = useBranchChanges()
  const [branchConfig] = useBranchConfig()

  return branchConfig?.changeType !== NONE_CHANGE_TYPE
    ? branchChanges.length + 1
    : branchChanges.length
}
