import type { VersionStatus } from './version-status'
import type { Key } from './keys'
import type { Principal } from './principals'

export type PagedPackageVersions = Readonly<PackageVersions[]>

export type PackageVersions = Readonly<PackageVersion[]>

export type PackageVersion = Readonly<{
  key: Key
  status: VersionStatus
  createdBy: Principal
  createdAt?: string
  versionLabels: string[]
  previousVersion?: string
  latestRevision: boolean
  apiProcessorVersion?: string
  hasErrors?: boolean
  changelogHasErrors?: boolean
}>

export type PackageVersionDto = Readonly<{
  version: Key
  status: VersionStatus
  createdBy: Principal
  createdAt?: string
  versionLabels?: string[]
  previousVersion?: string
  notLatestRevision?: boolean
  apiProcessorVersion?: string
  hasErrors?: boolean
  changelogHasErrors?: boolean
}>

export type PackageVersionsDto = Readonly<{
  versions: ReadonlyArray<PackageVersionDto>
}>

export const SPECIAL_VERSION_KEY = '@'
export const REVISION_DELIMITER = '@'
