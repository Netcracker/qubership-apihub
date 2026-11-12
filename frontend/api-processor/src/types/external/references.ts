import { PackageId, VersionId } from './types'
import { VersionStatus } from './config'

export type VersionReferencesResolver = (
  version: VersionId,
  packageId: PackageId,
) => Promise<ResolvedReferences | null>

export type ReferenceElement = {
  packageRef: string // packageId@version
  parentPackageRef?: string // packageId@version
  excluded?: boolean
}

export interface ResolvedReferences {
  references: ReferenceElement[]
  packages: ResolvedReferenceMap
}

export type ResolvedReferenceMap = Record<string, ReferencedPackage>

export interface ReferencedPackage {
  refId: string
  kind: ReferencedPackageKind
  name: string
  version: string
  status: VersionStatus
  parentPackages?: ReadonlyArray<string>
  deletedAt?: string
  deletedBy?: string
  notLatestRevision?: boolean
}

export const KIND_PACKAGE = 'package'
export const KIND_DASHBOARD = 'dashboard'

export type ReferencedPackageKind =
  | typeof KIND_PACKAGE
  | typeof KIND_DASHBOARD
