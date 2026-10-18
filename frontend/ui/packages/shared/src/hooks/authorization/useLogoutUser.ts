import { useMutation } from '@tanstack/react-query'
import { API_V1, requestVoid } from '../../utils/requests'
import type { IsLoading } from '../../utils/aliases'

type LogoutFunction = () => void

export function useLogoutUser(): [LogoutFunction, IsLoading, Error | null] {
  const { mutate, isLoading, error } = useMutation<void, Error>({
    mutationFn: logout,
  })

  return [mutate, isLoading, error]
}

function logout(): Promise<void> {
  return requestVoid('/logout', { method: 'POST' }, { basePath: API_V1 })
}
