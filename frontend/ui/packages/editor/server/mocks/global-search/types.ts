import type { FileFormat } from '../files/types'
import type { GroupDto } from '../groups/types'
import type { SpecType } from '../specs/types'
import type { VersionStatus } from '../version-status/types'

export type FileResultDto = Readonly<{
  fileId: string
  title: string
  slug: string
  type: SpecType
  labels: string[]
  format: FileFormat
}>

export type PackageSearchResultDto = Readonly<{
  packageId: string
  name: string
  description: string
  parentPackages: GroupDto[]
}>

export type VersionSearchResultDto = Readonly<{
  packageId: string
  name: string
  parentPackages: GroupDto[]
  version: string
  status: VersionStatus
  publishedAt: string
  files: FileResultDto[]
}>

export type DocumentSearchResultDto = Readonly<{
  packageId: string
  name: string
  parentPackages: GroupDto[]
  version: string
  status: VersionStatus
  publishedAt: string
  files: FileResultDto[]
}>

// TODO: Remove partial when BE will be ready
export type SearchResultsDto = Readonly<Partial<{
  packages: PackageSearchResultDto[]
  versions: VersionSearchResultDto[]
  documents: DocumentSearchResultDto[]
}>>
