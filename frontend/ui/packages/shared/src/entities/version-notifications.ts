import type { Key } from './keys'

export const NOTIFICATION_SEVERITY = {
  ERROR: 'error',
  WARNING: 'warning',
  INFORMATION: 'information',
  HINT: 'hint',
} as const

export type NotificationSeverity = (typeof NOTIFICATION_SEVERITY)[keyof typeof NOTIFICATION_SEVERITY]

export const NOTIFICATION_CATEGORY = {
  PARSE_FILE: 'parse-file',
  INVALID_TEXT_FILE: 'invalid-text-file',
  FILE_NOT_PARSED: 'file-not-parsed',
  BUILD_DOCUMENT: 'build-document',
  SWAGGER_CONVERSION: 'swagger-conversion',
  REF_HAS_SIBLINGS: 'ref-has-siblings',
  REF_NOT_ALLOWED: 'ref-not-allowed',
  REF_NOT_FOUND: 'ref-not-found',
  REF_NOT_VALID_FORMAT: 'ref-not-valid-format',
  BUILD_OPERATIONS: 'build-operations',
  DUPLICATE_OPERATION_ID: 'duplicate-operation-id',
  REST_DUPLICATE_OPERATION: 'rest-duplicate-operation',
  ASYNC_DUPLICATE_OPERATION: 'async-duplicate-operation',
  EMPTY_PATH_PARAMETER: 'empty-path-parameter',
  DOUBLE_SLASH_PATH: 'double-slash-path',
  DDL_DUPLICATE_OBJECT: 'ddl-duplicate-object',
  DDL_PARSE_ISSUE: 'ddl-parse-issue',
  DDL_ENTITY_BUILD: 'ddl-entity-build',
  DDL_DUPLICATE_ENTITY: 'ddl-duplicate-entity',
  MCP_ENTITY_BUILD: 'mcp-entity-build',
  MCP_DOCUMENT_SCHEMA: 'mcp-document-schema',
  MCP_INIT_REQUIRED: 'mcp-init-required',
  MCP_DUPLICATE_ENTITY: 'mcp-duplicate-entity',
  MCP_CAPABILITY_UNUSED: 'mcp-capability-unused',
  TOLERANT_HASH_MISSING: 'tolerant-hash-missing',
  TOLERANT_HASH_FAILED: 'tolerant-hash-failed',
  DEPRECATED_COMPONENT_PATH: 'deprecated-component-path',
  VERSION_NOT_RESOLVED: 'version-not-resolved',
  VERSION_REFS_NOT_RESOLVED: 'version-refs-not-resolved',
  VERSION_DOCUMENTS_MISSING: 'version-documents-missing',
  RISKY_BEFORE_VALUE: 'risky-before-value',
  RISKY_ORIGINS: 'risky-origins',
  COMPARISON_SERIALIZATION: 'comparison-serialization',
  GROUP_DOCUMENTS_MISSING: 'group-documents-missing',
  PARTIAL_GROUP_DOCUMENTS: 'partial-group-documents',
} as const

export type NotificationCategory = (typeof NOTIFICATION_CATEGORY)[keyof typeof NOTIFICATION_CATEGORY]

export type VersionNotificationDto = Readonly<{
  category: NotificationCategory
  severity: NotificationSeverity
  message: string
  documentId?: Key
}>

export type VersionNotificationsDto = Readonly<{
  notifications?: ReadonlyArray<VersionNotificationDto>
}>

export type VersionNotification = Readonly<{
  id: string
  category: NotificationCategory
  severity: NotificationSeverity
  message: string
  documentId?: Key
}>

export type VersionNotifications = ReadonlyArray<VersionNotification>

export type VersionNotificationsQuery = {
  documentId?: Key
  emptyDocumentId?: boolean
  severity?: NotificationSeverity[]
  category?: NotificationCategory[]
  limit?: number
  page?: number
}

export function toVersionNotifications(dto: VersionNotificationsDto | null | undefined): VersionNotifications {
  const notifications = dto?.notifications
  if (!notifications?.length) {
    return []
  }

  const occurrences = new Map<string, number>()

  return notifications.map((item) => {
    const { category, severity, message, documentId } = item
    const baseKey = `${documentId ?? 'version'}::${category}::${message}`
    const count = occurrences.get(baseKey) ?? 0
    occurrences.set(baseKey, count + 1)
    const id = count === 0 ? baseKey : `${baseKey}#${count}`

    return {
      id,
      category,
      severity,
      message,
      documentId,
    }
  })
}

export function isReferenceNotificationCategory(category: NotificationCategory): boolean {
  return category.startsWith('ref-')
}

export function isDdlNotificationCategory(category: NotificationCategory): boolean {
  return category.startsWith('ddl-')
}

export function isMcpNotificationCategory(category: NotificationCategory): boolean {
  return category.startsWith('mcp-')
}

export function isVersionResolutionNotificationCategory(category: NotificationCategory): boolean {
  return category.startsWith('version-')
}
