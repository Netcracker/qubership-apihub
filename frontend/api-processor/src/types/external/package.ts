import { PackageId } from './types'

export type PackageResolver = (
  packageId: PackageId,
) => Promise<ResolvedPackage | null>

export type ResolvedPackage = {
  packageId: string
  name: string

  // other params (not used in builder logic)
  [key: string]: unknown
}
