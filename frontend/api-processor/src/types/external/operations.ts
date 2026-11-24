import { OperationId, OperationsApiType, PackageId, VersionId } from './types'
import { DeprecateItem } from './deprecated'
import { ApiAudience } from '../package'
import { ApihubApiCompatibilityKind } from '../../consts'

export type VersionOperationsResolver = (
  apiType: OperationsApiType,
  version: VersionId,
  packageId: PackageId,
  operationsIds?: OperationId[],
  includeData?: boolean,
) => Promise<ResolvedOperations | null>

export interface ResolvedOperations {
  operations: ResolvedOperation[]
  // packages: Record<string, PackageData>
}

export interface ResolvedOperation<M = any> {
  operationId: OperationId
  documentId: string
  title: string
  apiType: OperationsApiType
  apiKind: ApihubApiCompatibilityKind
  deprecated: boolean
  metadata: M // TODO: align with contract
  data?: unknown
  tags?: string[]

  // new properties
  deprecatedItems?: DeprecateItem[]     // deprecated items
  deprecatedInfo?: string
  deprecatedInPreviousVersions?: string[]
  models?: Record<string, string>       // schema models { name: hash }

  // other params (not used in builder logic)
  // [key: string]: unknown

  // refPackage?: PackageRef
  // changes?: OperationChanges[]
  // changeSummary?: ChangeSummary
  apiAudience?: ApiAudience
}
