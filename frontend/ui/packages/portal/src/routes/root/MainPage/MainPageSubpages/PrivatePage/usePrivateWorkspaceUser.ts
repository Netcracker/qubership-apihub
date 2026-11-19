import { useQuery } from '@tanstack/react-query'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { portalRequestJson } from '@portal/utils/requests'

export const SPACE_QUERY_KEY = 'space-query-key'

export function usePrivateWorkspace(options?: Partial<{
  cacheTime?: number
}>): [Key, IsLoading] {
  const { cacheTime } = options ?? {}
  const { data, isLoading } = useQuery<Key, Error, Key>({
    queryKey: [SPACE_QUERY_KEY],
    queryFn: () => getPrivateWorkspaceUser(),
    cacheTime: cacheTime,
  })

  return [
    data ?? '',
    isLoading,
  ]
}

export async function getPrivateWorkspaceUser(): Promise<Key> {
  const { packageId } = await portalRequestJson<PrivateWorkspaceId>('/space', {
      method: 'get',
    },
    { customErrorHandler: onErrorHandler },
  )

  return packageId
}

async function onErrorHandler(): Promise<void> {
  return Promise.resolve()
}

type PrivateWorkspaceId = {
  packageId: Key
}
