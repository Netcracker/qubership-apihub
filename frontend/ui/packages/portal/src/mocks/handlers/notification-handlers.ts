import { http, HttpResponse, passthrough } from 'msw'

import {
  NOTIFICATION_CATEGORY,
  NOTIFICATION_SEVERITY,
  type VersionNotificationsDto,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-notifications'
import { getMockVersionFlags } from '@netcracker/qubership-apihub-ui-shared/mocks/mock-version-flags'

export const notificationHandlers = [
  // The current api-processor puts every notification without a document into the comparison notifications, so this
  // endpoint never returns one for a build, and only this mock fills the Empty item of the dialog.
  http.get('*/api/v2/packages/:packageKey/versions/:versionKey/notifications', ({ request, params }) => {
    const isVersionScope = new URL(request.url).searchParams.get('emptyDocumentId') === 'true'
    if (!isVersionScope || !getMockVersionFlags(String(params.versionKey))?.hasErrors) {
      return passthrough()
    }
    return HttpResponse.json<VersionNotificationsDto>({
      notifications: [{
        category: NOTIFICATION_CATEGORY.VERSION_NOT_RESOLVED,
        severity: NOTIFICATION_SEVERITY.ERROR,
        message: `No such version: version: mock-previous-version, packageId: ${String(params.packageKey)}`,
      }],
    })
  }),
]
