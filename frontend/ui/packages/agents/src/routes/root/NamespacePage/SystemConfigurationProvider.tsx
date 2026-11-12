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

