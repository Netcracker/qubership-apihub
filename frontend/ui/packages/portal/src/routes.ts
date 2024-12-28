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

// Main tabs

import { SPECIAL_VERSION_KEY } from '@netcracker/qubership-apihub-ui-shared/entities/versions'

export const FAVORITE_PAGE = 'favorite'
export const SHARED_PAGE = 'shared'
export const WORKSPACES_PAGE = 'workspaces'
export const PRIVATE_PAGE = 'private'
export const GROUPS_PAGE = 'groups'
export const WORKSPACES_PAGE_PATH_PATTERN = '/portal/workspaces/:workspaceId'
export const GROUPS_PAGE_PATH_PATTERN = '/portal/groups/:groupId'
export const PACKAGE_PAGE_PATH_PATTERN = '/portal/packages/:packageId'

// Package tabs
export const OVERVIEW_PAGE = 'overview'
export const API_CHANGES_PAGE = 'changes'
export const OPERATIONS_PAGE = 'operations'
export const DEPRECATED_PAGE = 'deprecated'
export const DOCUMENTS_PAGE = 'documents'
export const VERSION_PAGE_PATH_PATTERN = '/portal/packages/:packageId/:versionId/'
export const OVERVIEW_PATH_PATTERN = `/portal/packages/:packageId/:versionId/${OVERVIEW_PAGE}/`
export const API_CHANGES_PAGE_PATH_PATTERN = `/portal/packages/:packageId/:versionId/${API_CHANGES_PAGE}/:apiType/`
export const OPERATIONS_PAGE_PATH_PATTERN = `/portal/packages/:packageId/:versionId/${OPERATIONS_PAGE}/:apiType/`
export const OPERATION_PAGE_PATH_PATTERN = `/portal/packages/:packageId/:versionId/${OPERATIONS_PAGE}/:apiType/:operationId`
export const DEPRECATED_PAGE_PATH_PATTERN = `/portal/packages/:packageId/:versionId/${DEPRECATED_PAGE}/:apiType`
export const DOCUMENTS_PAGE_PATH_PATTERN = `/portal/packages/:packageId/:versionId/${DOCUMENTS_PAGE}/:documentId`

export const CONFIGURATION_PAGE = 'edit'

// Overview tabs
// Overview tabs have not self path patterns because they have not specific parameters
export const SUMMARY_PAGE = 'summary'
export const PACKAGES_PAGE = 'packages'
export const REVISION_HISTORY_PAGE = 'revision-history'
export const OPERATION_GROUPS_PAGE = 'groups'
export const ACTIVITY_HISTORY_PAGE = 'activity-history'

// Service tabs
export const PACKAGE_SETTINGS_PAGE = 'settings'
export const SETTINGS_PAGE = 'settings'
export const PACKAGE_SETTINGS_PAGE_PATH_PATTERN = `/portal/packages/:packageId/${SPECIAL_VERSION_KEY}/${PACKAGE_SETTINGS_PAGE}/`
export const SETTINGS_PAGE_PATH_PATTERN = `/portal/${SETTINGS_PAGE}/`

// Package settings tabs
// Package settings tabs have not self path patterns because they have not specific parameters
export const GENERAL_PAGE = 'general'
export const API_SPECIFIC_CONFIGURATION_PAGE = 'configuration'
export const VERSIONS_PAGE = 'versions'
export const ACCESS_TOKENS_PAGE = 'tokens'
export const USER_ACCESS_CONTROLS_PAGE = 'members'

// Portal settings tabs
// Portal settings tabs have not self path patterns because they have not specific parameters
export const USER_ROLES_PAGE = 'roles'
export const ROLES_HIERARCHY_PAGE = 'hierarchy'
export const SYSTEM_ADMINISTRATORS_PAGE = 'sysadms'
export const SYSTEM_TOKENS_PAGE = 'tokens'

// Edit package page
export const CONFIGURE_DASHBOARD_PAGE = 'edit'
export const CONFIGURE_DASHBOARD_PAGE_PATH_PATTERN = `/portal/packages/:packageId/:versionId/${CONFIGURE_DASHBOARD_PAGE}`

