import type { FetchNextPageOptions, InfiniteQueryObserverResult } from '@tanstack/react-query'
import omit from 'lodash-es/omit'

import { getOptionalBody } from '@netcracker/qubership-apihub-ui-shared/utils/request-bodies'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { API_V4, requestJson } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

import type {
  DdlContractSearchResult,
  DdlContractSearchResultDto,
  DocumentSearchResult,
  DocumentSearchResultDto,
  Level,
  McpContractSearchResult,
  McpContractSearchResultDto,
  OperationSearchResult,
  OperationSearchResultDto,
  PackageSearchResult,
  PackageSearchResultDto,
  SearchCriteria,
  SearchResults,
  SearchResultsDto,
} from '../../../../entities/global-search'
import { DDL_LEVEL, MCP_LEVEL, toApiTypeFilter } from '../../../../entities/global-search'

export type FetchNextSearchResultList = (options?: FetchNextPageOptions) => Promise<InfiniteQueryObserverResult<SearchResults, Error>>

export async function getSearchResult(
  criteria: SearchCriteria,
  level: Level,
  limit: number,
  page: number,
): Promise<SearchResults> {

  const queryParams = optionalSearchParams({
    limit: { value: limit },
    page: { value: page, toStringValue: page => `${page}` },
  })

  const searchResultsDto = await requestJson<SearchResultsDto>(`/search/${level}?${queryParams}`, {
    method: 'POST',
    body: JSON.stringify(buildSearchRequestBody(criteria, level)),
  }, {
    basePath: API_V4,
  })

  return toSearchResults(searchResultsDto)
}

function buildSearchRequestBody(
  criteria: SearchCriteria,
  level: Level,
): object {
  const common = omit(criteria, ['apiContract'])

  // For mcp and ddl the level already *is* the contract type: those endpoints build a
  // GlobalContractSearchQuery, which has no api_type field.
  if (level === MCP_LEVEL || level === DDL_LEVEL) {
    return getOptionalBody(common) ?? {}
  }

  return getOptionalBody({ ...common, apiType: toApiTypeFilter(criteria) }) ?? {}
}

function toSearchResults(value: SearchResultsDto): SearchResults {
  return {
    packages: value?.packages?.map(toPackageSearchResult) ?? [],
    operations: value?.operations?.map(toOperationSearchResult) ?? [],
    documents: value?.documents?.map(toDocumentSearchResult) ?? [],
    mcpContracts: value?.mcpContracts?.map(toMcpContractSearchResult) ?? [],
    ddlContracts: value?.ddlContracts?.map(toDdlContractSearchResult) ?? [],
  }
}

function toPackageSearchResult(value: PackageSearchResultDto): PackageSearchResult {
  return {
    ...value,
    packageKey: value.packageId,
    createdAt: new Date(value.createdAt).toDateString(),
  }
}

function toOperationSearchResult(value: OperationSearchResultDto): OperationSearchResult {
  return {
    ...value,
    packageKey: value.packageId,
    operationKey: value.operationId,
    deprecated: value.deprecated ?? false,
  }
}

function toDocumentSearchResult(value: DocumentSearchResultDto): DocumentSearchResult {
  return {
    ...value,
    packageKey: value.packageId,
    createdAt: new Date(value.createdAt).toDateString(),
  }
}

function toMcpContractSearchResult(value: McpContractSearchResultDto): McpContractSearchResult {
  return {
    ...value,
    packageKey: value.packageId,
  }
}

function toDdlContractSearchResult(value: DdlContractSearchResultDto): DdlContractSearchResult {
  return {
    ...value,
    packageKey: value.packageId,
  }
}
