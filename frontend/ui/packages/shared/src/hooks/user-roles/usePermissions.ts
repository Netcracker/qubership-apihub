import { useQuery } from '@tanstack/react-query'
import type { IsLoading } from '../../utils/aliases'
import type { Permissions, PermissionsDto } from '../../types/permissions'
import { requestJson } from '../../utils/requests'

const PERMISSIONS_QUERY_KEY = 'permissions-query-key'

export function usePermissions(enabled = true): [Permissions, IsLoading, Error | null] {
  const { data, isInitialLoading, error } = useQuery<PermissionsDto, Error, Permissions>({
    queryKey: [PERMISSIONS_QUERY_KEY],
    queryFn: () => getPermissions(),
    select: (value: PermissionsDto) => value.permissions,
    enabled: enabled,
  })

  return [data ?? [], isInitialLoading, error]
}

export async function getPermissions(): Promise<PermissionsDto> {
  return await requestJson<PermissionsDto>('/api/v2/permissions', {
    method: 'GET',
  })
}
