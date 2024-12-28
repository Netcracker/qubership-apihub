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

import { format } from './strings'
import type { FetchRedirectDetails } from './requests'
import { API_BASE_PATH_PATTERN, FETCH_REDIRECT_TYPE_PACKAGE } from './requests'
import { matchPath } from 'react-router-dom'
import type { PathMatch } from 'react-router'

export function redirectToSaml(): void {
  redirectTo('/api/v2/auth/saml')
}

export function redirectToGitlab(): void {
  redirectTo('/login/ncgitlab')
}

function redirectTo(path: string, redirectUri?: string): void {
  const url = format(
    '{}{}?redirectUri={}',
    location.origin, path, encodeURIComponent(redirectUri ?? location.href),
  );

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
