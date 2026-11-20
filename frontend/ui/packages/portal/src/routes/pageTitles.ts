/*
 * Browser tab titles of the portal: which parts each page shows and in which order.
 * Pages pass data and never build strings. The wording is in `pageTitleLabels.ts`,
 * the resolution of the comparison titles is in `comparisonPageTitles.ts`.
 *
 * Segments go from the most specific to the least specific one, the app name is appended
 * by the format. Empty segments (data not loaded yet) are skipped, see `buildDocumentTitle`.
 */

import { getRouteApiTypeTitle, isApiContract } from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'
import { DASHBOARD_KIND, type PackageKind } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import {
  createDocumentTitleFormat,
  type DocumentTitleFormat,
  type DocumentTitleSegment,
  type DocumentTitleSegments,
  toTabTitle,
} from '@netcracker/qubership-apihub-ui-shared/utils/document-title'
import { APIHUB_APP_NAME } from '@netcracker/qubership-apihub-ui-shared/utils/document-title-labels'

import { COMPARISON_PAGE_TITLES, toTitleVersion, type TitleVersion } from './comparisonPageTitles'
import {
  OVERVIEW_TAB_TITLES,
  PACKAGE_SETTINGS_TAB_TITLES,
  PAGE_TITLE_LABELS,
  PORTAL_SETTINGS_TAB_TITLES,
  PROFILE_TAB_TITLES,
} from './pageTitleLabels'

export type { VersionsComparisonTitleParams } from './comparisonPageTitles'

export const PORTAL_DOCUMENT_TITLE_FORMAT: DocumentTitleFormat = createDocumentTitleFormat(APIHUB_APP_NAME)

export const PAGE_TITLES = {
  favorite: (): DocumentTitleSegments => [PAGE_TITLE_LABELS.favorite],
  shared: (): DocumentTitleSegments => [PAGE_TITLE_LABELS.shared],
  private: (): DocumentTitleSegments => [PAGE_TITLE_LABELS.private],
  workspaces: (): DocumentTitleSegments => [PAGE_TITLE_LABELS.workspaces],
  workspace: (workspaceName?: string): DocumentTitleSegments => [workspaceName, PAGE_TITLE_LABELS.workspace],
  group: (groupName?: string): DocumentTitleSegments => [groupName, PAGE_TITLE_LABELS.group],

  portalSettings: (tab?: string): DocumentTitleSegments => [
    toTabTitle(PORTAL_SETTINGS_TAB_TITLES, tab),
    PAGE_TITLE_LABELS.portalSettings,
  ],
  profile: (tab?: string): DocumentTitleSegments => [
    toTabTitle(PROFILE_TAB_TITLES, tab),
    PAGE_TITLE_LABELS.profile,
  ],

  package: (packageName?: string): DocumentTitleSegments => [packageName],
  packageSettings: (tab?: string, packageName?: string): DocumentTitleSegments => [
    toTabTitle(PACKAGE_SETTINGS_TAB_TITLES, tab),
    packageName ? `${packageName} ${PAGE_TITLE_LABELS.packageSettings}` : PAGE_TITLE_LABELS.packageSettings,
  ],

  /** Appended to every page of a package version, see `useVersionPageTitle`. */
  versionContext: (packageName?: string, version?: TitleVersion): DocumentTitleSegments => [
    packageName,
    toTitleVersion(version),
  ],
  overview: (tab?: string): DocumentTitleSegments => [toTabTitle(OVERVIEW_TAB_TITLES, tab)],
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
  configure: (packageKind?: PackageKind): DocumentTitleSegments => [toConfigureTitle(packageKind)],

  ...COMPARISON_PAGE_TITLES,
}

function toConfigureTitle(packageKind: PackageKind | undefined): string | undefined {
  if (!packageKind) {
    return undefined
  }
  return packageKind === DASHBOARD_KIND ? PAGE_TITLE_LABELS.configureDashboard : PAGE_TITLE_LABELS.configureVersion
}

function toApiTypeTitle(apiType: string | undefined): DocumentTitleSegment {
  return apiType && isApiContract(apiType) ? getRouteApiTypeTitle(apiType) : undefined
}
