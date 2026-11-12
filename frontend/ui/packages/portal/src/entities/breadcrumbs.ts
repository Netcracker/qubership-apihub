import type { Package } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type { Key, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

export type PackagesComparisonParams = Partial<{
  changedPackage: Package | null
  changedPackageKey: Key
  changedVersionKey: VersionKey
  originPackage: Package | null
  originPackageKey: Key
  originVersionKey: VersionKey
}>
