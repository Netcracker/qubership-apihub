import type { JavaApiChangeRow } from '@netcracker/qubership-apihub-api-doc-viewer'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { PackagePermission } from '@netcracker/qubership-apihub-ui-shared/entities/package-permissions'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'

export const LibraryErrorCodes = {
  ALREADY_EXISTS: '3001',
  INVALID_COORDINATES: '3002',
  REPOSITORY_NOT_CONFIGURED: '3003',
  VERSION_ALREADY_EXISTS: '3101',
  VERSION_NOT_FOUND_IN_REGISTRY: '3103',
  PREVIOUS_VERSION_NOT_FOUND: '3105',
} as const

export const LIBRARY_ERROR_MESSAGES: ReadonlyMap<string, string> = new Map([
  [
    LibraryErrorCodes.ALREADY_EXISTS,
    'Duplicate Maven coordinates. A library with this repository name and Maven GA is already registered. Use the existing library to publish versions, or change the coordinates.',
  ],
  [LibraryErrorCodes.INVALID_COORDINATES, 'Invalid Maven coordinates. Check Maven GroupId and ArtifactId.'],
  [LibraryErrorCodes.REPOSITORY_NOT_CONFIGURED, 'This repository is not configured in APIHUB.'],
  [LibraryErrorCodes.VERSION_ALREADY_EXISTS, 'This version is already published in this library.'],
  [LibraryErrorCodes.VERSION_NOT_FOUND_IN_REGISTRY, 'This version is not found in the registry.'],
  [LibraryErrorCodes.PREVIOUS_VERSION_NOT_FOUND, 'The selected previous version is not found in this library.'],
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
  RUNNING: 'running',
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
    statistics?: Readonly<{
      classCount: number
      interfaceCount: number
      enumCount: number
      annotationTypeCount: number
    }>
    metadata?: Readonly<{
      buildId?: string
      buildStatus?: LibraryVersionBuildStatus
      buildError?: string
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

export type LibraryClassDto = Readonly<{
  classId: string
  kind: 'class' | 'interface' | 'enum' | 'annotation' | 'record'
  qualifiedName: string
  packageName?: string
  modifiers?: string[]
  deprecated: boolean
  methodCount: number
  constructorCount: number
  fieldCount: number
}>

export type LibraryClassesDto = Readonly<{ classes: LibraryClassDto[] }>

export type LibraryMethodDto = Readonly<{
  classId: string
  methodId: string
  name: string
  signature: string
  modifiers?: string[]
  deprecated: boolean
}>

export type LibraryFieldDto = Readonly<{
  classId: string
  signature: string
}>

export type LibraryClassDetailsDto =
  & LibraryClassDto
  & Readonly<{
    methods: LibraryMethodDto[]
    constructors: LibraryMethodDto[]
    fields: LibraryFieldDto[]
  }>

export type LibraryChangeDto = JavaApiChangeRow

export type LibraryNestedClassChangeDto = Readonly<{
  classId: string
  kind: LibraryClassDto['kind']
  status: 'added' | 'removed' | 'changed'
  severity: LibraryChangeDto['severity']
}>

export type LibraryChangesSummaryDto = Readonly<{
  comparisonId: string
  libraryId: Key
  version: string
  previousLibraryId: Key
  previousVersion: string
  // The service leaves the field out when the comparison found no changes (noContent: true)
  changeCounts?: Readonly<
    Partial<
      Record<'breaking' | 'non-breaking' | 'annotation' | 'added' | 'removed' | 'changed' | 'deprecated', number>
    >
  >
}>

export type LibraryChangesDto = Readonly<{
  comparison: LibraryChangesSummaryDto
  changes: readonly LibraryChangeDto[]
  nestedChanges?: readonly LibraryNestedClassChangeDto[]
}>

export function toLibraryVersion(value: LibraryVersionDto): LibraryVersion {
  return { ...value, labels: value.labels ?? [] }
}
