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

import { useBranchConfig } from './useBranchConfig'
import { useChangeSearchParam } from '../../useChangeSearchParam'
import { useMemo } from 'react'
import { useBranchChanges } from './useBranchChanges'
import { getFileName, getFilePath } from '@netcracker/qubership-apihub-ui-shared/utils/files'

export function useSelectedChange(): Change | undefined {
  const [selectedChangeKey] = useChangeSearchParam()

  const [branchConfig] = useBranchConfig()
  const [changes] = useBranchChanges()

  return useMemo(
    () => {
      if (branchConfig && branchConfig.key === selectedChangeKey) {
        return {
          name: getFileName(branchConfig.key),
          path: getFilePath(branchConfig.key),
        }
      }
      const change = changes.find(change => change.fileId === selectedChangeKey)
      if (change) {
        return {
          name: getFileName(change.fileId),
          path: change.fileId,
          oldPath: change.movedFrom,
        }
      }
      return undefined
    },
    [branchConfig, changes, selectedChangeKey],
  )
}

export type Change = {
  name: string
  path: string
  oldPath?: string
}

export function useConfigChangeSelected(): boolean {
  const [selectedChangeKey] = useChangeSearchParam()
  const [branchConfig] = useBranchConfig()
  return selectedChangeKey === branchConfig?.key
}

