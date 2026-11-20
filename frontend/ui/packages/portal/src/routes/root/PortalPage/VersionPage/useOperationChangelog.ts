import { useQuery } from '@tanstack/react-query'
import type {
  UseOperationChangelogOptions,
} from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget/api/getOperationChangelog'
import { getOperationChangeLog } from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget/api/getOperationChangelog'
import type { OperationChanges, OperationChangesDto } from '@netcracker/qubership-apihub-ui-shared/entities/operation-changelog'
import { toOperationChanges } from '@netcracker/qubership-apihub-ui-shared/entities/operation-changelog'
import type { IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { useMemo } from 'react'

const OPERATION_CHANGELOG = 'operation-changelog-query-key'

export function useOperationChangelog(options: UseOperationChangelogOptions): [OperationChanges, IsLoading, IsSuccess] {
  const {
    packageKey,
    versionKey,
    operationKey,
    apiType,
    previousVersion,
    previousVersionPackageId,
    severity,
    enable = false,
  } = options

  const { data, isInitialLoading, isSuccess } = useQuery<OperationChangesDto, Error, OperationChanges>({
    queryKey: [OPERATION_CHANGELOG, versionKey, packageKey, operationKey, apiType, previousVersion, previousVersionPackageId, severity],
    enabled: enable && !!versionKey && !!packageKey && !!operationKey,
    retry: false,
    queryFn: ({ signal }) => getOperationChangeLog({
      versionKey,
      packageKey,
      operationKey,
      apiType,
      previousVersion,
      previousVersionPackageId,
      severity,
    }, signal),
    select: toOperationChanges,
  })

  return useMemo(() => [
    data ?? [],
    isInitialLoading,
    isSuccess,
  ], [data, isInitialLoading, isSuccess])
}
