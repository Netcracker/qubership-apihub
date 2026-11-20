import { http, HttpResponse, passthrough } from 'msw'

import { getMockVersionFlags } from '@netcracker/qubership-apihub-ui-shared/mocks/mock-version-flags'
import { patchJsonResponse } from '@netcracker/qubership-apihub-ui-shared/mocks/patch-json-response'

import {
  BASELINE_VERSIONS_PAGE_SIZE,
  type BaselineVersionDto,
  type ServiceDto,
  type ServicesDto,
} from '@agents/entities/services'
import {
  COMPLETE_DISCOVERY_STATUS,
  ERROR_DISCOVERY_STATUS,
  NONE_DISCOVERY_STATUS,
} from '@agents/entities/statuses'

// The value of this local storage key picks a state of Discover Services: `none`, `error`, or `empty` rewrite the
// discovery result, and `start-error` fails the start of a discovery
const MOCK_DISCOVERY_KEY = 'msw-discovery'
const MOCK_DISCOVERY_START_ERROR = 'start-error'

// The value `true` of this local storage key fills the version list of each baseline package up to the 100 versions
// that discovery lists, with versions the portal does not have; the other release versions of the package are then
// found only by the search of "Baseline Version"
const MOCK_BASELINE_100_VERSIONS_KEY = 'msw-baseline-100-versions'

const MOCK_DISCOVERY_RESULTS: Record<string, (data: ServicesDto) => ServicesDto> = {
  none: data => ({ ...data, status: NONE_DISCOVERY_STATUS, services: [] }),
  error: data => ({ ...data, status: ERROR_DISCOVERY_STATUS, services: [] }),
  empty: data => ({ ...data, status: COMPLETE_DISCOVERY_STATUS, services: [] }),
}

export const serviceHandlers = [
  http.post(
    '*/api/v2/agents/:agentId/namespaces/:namespaceId/workspaces/:workspaceKey/discover',
    () => {
      if (localStorage.getItem(MOCK_DISCOVERY_KEY) !== MOCK_DISCOVERY_START_ERROR) {
        return passthrough()
      }
      return HttpResponse.json(
        { status: 500, message: 'Mock failure: the agent did not start the discovery.' },
        { status: 500 },
      )
    },
  ),

  http.get(
    '*/api/v2/agents/:agentId/namespaces/:namespaceId/workspaces/:workspaceKey/services',
    ({ request }) => patchJsonResponse<ServicesDto>(request, data => withMockDiscoveryResult({
      ...data,
      services: data.services.map(service => withMock100BaselineVersions(withMockBaselineFlags(service))),
    })),
  ),
]

function withMockDiscoveryResult(data: ServicesDto): ServicesDto {
  const mockResult = MOCK_DISCOVERY_RESULTS[localStorage.getItem(MOCK_DISCOVERY_KEY) ?? '']
  return mockResult ? mockResult(data) : data
}

function withMockBaselineFlags(service: ServiceDto): ServiceDto {
  if (!service.baseline) {
    return service
  }
  return {
    ...service,
    baseline: {
      ...service.baseline,
      versions: service.baseline.versions.map(withMockVersionFlags),
    },
  }
}

function withMock100BaselineVersions(service: ServiceDto): ServiceDto {
  if (!service.baseline || localStorage.getItem(MOCK_BASELINE_100_VERSIONS_KEY) !== 'true') {
    return service
  }
  const newestVersions = service.baseline.versions.slice(0, 1)
  const fillerVersions = Array.from(
    { length: BASELINE_VERSIONS_PAGE_SIZE - newestVersions.length },
    (_, index) => `mock-${index + 1}`,
  )
  return { ...service, baseline: { ...service.baseline, versions: [...newestVersions, ...fillerVersions] } }
}

// A plain version name has no fields to override.
function withMockVersionFlags(version: BaselineVersionDto): BaselineVersionDto {
  if (typeof version === 'string') {
    return version
  }
  const flags = getMockVersionFlags(version.version)
  return flags ? { ...version, ...flags } : version
}
