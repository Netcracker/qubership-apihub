import { useQuery } from '@tanstack/react-query'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { ServiceNames, ServiceNamesDto } from '@netcracker/qubership-apihub-ui-shared/entities/service-names'
import { getServiceNames, toServiceNames } from '@netcracker/qubership-apihub-ui-shared/entities/service-names'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import {
  useGetAgentPrefix,
} from '@netcracker/qubership-apihub-ui-shared/features/system-extensions/useSystemExtensions'

const SERVICE_NAMES_QUERY_KEY = 'service-names-query-key'

export function useServiceNames(agentKey: Key, namespaceName: string | undefined): [ServiceNames, IsLoading] {
  const prefix = useGetAgentPrefix()
  const { data, isLoading } = useQuery<ServiceNamesDto, Error, ServiceNames>({
    queryKey: [SERVICE_NAMES_QUERY_KEY, agentKey, namespaceName],
    queryFn: () => getServiceNames(agentKey!, namespaceName!, prefix),
    select: toServiceNames,
    enabled: !!agentKey && !!namespaceName,
  })

  return [
    data ?? [],
    isLoading,
  ]
}
