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
import type { OperationGroup } from '@netcracker/qubership-apihub-ui-shared/entities/operation-groups'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export function useGroupingNamesByApiType(
  apiTypes: ReadonlyArray<ApiType>,
  groups?: ReadonlyArray<OperationGroup>,
): Map<ApiType, ReadonlyArray<string>> {
  return useMemo(() => {
    const groupNameMap = new Map<ApiType, ReadonlyArray<string>>()

    apiTypes.forEach(apiType => {
      const typeGroupNames = (groups ?? [])
        .filter(group => apiType === group.apiType)
        .map(group => group.groupName)
      groupNameMap.set(apiType, typeGroupNames)
    })

    return groupNameMap
  }, [groups, apiTypes])
}
