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
import { ncCustomAgentsRequestJson } from '@apihub/utils/requests'
import { APIHUB_NC_BASE_PATH } from '@netcracker/qubership-apihub-ui-shared/utils/urls'
import { API_V1 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

export type IdpUrlDto = {
  identityProviderUrl: string
}

export function useNamespaceIdentityProviderUrl(options: {
  agentKey: string
  namespaceKey: string
}): [string | null, IsLoading] {
  const { agentKey, namespaceKey } = options

  const { data, isLoading } = useQuery<IdpUrlDto, Error, string>({
    queryKey: [IDENTITY_PROVIDER_URL_QUERY_KEY, agentKey, namespaceKey],
    queryFn: () => fetchIdpUrl(agentKey!, namespaceKey),
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
): Promise<IdpUrlDto> {
  const agentId = encodeURIComponent(agentKey)
  const namespaceId = encodeURIComponent(namespaceKey)

  const pathPattern = '/agents/:agentId/namespaces/:namespaceId/idp'
  return await ncCustomAgentsRequestJson<IdpUrlDto>(
    generatePath(pathPattern, { agentId, namespaceId }),
    {
      method: 'GET',
    },
    { basePath: `${APIHUB_NC_BASE_PATH}${API_V1}` },
  )
}

function idpToString(idpUrl: IdpUrlDto): string {
  return idpUrl.identityProviderUrl
}
