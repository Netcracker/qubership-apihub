import type { Service } from '@agents/entities/services'
import {
  COMPLETE_DISCOVERY_STATUS,
  ERROR_DISCOVERY_STATUS,
  NONE_DISCOVERY_STATUS,
  RUNNING_DISCOVERY_STATUS,
} from '@agents/entities/statuses'
import {
  discoveryViewOf,
  FAILED_DISCOVERY_VIEW,
  LOADING_DISCOVERY_VIEW,
  NO_SERVICES_DISCOVERY_VIEW,
  NOT_RUN_DISCOVERY_VIEW,
  SERVICES_DISCOVERY_VIEW,
} from './useDiscoveryView'

const SERVICE: Service = { key: 'api-linter-service', specs: [] }

describe('discoveryViewOf', () => {
  it('shows the loading view until the first answer arrives', () => {
    expect(discoveryViewOf({ status: NONE_DISCOVERY_STATUS, services: [] }, true, false)).toBe(LOADING_DISCOVERY_VIEW)
  })

  it('offers to run a discovery when none has run', () => {
    expect(discoveryViewOf({ status: NONE_DISCOVERY_STATUS, services: [] }, false, false)).toBe(NOT_RUN_DISCOVERY_VIEW)
  })

  it('shows the services of a running discovery, also before it finds one', () => {
    expect(discoveryViewOf({ status: RUNNING_DISCOVERY_STATUS, services: [] }, false, false))
      .toBe(SERVICES_DISCOVERY_VIEW)
  })

  it('shows the failed state when the discovery failed', () => {
    expect(discoveryViewOf({ status: ERROR_DISCOVERY_STATUS, services: [] }, false, false)).toBe(FAILED_DISCOVERY_VIEW)
  })

  it('shows the failed state when the services request fails', () => {
    expect(discoveryViewOf({ status: NONE_DISCOVERY_STATUS, services: [] }, false, true)).toBe(FAILED_DISCOVERY_VIEW)
  })

  it('shows that no service was found when a finished discovery found none', () => {
    expect(discoveryViewOf({ status: COMPLETE_DISCOVERY_STATUS, services: [] }, false, false))
      .toBe(NO_SERVICES_DISCOVERY_VIEW)
  })

  it('shows the services that a finished discovery found', () => {
    expect(discoveryViewOf({ status: COMPLETE_DISCOVERY_STATUS, services: [SERVICE] }, false, false))
      .toBe(SERVICES_DISCOVERY_VIEW)
  })
})
