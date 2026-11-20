import { OperationsApiType, PackageId, VersionId } from './types'
import { ChangeSummary } from './comparison'
import { Labels } from './documents'

export type VersionResolver = (
  packageId: PackageId,
  version: VersionId,
  includeOperations?: boolean,
) => Promise<ResolvedVersion | null>

export type ResolvedVersion = {
  previousVersion?: string
  previousVersionPackageId?: string
  operationTypes?: OperationTypes[]
  version: string
  apiProcessorVersion: string
  versionLabels?: Labels
  // other params (not used in builder logic)
  [key: string]: unknown
  // changeSummary?: object
  // operationSummary?: object
  // createdAt: string
  // createdBy: string
}

export type OperationTypes = {
  apiType: OperationsApiType
  changesSummary?: ChangeSummary
  operationsCount?: number
  deprecatedCount?: number
}

export interface ResolvedVersionOperationsHashMap {
  [operationId: string]: string
}
