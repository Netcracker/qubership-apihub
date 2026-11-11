import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { PackagePermission } from '@netcracker/qubership-apihub-ui-shared/entities/package-permissions'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'

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
    latestRelease?: string
    breakingChangesCount?: number
    createdAt?: string
    createdBy?: string
  }>

export type MavenLibraryUpdateDto = Pick<MavenLibraryCreateDto, 'name' | 'description' | 'defaultRole'>

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

export type LibraryVersionPublishDto = Readonly<{
  version: string
  previousVersion?: string
  status: VersionStatus
  labels: string[]
}>

export type LibraryVersionDto =
  & LibraryVersionPublishDto
  & Readonly<{
    libraryId: Key
    createdAt?: string
    createdBy?: string
    metadata?: Readonly<{
      javaApi?: Readonly<{ classes: number; interfaces: number; enums: number }>
      activities?: ReadonlyArray<Readonly<{ id: string; action: string; createdAt: string; createdBy: string }>>
    }>
  }>

export type LibraryVersionsDto = Readonly<{
  versions: LibraryVersionDto[]
}>

export type LibraryRegistryVersionsDto = Readonly<{
  versions: string[]
}>

export type LibraryVersionUpdateDto = Pick<LibraryVersionPublishDto, 'status' | 'labels'>

export type LibraryJavaApiDocumentDto = Readonly<Record<string, unknown>>
