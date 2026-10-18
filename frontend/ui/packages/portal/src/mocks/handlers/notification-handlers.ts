import { bypass, http, HttpResponse, passthrough } from 'msw'

import {
  NOTIFICATION_CATEGORY,
  NOTIFICATION_SEVERITY,
  type VersionNotificationDto,
  type VersionNotificationsDto,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-notifications'

const BUILD_ERROR_NOTIFICATIONS: ReadonlyArray<VersionNotificationDto> = [
  {
    category: NOTIFICATION_CATEGORY.PARSE_FILE,
    severity: NOTIFICATION_SEVERITY.ERROR,
    message: 'Cannot process the "docs/events.yaml" document. Unexpected token at line 42',
    documentId: 'events-yaml',
  },
  {
    category: NOTIFICATION_CATEGORY.REF_HAS_SIBLINGS,
    severity: NOTIFICATION_SEVERITY.WARNING,
    message: 'Sibling properties alongside $ref will be ignored in "docs/events.yaml"',
    documentId: 'events-yaml',
  },
  {
    category: NOTIFICATION_CATEGORY.DUPLICATE_OPERATION_ID,
    severity: NOTIFICATION_SEVERITY.ERROR,
    message: 'Duplicate operationId "getOrder" detected in "docs/orders.json"',
    documentId: 'orders-json',
  },
  {
    category: NOTIFICATION_CATEGORY.VERSION_DOCUMENTS_MISSING,
    severity: NOTIFICATION_SEVERITY.ERROR,
    message: 'Package version documents resolution failed for one or more descriptors',
  },
]

export const notificationHandlers = [
  http.get('*/api/v2/packages/:packageKey/versions/:versionKey/notifications', async ({ request, params }) => {
    const versionKey = String(params.versionKey)
    const { searchParams } = new URL(request.url)

    const hasBuildErrors = versionKey.includes('errors-build') ||
      versionKey.includes('errors-documents') ||
      versionKey.includes('errors-build-and-comparison') ||
      versionKey.includes('errors-processor-mismatch-and-build')

    if (hasBuildErrors) {
      return HttpResponse.json<VersionNotificationsDto>({
        notifications: applyNotificationFilters(BUILD_ERROR_NOTIFICATIONS, searchParams),
      })
    }

    return passthroughOrEmptyNotifications(request)
  }),
]

function applyNotificationFilters(
  notifications: ReadonlyArray<VersionNotificationDto>,
  searchParams: URLSearchParams,
): VersionNotificationDto[] {
  const documentId = searchParams.get('documentId')
  const emptyDocumentId = searchParams.get('emptyDocumentId') === 'true'
  const severityFilters = splitCsvParam(searchParams.get('severity'))
  const categoryFilters = splitCsvParam(searchParams.get('category'))

  const scoped = documentId
    ? notifications
      .filter(notification => notification.documentId)
      .map(notification => ({ ...notification, documentId: documentId }))
    : notifications

  return scoped.filter((notification) => {
    if (emptyDocumentId && notification.documentId) {
      return false
    }
    if (documentId && notification.documentId !== documentId) {
      return false
    }
    if (severityFilters && !severityFilters.includes(notification.severity)) {
      return false
    }
    if (categoryFilters && !categoryFilters.includes(notification.category)) {
      return false
    }
    return true
  })
}

function splitCsvParam(value: string | null): string[] | null {
  return value ? value.split(',') : null
}

async function passthroughOrEmptyNotifications(request: Request): Promise<Response> {
  try {
    const originalResponse = await fetch(bypass(request))
    if (originalResponse.status === 404) {
      return HttpResponse.json<VersionNotificationsDto>({ notifications: [] })
    }
    return originalResponse
  } catch {
    return passthrough()
  }
}
