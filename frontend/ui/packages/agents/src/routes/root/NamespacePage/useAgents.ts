import { useQuery } from '@tanstack/react-query'
import type { Agents } from '@netcracker/qubership-apihub-ui-shared/entities/agents'
import { EMPTY_AGENTS, getAgents } from '@netcracker/qubership-apihub-ui-shared/entities/agents'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import {
  useGetAgentPrefix,
} from '@netcracker/qubership-apihub-ui-shared/features/system-extensions/useSystemExtensions'

const AGENTS_QUERY_KEY = 'agents-query-key'

export function useAgents(): [Agents, IsLoading] {
  const prefix = useGetAgentPrefix()
  const { data, isLoading } = useQuery<Agents, Error, Agents>({
    queryKey: [AGENTS_QUERY_KEY],
    queryFn: () => getAgents(prefix),
  })

  return [
    data ?? EMPTY_AGENTS,
    isLoading,
  ]
}
