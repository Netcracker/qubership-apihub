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

import { useServices } from './useServices'
import { useMemo } from 'react'
import { NO_PREVIOUS_VERSION_OPTION } from '@apihub/entities/snapshots'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'

export function useBaselineOptions(withDefaultOption = false): string[] {
  const [{ services }] = useServices()
  return useMemo(() => [
    ...new Set(withDefaultOption ? [NO_PREVIOUS_VERSION_OPTION] : []),
    ...new Set(services.flatMap(({ baseline }) => {
      if (baseline?.versions) {
        return baseline.versions.map(version => getSplittedVersionKey(version).versionKey)
      }
      return []
    })),
  ], [services, withDefaultOption])
}
