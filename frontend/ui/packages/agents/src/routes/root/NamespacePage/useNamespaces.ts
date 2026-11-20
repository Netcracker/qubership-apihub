import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import type {
  Namespaces,
  NamespacesDto,
} from '@netcracker/qubership-apihub-ui-shared/entities/namespaces'
import {
  EMPTY_NAMESPACES,
  getNamespaces,
  toNamespaces,
} from '@netcracker/qubership-apihub-ui-shared/entities/namespaces'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import {
  useGetAgentPrefix,
} from '@netcracker/qubership-apihub-ui-shared/features/system-extensions/useSystemExtensions'

const NAMESPACES_QUERY_KEY = 'namespaces-query-key'

export function useNamespaces(): [Namespaces, IsLoading] {
  const { agentId: agentKey } = useParams()
  const prefix = useGetAgentPrefix()
  const { data, isLoading } = useQuery<NamespacesDto, Error, Namespaces>({
    queryKey: [NAMESPACES_QUERY_KEY, agentKey],
    queryFn: () => getNamespaces(agentKey!, prefix),
    select: toNamespaces,
    enabled: !!agentKey,
  })

  return [
    data ?? EMPTY_NAMESPACES,
    isLoading,
  ]
}
