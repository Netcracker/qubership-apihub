/*
 * Wording of the portal tab titles: page names, tab names and the comparison arrow.
 * The order of the parts is in `pageTitles.ts`; separators and the app name are common to all apps
 * (`@netcracker/qubership-apihub-ui-shared/utils/document-title-labels`).
 */

import {
  ACCESS_TOKENS_PAGE,
  ACTIVITY_HISTORY_PAGE,
  API_SPECIFIC_CONFIGURATION_PAGE,
  EXPORT_SETTINGS_PAGE,
  GENERAL_PAGE,
  OPERATION_GROUPS_PAGE,
  type OverviewPageRoute,
  PACKAGES_PAGE,
  type PackageSettingsPageRoute,
  PERSONAL_ACCESS_TOKENS_PAGE,
  type ProfilePageRoute,
  REVISION_HISTORY_PAGE,
  ROLES_HIERARCHY_PAGE,
  RULESET_MANAGEMENT_PAGE,
  type SettingsPageRoute,
  SUMMARY_PAGE,
  SYSTEM_ADMINISTRATORS_PAGE,
  SYSTEM_TOKENS_PAGE,
  USER_ACCESS_CONTROLS_PAGE,
  USER_ROLES_PAGE,
  VERSIONS_PAGE,
} from '../routes'

export const COMPARISON_ARROW = ' → '

export const PAGE_TITLE_LABELS = {
  favorite: 'Favorite',
  shared: 'Shared',
  private: 'Private',
  workspaces: 'Workspaces',
  workspace: 'Workspace',
  group: 'Group',
  portalSettings: 'Portal Settings',
  profile: 'Profile',
  packageSettings: 'Settings',
  contracts: 'Contracts',
  operation: 'Operation',
  apiChanges: 'API Changes',
  deprecated: 'Deprecated',
  apiQuality: 'API Quality',
  documents: 'Documents',
  preview: 'Preview',
  compare: 'Compare',
  compareGroups: 'Compare Groups',
  configureVersion: 'Configure Version',
  configureDashboard: 'Configure Dashboard',
} as const

export const PORTAL_SETTINGS_TAB_TITLES: Record<SettingsPageRoute, string> = {
  [USER_ROLES_PAGE]: 'User Roles',
  [ROLES_HIERARCHY_PAGE]: 'Roles Hierarchy',
  [SYSTEM_ADMINISTRATORS_PAGE]: 'System Administrators',
  [SYSTEM_TOKENS_PAGE]: 'System Tokens',
  [RULESET_MANAGEMENT_PAGE]: 'API Quality Rulesets',
}

export const PROFILE_TAB_TITLES: Record<ProfilePageRoute, string> = {
  [PERSONAL_ACCESS_TOKENS_PAGE]: 'Personal Access Tokens',
}

export const PACKAGE_SETTINGS_TAB_TITLES: Record<PackageSettingsPageRoute, string> = {
  [GENERAL_PAGE]: 'General',
  [API_SPECIFIC_CONFIGURATION_PAGE]: 'API Specific Configuration',
  [EXPORT_SETTINGS_PAGE]: 'Export Settings',
  [VERSIONS_PAGE]: 'Versions',
  [ACCESS_TOKENS_PAGE]: 'Access Tokens',
  [USER_ACCESS_CONTROLS_PAGE]: 'User Access Control',
}

export const OVERVIEW_TAB_TITLES: Record<OverviewPageRoute, string> = {
  [SUMMARY_PAGE]: 'Summary',
  [ACTIVITY_HISTORY_PAGE]: 'Activity History',
  [REVISION_HISTORY_PAGE]: 'Revision History',
  [OPERATION_GROUPS_PAGE]: 'Operation Groups',
  [PACKAGES_PAGE]: 'Packages',
}
