import type { JavaApiChangeRow } from '@netcracker/qubership-apihub-api-doc-viewer'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { PackagePermission } from '@netcracker/qubership-apihub-ui-shared/entities/package-permissions'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'

// TODO(libraries-backend): Service codes: 3001 duplicate library, 3002 invalid coordinates, 3003 unknown repository,
// 3103 artifact not found; symbolic codes here match only the mock. Create skips registry lookup, so
// LIBRARY_COORDINATES_NOT_VERIFIED never comes from the service.
export const LIBRARY_COORDINATES_ERRORS: ReadonlyMap<string, string> = new Map([
  [
    'LIBRARY_COORDINATES_NOT_VERIFIED',
    'These coordinates could not be verified in Artifactory. Check repository name and Maven GA',
  ],
  [
    'LIBRARY_ALREADY_EXISTS',
    'Duplicate Maven coordinates. A library with this repository name and Maven GA is already registered. Use the existing library to publish versions, or change the coordinates.',
  ],
])

export type MavenLibraryCreateDto = Readonly<{
  alias: string
  name: string
  language: 'java'
  repository: string
  coordinates: Readonly<{
    groupId: string
    artifactId: string
    classifier?: string
  }>
  parentPackageId?: Key
  description?: string
  defaultRole?: string
}>

export type MavenLibraryDto =
  & MavenLibraryCreateDto
  & Readonly<{
    libraryId: Key
    coordinatesKey: string
    isFavorite: boolean
    permissions?: PackagePermission[]
    // TODO(libraries-backend): The service returns neither latestRelease nor breakingChangesCount;
    // only the local mock fills them until the service supplies both fields.
    latestRelease?: string
    breakingChangesCount?: number
    createdAt?: string
    createdBy?: string
  }>

export type MavenLibraryUpdateDto = Partial<Pick<MavenLibraryCreateDto, 'name' | 'description' | 'defaultRole'>>

export type LibrariesDto = Readonly<{
  libraries: MavenLibraryDto[]
}>

export type LibraryMemberDto = Readonly<{
  user: Readonly<{ userId: Key; name: string }>
  roles: ReadonlyArray<
    Readonly<{
      roleId: string
      role: string
      inheritedFrom?: Readonly<{ packageId: Key; kind: string; name: string }>
    }>
  >
}>

export type LibraryMembersDto = Readonly<{ members: LibraryMemberDto[] }>
export type LibraryMemberUpdateDto = Readonly<{ roleIds: string[] }>

export type LibraryApiKeyDto = Readonly<{
  id: Key
  libraryId: Key
  name: string
  createdAt: string
  createdBy: Readonly<{ id: Key; name: string }>
  createdFor: Readonly<{ id: Key; name: string }>
  roles: string[]
  apiKey?: string
}>

export type LibraryApiKeysDto = Readonly<{ apiKeys: LibraryApiKeyDto[] }>
export type LibraryApiKeyCreateDto = Readonly<{ name: string; roles?: string[]; createdFor: Key }>

// TODO(libraries-backend): Import ignores status: it starts as draft and is released when its build completes.
// Omitting previousVersion means "the latest release"; the service has no way to request "no previous version".
// Wait for import status control and an explicit "no previous version" option.
export type LibraryVersionPublishDto = Readonly<{
  version: string
  previousVersion?: string
  status: VersionStatus
  labels: string[]
}>

export const LibraryVersionBuildStatuses = {
  NOT_STARTED: 'none',
  COMPLETE: 'complete',
  ERROR: 'error',
} as const

export type LibraryVersionBuildStatus = typeof LibraryVersionBuildStatuses[keyof typeof LibraryVersionBuildStatuses]

export type LibraryVersionDto =
  & Omit<LibraryVersionPublishDto, 'labels'>
  & Readonly<{
    libraryId: Key
    labels?: string[]
    createdAt?: string
    createdBy?: string
    metadata?: Readonly<{
      buildId?: string
      buildStatus?: LibraryVersionBuildStatus
      buildError?: string
      javaApi?: Readonly<{ classes: number; interfaces: number; enums: number }>
      // TODO(libraries-backend): The service has no activity source for a library version;
      // the Activity tab stays empty until the service provides one.
      activities?: ReadonlyArray<Readonly<{ id: string; action: string; createdAt: string; createdBy: string }>>
    }>
  }>

export type LibraryVersion = Omit<LibraryVersionDto, 'labels'> & Readonly<{ labels: string[] }>

export type LibraryVersions = Readonly<{ versions: LibraryVersion[] }>

export type LibraryVersionsDto = Readonly<{
  versions: LibraryVersionDto[]
}>

export type LibraryAvailableVersionsDto = Readonly<{
  versions: ReadonlyArray<Readonly<{ version: string }>>
}>

export type LibraryVersionUpdateDto = Pick<LibraryVersionPublishDto, 'status' | 'labels'>

export type LibraryJavaApiDocumentDto = Readonly<Record<string, unknown>>

export type LibraryChangeDto = JavaApiChangeRow

export type LibraryChangesSummaryDto = Readonly<{
  comparisonId: string
  libraryId: Key
  version: string
  previousLibraryId: Key
  previousVersion: string
  changeCounts: Readonly<
    Record<'breaking' | 'non-breaking' | 'annotation' | 'added' | 'removed' | 'changed' | 'deprecated', number>
  >
}>

export type LibraryChangesDto = Readonly<{
  comparison: LibraryChangesSummaryDto
  changes: readonly LibraryChangeDto[]
}>

export function toLibraryVersion(value: LibraryVersionDto): LibraryVersion {
  return { ...value, labels: value.labels ?? [] }
}
