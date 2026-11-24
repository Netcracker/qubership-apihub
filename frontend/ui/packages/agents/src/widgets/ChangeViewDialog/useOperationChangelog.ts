import { useQuery } from '@tanstack/react-query'
import type {
  UseOperationChangelogOptions,
} from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget/api/getOperationChangelog'
import { getOperationChangeLog } from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget/api/getOperationChangelog'
import type { OperationChanges, OperationChangesDto } from '@netcracker/qubership-apihub-ui-shared/entities/operation-changelog'
import { toOperationChanges } from '@netcracker/qubership-apihub-ui-shared/entities/operation-changelog'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'

// copy-pasted from portal
const OPERATION_CHANGELOG = 'operation-changelog-query-key'

export function useOperationChangelog(options: UseOperationChangelogOptions): [OperationChanges, IsLoading] {
  const { packageKey, versionKey, operationKey, apiType, previousVersion, previousVersionPackageId } = options

  const { data, isLoading } = useQuery<OperationChangesDto, Error, OperationChanges>({
    queryKey: [OPERATION_CHANGELOG, versionKey, packageKey, operationKey, apiType, previousVersion, previousVersionPackageId],
    enabled: !!versionKey && !!packageKey && !!operationKey,
    retry: false,
    queryFn: ({ signal }) => getOperationChangeLog({
      versionKey,
      packageKey,
      operationKey,
      apiType,
      previousVersion,
      previousVersionPackageId,
    }, signal),
    select: toOperationChanges,
  })

  return [
    data ?? [],
    isLoading,
  ]
}
