import { OperationId, OperationsApiType, PackageId, VersionId } from './types'
import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import { Hash } from '../package'

export type VersionDeprecatedResolver = (
  apiType: OperationsApiType,
  version: VersionId,
  packageId: PackageId,
  operationsIds?: OperationId[],
) => Promise<ResolvedDeprecatedOperations | null>

export interface ResolvedDeprecatedOperations {
  operations: ResolvedDeprecatedOperation[]
}

export interface ResolvedDeprecatedOperation {
  operationId: string // path-method slug
  apiType: string
  apiKind: string
  deprecated: boolean
  deprecatedItems?: DeprecateItem[]     // deprecated items
  deprecatedInfo?: string
  deprecatedInPreviousVersions?: string[]
}

export interface DeprecateItem {
  declarationJsonPaths: JsonPath[]               //declarative path to deprecated item
  description?: string                           // human-readable location of deprecated item
  deprecatedInPreviousVersions: string[]         // list of previous version with same deprecated item
  deprecatedInfo?: string                        // meta from x-deprecated-meta
  tolerantHash?: Hash                            // value of tolerant hash for Schema Object or Parameter Object that was deprecated
  hash?: Hash                                    // value of hash for Schema Object or Parameter Object that was deprecated, need for detecting semi-breaking in UI
}
