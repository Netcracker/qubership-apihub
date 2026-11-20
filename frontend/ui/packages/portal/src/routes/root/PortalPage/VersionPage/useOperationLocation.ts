import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import type { OperationLocation } from '@portal/entities/operation-location'

export function useOperationLocation(): OperationLocation {
  const packageId = useSearchParam('package')!
  const versionId = useSearchParam('version')!
  const operationId = useSearchParam('operation')!
  return {
    packageKey: packageId,
    versionKey: versionId,
    operationKey: operationId,
  }
}


