import { useMutation } from '@tanstack/react-query'
import type { IsError, IsLoading } from '../../../utils/aliases'
import { getRedirectUri } from '../../../utils/redirects'
import { API_V3, requestVoid } from '../../../utils/requests'

export function useLoginUser(): [LoginUser, IsLoading, IsError] {
  const { mutate, isLoading, isError } = useMutation<void, Error, Credentials>({
    mutationFn: credentials => loginUser(credentials),
    onSuccess: () => {
      location.replace(getRedirectUri())
    },
    onError: () => {
      console.error('Wrong credentials!')
    },
  })

  return [mutate, isLoading, isError]
}

async function loginUser(
  { username, password }: Credentials,
): Promise<void> {
  const basic = window.btoa(`${username}:${password}`)

  return await requestVoid('/auth/local', {
    method: 'post',
    headers: { authorization: `Basic ${basic}` },
  }, { basePath: API_V3 })
}

type LoginUser = (credentials: Credentials) => void

type Credentials = Readonly<{
  username: string
  password: string
}>
