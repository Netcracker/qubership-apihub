import { http, passthrough, type PathParams } from 'msw'

import { patchJsonResponse } from '@netcracker/qubership-apihub-ui-shared/mocks/patch-json-response'
import {
  COMPLETE_PUBLISH_STATUS,
  ERROR_PUBLISH_STATUS,
  type PublishDetailsDto,
} from '@netcracker/qubership-apihub-ui-shared/utils/packages-builder'

import type { PublishConfigDto } from '@agents/entities/publish-config'
import type { SnapshotPublicationInfoDto } from '@agents/entities/snapshot-publication-info'
import type { PublishSnapshotRequestDto } from '@agents/entities/snapshots'

// A snapshot whose name contains the marker gets a failed comparison in the snapshot version of each service.
const MOCK_COMPARISON_ERRORS_MARKER = 'errors-comparison'
// A snapshot whose name contains the marker gets a failed publication of each service, though the backend publishes it.
const MOCK_PUBLISH_FAILED_MARKER = 'errors-publish-failed'
const MOCK_PUBLISH_FAILED_MESSAGE = 'Mock publication failure: the build of this service failed.'

// The publications of the runs started with the failure marker. The statuses poll carries only publish ids.
const failedPublishIds = new Set<string>()

export const snapshotHandlers = [
  http.get(
    '*/api/v2/agents/:agentId/namespaces/:namespaceId/workspaces/:workspaceKey/snapshots/:snapshotKey',
    ({ request, params }) => {
      if (!String(params.snapshotKey).includes(MOCK_COMPARISON_ERRORS_MARKER)) {
        return passthrough()
      }
      return patchJsonResponse<SnapshotPublicationInfoDto>(request, snapshot => ({
        ...snapshot,
        services: snapshot.services.map(service => ({ ...service, changelogHasErrors: true })),
      }))
    },
  ),

  // Create Snapshot and Promote Version: remembers the service publications of a run with the failure marker
  http.post<PathParams, PublishSnapshotRequestDto>(
    '*/api/v2/agents/:agentId/namespaces/:namespaceId/workspaces/:workspaceKey/snapshots',
    async ({ request }) => {
      const { version } = await request.clone().json()
      if (!version.includes(MOCK_PUBLISH_FAILED_MARKER)) {
        return passthrough()
      }
      return patchJsonResponse<PublishConfigDto>(request, config => {
        config.services.forEach(({ publishId }) => failedPublishIds.add(publishId))
        return config
      })
    },
  ),

  // Rewrites only the publications that are already final, so the 404 and the running ones of the poll stay real
  http.post(
    '*/api/v2/packages/:packageId/publish/statuses',
    ({ request }) => {
      if (failedPublishIds.size === 0) {
        return passthrough()
      }
      return patchJsonResponse<PublishDetailsDto[]>(request, statuses => statuses.map(details => (
        failedPublishIds.has(details.publishId) && details.status === COMPLETE_PUBLISH_STATUS
          ? {
            ...details,
            status: ERROR_PUBLISH_STATUS,
            message: MOCK_PUBLISH_FAILED_MESSAGE,
            hasErrors: false,
            changelogHasErrors: false,
          }
          : details
      )))
    },
  ),
]
