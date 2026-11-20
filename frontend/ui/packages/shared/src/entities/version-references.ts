import type { DASHBOARD_KIND, PACKAGE_KIND } from './packages'
import type { VersionStatus } from './version-status'
import type { Key } from './keys'
import { isEmpty } from '../utils/arrays'

export type VersionReferences = Partial<Readonly<{
  references: ReadonlyArray<UnresolvedReference>
  packages: Record<Key, PackageReference>
}>>

export type VersionReferencesDto = Partial<Readonly<{
  references: ReadonlyArray<UnresolvedReferenceDto>
  packages: Record<Key, PackageReferenceDto>
}>>

export type UnresolvedReference = Partial<Readonly<{
  packageRef: Key
  parentPackageRef: Key
  excluded: boolean
}>>

export type UnresolvedReferenceDto = UnresolvedReference

export type ReferenceKind =
  | typeof PACKAGE_KIND
  | typeof DASHBOARD_KIND

export type PackageReference = Partial<Readonly<{
  key: Key
  kind: ReferenceKind
  name: string
  version: Key
  status: VersionStatus
  deletedAt: string
  deletedBy: string
  parentPackages: ReadonlyArray<Key>
  latestRevision: boolean
  hasErrors: boolean
  changelogHasErrors: boolean
  apiProcessorVersion: string
}>>

export type PackageReferenceDto = Partial<Readonly<{
  refId: Key
  kind: ReferenceKind
  name: string
  version: Key
  status: VersionStatus
  deletedAt: string
  deletedBy: string
  parentPackages: ReadonlyArray<Key>
  notLatestRevision: boolean
  hasErrors: boolean
  changelogHasErrors: boolean
  apiProcessorVersion: string
}>>

export function toVersionReferences(value: VersionReferencesDto): VersionReferences {
  if (!value.packages) {
    return {
      references: [],
      packages: {},
    }
  }
  const packagesDto = value.packages
  const packages: Record<Key, PackageReference> = {}
  if (isEmpty(value.references)) {
    return {
      references: [],
      packages: packages,
    }
  }
  Object.entries(packagesDto!).map(([refKey, packageReference]) => {
    packages[refKey] = {
      ...packageReference,
      key: packageReference.refId,
      latestRevision: !packageReference.notLatestRevision,
    }
  })
  return {
    references: value.references,
    packages: packages,
  }
}
