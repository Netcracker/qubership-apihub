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
import { usePackageVersions } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/usePackageVersions'
import type { VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { RELEASE_VERSION_STATUS } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import { usePackageKey } from '../../usePackage'

export function usePreviousVersionOptions(): VersionKey[] {
  const defaultPackageKey = usePackageKey()
  const [versions] = usePackageVersions({ packageKey: defaultPackageKey, status: RELEASE_VERSION_STATUS })

  return useMemo(() => ([
    NO_PREVIOUS_RELEASE_VERSION_OPTION,
    ...versions.map(({ key }) => key),
  ]), [versions])
}

export const NO_PREVIOUS_RELEASE_VERSION_OPTION: VersionKey = 'No previous release version'
