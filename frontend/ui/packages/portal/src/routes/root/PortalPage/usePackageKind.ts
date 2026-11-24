import { usePackage } from '../usePackage'
import type { PackageKind } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'

export function usePackageKind(): [PackageKind | undefined, IsLoading] {
  const [homePackage, isLoading] = usePackage()

  return [homePackage?.kind, isLoading]
}
