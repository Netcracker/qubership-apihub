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

import { useBranchConfig } from '../../useBranchConfig'
import { useMemo } from 'react'
import { useAuthorization } from '@netcracker/qubership-apihub-ui-shared/hooks/authorization'
import type { User } from '@netcracker/qubership-apihub-ui-shared/types/user'

export function useOtherEditors(): ReadonlyArray<User> {
  const [branchConfig] = useBranchConfig()
  const [authorization] = useAuthorization()
  const userKey = authorization?.user.key ?? ''

  return useMemo(
    () => branchConfig?.editors.filter(editor => editor.key !== userKey) ?? [],
    [userKey, branchConfig?.editors],
  )
}
