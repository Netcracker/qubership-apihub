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

import { useCookie, useDebounce, useLocalStorage } from 'react-use'
import { safeParse } from '@stoplight/json'
import type { Dispatch, SetStateAction } from 'react'
import type { Authorization, AuthorizationDto } from '../../types/authorization'
import { AUTHORIZATION_COOKIE_KEY, AUTHORIZATION_LOCAL_STORAGE_KEY } from '../../utils/constants'
import { isTokenExpired } from '../../entities/token-payload'
import { toUser } from '../../types/user'

export const DEFAULT_AUTHORIZATION_DEBOUNCE = 1500

export type AuthorizationOptions = { cookie?: string | null; setLogin?: Dispatch<SetStateAction<boolean>> }

export function useAuthorization(options?: AuthorizationOptions): [Authorization | undefined, SetAuthorization, RemoveAuthorization] {
  const [localStorageAuthorization, setLocalStorageAuthorization, removeLocalStorageAuthorization] = useLocalStorage<Authorization>(AUTHORIZATION_LOCAL_STORAGE_KEY)
  const [cookieAuthorization, , removeCookieAuthorization] = useCookie(AUTHORIZATION_COOKIE_KEY)

  useDebounce(() => {
    if (localStorageAuthorization && !isTokenExpired(localStorageAuthorization.token)) {
      options?.setLogin?.(true)
    }
  }, 1000)

  if (localStorageAuthorization && isTokenExpired(localStorageAuthorization.token)) {
    removeLocalStorageAuthorization()
  }

  if (!localStorageAuthorization) {
    const authorizationDto = safeParse(window.atob(options?.cookie ?? cookieAuthorization ?? '')) as AuthorizationDto | null
    const authorization = authorizationDto && { ...authorizationDto, user: toUser(authorizationDto!.user!) }
    authorization && !isTokenExpired(authorization.token) && setLocalStorageAuthorization(authorization)
  }

  const removeAuthorization = (): void => {
    removeLocalStorageAuthorization()
    removeCookieAuthorization()
  }

  return [localStorageAuthorization, setLocalStorageAuthorization, removeAuthorization]
}

type SetAuthorization = Dispatch<SetStateAction<Authorization | undefined>>
type RemoveAuthorization = () => void

export type LoginUser = (credentials: Credentials) => void

export type Credentials = Readonly<{
  username: string
  password: string
}>
