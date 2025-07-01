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

import type { PathMatch } from 'react-router'
import { matchPath } from 'react-router-dom'
import { SEARCH_PARAM_NO_AUTO_LOGIN, SEARCH_PARAM_REDIRECT_URI } from './constants'
import type { FetchRedirectDetails } from './requests'
import { API_BASE_PATH_PATTERN, FETCH_REDIRECT_TYPE_PACKAGE } from './requests'
import { optionalSearchParams } from './search-params'

export function redirectToGitlab(): void {
  redirectTo('/login/gitlab')
}

export function redirectToLogin(): void {
  redirectTo('/login', optionalSearchParams({
    [SEARCH_PARAM_NO_AUTO_LOGIN]: { value: true },
    redirectUri: { value: location.href },
  }))
}

export function redirectTo(path: string, searchParams: URLSearchParams = new URLSearchParams()): void {
  const redirectUri = searchParams.get('redirectUri') ?? location.href
  searchParams.set('redirectUri', redirectUri)

  let url = location.origin
  if (path.includes('?')) {
    url = `${url}${path}&${searchParams}`
  } else {
    url = `${url}${path}?${searchParams}`
  }

  (() => {
    window.stop()
    location.replace(url)
  })()
}

type PackagePathPattern = `/${string}/:packageId${'' | `/${string}`}`

// Path Patterns should not include API_BASE_PATH
export function getPackageRedirectDetails<P extends PackagePathPattern>(
  response: Response,
  pathPattern: P,
): FetchRedirectDetails | null {
  const redirectedUrl = new URL(response.url)
  const match = matchPath(`${API_BASE_PATH_PATTERN}${pathPattern}`, redirectedUrl.pathname) as PathMatch<'packageId'> | null
  return match && match.params.packageId
    ? {
      redirectType: FETCH_REDIRECT_TYPE_PACKAGE,
      id: match.params.packageId,
    }
    : null
}

export function getRedirectUri(): string {
  const url = new URL(location.href)
  const redirectUri = url.searchParams.get(SEARCH_PARAM_REDIRECT_URI)
  if (redirectUri) {
    return redirectUri
  }
  if (location.pathname === '/login') {
    return location.origin
  }
  return location.href
}
