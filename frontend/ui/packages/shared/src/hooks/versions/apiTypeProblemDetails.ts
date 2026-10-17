import { type ApiType, isApiType } from '../../entities/api-types'
import {
  CONTRACT_TYPE_DDL,
  CONTRACT_TYPE_MCP,
  type ContractType,
  getRouteApiTypeTitle,
} from '../../entities/contract-types'
import type { VersionKey } from '../../entities/keys'
import type { OperationTypeSummary, VersionContractsSummary } from '../../entities/version-contents'
import {
  getPackageVersionApiTypeDocumentListTooltip,
  getPackageVersionApiTypeNoOperationsTooltip,
  getPackageVersionApiTypeSomeOperationsTooltip,
  getPackageVersionContractTypeNoEntitiesTooltip,
  getPackageVersionContractTypeSomeEntitiesTooltip,
  PUBLICATION_ERROR_MESSAGES,
} from '../../utils/publicationErrorMessages'
import { isSpecTypeForApiType, type SpecType } from '../../utils/specs'

export type ApiTypeProblemDetails = Readonly<{
  hasProblems: boolean
  tooltip?: string
}>

type InvalidDocumentRef = Readonly<{
  type: SpecType
  title?: string
  filename?: string
  slug?: string
  hasErrors?: boolean
}>

type ResolveApiTypeProblemDetailsParams = Readonly<{
  apiType: ApiType | ContractType
  operationType?: OperationTypeSummary
  contractsSummary?: VersionContractsSummary
  invalidDocumentNames?: ReadonlyArray<string>
  versionKey: VersionKey
}>

type ResolveVersionApiTypeProblemsMapParams = Readonly<{
  allowedApiTypes?: ReadonlyArray<ApiType | ContractType>
  operationTypes?: Partial<Record<ApiType, OperationTypeSummary>>
  contractsSummary?: VersionContractsSummary
  versionKey: VersionKey
}>

type ResolveOverviewSummaryApiTypeProblemsMapParams = Readonly<{
  operationTypes?: Partial<Record<ApiType, OperationTypeSummary>>
  contractsSummary?: VersionContractsSummary
  documents?: ReadonlyArray<InvalidDocumentRef>
  versionKey: VersionKey
}>

const NO_API_TYPE_PROBLEMS: ApiTypeProblemDetails = {
  hasProblems: false,
}

export function isApiTypeFullyInvalid(
  apiType: ApiType | ContractType,
  operationType?: OperationTypeSummary,
  contractsSummary?: VersionContractsSummary,
): boolean {
  return hasApiTypeErrors(apiType, operationType, contractsSummary) &&
    isApiTypeEmpty(apiType, operationType, contractsSummary)
}

export function isApiTypeEmpty(
  apiType: ApiType | ContractType,
  operationType?: OperationTypeSummary,
  contractsSummary?: VersionContractsSummary,
): boolean {
  if (isApiType(apiType)) {
    return (operationType?.operationsCount ?? 0) === 0
  }

  if (apiType === CONTRACT_TYPE_DDL) {
    return (contractsSummary?.ddl?.tablesCount ?? 0) === 0
  }

  if (apiType === CONTRACT_TYPE_MCP) {
    const mcpTotals = contractsSummary?.mcp?.totals
    const totalEntities = (mcpTotals?.toolsCount ?? 0) +
      (mcpTotals?.promptsCount ?? 0) +
      (mcpTotals?.resourcesCount ?? 0)
    return totalEntities === 0
  }

  return false
}

export function resolveApiTypeEmptyMessage(
  apiType: ApiType | ContractType,
  operationType?: OperationTypeSummary,
  contractsSummary?: VersionContractsSummary,
): string | undefined {
  if (!isApiTypeFullyInvalid(apiType, operationType, contractsSummary)) {
    return undefined
  }

  return isApiType(apiType)
    ? PUBLICATION_ERROR_MESSAGES.emptyState.noValidOperationsInApiType
    : PUBLICATION_ERROR_MESSAGES.emptyState.noValidEntitiesInContractType
}

