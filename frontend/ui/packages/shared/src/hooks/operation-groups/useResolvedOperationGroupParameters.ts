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
