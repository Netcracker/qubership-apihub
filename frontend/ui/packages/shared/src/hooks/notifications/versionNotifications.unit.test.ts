import {
  isDdlNotificationCategory,
  isMcpNotificationCategory,
  isReferenceNotificationCategory,
  isVersionResolutionNotificationCategory,
  NOTIFICATION_CATEGORY,
  NOTIFICATION_SEVERITY,
  toVersionNotifications,
  type VersionNotificationsDto,
} from '../../entities/version-notifications'
import { toNotificationFiltersQueryKey, toVersionNotificationsSearchParams } from './notificationQueryParams'

describe('versionNotifications entities and mappers', () => {
  it('returns empty array when dto or notifications array is missing or empty', () => {
    expect(toVersionNotifications(null)).toEqual([])
    expect(toVersionNotifications(undefined)).toEqual([])
    expect(toVersionNotifications({ notifications: [] })).toEqual([])
  })

  it('maps DTO to UI model with deterministic, content-based unique identifiers', () => {
    const dto: VersionNotificationsDto = {
      notifications: [
        {
          category: NOTIFICATION_CATEGORY.BUILD_DOCUMENT,
          severity: NOTIFICATION_SEVERITY.ERROR,
          message: 'Failed to build document',
          documentId: 'doc-slug',
        },
        {
          category: NOTIFICATION_CATEGORY.VERSION_DOCUMENTS_MISSING,
          severity: NOTIFICATION_SEVERITY.WARNING,
          message: 'Missing root documents',
        },
        {
          category: NOTIFICATION_CATEGORY.BUILD_DOCUMENT,
          severity: NOTIFICATION_SEVERITY.ERROR,
          message: 'Failed to build document',
          documentId: 'doc-slug',
        },
      ],
    }

    const result = toVersionNotifications(dto)

    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({
      id: 'doc-slug::build-document::Failed to build document',
      category: NOTIFICATION_CATEGORY.BUILD_DOCUMENT,
      severity: NOTIFICATION_SEVERITY.ERROR,
      message: 'Failed to build document',
      documentId: 'doc-slug',
    })
    expect(result[1]).toEqual({
      id: 'version::version-documents-missing::Missing root documents',
      category: NOTIFICATION_CATEGORY.VERSION_DOCUMENTS_MISSING,
      severity: NOTIFICATION_SEVERITY.WARNING,
      message: 'Missing root documents',
      documentId: undefined,
    })
    expect(result[2].id).toBe('doc-slug::build-document::Failed to build document#1')
  })

  it('keeps content-based ids stable when surrounding notifications are filtered out', () => {
    const sharedNotification = {
      category: NOTIFICATION_CATEGORY.PARSE_FILE,
      severity: NOTIFICATION_SEVERITY.ERROR,
      message: 'Cannot process the document',
      documentId: 'events-yaml',
    }
    const dto: VersionNotificationsDto = {
      notifications: [
        {
          category: NOTIFICATION_CATEGORY.REF_NOT_FOUND,
          severity: NOTIFICATION_SEVERITY.WARNING,
          message: 'Missing $ref target',
          documentId: 'orders-json',
        },
        sharedNotification,
        {
          category: NOTIFICATION_CATEGORY.VERSION_DOCUMENTS_MISSING,
          severity: NOTIFICATION_SEVERITY.ERROR,
          message: 'Package version documents resolution failed',
        },
      ],
    }

    const fullResult = toVersionNotifications(dto)
    const filteredResult = toVersionNotifications({ notifications: [sharedNotification] })

    expect(filteredResult[0].id).toBe(fullResult[1].id)
  })

  it('correctly categorizes category prefixes via helper predicates', () => {
    expect(isReferenceNotificationCategory(NOTIFICATION_CATEGORY.REF_NOT_FOUND)).toBe(true)
    expect(isReferenceNotificationCategory(NOTIFICATION_CATEGORY.BUILD_DOCUMENT)).toBe(false)

    expect(isDdlNotificationCategory(NOTIFICATION_CATEGORY.DDL_ENTITY_BUILD)).toBe(true)
    expect(isDdlNotificationCategory(NOTIFICATION_CATEGORY.PARSE_FILE)).toBe(false)

    expect(isMcpNotificationCategory(NOTIFICATION_CATEGORY.MCP_DOCUMENT_SCHEMA)).toBe(true)
    expect(isMcpNotificationCategory(NOTIFICATION_CATEGORY.REST_DUPLICATE_OPERATION)).toBe(false)

    expect(isVersionResolutionNotificationCategory(NOTIFICATION_CATEGORY.VERSION_NOT_RESOLVED)).toBe(true)
    expect(isVersionResolutionNotificationCategory(NOTIFICATION_CATEGORY.TOLERANT_HASH_FAILED)).toBe(false)
  })
})

describe('notification query parameter serialization', () => {
  it('serializes severity and category as comma-separated values', () => {
    const params = toVersionNotificationsSearchParams({
      documentId: 'events-yaml',
      severity: [NOTIFICATION_SEVERITY.ERROR, NOTIFICATION_SEVERITY.WARNING],
      category: [NOTIFICATION_CATEGORY.PARSE_FILE, NOTIFICATION_CATEGORY.BUILD_DOCUMENT],
      limit: 50,
      page: 1,
    })

    expect(params.get('documentId')).toBe('events-yaml')
    expect(params.get('severity')).toBe('error,warning')
    expect(params.get('category')).toBe('build-document,parse-file')
    expect(params.get('limit')).toBe('50')
    expect(params.get('page')).toBe('1')
  })

  it('canonicalizes severity and category order for query params and cache keys', () => {
    const params = toVersionNotificationsSearchParams({
      severity: [NOTIFICATION_SEVERITY.WARNING, NOTIFICATION_SEVERITY.ERROR],
      category: [NOTIFICATION_CATEGORY.BUILD_DOCUMENT, NOTIFICATION_CATEGORY.PARSE_FILE],
    })

    expect(params.get('severity')).toBe('error,warning')
    expect(params.get('category')).toBe('build-document,parse-file')
    expect(toNotificationFiltersQueryKey({
      severity: [NOTIFICATION_SEVERITY.WARNING, NOTIFICATION_SEVERITY.ERROR],
    })).toEqual(toNotificationFiltersQueryKey({
      severity: [NOTIFICATION_SEVERITY.ERROR, NOTIFICATION_SEVERITY.WARNING],
    }))
  })

  it('serializes emptyDocumentId and keeps it in the cache key', () => {
    const params = toVersionNotificationsSearchParams({ emptyDocumentId: true })

    expect(params.get('emptyDocumentId')).toBe('true')
    expect(params.get('documentId')).toBeNull()

    expect(toVersionNotificationsSearchParams({ emptyDocumentId: false }).toString()).toBe('')

    expect(toNotificationFiltersQueryKey({ emptyDocumentId: true }))
      .not.toEqual(toNotificationFiltersQueryKey({ documentId: 'events-yaml' }))
  })

  it('omits empty filters', () => {
    expect(toVersionNotificationsSearchParams({}).toString()).toBe('')
    expect(toVersionNotificationsSearchParams({ severity: [], category: [] }).toString()).toBe('')
  })
})
