/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
