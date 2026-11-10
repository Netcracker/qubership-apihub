/*
 * Browser tab titles of the portal: the single place for their wording, order and separators.
 * When the wording changes, only this file is edited; pages pass data and never build strings.
 *
 * Segments go from the most specific to the least specific one, the app name is appended
 * by the format. Empty segments (data not loaded yet) are skipped, see `buildDocumentTitle`.
 */

import { getRouteApiTypeTitle, isApiContract } from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { REVISION_DELIMITER } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import type {
  DocumentTitleFormat,
  DocumentTitleSegment,
  DocumentTitleSegments,
} from '@netcracker/qubership-apihub-ui-shared/utils/document-title'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'

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

/** A version as the title shows it: the revision is shown only when it is not the latest one, as in the toolbar. */
type TitleVersion = Partial<{
  fullVersion: Key
  latestRevision: boolean
}>

type ComparisonSide = Partial<{
  packageName: string
  version: TitleVersion
}>

export type VersionsComparisonTitleParams = Partial<{
  origin: ComparisonSide
  changed: ComparisonSide
}>

type OperationsComparisonTitleParams = VersionsComparisonTitleParams & Partial<{
  originOperationTitle: string
  changedOperationTitle: string
}>

type GroupsComparisonTitleParams = Partial<{
  originGroup: string
  changedGroup: string
  changed: ComparisonSide
}>

type GroupOperationsComparisonTitleParams = GroupsComparisonTitleParams & Partial<{
  originOperationTitle: string
  changedOperationTitle: string
}>

export const PORTAL_DOCUMENT_TITLE_FORMAT: DocumentTitleFormat = {
  appName: 'APIHUB',
  segmentSeparator: ' · ',
  appNameSeparator: ' | ',
}

const COMPARISON_ARROW = ' → '