export const PREVIEW_PAGE = 'preview'
export const PREVIEW_PAGE_PATH_PATTERN = `/portal/packages/:packageId/:versionId/${DOCUMENTS_PAGE}/:documentId/${PREVIEW_PAGE}`
export const COMPARE_PAGE = 'compare'
export const VERSION_COMPARE_PAGE_PATH_PATTERN = `/portal/packages/:packageId/:versionId/${COMPARE_PAGE}`
export const OPERATION_COMPARE_PAGE_PATH_PATTERN = `/portal/packages/:packageId/:versionId/${COMPARE_PAGE}/:apiType/:operationId`
export const GROUPS_COMPARE_PAGE_PATH_PATTERN = `/portal/packages/:packageId/:versionId/${OPERATION_GROUPS_PAGE}/:groupId/${COMPARE_PAGE}`
export const GROUPS_OPERATIONS_COMPARE_PAGE_PATH_PATTERN = `/portal/packages/:packageId/:versionId/${OPERATION_GROUPS_PAGE}/:groupId/${COMPARE_PAGE}/:apiType/:operationId`

// Expand/Collapse Sidebar Button
export const TOGGLE_SIDEBAR_BUTTON = 'toggle-sidebar'

// Path params
export const VERSION_ID = 'versionId'

export type MainPageRoute =
  | typeof FAVORITE_PAGE
  | typeof SHARED_PAGE
  | typeof WORKSPACES_PAGE
  | typeof PRIVATE_PAGE
  | typeof GROUPS_PAGE

export type VersionPageRoute =
  | typeof OVERVIEW_PAGE
  | typeof OPERATIONS_PAGE
  | typeof API_CHANGES_PAGE
  | typeof DEPRECATED_PAGE
  | typeof DOCUMENTS_PAGE

export type PackageVersionPageRoute =
  | typeof CONFIGURATION_PAGE

export type OverviewPageRoute =
  | typeof SUMMARY_PAGE
  | typeof PACKAGES_PAGE
  | typeof OPERATION_GROUPS_PAGE
  | typeof REVISION_HISTORY_PAGE
  | typeof ACTIVITY_HISTORY_PAGE

export const SUMMARY_ROUTE = `${OVERVIEW_PAGE}/${SUMMARY_PAGE}`

export type PackageSettingsPageRoute =
  | typeof GENERAL_PAGE
  | typeof API_SPECIFIC_CONFIGURATION_PAGE
  | typeof VERSIONS_PAGE
  | typeof ACCESS_TOKENS_PAGE
  | typeof USER_ACCESS_CONTROLS_PAGE

export type SettingsPageRoute =
  | typeof USER_ROLES_PAGE
  | typeof ROLES_HIERARCHY_PAGE
  | typeof SYSTEM_ADMINISTRATORS_PAGE
  | typeof SYSTEM_TOKENS_PAGE

export const PORTAL_PATH_PATTERNS: string[] = [
  WORKSPACES_PAGE_PATH_PATTERN,
  GROUPS_PAGE_PATH_PATTERN,
  PACKAGE_PAGE_PATH_PATTERN,
  OVERVIEW_PATH_PATTERN,
  VERSION_PAGE_PATH_PATTERN,
  OPERATIONS_PAGE_PATH_PATTERN,
  OPERATION_PAGE_PATH_PATTERN,
  API_CHANGES_PAGE_PATH_PATTERN,
  DEPRECATED_PAGE_PATH_PATTERN,
  DOCUMENTS_PAGE_PATH_PATTERN,
  PACKAGE_SETTINGS_PAGE_PATH_PATTERN,
  SETTINGS_PAGE_PATH_PATTERN,
  CONFIGURE_DASHBOARD_PAGE_PATH_PATTERN,
  VERSION_COMPARE_PAGE_PATH_PATTERN,
  PREVIEW_PAGE_PATH_PATTERN,
  OPERATION_COMPARE_PAGE_PATH_PATTERN,
  GROUPS_COMPARE_PAGE_PATH_PATTERN,
  GROUPS_OPERATIONS_COMPARE_PAGE_PATH_PATTERN,
]
