import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { generatePath } from 'react-router-dom'

import type {
  McpCollection,
  McpContractEntityDetailsDto,
  McpEntityDetails,
} from '@netcracker/qubership-apihub-ui-shared/entities/contracts-mcp'
import { mcpCollectionToApiSegment, toMcpEntity } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-mcp'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { IsInitialLoading, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { API_V1, requestJson } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

import { useVersionWithRevision } from '../../../useVersionWithRevision'

export const MCP_ENTITY_DETAILS_QUERY_KEY = 'mcp-entity-details-query-key'

type McpEntityDetailsQueryState = {
  data: McpEntityDetails | undefined
  isLoading: IsLoading
  isInitialLoading: IsInitialLoading
}

type UseMcpEntityDetailsOptions = Readonly<{
  packageKey?: Key
  versionKey?: Key
  collection: McpCollection
  mcpEntityId?: Key
  enabled?: boolean
}>

export function useMcpEntityDetails(options: UseMcpEntityDetailsOptions): McpEntityDetailsQueryState {
  const {
    packageKey,
    versionKey,
    collection,
    mcpEntityId,
    enabled = true,
  } = options

  const { fullVersion } = useVersionWithRevision(versionKey, packageKey)

  const { data, isLoading, isInitialLoading } = useQuery<McpContractEntityDetailsDto, Error, McpEntityDetails>({
    queryKey: [MCP_ENTITY_DETAILS_QUERY_KEY, packageKey, fullVersion, collection, mcpEntityId],
    queryFn: () => getMcpEntityDetails(packageKey!, fullVersion!, collection, mcpEntityId!),
    enabled: !!packageKey && !!fullVersion && !!mcpEntityId && enabled,
    keepPreviousData: true,
    select: dto => ({ ...toMcpEntity(dto), data: dto.data }),
  })

  return useMemo(() => ({
    data,
    isLoading,
    isInitialLoading,
  }), [data, isInitialLoading, isLoading])
}

async function getMcpEntityDetails(
  packageKey: Key,
  versionKey: Key,
  collection: McpCollection,
  mcpEntityId: Key,
): Promise<McpContractEntityDetailsDto> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)
  const encodedMcpEntityId = encodeURIComponent(mcpEntityId)

  const pathPattern = '/packages/:packageId/versions/:versionId/mcp/:apiEntity/:mcpEntityId'
  return requestJson<McpContractEntityDetailsDto>(
    generatePath(pathPattern, {
      packageId: packageId,
      versionId: versionId,
      apiEntity: mcpCollectionToApiSegment(collection),
      mcpEntityId: encodedMcpEntityId,
    }),
    { method: 'get' },
    { basePath: API_V1 },
  )
}