const PAGE_TITLE_LABELS = {
  login: 'Log In',
  notFound: 'Page Not Found',
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

const PORTAL_SETTINGS_TAB_TITLES: Record<SettingsPageRoute, string> = {
  [USER_ROLES_PAGE]: 'User Roles',
  [ROLES_HIERARCHY_PAGE]: 'Roles Hierarchy',
  [SYSTEM_ADMINISTRATORS_PAGE]: 'System Administrators',
  [SYSTEM_TOKENS_PAGE]: 'System Tokens',
  [RULESET_MANAGEMENT_PAGE]: 'API Quality Rulesets',
}

const PROFILE_TAB_TITLES: Record<ProfilePageRoute, string> = {
  [PERSONAL_ACCESS_TOKENS_PAGE]: 'Personal Access Tokens',
}

const PACKAGE_SETTINGS_TAB_TITLES: Record<PackageSettingsPageRoute, string> = {
  [GENERAL_PAGE]: 'General',
  [API_SPECIFIC_CONFIGURATION_PAGE]: 'API Specific Configuration',
  [EXPORT_SETTINGS_PAGE]: 'Export Settings',
  [VERSIONS_PAGE]: 'Versions',
  [ACCESS_TOKENS_PAGE]: 'Access Tokens',
  [USER_ACCESS_CONTROLS_PAGE]: 'User Access Control',
}

const OVERVIEW_TAB_TITLES: Record<OverviewPageRoute, string> = {
  [SUMMARY_PAGE]: 'Summary',
  [ACTIVITY_HISTORY_PAGE]: 'Activity History',
  [REVISION_HISTORY_PAGE]: 'Revision History',
  [OPERATION_GROUPS_PAGE]: 'Operation Groups',
  [PACKAGES_PAGE]: 'Packages',
}

export const PAGE_TITLES = {
  login: (): DocumentTitleSegments => [PAGE_TITLE_LABELS.login],
  notFound: (): DocumentTitleSegments => [PAGE_TITLE_LABELS.notFound],

  favorite: (): DocumentTitleSegments => [PAGE_TITLE_LABELS.favorite],
  shared: (): DocumentTitleSegments => [PAGE_TITLE_LABELS.shared],
  private: (): DocumentTitleSegments => [PAGE_TITLE_LABELS.private],
  workspaces: (): DocumentTitleSegments => [PAGE_TITLE_LABELS.workspaces],
  workspace: (workspaceName?: string): DocumentTitleSegments => [workspaceName, PAGE_TITLE_LABELS.workspace],
  group: (groupName?: string): DocumentTitleSegments => [groupName, PAGE_TITLE_LABELS.group],

  portalSettings: (tab?: string): DocumentTitleSegments => [
    PORTAL_SETTINGS_TAB_TITLES[tab as SettingsPageRoute],
    PAGE_TITLE_LABELS.portalSettings,
  ],
  profile: (tab?: string): DocumentTitleSegments => [
    PROFILE_TAB_TITLES[tab as ProfilePageRoute],
    PAGE_TITLE_LABELS.profile,
  ],

  package: (packageName?: string): DocumentTitleSegments => [packageName],
  packageSettings: (tab?: string, packageName?: string): DocumentTitleSegments => [
    PACKAGE_SETTINGS_TAB_TITLES[tab as PackageSettingsPageRoute],
    packageName ? `${packageName} ${PAGE_TITLE_LABELS.packageSettings}` : PAGE_TITLE_LABELS.packageSettings,
  ],

  /** Appended to every page of a package version, see `useVersionPageTitle`. */
  versionContext: (packageName?: string, version?: TitleVersion): DocumentTitleSegments => [
    packageName,
    toTitleVersion(version),
  ],
  overview: (tab?: string): DocumentTitleSegments => [OVERVIEW_TAB_TITLES[tab as OverviewPageRoute]],
  contracts: (apiType?: string): DocumentTitleSegments => [PAGE_TITLE_LABELS.contracts, toApiTypeTitle(apiType)],
  contract: (contractTitle?: string, apiType?: string): DocumentTitleSegments => [
    contractTitle || PAGE_TITLE_LABELS.operation,
    toApiTypeTitle(apiType),
  ],
  apiChanges: (apiType?: string): DocumentTitleSegments => [PAGE_TITLE_LABELS.apiChanges, toApiTypeTitle(apiType)],
  deprecated: (apiType?: string): DocumentTitleSegments => [PAGE_TITLE_LABELS.deprecated, toApiTypeTitle(apiType)],
  apiQuality: (apiType?: string): DocumentTitleSegments => [PAGE_TITLE_LABELS.apiQuality, toApiTypeTitle(apiType)],
  documents: (documentTitle?: string): DocumentTitleSegments => [documentTitle, PAGE_TITLE_LABELS.documents],
  documentPreview: (documentTitle?: string): DocumentTitleSegments => [documentTitle, PAGE_TITLE_LABELS.preview],
  configure: (isDashboard: boolean): DocumentTitleSegments => [
    isDashboard ? PAGE_TITLE_LABELS.configureDashboard : PAGE_TITLE_LABELS.configureVersion,
  ],

  versionsComparison: versionsComparisonTitle,
  operationsComparison: (params: OperationsComparisonTitleParams): DocumentTitleSegments => [
    fromTo(params.originOperationTitle, params.changedOperationTitle) ?? PAGE_TITLE_LABELS.operation,
    ...versionsComparisonTitle(params),
  ],
  groupsComparison: (params: GroupsComparisonTitleParams): DocumentTitleSegments => {
    const groups = fromTo(params.originGroup, params.changedGroup)
    return [
      groups ? `${PAGE_TITLE_LABELS.compareGroups} ${groups}` : PAGE_TITLE_LABELS.compareGroups,
      params.changed?.packageName,
      toTitleVersion(params.changed?.version),
    ]
  },
  groupOperationsComparison: (params: GroupOperationsComparisonTitleParams): DocumentTitleSegments => [
    fromTo(params.originOperationTitle, params.changedOperationTitle) ?? PAGE_TITLE_LABELS.operation,
    PAGE_TITLE_LABELS.compareGroups,
    params.changed?.packageName,
    toTitleVersion(params.changed?.version),
  ],
}

function toTitleVersion(version: TitleVersion | undefined): string | undefined {
  if (!version?.fullVersion) {
    return undefined
  }
  const { versionKey, revisionKey } = getSplittedVersionKey(version.fullVersion)
  const isLatestRevision = version.latestRevision ?? true
  return isLatestRevision || !revisionKey ? versionKey : `${versionKey}${REVISION_DELIMITER}${revisionKey}`
}

function toApiTypeTitle(apiType: string | undefined): DocumentTitleSegment {
  return apiType && isApiContract(apiType) ? getRouteApiTypeTitle(apiType) : undefined
}

function versionsComparisonTitle(params: VersionsComparisonTitleParams): DocumentTitleSegments {
  return [
    comparisonTitle(PAGE_TITLE_LABELS.compare, params),
    isSamePackage(params) ? params.changed?.packageName ?? params.origin?.packageName : undefined,
  ]
}

function comparisonTitle(label: string, params: VersionsComparisonTitleParams): string {
  const withPackage = !isSamePackage(params)
  const sides = fromTo(
    toComparisonSideTitle(params.origin, withPackage),
    toComparisonSideTitle(params.changed, withPackage),
  )
  return sides && (withPackage || sides.includes(COMPARISON_ARROW)) ? `${label} ${sides}` : label
}

function toComparisonSideTitle(side: ComparisonSide | undefined, withPackage: boolean): string | undefined {
  const version = toTitleVersion(side?.version)
  return withPackage
    ? [side?.packageName, version].filter(Boolean).join(' ') || undefined
    : version
}

function isSamePackage({ origin, changed }: VersionsComparisonTitleParams): boolean {
  return !origin?.packageName || !changed?.packageName || origin.packageName === changed.packageName
}

function fromTo(origin: string | undefined, changed: string | undefined): string | undefined {
  if (origin && changed && origin !== changed) {
    return `${origin}${COMPARISON_ARROW}${changed}`
  }
  return changed ?? origin
}
