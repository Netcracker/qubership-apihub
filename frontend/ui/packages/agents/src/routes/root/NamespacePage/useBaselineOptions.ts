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
import { NO_PREVIOUS_VERSION_OPTION } from '@agents/entities/snapshots'
import type { ServiceKey } from '@agents/entities/keys'
import { type BaselineOptions, toBaselineOptions } from './baselineOptions'
import { useAppApiProcessorVersion } from '@netcracker/qubership-apihub-ui-shared/hooks/frontend-version/useVersionInfo'
import { agent } from '@netcracker/qubership-apihub-ui-shared/utils/version-info'

type UseBaselineOptionsParams = {
  selectedServiceKeys?: ReadonlyArray<ServiceKey>
  withDefaultOption?: boolean
}

export function useBaselineOptions({
  selectedServiceKeys,
  withDefaultOption = false,
}: UseBaselineOptionsParams = {}): BaselineOptions {
  const [{ services }] = useServices()
  const appApiProcessorVersion = useAppApiProcessorVersion(agent)

  return useMemo(() => {
    const options = toBaselineOptions(services, selectedServiceKeys, appApiProcessorVersion)
    if (!withDefaultOption) {
      return options
    }
    return {
      ...options,
      versionKeys: [NO_PREVIOUS_VERSION_OPTION, ...options.versionKeys],
    }
  }, [appApiProcessorVersion, selectedServiceKeys, services, withDefaultOption])
}
