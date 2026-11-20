import type { VersionStatus } from './version-status'
import type { ChangesSummary } from './change-severities'
import type { PackagesRefs, Tags } from './operations'
import type { OperationGroup, OperationGroupWithApiTypeDto } from './operation-groups'
import type { Key, VersionKey } from './keys'
import type { Principal } from './principals'
import type { ApiType } from './api-types'
import { toDdlContractsSummary, type DdlContractsSummary, type DdlContractsSummaryDto } from './contracts-ddl'
import { toMcpContractsSummary, type McpContractsSummary, type McpContractsSummaryDto } from './contracts-mcp'
import type { ApiAudienceTransition, DiffTypeDto } from '@netcracker/qubership-apihub-api-processor'
import type { DiffType } from '@netcracker/qubership-apihub-api-diff'

export type PackageVersionContent = Readonly<{
  version: Key
  packageKey: Key
  status: VersionStatus
  createdAt: string
  createdBy: Principal
  operationGroups: ReadonlyArray<OperationGroup>
  latestRevision: boolean
  previousVersion?: VersionKey
  previousVersionPackageId?: VersionKey
  versionLabels?: string[]
  operationTypes?: Record<ApiType, OperationTypeSummary>
  contractsSummary?: VersionContractsSummary
  revisionsCount: number
  apiProcessorVersion?: string
  hasErrors?: boolean
  changelogHasErrors?: boolean
}>

export type PackageVersionContentDto = Readonly<{
  version: Key
  packageId: Key
  status: VersionStatus
  createdAt: string
  createdBy: Principal
  operationGroups?: ReadonlyArray<OperationGroupWithApiTypeDto>
  previousVersion?: VersionKey
  previousVersionPackageId?: VersionKey
  versionLabels?: string[]
  operationTypes?: ReadonlyArray<OperationTypeSummaryDto>
  contractsSummary?: VersionContractsSummaryDto
  notLatestRevision?: boolean
  revisionsCount?: number
  apiProcessorVersion?: string
  hasErrors?: boolean
  changelogHasErrors?: boolean
}>

export type VersionContractsSummaryDto = Readonly<{
  mcp?: McpContractsSummaryDto
  ddl?: DdlContractsSummaryDto
}>

export type VersionContractsSummary = Readonly<{
  mcp?: McpContractsSummary
  ddl?: DdlContractsSummary
}>

export function toVersionContractsSummary(
  contractsSummary: VersionContractsSummaryDto | undefined,
): VersionContractsSummary | undefined {
  if (!contractsSummary) {
    return undefined
  }

  const mcp = toMcpContractsSummary(contractsSummary.mcp)
  const ddl = toDdlContractsSummary(contractsSummary.ddl)

  if (!mcp && !ddl) {
    return undefined
  }

  return {
    ...(mcp !== undefined && { mcp: mcp }),
    ...(ddl !== undefined && { ddl: ddl }),
  }
}

export type OperationTypeSummary<T extends DiffType | DiffTypeDto = DiffType> = Readonly<{
  apiType: ApiType
  changesSummary: ChangesSummary<T>
  numberOfImpactedOperations: ChangesSummary<T>
  operationsCount: number
  deprecatedCount: number
  noBwcOperationsCount: number
  internalAudienceOperationsCount: number
  unknownAudienceOperationsCount: number
  apiAudienceTransitions: ApiAudienceTransition[]
  operations?: object
  hasErrors?: boolean
}>

export type OperationTypeSummaryDto = OperationTypeSummary<DiffTypeDto>

export type VersionDeprecatedSummaryDto = PackageDeprecatedSummaryDto | DashboardDeprecatedSummaryDto

export type VersionDeprecatedSummary = PackageDeprecatedSummary | DashboardDeprecatedSummary

export type DashboardDeprecatedSummaryDto = Readonly<{
  refs: RefDeprecatedSummaryDto[]
  packages: PackagesRefs
}>

export type RefDeprecatedSummaryDto = Readonly<{
  packageRef: Key
  operationTypes: ReadonlyArray<OperationTypeDeprecatedSummary> | undefined
}>

export type DashboardDeprecatedSummary = ReadonlyArray<RefDeprecatedSummary>

export type RefDeprecatedSummary = Readonly<{
  refKey?: Key
  operationTypes?: Record<ApiType, OperationTypeDeprecatedSummary>
}>

export type PackageDeprecatedSummaryDto = Readonly<{
  operationTypes: OperationTypeDeprecatedSummary[] | undefined
}>

export type PackageDeprecatedSummary = Readonly<{
  operationTypes?: Record<ApiType, OperationTypeDeprecatedSummary>
}>

export type OperationTypeDeprecatedSummary = Readonly<{
  apiType: ApiType
  deprecatedCount: string
  tags: Tags
}>

export function isDashboardDeprecatedSummaryDto(value: VersionDeprecatedSummaryDto): value is DashboardDeprecatedSummaryDto {
  return !!(value as DashboardDeprecatedSummaryDto)?.refs
}

export function isDashboardDeprecatedSummary(value: VersionDeprecatedSummary): value is DashboardDeprecatedSummary {
  return Array.isArray(value)
}
