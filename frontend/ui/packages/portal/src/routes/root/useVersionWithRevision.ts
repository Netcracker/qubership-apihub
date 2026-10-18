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

import { useMemo } from 'react'
import { usePackageVersionContent } from './usePackageVersionContent'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'

export type VersionWithRevisionQueryState = {
  fullVersion: Key
  latestRevision: boolean
  isLoading: IsLoading
  isInitialLoading: IsLoading
}

export function useVersionWithRevision(
  version: Key | undefined,
  packageKey: Key | undefined,
  enabled?: boolean,
): VersionWithRevisionQueryState {
  const { versionContent, isLoading, isInitialLoading } = usePackageVersionContent({
    versionKey: version,
    packageKey: packageKey,
    enabled: enabled,
  })
  const { version: versionWithRevision, latestRevision } = versionContent ?? {}
  return useMemo(
    () => ({
      fullVersion: versionWithRevision ?? '',
      latestRevision: latestRevision ?? true,
      isLoading: isLoading,
      isInitialLoading: isInitialLoading,
    }),
    [isInitialLoading, isLoading, latestRevision, versionWithRevision],
  )
}
