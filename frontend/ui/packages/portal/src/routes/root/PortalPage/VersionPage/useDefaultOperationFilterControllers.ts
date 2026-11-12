import { useTagSearchFilter } from './useTagSearchFilter'
import { useRefSearchParam } from '../useRefSearchParam'
import { useApiKindSearchFilter } from './useApiKindSearchFilters'
import { useCallback } from 'react'
import type { OperationsFilterControllers } from './SelfManagedOperationFilters'
import { useOperationGroupSearchFilter } from './useOperationGroupSearchFilter'
import type { PackageReference } from '@netcracker/qubership-apihub-ui-shared/entities/version-references'
import { useApiAudienceSearchFilter } from './useApiAudienceSearchFilters'

export function useDefaultOperationFilterControllers(isDashboard: boolean): OperationsFilterControllers {
  const [, setTag] = useTagSearchFilter()
  const [refPackageKey, setRef] = useRefSearchParam()
  const [operationGroupKey, setOperationGroupKey] = useOperationGroupSearchFilter()
  const [apiAudinceFilter, setApiAudieceFilter] = useApiAudienceSearchFilter()
  const [apiKindFilter, setApiKindFilter] = useApiKindSearchFilter()

  const onSelectPackageRef = useCallback(
    (packageRef: PackageReference | null) => {
      if (packageRef && packageRef.key === refPackageKey) {
        return
      }

      setTag(undefined)
      setRef(packageRef?.key)
    },
    // TODO 04.10.23 // Explain it
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refPackageKey, setTag],
  )

  return {
    selectedPackageKey: refPackageKey,
    onSelectPackage: isDashboard ? onSelectPackageRef : undefined,
    selectedOperationGroupName: operationGroupKey,
    onSelectOperationGroup: setOperationGroupKey,
    selectedApiAudience: apiAudinceFilter,
    onSelectApiAudience: setApiAudieceFilter,
    selectedApiKind: apiKindFilter,
    onSelectApiKind: setApiKindFilter,
  }
}
