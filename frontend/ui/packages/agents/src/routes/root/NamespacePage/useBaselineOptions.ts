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
