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
import type {
  DocumentSearchResult,
  DocumentSearchResultDto,
  Level,
  OperationSearchResult,
  OperationSearchResultDto,
  PackageSearchResult,
  PackageSearchResultDto,
  SearchCriteria,
  SearchResults,
  SearchResultsDto,
} from '../../../../entities/global-search'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { requestJson } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { getOptionalBody } from '@netcracker/qubership-apihub-ui-shared/utils/request-bodies'

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

  const searchResultsDto = await requestJson<SearchResultsDto>(`/api/v3/search/${level}?${queryParams}`, {
    method: 'POST',
    body: JSON.stringify(getOptionalBody(criteria)),
  })

  return toSearchResults(searchResultsDto)
}

function toSearchResults(value: SearchResultsDto): SearchResults {
  return {
    packages: value?.packages?.map(toPackageSearchResult) ?? [],
    operations: value?.operations?.map(toOperationSearchResult) ?? [],
    documents: value?.documents?.map(toDocumentSearchResult) ?? [],
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
