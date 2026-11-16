import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Services, ServicesDto } from '@agents/entities/services'
import { EMPTY_SERVICES, getServices, toServices } from '@agents/entities/services'
import { useParams } from 'react-router-dom'
import type { InvalidateQuery, IsError, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { RUNNING_DISCOVERY_STATUS } from '@agents/entities/statuses'
import { WORKSPACE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { STATUS_REFETCH_INTERVAL } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import {
  useGetAgentPrefix,
} from '@netcracker/qubership-apihub-ui-shared/features/system-extensions/useSystemExtensions'

const SERVICES_QUERY_KEY = 'services-query-key'

/**
 * The services of the namespace and the workspace in the URL. `IsError` holds only when the request failed with no
 * result to show: after a failed refetch, the last result stays.
 */
export function useServices(options?: {
  onlyWithSpecs: boolean
}): [Services, IsLoading, IsError] {
  const { agentId, namespaceKey } = useParams()
  const { onlyWithSpecs } = options ?? {}
  const workspaceKey = useSearchParam(WORKSPACE_SEARCH_PARAM)
  const prefix = useGetAgentPrefix()

  const { data, isLoading, isError } = useQuery<ServicesDto, Error, Services>({
    queryKey: [SERVICES_QUERY_KEY, agentId, namespaceKey, workspaceKey, onlyWithSpecs],
    queryFn: () => getServices(agentId!, namespaceKey!, workspaceKey!, onlyWithSpecs, prefix),
    enabled: !!namespaceKey,
    refetchInterval: data => (data?.status === RUNNING_DISCOVERY_STATUS ? STATUS_REFETCH_INTERVAL : false),
    select: toServices,
  })

  return [
    data ?? EMPTY_SERVICES,
    isLoading,
    isError && !data,
  ]
}

export function useInvalidateServices(): InvalidateQuery<void> {
  const { agentId, namespaceKey } = useParams()
  const client = useQueryClient()

  return () => client.invalidateQueries({
    queryKey: [SERVICES_QUERY_KEY, agentId, namespaceKey],
    refetchType: 'all',
  })
}
