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
import { isSyntheticGroup, UNGROUPED_OPERATION_GROUP } from '../../entities/operation-groups'

type ResolvedGroupParameters = {
  resolvedExcludedGroupName: string | undefined
  resolvedGroupName: string | undefined
  resolvedEmptyGroup: boolean
}

export function useResolvedOperationGroupParameters(
  groupName?: string,
  excludedGroupName?: string,
): ResolvedGroupParameters {
  return useMemo(() => {
    const result: ResolvedGroupParameters = {
      resolvedExcludedGroupName: undefined,
      resolvedGroupName: undefined,
      resolvedEmptyGroup: false,
    }
    if (!groupName && excludedGroupName) {
      result.resolvedExcludedGroupName = excludedGroupName
    }
    if (groupName && !excludedGroupName) {
      result.resolvedGroupName = !isSyntheticGroup(groupName) ? groupName : undefined
    }
    if (groupName === UNGROUPED_OPERATION_GROUP) {
      result.resolvedEmptyGroup = true
    }
    return result
  }, [excludedGroupName, groupName])
}
