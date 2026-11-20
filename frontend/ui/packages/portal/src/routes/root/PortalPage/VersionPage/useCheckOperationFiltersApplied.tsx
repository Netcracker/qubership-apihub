import { useDefaultOperationFilterControllers } from './useDefaultOperationFilterControllers'
import { useTagSearchFilter } from './useTagSearchFilter'
import { useMemo } from 'react'
import { ALL_OPERATION_GROUPS } from '@netcracker/qubership-apihub-ui-shared/entities/operation-groups'
import { ALL_API_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/operations'

export function useCheckOperationFiltersApplied(isDashboard: boolean): boolean {
  const {
    selectedPackageKey,
    selectedOperationGroupName,
    selectedApiKind,
  } = useDefaultOperationFilterControllers(isDashboard)
  const [tag] = useTagSearchFilter()

  return useMemo(
    () => !!selectedPackageKey || selectedOperationGroupName !== ALL_OPERATION_GROUPS || selectedApiKind !== ALL_API_KIND || !!tag,
    [selectedApiKind, selectedOperationGroupName, selectedPackageKey, tag],
  )
}
