import { useMutation } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { useInvalidateServices } from '../../../useServices'
import type { IsError, IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { runServiceDiscovery } from '@agents/entities/services'
import { WORKSPACE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import {
  useGetAgentPrefix,
} from '@netcracker/qubership-apihub-ui-shared/features/system-extensions/useSystemExtensions'

export function useRunDiscovery(onError: (error: Error) => void): [RunDiscovery, IsLoading, IsSuccess, IsError] {
  const { agentId, namespaceKey } = useParams()
  const workspaceId = useSearchParam(WORKSPACE_SEARCH_PARAM)

  const invalidateServices = useInvalidateServices()
  const prefix = useGetAgentPrefix()

  const { mutate, isLoading, isSuccess, isError } = useMutation<void, Error | undefined>({
    mutationFn: () => runServiceDiscovery(agentId!, namespaceKey!, workspaceId!, prefix),
    onSuccess: invalidateServices,
    // A 401 rejects with no error, and the sign-in takes over from there
    onError: error => {
      if (error) {
        onError(error)
      }
    },
  })

  return [
    mutate,
    isLoading,
    isSuccess,
    isError,
  ]
}

export type RunDiscovery = () => void
