import type { MethodType, SpecType } from '../packages/types'
import type { VersionStatus } from '../packages/version-statuses'

export type SearchResults = Readonly<{
  packages: PackageSearchResult[]
  operations: OperationSearchResult[]
  documents: DocumentSearchResult[]
}>

export type PackageSearchResult = Readonly<{
  packageKey: string
  name: string
  parentPackages: string[]
  version: string
  status: VersionStatus
  createdAt: string
  labels?: string[]
}>

export type OperationSearchResult = Readonly<{
  packageKey: string
  name: string
  description?: string
  serviceName?: string
  parentPackages: string[]
  version: string
  status: VersionStatus
  operationKey: string
  title: string
  deprecated?: boolean
  path: string
  method: MethodType
}>

export type DocumentSearchResult = Readonly<{
  packageKey: string
  name: string
  parentPackages: string[]
  version: string
  status: VersionStatus
  slug: string
  type: SpecType
  title: string
  labels?: string[]
  content?: string[]
  showMoreOption?: boolean
}>

export type SearchResultsDto = Readonly<Partial<{
  packages: PackageSearchResultDto[]
  operations: OperationSearchResultDto[]
  documents: DocumentSearchResultDto[]
}>>

export type PackageSearchResultDto = Readonly<{
  packageId: string
  name: string
  description?: string
  serviceName?: string
  parentPackages: string[]
  version: string
  status: VersionStatus
  createdAt: string
  labels?: string[]
}>

export type OperationSearchResultDto = Readonly<{
  packageId: string
  name: string
  parentPackages: string[]
  version: string
  status: VersionStatus
  operationId: string
  title: string
  deprecated?: boolean
  path: string
  method: MethodType
}>

export type DocumentSearchResultDto = Readonly<{
  packageId: string
  name: string
  parentPackages: string[]
  version: string
  status: VersionStatus
  slug: string
  type: SpecType
  title: string
  labels?: string[]
  content?: string[]
  showMoreOption?: boolean
}>

export const JSON_FILE_FORMAT = 'json'
export const YAML_FILE_FORMAT = 'yaml'
export const MD_FILE_FORMAT = 'md'
export const UNKNOWN_FILE_FORMAT = 'unknown'

export type FileFormat =
  | typeof JSON_FILE_FORMAT
  | typeof YAML_FILE_FORMAT
  | typeof MD_FILE_FORMAT
  | typeof UNKNOWN_FILE_FORMAT
