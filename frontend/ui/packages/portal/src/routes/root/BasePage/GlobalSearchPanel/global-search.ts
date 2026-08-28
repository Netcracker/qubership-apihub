/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { FetchNextPageOptions, InfiniteQueryObserverResult } from '@tanstack/react-query'
import omit from 'lodash-es/omit'

import { isApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
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
  SearchCommonCriteria,
  SearchCriteria,
  SearchResults,
  SearchResultsDto,
} from '../../../../entities/global-search'
import { OPERATION_LEVEL, SEARCH_OPERATION_ONLY_CRITERIA } from '../../../../entities/global-search'

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
  const common = pickSearchCommonCriteria(criteria)

  if (level !== OPERATION_LEVEL) {
    return getOptionalBody(common) ?? {}
  }

  const apiContract = criteria.apiContract ?? criteria.apiType
  const apiType = apiContract && isApiType(apiContract) ? apiContract : criteria.apiType

  return getOptionalBody({ ...common, apiType }) ?? {}
}

function pickSearchCommonCriteria(criteria: SearchCriteria): SearchCommonCriteria {
  return omit(criteria, SEARCH_OPERATION_ONLY_CRITERIA)
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
