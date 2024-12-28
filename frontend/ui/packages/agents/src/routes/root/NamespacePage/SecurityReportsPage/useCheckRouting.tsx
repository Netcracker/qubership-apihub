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

import { useInvalidateSecurityReports } from './useSecurityReports'
import { useMutation } from '@tanstack/react-query'
import type { Key } from '@apihub/entities/keys'
import { ncCustomAgentsRequestVoid } from '@apihub/utils/requests'
import type { HttpError } from '@netcracker/qubership-apihub-ui-shared/utils/responses'
import { API_V3 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { APIHUB_NC_BASE_PATH } from '@netcracker/qubership-apihub-ui-shared/utils/urls'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'

export type CheckRoutingDetails = {
  agentId: string
  namespaceId: string
  workspaceId: string
  idpUrl: string
  username: string
  password: string
}

export function useCheckRouting(onSuccess: () => void, onError: (error: HttpError) => void): [StartRoutingCheckFunction, IsLoading] {
  const invalidateSecurityReports = useInvalidateSecurityReports()

  const { mutate, isLoading } = useMutation<void, HttpError, CheckRoutingDetails>({
    mutationFn: ({ agentId, namespaceId, workspaceId, idpUrl, username, password }) =>
      startRoutingCheck(agentId, namespaceId, workspaceId, idpUrl, username, password),
    onSuccess: () => {
      invalidateSecurityReports()
      onSuccess()
    },
    onError: error => onError(error),
  })

  return [mutate, isLoading]
}

async function startRoutingCheck(
  agentKey: Key,
  nameKey: Key,
  workspaceKey: Key,
  identityProviderUrl: string,
  username: string,
  password: string,
): Promise<void> {
  const agentId = encodeURIComponent(agentKey)
  const name = encodeURIComponent(nameKey)
  const workspaceId = encodeURIComponent(workspaceKey)

  await ncCustomAgentsRequestVoid(
    '/security/gatewayRouting',
    {
      method: 'POST',
      body: JSON.stringify({
        agentId,
        name,
        workspaceId,
        identityProviderUrl,
        username,
        password,
      }),
    }, {
      basePath: `${APIHUB_NC_BASE_PATH}${API_V3}`,
    },
  )
}

type StartRoutingCheckFunction = (details: CheckRoutingDetails) => void
