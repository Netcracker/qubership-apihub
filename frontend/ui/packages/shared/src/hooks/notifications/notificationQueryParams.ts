import type { VersionNotificationsQuery } from '../../entities/version-notifications'
import { optionalSearchParams } from '../../utils/search-params'

export function toVersionNotificationsSearchParams(
  query?: VersionNotificationsQuery,
): URLSearchParams {
  return optionalSearchParams({
    documentId: { value: query?.documentId },
    emptyDocumentId: { value: query?.emptyDocumentId },
    severity: {
      value: query?.severity,
      toStringValue: stringifyArrayParam,
    },
    category: {
      value: query?.category,
      toStringValue: stringifyArrayParam,
    },
    limit: { value: query?.limit },
    page: { value: query?.page },
  })
}

export const toNotificationFiltersQueryKey = (
  query: VersionNotificationsQuery,
): readonly unknown[] => [
  query.documentId,
  query.emptyDocumentId,
  toCanonicalNotificationCsvParam(query.severity),
  toCanonicalNotificationCsvParam(query.category),
  query.limit,
  query.page,
]

function stringifyArrayParam(value: object | string | number): string {
  if (!Array.isArray(value)) {
    return String(value)
  }
  return toCanonicalNotificationCsvParam(value.map(String)) ?? ''
}

function toCanonicalNotificationCsvParam(
  values?: ReadonlyArray<string>,
): string | undefined {
  if (!values?.length) {
    return undefined
  }
  return [...values].sort().join(',')
}
