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

import type { Params, PathMatch } from 'react-router'
import { matchPath } from 'react-router-dom'

export function isUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch (e) {
    return false
  }
}

export function matchPathname(pathname: string, patterns: string[]): PathMatch | null {
  let pathMatch: PathMatch<string> | null = null
  patterns.find(pattern => {
    const match = matchPath(`${pattern}*`, pathname)
    if (match) {
      pathMatch = match
    }
  })

  return pathMatch
}

export function replaceParam(locationPathname: string, params: Params<string>, paramKey: string, newParamValue: string): string | null {
  if (!params[paramKey]) {
    return null
  }

  return locationPathname
    .split('/')
    .map(segment => (segment === params[paramKey] ? newParamValue : segment))
    .join('/')
}

export const APIHUB_NC_BASE_PATH = '/apihub-nc'
