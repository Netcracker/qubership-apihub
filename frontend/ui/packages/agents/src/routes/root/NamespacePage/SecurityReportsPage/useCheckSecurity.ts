import { useMutation } from '@tanstack/react-query'
import type { Key } from '@agents/entities/keys'
import { useInvalidateSecurityReports } from './useSecurityReports'
import { useParams } from 'react-router-dom'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { WORKSPACE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { API_V2, requestVoid } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import {
  useGetAgentPrefix,
} from '@netcracker/qubership-apihub-ui-shared/features/system-extensions/useSystemExtensions'

export function useCheckSecurity(): StartSecurityCheckFunction {
  const { agentId = '', namespaceKey = '' } = useParams()
  const workspaceKey = useSearchParam(WORKSPACE_SEARCH_PARAM)
  const prefix = useGetAgentPrefix()

  const invalidateSecurityReports = useInvalidateSecurityReports()

  const { mutate } = useMutation<void, Error, void>({
    mutationFn: () => startSecurityCheck(agentId, namespaceKey, workspaceKey!, prefix),
    onSuccess: () => invalidateSecurityReports(),
  })

  return mutate
}

async function startSecurityCheck(
  agentKey: Key,
  nameKey: Key,
  workspaceKey: Key,
  prefix: string,
): Promise<void> {
  const agentId = encodeURIComponent(agentKey)
  const name = encodeURIComponent(nameKey)
  const workspaceId = encodeURIComponent(workspaceKey)

  await requestVoid('/security/authCheck', {
      method: 'POST',
      body: JSON.stringify({ agentId, name, workspaceId }),
    },
    { basePath: `${prefix}${API_V2}` },
  )
}

type StartSecurityCheckFunction = () => void
