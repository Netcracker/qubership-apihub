import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import type { InvalidateQuery, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { WORKSPACE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import type { Snapshots, SnapshotsDto } from '@agents/entities/snapshots'
import { EMPTY_SNAPSHOTS, getSnapshots, toSnapshots } from '@agents/entities/snapshots'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import {
  useGetAgentPrefix,
} from '@netcracker/qubership-apihub-ui-shared/features/system-extensions/useSystemExtensions'

const SNAPSHOTS_QUERY_KEY = 'snapshots-query-key'

export function useSnapshots(): [Snapshots, IsLoading] {
  const { agentId, namespaceKey } = useParams()
  const workspaceKey = useSearchParam(WORKSPACE_SEARCH_PARAM)
  const prefix = useGetAgentPrefix()

  const { data, isLoading } = useQuery<SnapshotsDto, Error, Snapshots>({
    queryKey: [SNAPSHOTS_QUERY_KEY, agentId, namespaceKey, workspaceKey],
    queryFn: () => getSnapshots(agentId!, namespaceKey!, workspaceKey!, prefix),
    enabled: !!namespaceKey,
    select: toSnapshots,
  })

  return [
    data ?? EMPTY_SNAPSHOTS,
    isLoading,
  ]
}

export function useInvalidateSnapshots(): InvalidateQuery<void> {
  const { namespaceKey, agentId } = useParams()
  const client = useQueryClient()

  return () => client.invalidateQueries({
    queryKey: [SNAPSHOTS_QUERY_KEY, agentId, namespaceKey],
    refetchType: 'all',
  })
}