export function resolveApiTypeProblemDetails(
  params: ResolveApiTypeProblemDetailsParams,
): ApiTypeProblemDetails {
  const { apiType, operationType, contractsSummary, invalidDocumentNames, versionKey } = params

  if (!hasApiTypeErrors(apiType, operationType, contractsSummary)) {
    return NO_API_TYPE_PROBLEMS
  }

  if (invalidDocumentNames && invalidDocumentNames.length > 0) {
    return {
      hasProblems: true,
      tooltip: getPackageVersionApiTypeDocumentListTooltip([...invalidDocumentNames]),
    }
  }

  const displayTitle = getRouteApiTypeTitle(apiType)

  if (isApiType(apiType)) {
    return {
      hasProblems: true,
      tooltip: isApiTypeFullyInvalid(apiType, operationType, contractsSummary)
        ? getPackageVersionApiTypeNoOperationsTooltip(displayTitle, versionKey)
        : getPackageVersionApiTypeSomeOperationsTooltip(displayTitle, versionKey),
    }
  }

  if (apiType === CONTRACT_TYPE_DDL || apiType === CONTRACT_TYPE_MCP) {
    return {
      hasProblems: true,
      tooltip: isApiTypeFullyInvalid(apiType, operationType, contractsSummary)
        ? getPackageVersionContractTypeNoEntitiesTooltip(displayTitle, versionKey)
        : getPackageVersionContractTypeSomeEntitiesTooltip(displayTitle, versionKey),
    }
  }

  return NO_API_TYPE_PROBLEMS
}

export function resolveVersionApiTypeProblemsMap(
  params: ResolveVersionApiTypeProblemsMapParams,
): Partial<Record<ApiType | ContractType, ApiTypeProblemDetails>> {
  const { allowedApiTypes = [] } = params
  const result: Partial<Record<ApiType | ContractType, ApiTypeProblemDetails>> = {}

  for (const apiType of allowedApiTypes) {
    const problem = resolveApiTypeProblemDetails({
      apiType: apiType,
      operationType: isApiType(apiType) ? params.operationTypes?.[apiType] : undefined,
      contractsSummary: params.contractsSummary,
      versionKey: params.versionKey,
    })
    if (problem.hasProblems) {
      result[apiType] = problem
    }
  }

  return result
}

export function resolveOverviewSummaryApiTypeProblemsMap(
  params: ResolveOverviewSummaryApiTypeProblemsMapParams,
): Partial<Record<ApiType | ContractType, ApiTypeProblemDetails>> {
  const { operationTypes, contractsSummary, documents = [], versionKey } = params
  const result: Partial<Record<ApiType | ContractType, ApiTypeProblemDetails>> = {}
  const invalidDocs = documents.filter(doc => doc.hasErrors)

  for (const { apiType, operationType } of collectAffectedOverviewTypes(operationTypes, contractsSummary)) {
    result[apiType] = resolveApiTypeProblemDetails({
      apiType: apiType,
      operationType: operationType,
      contractsSummary: contractsSummary,
      invalidDocumentNames: invalidDocs
        .filter(doc => isSpecTypeForApiType(doc.type, apiType))
        .map(doc => doc.title || doc.filename || doc.slug || 'Unknown document'),
      versionKey: versionKey,
    })
  }

  return result
}

function collectAffectedOverviewTypes(
  operationTypes: Partial<Record<ApiType, OperationTypeSummary>> | undefined,
  contractsSummary: VersionContractsSummary | undefined,
): ReadonlyArray<Readonly<{ apiType: ApiType | ContractType; operationType?: OperationTypeSummary }>> {
  const affectedTypes: Array<{ apiType: ApiType | ContractType; operationType?: OperationTypeSummary }> = []

  if (operationTypes) {
    for (const [rawType, opSummary] of Object.entries(operationTypes)) {
      if (isApiType(rawType) && opSummary?.hasErrors) {
        affectedTypes.push({ apiType: rawType, operationType: opSummary })
      }
    }
  }

  if (contractsSummary?.ddl?.hasErrors) {
    affectedTypes.push({ apiType: CONTRACT_TYPE_DDL })
  }

  if (contractsSummary?.mcp?.totals?.hasErrors) {
    affectedTypes.push({ apiType: CONTRACT_TYPE_MCP })
  }

  return affectedTypes
}

function hasApiTypeErrors(
  apiType: ApiType | ContractType,
  operationType?: OperationTypeSummary,
  contractsSummary?: VersionContractsSummary,
): boolean {
  if (isApiType(apiType)) {
    return operationType?.hasErrors ?? false
  }
  if (apiType === CONTRACT_TYPE_DDL) {
    return contractsSummary?.ddl?.hasErrors ?? false
  }
  if (apiType === CONTRACT_TYPE_MCP) {
    return contractsSummary?.mcp?.totals?.hasErrors ?? false
  }
  return false
}
