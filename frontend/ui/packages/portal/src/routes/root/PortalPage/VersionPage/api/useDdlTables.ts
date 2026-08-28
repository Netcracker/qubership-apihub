import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { generatePath } from 'react-router-dom'

import type { FetchNextMetaList } from '@netcracker/qubership-apihub-ui-shared/components/MetaClickableListWithPreview'
import type { DdlContractEntity, DdlEntitiesDto } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-ddl'
import { toDdlContractEntities } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-ddl'
import type { Key, PackageKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { HasNextPage, IsFetchingNextPage, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { API_V1, requestJson } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'

import { useVersionWithRevision } from '../../../useVersionWithRevision'

export const DDL_TABLES_QUERY_KEY = 'ddl-tables-query-key'

type UseDdlTablesOptions = Readonly<{
  packageKey?: Key
  versionKey?: Key
  textFilter?: string
  refPackageKey?: PackageKey
  limit?: number
  enabled?: boolean
}>

export function useDdlTables(options?: UseDdlTablesOptions): [
  ReadonlyArray<DdlContractEntity>,
  IsLoading,
  FetchNextMetaList,
  IsFetchingNextPage,
  HasNextPage,
] {
  const {
    packageKey,
    versionKey,
    textFilter,
    refPackageKey,
    limit = 100,
    enabled = true,
  } = options ?? {}

  const { fullVersion } = useVersionWithRevision(versionKey, packageKey)

  const {
    data: tablesList,
    isLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useInfiniteQuery<ReadonlyArray<DdlContractEntity>, Error>({
    queryKey: [DDL_TABLES_QUERY_KEY, packageKey, fullVersion, textFilter, refPackageKey],
    queryFn: ({ pageParam = 0, signal }) =>
      getDdlTables({
        packageKey: packageKey!,
        versionKey: fullVersion!,
        textFilter: textFilter,
        refPackageKey: refPackageKey,
        limit: limit,
        offset: pageParam,
      }, signal),
    getNextPageParam: (lastPage, allPages) => {
      if (!limit) {
        return undefined
      }
      return lastPage.length === limit ? allPages.length * limit : undefined
    },
    enabled: !!packageKey && !!fullVersion && enabled,
  })

  return [
    useMemo(() => tablesList?.pages.flat() ?? [], [tablesList?.pages]),
    isLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  ]
}

async function getDdlTables(
  options: {
    packageKey: Key
    versionKey: Key
    textFilter?: string
    refPackageKey?: PackageKey
    limit?: number
    offset?: number
  },
  signal?: AbortSignal,
): Promise<ReadonlyArray<DdlContractEntity>> {
  const {
    packageKey,
    versionKey,
    textFilter,
    refPackageKey,
    limit,
    offset,
  } = options

  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)

  const queryParams = optionalSearchParams({
    textFilter: { value: textFilter },
    refPackageId: { value: refPackageKey },
    limit: { value: limit },
    offset: { value: offset, toStringValue: value => `${value}` },
  })

  const pathPattern = '/packages/:packageId/versions/:versionId/ddl/entities'
  const response = await requestJson<DdlEntitiesDto>(
    `${generatePath(pathPattern, { packageId: packageId, versionId: versionId })}?${queryParams}`,
    { method: 'get', signal: signal },
    { basePath: API_V1 },
  )

  return toDdlContractEntities(response)
}
