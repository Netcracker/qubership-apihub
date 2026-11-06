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

const SESSION_STORAGE_KEY_ANONYMOUS_SESSION = 'anonymousSession'

/**
 * Anonymous session: the backend allows anonymous read access and the current visitor is not logged in.
 * While it is active, a 401 from a protected endpoint is not an invitation to log in (no token refresh,
 * no redirect to the login page): the request simply fails and the UI shows what the anonymous
 * principal may see. The flag lives in sessionStorage so request wrappers can read it synchronously.
 */
export function markAnonymousSession(): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY_ANONYMOUS_SESSION, 'true')
  } catch {
    // storage unavailable (e.g. web worker): nothing to remember
  }
}

export function clearAnonymousSession(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY_ANONYMOUS_SESSION)
  } catch {
    // storage unavailable
  }
}

export function isAnonymousSession(): boolean {
  try {
    return typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_STORAGE_KEY_ANONYMOUS_SESSION) === 'true'
  } catch {
    return false
  }
}
