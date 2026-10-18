import { bypass, http, HttpResponse, passthrough } from 'msw'

// A snapshot whose name contains the marker gets a failed comparison in the snapshot version of each service.
const MOCK_COMPARISON_ERRORS_MARKER = 'errors-comparison'

// Describes only the fields the handler touches.
type MockSnapshotDto = Readonly<{
  services: ReadonlyArray<Readonly<{ changelogHasErrors?: boolean }>>
}>

export const snapshotHandlers = [
  http.get(
    '*/api/v2/agents/:agentId/namespaces/:namespaceId/workspaces/:workspaceKey/snapshots/:snapshotKey',
    async ({ request, params }) => {
      if (!String(params.snapshotKey).includes(MOCK_COMPARISON_ERRORS_MARKER)) {
        return passthrough()
      }

      const originalResponse = await fetch(bypass(request))
      if (!originalResponse.ok) {
        return originalResponse
      }

      const realData: MockSnapshotDto = await originalResponse.json()
      return HttpResponse.json<MockSnapshotDto>({
        ...realData,
        services: realData.services.map(service => ({ ...service, changelogHasErrors: true })),
      })
    },
  ),
]
