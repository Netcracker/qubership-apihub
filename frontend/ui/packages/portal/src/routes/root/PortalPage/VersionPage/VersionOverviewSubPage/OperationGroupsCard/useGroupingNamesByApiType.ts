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
