export enum EventType {
  GRANT_ROLE_EVENT = 'grant_role',
  UPDATE_ROLE_EVENT = 'update_role',
  DELETE_ROLE_EVENT = 'delete_role',
  GENERATE_API_KEY_EVENT = 'generate_api_key',
  REVOKE_API_KEY_EVENT = 'revoke_api_key',
  PUBLISH_NEW_VERSION_EVENT = 'publish_new_version',
  DELETE_REVISION_EVENT = 'delete_revision',
  PUBLISH_NEW_REVISION_EVENT = 'publish_new_revision',
  PATCH_VERSION_META_EVENT = 'patch_version_meta',
  DELETE_VERSION_EVENT = 'delete_version',
  CREATE_PACKAGE_EVENT = 'create_package',
  DELETE_PACKAGE_EVENT = 'delete_package',
  PATCH_PACKAGE_META_EVENT = 'patch_package_meta',
  CREATE_MANUAL_GROUP_EVENT = 'create_manual_group',
  DELETE_MANUAL_GROUP_EVENT = 'delete_manual_group',
  UPDATE_OPERATIONS_GROUP_PARAMETERS_EVENT = 'update_operations_group_parameters',
  UPDATE_DOCUMENT_SHAREABILITY_EVENT = 'update_document_shareability',
}

export const AVAILABLE_EVENT_TYPES = Object.values(EventType)

export { EventType as ActivityEventType }

export enum ActivityType {
  PACKAGE_MANAGEMENT = 'Package management',
  NEW_VERSION = 'New version',
  PACKAGE_VERSION = 'Package version',
  PACKAGE_SECURITY = 'Package security',
  PACKAGE_MEMBERS = 'Package members',
  OPERATIONS_GROUP = 'Operations groups'
}
