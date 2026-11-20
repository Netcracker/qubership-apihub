import { useMemo } from 'react'

import { useAppApiProcessorVersion } from '@netcracker/qubership-apihub-ui-shared/hooks/frontend-version/useVersionInfo'
import { agent } from '@netcracker/qubership-apihub-ui-shared/utils/version-info'

import type { ServiceKey } from '@agents/entities/keys'
import { type BaselineOptions, toBaselineOptions } from './baselineOptions'
import { useServices } from './useServices'

type UseBaselineOptionsParams = {
  selectedServiceKeys?: ReadonlyArray<ServiceKey>
}

export function useBaselineOptions({ selectedServiceKeys }: UseBaselineOptionsParams = {}): BaselineOptions {
  const [{ services }] = useServices()
  const appApiProcessorVersion = useAppApiProcessorVersion(agent)

  return useMemo(
    () => toBaselineOptions(services, selectedServiceKeys, appApiProcessorVersion),
    [appApiProcessorVersion, selectedServiceKeys, services],
  )
}
