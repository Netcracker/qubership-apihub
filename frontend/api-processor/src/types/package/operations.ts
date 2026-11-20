import { OperationId, OperationsApiType } from '../external'
import { PackageDeprecatedItem } from './deprecated'
import { ApihubApiCompatibilityKind } from '../../consts'
import { OperationSearch } from '../internal/operation'

export type PackageOperations = {
  operations: PackageOperation[]
}

export interface PackageOperation {
  operationId: OperationId
  documentId: string
  title: string
  apiType: OperationsApiType
  deprecated: boolean
  apiKind: ApihubApiCompatibilityKind
  metadata: RestMetadata | GraphQLMetaData
  search: OperationSearch
  tags: string[]

  // new properties
  deprecatedItems?: PackageDeprecatedItem[]     // deprecated items
  deprecatedInfo?: string
  deprecatedInPreviousVersions?: string[]
  models?: Record<string, string>       // schema models { name: hash }
  apiAudience?: ApiAudience
  versionInternalDocumentId: string
}

export interface RestMetadata {
  path: string
  method: string
  tags: string[]
  title: string
}

export interface GraphQLMetaData {
  type: string
  method: string
  title: string
  tags?: string[]
}

export const API_AUDIENCE_INTERNAL = 'internal'
export const API_AUDIENCE_EXTERNAL = 'external'
export const API_AUDIENCE_UNKNOWN = 'unknown'
export type ApiAudience = typeof API_AUDIENCE_INTERNAL | typeof API_AUDIENCE_EXTERNAL | typeof API_AUDIENCE_UNKNOWN
