import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Services, ServicesDto } from '@agents/entities/services'
import { EMPTY_SERVICES, getServices, toServices } from '@agents/entities/services'
import { useParams } from 'react-router-dom'
import type { InvalidateQuery, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { RUNNING_DISCOVERY_STATUS } from '@agents/entities/statuses'
import { WORKSPACE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { STATUS_REFETCH_INTERVAL } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import {
  useGetAgentPrefix,
} from '@netcracker/qubership-apihub-ui-shared/features/system-extensions/useSystemExtensions'

const SERVICES_QUERY_KEY = 'services-query-key'

export function useServices(options?: {
  onlyWithSpecs: boolean
}): [Services, IsLoading] {
  const { agentId, namespaceKey } = useParams()
  const { onlyWithSpecs } = options ?? {}
  const workspaceKey = useSearchParam(WORKSPACE_SEARCH_PARAM)
  const prefix = useGetAgentPrefix()

  const { data, isLoading } = useQuery<ServicesDto, Error, Services>({
    queryKey: [SERVICES_QUERY_KEY, agentId, namespaceKey, workspaceKey, onlyWithSpecs],
    queryFn: () => getServices(agentId!, namespaceKey!, workspaceKey!, onlyWithSpecs, prefix),
    enabled: !!namespaceKey,
    refetchInterval: data => (data?.status === RUNNING_DISCOVERY_STATUS ? STATUS_REFETCH_INTERVAL : false),
    select: toServices,
  })

  return [
    data ?? EMPTY_SERVICES,
    isLoading,
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
