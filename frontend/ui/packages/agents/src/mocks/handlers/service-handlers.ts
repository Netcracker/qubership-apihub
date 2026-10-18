import { bypass, http, HttpResponse } from 'msw'

import {
  getMockVersionFlags,
  type MockVersionFlags,
} from '@netcracker/qubership-apihub-ui-shared/mocks/mock-version-flags'

// An older agent sends plain version names; a newer one sends objects with the flags.
type MockBaselineVersionDto = string | Readonly<{ version: string } & MockVersionFlags>

type MockServiceDto = Readonly<{
  baseline?: Readonly<{
    versions: ReadonlyArray<MockBaselineVersionDto>
  }>
}>

type MockServicesDto = Readonly<{
  services: ReadonlyArray<MockServiceDto>
}>

export const serviceHandlers = [
  http.get(
    '*/api/v2/agents/:agentId/namespaces/:namespaceId/workspaces/:workspaceKey/services',
    async ({ request }) => {
      const originalResponse = await fetch(bypass(request))
      if (!originalResponse.ok) {
        return originalResponse
      }
      const realData: MockServicesDto = await originalResponse.json()
      return HttpResponse.json<MockServicesDto>({
        ...realData,
        services: realData.services.map(withMockBaselineFlags),
      })
    },
  ),
]

function withMockBaselineFlags(service: MockServiceDto): MockServiceDto {
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
function withMockVersionFlags(version: MockBaselineVersionDto): MockBaselineVersionDto {
  if (typeof version === 'string') {
    return version
  }
  const flags = getMockVersionFlags(version.version)
  return flags ? { ...version, ...flags } : version
}
