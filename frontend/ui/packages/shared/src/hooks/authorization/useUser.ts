import { useQuery } from '@tanstack/react-query'
import type { User, UserDto } from '../../types/user'
import { toUser } from '../../types/user'
import type { IsLoading } from '../../utils/aliases'
import { API_V1, requestJson } from '../../utils/requests'

const QUERY_KEY_USER = 'user-query-key'

export function useUser(enabled: boolean = true): [User | undefined, IsLoading, Error | null] {
  const { data, isLoading, error } = useQuery<UserDto, Error, User>({
    queryKey: [QUERY_KEY_USER],
    queryFn: getUser,
    select: toUser,
    refetchOnWindowFocus: true,
    enabled: enabled,
  })

  return [data, isLoading, error]
}

async function getUser(): Promise<UserDto> {
  return requestJson<UserDto>(
    '/user',
    { method: 'GET' },
    { basePath: API_V1 },
  )
}
