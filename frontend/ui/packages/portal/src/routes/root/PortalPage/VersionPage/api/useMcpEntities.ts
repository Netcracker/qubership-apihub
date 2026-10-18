import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { generatePath } from 'react-router-dom'

import type { FetchNextMetaList } from '@netcracker/qubership-apihub-ui-shared/components/MetaClickableListWithPreview'
import type {
  McpCollection,
  McpEntitiesDto,
  McpContractEntity,
} from '@netcracker/qubership-apihub-ui-shared/entities/contracts-mcp'
import { mcpCollectionToApiSegment, toMcpContractEntities } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-mcp'
import type { Key, PackageKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { HasNextPage, IsFetchingNextPage, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { API_V1, requestJson } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'

import { useVersionWithRevision } from '../../../useVersionWithRevision'

export const MCP_ENTITIES_QUERY_KEY = 'mcp-entities-query-key'

type UseMcpEntitiesOptions = Readonly<{
  packageKey?: Key
  versionKey?: Key
  collection: McpCollection
  textFilter?: string
  mcpEndpoint?: string
  refPackageKey?: PackageKey
  limit?: number
  enabled?: boolean
}>

export function useMcpEntities(options: UseMcpEntitiesOptions): [
  ReadonlyArray<McpContractEntity>,
  IsLoading,
  FetchNextMetaList,
  IsFetchingNextPage,
  HasNextPage,
] {
  const {
    packageKey,
    versionKey,
    collection,
    textFilter,
    mcpEndpoint,
    refPackageKey,
    limit = 100,
    enabled = true,
  } = options

  const { fullVersion } = useVersionWithRevision(versionKey, packageKey)

  const {
    data: entitiesList,
    isLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useInfiniteQuery<ReadonlyArray<McpContractEntity>, Error>({
    queryKey: [MCP_ENTITIES_QUERY_KEY, packageKey, fullVersion, collection, mcpEndpoint, textFilter, refPackageKey],
    queryFn: ({ pageParam = 0, signal }) =>
      getMcpEntities({
        packageKey: packageKey!,
        versionKey: fullVersion!,
        collection: collection,
        textFilter: textFilter,
        mcpEndpoint: mcpEndpoint,
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

  const entities = useMemo(() => entitiesList?.pages.flat() ?? [], [entitiesList?.pages])

  return [
    entities,
    isLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  ]
}

async function getMcpEntities(
  options: {
    packageKey: Key
    versionKey: Key
    collection: McpCollection
    textFilter?: string
    mcpEndpoint?: string
    refPackageKey?: PackageKey
    limit?: number
    offset?: number
  },
  signal?: AbortSignal,
): Promise<ReadonlyArray<McpContractEntity>> {
  const {
    packageKey,
    versionKey,
    collection,
    textFilter,
    mcpEndpoint,
    refPackageKey,
    limit,
    offset,
  } = options

  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)

  const queryParams = optionalSearchParams({
    textFilter: { value: textFilter },
    mcpEndpoint: { value: mcpEndpoint },
    refPackageId: { value: refPackageKey },
    limit: { value: limit },
    offset: { value: offset, toStringValue: value => `${value}` },
  })

  const pathPattern = '/packages/:packageId/versions/:versionId/mcp/:apiEntity'
  const response = await requestJson<McpEntitiesDto>(
    `${
      generatePath(pathPattern, {
        packageId: packageId,
        versionId: versionId,
        apiEntity: mcpCollectionToApiSegment(collection),
      })
    }?${queryParams}`,
    { method: 'get', signal: signal },
    { basePath: API_V1 },
  )

  return toMcpContractEntities(response)
}
