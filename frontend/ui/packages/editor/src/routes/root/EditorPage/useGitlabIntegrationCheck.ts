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

import { useAuthorization } from '@netcracker/qubership-apihub-ui-shared/hooks/authorization'
import { getTokenPayload } from '@netcracker/qubership-apihub-ui-shared/entities/token-payload'

export function useGitlabIntegrationCheck(): boolean {
  const [authorization] = useAuthorization()

  if (!authorization) {
    return false
  }

  try {
    return getTokenPayload(authorization.token).extensions.gitIntegration
  } catch (e) {/*do nothing*/}

  return false
}


