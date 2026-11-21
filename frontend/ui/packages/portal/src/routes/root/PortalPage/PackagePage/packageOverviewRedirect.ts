import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { Package } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'

export type PackageOverviewRedirect = {
  packageKey: Key
  versionKey: Key
}

/**
 * Where the package root (`/portal/packages/:packageId`) leads: the overview of the default version, without its
 * revision, so the latest revision opens. Nothing while the package is loading or when it has no default version:
 * the page then shows its placeholder.
 */
export function getPackageOverviewRedirect(
  packageObject: Pick<Package, 'key' | 'defaultVersion'> | null | undefined,
): PackageOverviewRedirect | undefined {
  const { versionKey } = getSplittedVersionKey(packageObject?.defaultVersion)
  if (!packageObject?.key || !versionKey) {
    return undefined
  }
  return { packageKey: packageObject.key, versionKey: versionKey }
}
