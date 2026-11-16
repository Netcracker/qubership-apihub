import type { IsError, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { isEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'

import type { Services } from '@agents/entities/services'
import {
  COMPLETE_DISCOVERY_STATUS,
  ERROR_DISCOVERY_STATUS,
  NONE_DISCOVERY_STATUS,
  RUNNING_DISCOVERY_STATUS,
} from '@agents/entities/statuses'
import { useServices } from '../../../useServices'

export const LOADING_DISCOVERY_VIEW = 'loading'
export const NOT_RUN_DISCOVERY_VIEW = 'not-run'
export const FAILED_DISCOVERY_VIEW = 'failed'
export const NO_SERVICES_DISCOVERY_VIEW = 'no-services'
export const SERVICES_DISCOVERY_VIEW = 'services'

type DiscoveryView =
  | typeof LOADING_DISCOVERY_VIEW
  | typeof NOT_RUN_DISCOVERY_VIEW
  | typeof FAILED_DISCOVERY_VIEW
  | typeof NO_SERVICES_DISCOVERY_VIEW
  | typeof SERVICES_DISCOVERY_VIEW

/** What Discover Services shows; the footer and the next step of the wizard depend on it too. */
export function useDiscoveryView(): DiscoveryView {
  const [discovery, isLoading, isError] = useServices()
  return discoveryViewOf(discovery, isLoading, isError)
}

/**
 * The view of Discover Services for a services response. A running discovery shows the services it found so far,
 * and a services request that failed with no result shows the failed discovery.
 */
export function discoveryViewOf(
  { status, services }: Services,
  isLoading: IsLoading,
  isError: IsError,
): DiscoveryView {
  if (isLoading) {
    return LOADING_DISCOVERY_VIEW
  }
  if (isError) {
    return FAILED_DISCOVERY_VIEW
  }
  switch (status) {
    case NONE_DISCOVERY_STATUS:
      return NOT_RUN_DISCOVERY_VIEW
    case RUNNING_DISCOVERY_STATUS:
      return SERVICES_DISCOVERY_VIEW
    case COMPLETE_DISCOVERY_STATUS:
      return isEmpty(services) ? NO_SERVICES_DISCOVERY_VIEW : SERVICES_DISCOVERY_VIEW
    case ERROR_DISCOVERY_STATUS:
      return FAILED_DISCOVERY_VIEW
  }
}
