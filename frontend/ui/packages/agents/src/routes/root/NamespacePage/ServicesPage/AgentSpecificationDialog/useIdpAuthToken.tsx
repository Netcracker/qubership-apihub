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

import { useMutation } from '@tanstack/react-query'
import type { Key } from '@apihub/entities/keys'
import { ncCustomAgentsRequestBlob } from '@apihub/utils/requests'
import type { HttpError } from '@netcracker/qubership-apihub-ui-shared/utils/responses'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { generatePath } from 'react-router-dom'
import { useShowErrorNotification, useShowSuccessNotification } from '../../../BasePage/NotificationHandler'

export type IdpAuthTokenDetails = {
  agentId: string
  namespaceId: string
  idpUrl: string
  username: string
  password: string
  tenant: string
}

export function useIdpAuthToken(): [string | undefined, GetIdpAuthTokenFunction, IsLoading] {
  const errorNotification = useShowErrorNotification()
  const successNotification = useShowSuccessNotification()

  const { data, mutate, isLoading } = useMutation<string, HttpError, IdpAuthTokenDetails>({
    mutationFn: ({ agentId, namespaceId, idpUrl, username, password, tenant }) =>
      getIdpAuthToken(agentId, namespaceId, idpUrl, username, password, tenant),
    onSuccess: () => {
      successNotification({
        message: 'Authorization header applied to the Playground',
      })
    },
    onError: (error) => {
      errorNotification({
        title: error.name,
        message: error.message,
      })
    },
  })

  return [data, mutate, isLoading]
}

async function getIdpAuthToken(
  agentKey: Key,
  nameKey: Key,
  identityProviderUrl: string,
  username: string,
  password: string,
  tenant: string,
): Promise<string> {
  const agentId = encodeURIComponent(agentKey)
  const name = encodeURIComponent(nameKey)

  const pathPattern = '/agents/:agentId/namespaces/:name/idp/token'
  const res = await ncCustomAgentsRequestBlob(generatePath(pathPattern, { agentId, name }), {
      method: 'post',
      body: JSON.stringify({
        agentId,
        name,
        identityProviderUrl,
        username,
        password,
        tenant,
      }),
    },
  )

  return res.headers.get('X-Authorization-Header-Value') ?? ''
}

type GetIdpAuthTokenFunction = (details: IdpAuthTokenDetails) => void
