import { useQuery } from '@tanstack/react-query'
import { portalRequestJson } from '@portal/utils/requests'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { Users, UsersDto } from '@netcracker/qubership-apihub-ui-shared/types/user'
import { toUsers } from '@netcracker/qubership-apihub-ui-shared/types/user'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'

const USERS_QUERY_KEY = 'users-query-key'

export function useUsers(
  { searchValue, packageKey, enabled = true }: { searchValue: string; packageKey?: Key | undefined; enabled?: boolean },
): [Users | null, IsLoading, Error | null] {
  const { data, error, isInitialLoading } = useQuery<UsersDto, Error, Users>({
    queryKey: [USERS_QUERY_KEY, packageKey, searchValue],
    queryFn: () => getUsersByFilter(searchValue),
    select: toUsers,
    enabled: enabled,
  })

  return [data ?? null, isInitialLoading, error]
}

export async function getUsersByFilter(
  searchValue: string,
  limit: number = 10,
  page: number = 0,
): Promise<UsersDto> {
  const searchParams = optionalSearchParams({
    filter: { value: searchValue },
    limit: { value: limit },
    page: { value: page },
  })

  return await portalRequestJson<UsersDto>(`/users?${searchParams}`, {
    method: 'GET',
  })
}
