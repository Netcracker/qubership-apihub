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

import { useAnonymousAccessEnabled } from './useAnonymousAccess'
import { useOptionalUser } from './useUser'

export type IsAnonymousState = [isAnonymous: boolean, isLoading: boolean]

/**
 * Whether the current visitor browses the portal anonymously (anonymous access is enabled and no user is signed in).
 * When anonymous access is disabled always resolves to `false` (the regular user flow handles authentication).
 */
export function useIsAnonymousState(): IsAnonymousState {
  const anonymousAccessEnabled = useAnonymousAccessEnabled()
  const [, isLoading, isAnonymous] = useOptionalUser(anonymousAccessEnabled)
  if (!anonymousAccessEnabled) {
    return [false, false]
  }
  return [isAnonymous, isLoading]
}

export function useIsAnonymous(): boolean {
  return useIsAnonymousState()[0]
}
