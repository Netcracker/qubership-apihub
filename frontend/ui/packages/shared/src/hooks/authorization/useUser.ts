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

import { useQuery } from '@tanstack/react-query'
import type { User, UserDto } from '../../types/user'
import { toUser } from '../../types/user'
import type { IsLoading } from '../../utils/aliases'
import { clearAnonymousSession, markAnonymousSession } from '../../utils/anonymous-session'
import { API_V1, isUnauthorizedError, requestJson } from '../../utils/requests'
import { tryRefreshToken } from '../../utils/security'

const QUERY_KEY_USER = 'user-query-key'
// Separate key: the two hooks have different 401 handling, and react-query uses the queryFn of the
// observer that last set options for a key, so sharing a key could trigger the login redirect.
const QUERY_KEY_OPTIONAL_USER = 'optional-user-query-key'

export type IsAnonymous = boolean

export function useUser(enabled: boolean = true): [User | undefined, IsLoading, Error | null] {
  const { data, isLoading, error } = useQuery<UserDto, Error, User>({
    queryKey: [QUERY_KEY_USER],
    queryFn: () => getUser(),
    select: toUser,
    refetchOnWindowFocus: true,
    enabled: enabled,
  })

  return [data, isLoading, error]
}

/**
 * Variant of {@link useUser} for pages that are available to anonymous (unauthenticated) users.
 * A 401 response does NOT trigger token refresh or redirect to the login page;
 * instead the hook resolves with no user and `isAnonymous = true`.
 */
export function useOptionalUser(enabled: boolean = true): [User | undefined, IsLoading, IsAnonymous] {
  const { data, isLoading, error, dataUpdatedAt, errorUpdatedAt } = useQuery<UserDto, Error, User>({
    queryKey: [QUERY_KEY_OPTIONAL_USER],
    queryFn: getOptionalUser,
    select: toUser,
    refetchOnWindowFocus: true,
    // A 401 is the expected answer for an anonymous visitor: do not re-request it every time
    // another component subscribes to the query (that would flip the query back to "loading").
    retryOnMount: false,
    enabled: enabled,
  })

  // Settled at least once (successfully or with an error). While a refetch without data is in progress
  // react-query reports "loading" again, which must not be treated as "not yet known".
  const hasSettled = dataUpdatedAt > 0 || errorUpdatedAt > 0
  const isAnonymous = !data && hasSettled && (!error || isUnauthorizedError(error))

  return [data, isLoading && !hasSettled, isAnonymous]
}

// Once a user has been seen in this page, a later 401 means the session expired:
// go through the regular token refresh / login flow instead of silently degrading to anonymous.
let userWasAuthenticated = false

// Remembers the outcome for the request wrappers (see anonymous-session.ts) before any other query runs
async function getOptionalUser(): Promise<UserDto> {
  if (userWasAuthenticated) {
    clearAnonymousSession()
    return getUser()
  }
  try {
    const user = await getUser({ skipAuthHandling: true })
    userWasAuthenticated = true
    clearAnonymousSession()
    return user
  } catch (error) {
    if (!isUnauthorizedError(error)) {
      throw error
    }
    // An expired access token answers 401 as well: try a silent refresh before giving up on the session,
    // otherwise the stale cookie would make every protected call fail while the page looks anonymous.
    if (await tryRefreshToken()) {
      const user = await getUser({ skipAuthHandling: true })
      userWasAuthenticated = true
      clearAnonymousSession()
      return user
    }
    markAnonymousSession()
    throw error
  }
}

async function getUser(options: { skipAuthHandling?: boolean } = {}): Promise<UserDto> {
  return requestJson<UserDto>(
    '/user',
    { method: 'GET' },
    { basePath: API_V1, ...options },
  )
}
