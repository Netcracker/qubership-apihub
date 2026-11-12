import type { Key, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { Operation } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { OperationsMovementDetails } from '@portal/routes/EventBusProvider'

export type PackageContext = {
  isDashboard: boolean
  packageKey?: Key
  version?: VersionKey
  refPackageKey?: Key
  refVersion?: VersionKey
}

export type OperationListsDelta = Array<{
  operation: Operation
  action: OperationsMovementDetails
}>

