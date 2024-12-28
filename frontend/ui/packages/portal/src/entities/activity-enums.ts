/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export enum EventType {
  GRANT_ROLE_EVENT = 'grant_role',
  UPDATE_ROLE_EVENT = 'update_role',
  DELETE_ROLE_EVENT = 'delete_role',
  GENERATE_API_KEY_EVENT = 'generate_api_key',
  REVOKE_API_KEY_EVENT = 'revoke_api_key',
  PUBLISH_NEW_VERSION_EVENT = 'publish_new_version',
  PUBLISH_NEW_REVISION_EVENT = 'publish_new_revision',
  PATCH_VERSION_META_EVENT = 'patch_version_meta',
  DELETE_VERSION_EVENT = 'delete_version',
  CREATE_PACKAGE_EVENT = 'create_package',
  DELETE_PACKAGE_EVENT = 'delete_package',
  PATCH_PACKAGE_META_EVENT = 'patch_package_meta',
  CREATE_MANUAL_GROUP_EVENT = 'create_manual_group',
  DELETE_MANUAL_GROUP_EVENT = 'delete_manual_group',
  UPDATE_OPERATIONS_GROUP_PARAMETERS_EVENT = 'update_operations_group_parameters',
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
