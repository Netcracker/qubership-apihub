import type { PackageKey, VersionKey } from '../../entities/keys'
import { type VersionNotificationsDto, type VersionNotificationsQuery } from '../../entities/version-notifications'
import { toNotificationFiltersQueryKey, toVersionNotificationsSearchParams } from './notificationQueryParams'
import {
  type InfiniteVersionNotificationsQueryState,
  NOTIFICATIONS_PAGE_LIMIT,
  type NotificationsQueryScope,
  requestNotificationsJson,
  useInfiniteNotificationsQuery,
} from './notificationsQuery'

const VERSION_NOTIFICATIONS_QUERY_KEY = 'version-notifications-query-key'

type UseInfiniteVersionNotificationsOptions =
  & Omit<VersionNotificationsQuery, 'limit' | 'page'>
  & Partial<NotificationsQueryScope>
  & {
    enabled?: boolean
  }

export function useInfiniteVersionNotifications(
  options: UseInfiniteVersionNotificationsOptions,
): InfiniteVersionNotificationsQueryState {
  const {
    packageKey,
    versionKey,
    documentId,
    emptyDocumentId,
    severity,
    category,
    enabled = true,
  } = options

  const query: VersionNotificationsQuery = {
    documentId: documentId,
    emptyDocumentId: emptyDocumentId,
    severity: severity,
    category: category,
    limit: NOTIFICATIONS_PAGE_LIMIT,
  }
  const queryKey = [
    VERSION_NOTIFICATIONS_QUERY_KEY,
    packageKey,
    versionKey,
    ...toNotificationFiltersQueryKey(query),
  ]
  const queryFn = (page: number, signal?: AbortSignal): Promise<VersionNotificationsDto> =>
    getVersionNotifications(packageKey!, versionKey!, { ...query, page }, signal)

  return useInfiniteNotificationsQuery({
    queryKey,
    queryFn,
    packageKey,
    versionKey,
    enabled,
  })
}

async function getVersionNotifications(
  packageKey: PackageKey,
  versionKey: VersionKey,
  query?: VersionNotificationsQuery,
  signal?: AbortSignal,
): Promise<VersionNotificationsDto> {
  return await requestNotificationsJson(
    '/packages/:packageId/versions/:versionId/notifications',
    packageKey,
    versionKey,
    toVersionNotificationsSearchParams(query),
    signal,
  )
}
