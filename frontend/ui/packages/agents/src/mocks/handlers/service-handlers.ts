import { http } from 'msw'

import { getMockVersionFlags } from '@netcracker/qubership-apihub-ui-shared/mocks/mock-version-flags'
import { patchJsonResponse } from '@netcracker/qubership-apihub-ui-shared/mocks/patch-json-response'

import type { BaselineVersionDto, ServiceDto, ServicesDto } from '@agents/entities/services'

export const serviceHandlers = [
  http.get(
    '*/api/v2/agents/:agentId/namespaces/:namespaceId/workspaces/:workspaceKey/services',
    ({ request }) => patchJsonResponse<ServicesDto>(request, data => ({
      ...data,
      services: data.services.map(withMockBaselineFlags),
    })),
  ),
]

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
