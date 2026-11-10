import { http, HttpResponse, passthrough } from 'msw'

import { getMockVersionFlags } from '@netcracker/qubership-apihub-ui-shared/mocks/mock-version-flags'
import { patchJsonResponse } from '@netcracker/qubership-apihub-ui-shared/mocks/patch-json-response'

import type { BaselineVersionDto, ServiceDto, ServicesDto } from '@agents/entities/services'
import {
  COMPLETE_DISCOVERY_STATUS,
  ERROR_DISCOVERY_STATUS,
  NONE_DISCOVERY_STATUS,
} from '@agents/entities/statuses'

// The value of this local storage key picks a state of Discover Services: `none`, `error`, or `empty` rewrite the
// discovery result, and `start-error` fails the start of a discovery
const MOCK_DISCOVERY_KEY = 'msw-discovery'
const MOCK_DISCOVERY_START_ERROR = 'start-error'

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
      services: data.services.map(withMockBaselineFlags),
    })),
  ),
]

// Without the key, or with another value, the result of the backend stays
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

// A plain version name has no fields to override.
function withMockVersionFlags(version: BaselineVersionDto): BaselineVersionDto {
  if (typeof version === 'string') {
    return version
  }
  const flags = getMockVersionFlags(version.version)
  return flags ? { ...version, ...flags } : version
}
