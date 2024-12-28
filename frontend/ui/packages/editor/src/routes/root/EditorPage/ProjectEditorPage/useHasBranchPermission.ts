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
import { useMemo } from 'react'
import type { BranchPermission } from '@apihub/entities/branches'
import {
  ALL_BRANCH_PERMISSION_TYPE,
  EDIT_BRANCH_PERMISSION_TYPE,
  PUBLISH_BRANCH_PERMISSION_TYPE,
  SAVE_BRANCH_PERMISSION_TYPE,
} from '@apihub/entities/branches'
import { isEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'

function useHasBranchPermission(permission: BranchPermission): boolean {
  const [branchConfig] = useBranchConfig()

  const hasBranchPermission = useMemo(
    () => (branchConfig?.permissions?.includes(ALL_BRANCH_PERMISSION_TYPE) || branchConfig?.permissions?.includes(permission)),
    [branchConfig?.permissions, permission],
  )

  return hasBranchPermission ?? false
}

export function useHasAllBranchPermission(): boolean {
  return useHasBranchPermission(ALL_BRANCH_PERMISSION_TYPE)
}

export function useHasEditBranchPermission(): boolean {
  return useHasBranchPermission(EDIT_BRANCH_PERMISSION_TYPE)
}

export function useHasSaveBranchPermission(): boolean {
  return useHasBranchPermission(SAVE_BRANCH_PERMISSION_TYPE)
}

export function useHasPublishBranchPermission(): boolean {
  return useHasBranchPermission(PUBLISH_BRANCH_PERMISSION_TYPE)
}

export function useIsBranchReadonly(): boolean {
  const [branchConfig] = useBranchConfig()
  return isEmpty(branchConfig?.permissions)
}
