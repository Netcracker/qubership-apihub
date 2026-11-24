import { useQuery } from '@tanstack/react-query'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { Namespaces, NamespacesDto } from '@netcracker/qubership-apihub-ui-shared/entities/namespaces'
import { EMPTY_NAMESPACES, toNamespaces } from '@netcracker/qubership-apihub-ui-shared/entities/namespaces'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { portalRequestJson } from '@portal/utils/requests'
import {
  useGetAgentPrefix,
} from '@netcracker/qubership-apihub-ui-shared/features/system-extensions/useSystemExtensions'
import { API_V2 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

const NAMESPACES_QUERY_KEY = 'namespaces-query-key'

export function useNamespaces(agentKey: Key): [Namespaces, IsLoading] {
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

export async function getNamespaces(agentKey: Key, prefix: string): Promise<NamespacesDto> {
  const agentId = encodeURIComponent(agentKey)

  return await portalRequestJson<NamespacesDto>(`/agents/${agentId}/namespaces`, {
      method: 'get',
    },
    { basePath: `${prefix}${API_V2}` })
}
