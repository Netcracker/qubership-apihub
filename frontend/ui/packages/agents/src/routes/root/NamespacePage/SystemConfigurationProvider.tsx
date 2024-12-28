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

import {
  createContext,
  type FC,
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react'
import { useSystemConfiguration } from '@netcracker/qubership-apihub-ui-shared/hooks/authorization/useSystemConfiguration'
import type { SystemConfiguration } from '@netcracker/qubership-apihub-ui-shared/types/system-configuration'

const SystemConfigurationContext = createContext<SystemConfiguration | null | undefined>()

export function useSystemConfigurationContext(): SystemConfiguration | null | undefined {
  return useContext(SystemConfigurationContext)
}

export const SystemConfigurationProvider: FC<PropsWithChildren> = ({ children }) => {
  const [systemConfiguration, isLoading] = useSystemConfiguration()
  const [currentSystemConfiguration, setCurrentSystemConfiguration] = useState<SystemConfiguration | null>()

  useEffect(() => {
    if (isLoading) {
      setCurrentSystemConfiguration(null)
    } else {
      setCurrentSystemConfiguration(systemConfiguration)
    }
  }, [isLoading, systemConfiguration])

  return (
    <SystemConfigurationContext.Provider value={currentSystemConfiguration}>
      {children}
    </SystemConfigurationContext.Provider>
  )
}

