import { bypass, http, HttpResponse, passthrough, type PathParams } from 'msw'

// A snapshot whose name contains the marker gets a failed comparison in the snapshot version of each service.
const MOCK_COMPARISON_ERRORS_MARKER = 'errors-comparison'
// A snapshot whose name contains the marker gets a failed publication of each service, though the backend publishes it.
const MOCK_PUBLISH_FAILED_MARKER = 'errors-publish-failed'
const MOCK_PUBLISH_FAILED_MESSAGE = 'Mock publication failure: the build of this service failed.'

// The publications of the runs started with the failure marker. The statuses poll carries only publish ids.
const failedPublishIds = new Set<string>()

// Describes only the fields the handler touches.
type MockSnapshotDto = Readonly<{
  services: ReadonlyArray<Readonly<{ changelogHasErrors?: boolean }>>
}>

type MockPublishSnapshotRequestDto = Readonly<{
  version?: string
}>

type MockPublishConfigDto = Readonly<{
  services?: ReadonlyArray<Readonly<{ publishId: string }>>
}>

type MockPublishDetailsDto = Readonly<{
  publishId: string
  status: string
  message?: string
  hasErrors?: boolean
  changelogHasErrors?: boolean
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

  // Create Snapshot and Promote Version: remembers the service publications of a run with the failure marker
  http.post<PathParams, MockPublishSnapshotRequestDto>(
    '*/api/v2/agents/:agentId/namespaces/:namespaceId/workspaces/:workspaceKey/snapshots',
    async ({ request }) => {
      const { version } = await request.clone().json()
      if (!version?.includes(MOCK_PUBLISH_FAILED_MARKER)) {
        return passthrough()
      }

      const originalResponse = await fetch(bypass(request))
      if (!originalResponse.ok) {
        return originalResponse
      }

      const realData: MockPublishConfigDto = await originalResponse.json()
      realData.services?.forEach(({ publishId }) => failedPublishIds.add(publishId))
      return HttpResponse.json<MockPublishConfigDto>(realData)
    },
  ),

  // Rewrites only the publications that are already final, so the 404 and the running ones of the poll stay real
  http.post(
    '*/api/v2/packages/:packageId/publish/statuses',
    async ({ request }) => {
      if (failedPublishIds.size === 0) {
        return passthrough()
      }

      const originalResponse = await fetch(bypass(request))
      if (!originalResponse.ok) {
        return originalResponse
      }

      const realData: MockPublishDetailsDto[] = await originalResponse.json()
      return HttpResponse.json<MockPublishDetailsDto[]>(realData.map(details => (
        failedPublishIds.has(details.publishId) && details.status === 'complete'
          ? {
            ...details,
            status: 'error',
            message: MOCK_PUBLISH_FAILED_MESSAGE,
            hasErrors: false,
            changelogHasErrors: false,
          }
          : details
      )))
    },
  ),
]
