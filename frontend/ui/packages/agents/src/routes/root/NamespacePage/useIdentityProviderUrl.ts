import { generatePath } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { API_V1, requestJson } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import {
  useGetNcServicePrefix,
} from '@netcracker/qubership-apihub-ui-shared/features/system-extensions/useSystemExtensions'

export type IdpUrlDto = {
  identityProviderUrl: string
}

export function useNamespaceIdentityProviderUrl(options: {
  agentKey: string
  namespaceKey: string
}): [string | null, IsLoading] {
  const { agentKey, namespaceKey } = options
  const ncServicePrefix = useGetNcServicePrefix()
  const { data, isLoading } = useQuery<IdpUrlDto, Error, string>({
    queryKey: [IDENTITY_PROVIDER_URL_QUERY_KEY, agentKey, namespaceKey],
    queryFn: () => fetchIdpUrl(agentKey!, namespaceKey, ncServicePrefix),
    enabled: !!ncServicePrefix,
    select: idpToString,
  })

  return [
    data ?? null,
    isLoading,
  ]
}

const IDENTITY_PROVIDER_URL_QUERY_KEY = 'identity-provider-url-query-key'

async function fetchIdpUrl(
  agentKey: string,
  namespaceKey: string,
  prefix: string,
): Promise<IdpUrlDto> {
  const agentId = encodeURIComponent(agentKey)
  const namespaceId = encodeURIComponent(namespaceKey)

  const pathPattern = '/agents/:agentId/namespaces/:namespaceId/idp'
  return await requestJson<IdpUrlDto>(
    generatePath(pathPattern, { agentId, namespaceId }),
    {
      method: 'GET',
    },
    { basePath: `${prefix}${API_V1}` },
  )
}

function idpToString(idpUrl: IdpUrlDto): string {
  return idpUrl.identityProviderUrl
}
