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
