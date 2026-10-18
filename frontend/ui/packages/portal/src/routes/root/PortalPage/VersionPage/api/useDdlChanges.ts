import { type FetchNextPageOptions, type InfiniteQueryObserverResult, useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { generatePath } from 'react-router-dom'

import type { DiffType } from '@netcracker/qubership-apihub-api-diff'

import {
  type DdlChangesPage,
  type DdlChangesPageDto,
  toDdlChangesPage,
} from '@netcracker/qubership-apihub-ui-shared/entities/contracts-ddl-changelog'
import type { Key, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { HasNextPage, IsFetchingNextPage, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'
import { API_V1, requestJson } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { getFullVersion } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import { replaceStringDiffTypeForDTO } from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget/api/getOperationChangelog'

export const DDL_CHANGES_QUERY_KEY = 'ddl-changes-query-key'

export type FetchNextDdlChangesPage = (
  options?: FetchNextPageOptions,
) => Promise<InfiniteQueryObserverResult<DdlChangesPage, Error>>

type UseDdlChangesOptions = Readonly<{
  packageKey?: Key
  versionKey?: VersionKey
  previousVersionKey?: VersionKey
  previousVersionPackageKey?: Key
  refPackageId?: Key
  textFilter?: string
  severityFilters?: DiffType[]
  page?: number
  limit?: number
  enabled?: boolean
}>

type UseDdlChangesResult = Readonly<{
  data: ReadonlyArray<DdlChangesPage>
  isLoading: IsLoading
  fetchNextPage: FetchNextDdlChangesPage
  isFetchingNextPage: IsFetchingNextPage
  hasNextPage: HasNextPage
  isChangelogReady: boolean
}>

export function useDdlChanges(options: UseDdlChangesOptions): UseDdlChangesResult {
  const {
    packageKey,
    versionKey,
    previousVersionKey,
    previousVersionPackageKey,
    refPackageId,
    textFilter,
    severityFilters,
    page = 1,
    limit = 100,
    enabled = true,
  } = options

  const {
    data,
    isLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useInfiniteQuery<DdlChangesPage, Error>({
    queryKey: [
      DDL_CHANGES_QUERY_KEY,
      packageKey,
      versionKey,
      previousVersionKey,
      previousVersionPackageKey,
      refPackageId,
      textFilter,
      severityFilters,
      limit,
    ],
    enabled: !!packageKey && !!versionKey && !!previousVersionKey && enabled,
    retry: false,
    queryFn: async ({ pageParam = page, signal }) => {
      const dto = await getDdlChanges({
        packageKey: packageKey!,
        versionKey: versionKey!,
        previousVersionKey: previousVersionKey,
        previousVersionPackageKey: previousVersionPackageKey,
        refPackageId: refPackageId,
        textFilter: textFilter,
        severityFilters: severityFilters,
        page: pageParam - 1,
        limit: limit,
      }, signal)
      return toDdlChangesPage(dto)
    },
    getNextPageParam: (lastPage, allPages) => {
      if (limit && enabled) {
        return lastPage.entities.length === limit ? allPages.length + 1 : undefined
      }
      return undefined
    },
  })

  const ddlChangesPages = useMemo(
    () => data?.pages ?? [],
    [data?.pages],
  )

  return {
    data: ddlChangesPages,
    isLoading: isLoading,
    fetchNextPage: fetchNextPage,
    isFetchingNextPage: isFetchingNextPage,
    hasNextPage: hasNextPage,
    isChangelogReady: !isLoading && !isFetchingNextPage && !hasNextPage,
  }
}

async function getDdlChanges(
  options: {
    packageKey: Key
    versionKey: VersionKey
    previousVersionKey?: VersionKey
    previousVersionPackageKey?: Key
    refPackageId?: Key
    textFilter?: string
    severityFilters?: DiffType[]
    page: number
    limit: number
  },
  signal?: AbortSignal,
): Promise<DdlChangesPageDto> {
  const {
    packageKey,
    versionKey,
    previousVersionKey,
    previousVersionPackageKey,
    refPackageId,
    textFilter,
    severityFilters,
    page,
    limit,
  } = options

  const packageId = encodeURIComponent(packageKey)
  const fullVersion = await getFullVersion({ packageKey, versionKey }, signal)
  const versionId = encodeURIComponent(fullVersion.version)
  const severityDto = replaceStringDiffTypeForDTO(severityFilters)

  const queryParams = optionalSearchParams({
    previousVersion: { value: previousVersionKey },
    previousVersionPackageId: { value: previousVersionPackageKey },
    refPackageId: { value: refPackageId },
    textFilter: { value: textFilter },
    severity: { value: severityDto },
    page: { value: page },
    limit: { value: limit },
  })

  const pathPattern = '/packages/:packageId/versions/:versionId/ddl/changes'
  return requestJson<DdlChangesPageDto>(
    `${generatePath(pathPattern, { packageId, versionId })}?${queryParams}`,
    { method: 'get', signal: signal },
    {
      basePath: API_V1,
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    },
  )
}
