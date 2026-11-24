import { useMutation } from '@tanstack/react-query'
import type { Key } from '@agents/entities/keys'
import type { HttpError } from '@netcracker/qubership-apihub-ui-shared/utils/responses'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { generatePath } from 'react-router-dom'
import { useShowErrorNotification, useShowSuccessNotification } from '../../../BasePage/NotificationHandler'
import {
  useGetNcServicePrefix,
} from '@netcracker/qubership-apihub-ui-shared/features/system-extensions/useSystemExtensions'
import { API_V1, requestBlob } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

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
  const ncServicePrefix = useGetNcServicePrefix()
  const { data, mutate, isLoading } = useMutation<string, HttpError, IdpAuthTokenDetails>({
    mutationFn: ({ agentId, namespaceId, idpUrl, username, password, tenant }) =>
      getIdpAuthToken(agentId, namespaceId, idpUrl, username, password, tenant, ncServicePrefix),
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
  prefix: string,
): Promise<string> {
  const agentId = encodeURIComponent(agentKey)
  const name = encodeURIComponent(nameKey)

  const pathPattern = '/agents/:agentId/namespaces/:name/idp/token'
  const res = await requestBlob(generatePath(pathPattern, { agentId, name }), {
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
    { basePath: `${prefix}${API_V1}` },
  )

  return res.headers.get('X-Authorization-Header-Value') ?? ''
}

type GetIdpAuthTokenFunction = (details: IdpAuthTokenDetails) => void
