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

import type { FC, PropsWithChildren } from 'react'
import { createContext, memo, useCallback, useContext, useState } from 'react'
import { createEventBus, slot } from 'ts-event-bus'
import { useEvent } from 'react-use'
import { generatePath, useNavigate } from 'react-router-dom'

import type { Path } from '@remix-run/router'
import type { OverviewPageRoute, PackageSettingsPageRoute, SettingsPageRoute } from '../routes'
import {
  API_CHANGES_PAGE_PATH_PATTERN,
  CONFIGURATION_PAGE,
  DEPRECATED_PAGE_PATH_PATTERN,
  DOCUMENTS_PAGE_PATH_PATTERN,
  GENERAL_PAGE,
  GROUPS_COMPARE_PAGE_PATH_PATTERN,
  GROUPS_OPERATIONS_COMPARE_PAGE_PATH_PATTERN,
  GROUPS_PAGE_PATH_PATTERN,
  OPERATION_COMPARE_PAGE_PATH_PATTERN,
  OPERATIONS_PAGE_PATH_PATTERN,
  OVERVIEW_PATH_PATTERN,
  PACKAGE_PAGE_PATH_PATTERN,
  PACKAGE_SETTINGS_PAGE_PATH_PATTERN,
  PREVIEW_PAGE_PATH_PATTERN,
  SETTINGS_PAGE_PATH_PATTERN,
  SUMMARY_PAGE,
  USER_ROLES_PAGE,
  VERSION_COMPARE_PAGE_PATH_PATTERN,
  VERSION_PAGE_PATH_PATTERN,
  WORKSPACES_PAGE_PATH_PATTERN,
} from '../routes'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type {
  API_TYPE_SEARCH_PARAM,
  DOCUMENT_SEARCH_PARAM,
  EXPAND_NAVIGATION_MENU_SEARCH_PARAM,
  FILE_VIEW_MODE_PARAM_KEY,
  FILTERS_SEARCH_PARAM,
  GROUP_SEARCH_PARAM,
  MODE_SEARCH_PARAM,
  OPERATION_SEARCH_PARAM,
  OPERATIONS_VIEW_MODE_PARAM,
  PACKAGE_SEARCH_PARAM,
  PLAYGROUND_SIDEBAR_VIEW_MODE_SEARCH_PARAM,
  REF_SEARCH_PARAM,
  SEARCH_TEXT_PARAM_KEY,
  SearchParam,
  TAG_SEARCH_PARAM,
  VERSION_SEARCH_PARAM,
} from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { AGENT_ROUTE, EDITOR_ROUTE } from '@netcracker/qubership-apihub-ui-shared/entities/application-routes'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export const NAVIGATE_TO_OVERVIEW = 'navigate-to-overview'
export const NAVIGATE_TO_OPERATIONS = 'navigate-to-operations'
export const NAVIGATE_TO_VERSIONS_COMPARISON = 'navigate-to-versions-comparison'
export const NAVIGATE_TO_OPERATIONS_COMPARISON = 'navigate-to-operations-comparison'
export const NAVIGATE_TO_GROUPS_OPERATIONS_COMPARISON = 'navigate-to-group-operations-comparison'
export const NAVIGATE_TO_GROUP = 'navigate-to-group'
export const NAVIGATE_TO_GROUPS_OPERATIONS_SWAPPER = 'navigate-to-groups-operations-swapper'
export const NAVIGATE_TO_OPERATIONS_SWAPPER = 'navigate-to-operations-swapper'
export const NAVIGATE_TO_FIRST_GROUP_OPERATION = 'navigate-to-first-group-operation'
export const NAVIGATE_TO_COMPARISON = 'navigate-to-comparison'
export const NAVIGATE_TO_GROUP_COMPARE_CONTENT = 'navigate-to-group-compare-content'
export const NAVIGATE_TO_WORKSPACE = 'navigate-to-workspace'
export const NAVIGATE_TO_DOCUMENTS = 'navigate-to-documents'
export const NAVIGATE_TO_DOCUMENT_PREVIEW = 'navigate-to-document-preview'
export const NAVIGATE_TO_PACKAGE = 'navigate-to-package'
export const NAVIGATE_TO_VERSION = 'navigate-to-version'
export const NAVIGATE_TO_SETTINGS = 'navigate-to-settings'
export const NAVIGATE_TO_AGENT = 'navigate-to-agent'
export const NAVIGATE_TO_EDITOR = 'navigate-to-editor'

export type PackageDetail = {
  packageKey: Key
}

export type VersionDetail = {
  packageKey: Key
  versionKey: Key
  edit?: boolean
}

export type OverviewDetail = {
  packageKey: Key
  versionKey: Key
  tab?: OverviewPageRoute
  search?: {
    [EXPAND_NAVIGATION_MENU_SEARCH_PARAM]?: SearchParam
  }
}

export type OperationsDetail = {
  packageKey: Key
  versionKey: Key
  apiType: ApiType
  operationKey?: Key
  search?: {
    [MODE_SEARCH_PARAM]?: SearchParam
    [FILE_VIEW_MODE_PARAM_KEY]?: SearchParam
    [REF_SEARCH_PARAM]?: SearchParam
    [PLAYGROUND_SIDEBAR_VIEW_MODE_SEARCH_PARAM]?: SearchParam
    [DOCUMENT_SEARCH_PARAM]?: SearchParam
    [SEARCH_TEXT_PARAM_KEY]?: SearchParam
    [EXPAND_NAVIGATION_MENU_SEARCH_PARAM]?: SearchParam
    [OPERATIONS_VIEW_MODE_PARAM]?: SearchParam
  }
}

export type ApiChangesDetail = {
  packageKey: Key
  versionKey: Key
  apiType: ApiType
  search?: {
    [EXPAND_NAVIGATION_MENU_SEARCH_PARAM]?: SearchParam
    [OPERATIONS_VIEW_MODE_PARAM]?: SearchParam
  }
}

export type DeprecatedDetail = {
  packageKey: Key
  versionKey: Key
  apiType: ApiType
  search?: {
    [EXPAND_NAVIGATION_MENU_SEARCH_PARAM]?: SearchParam
    [OPERATIONS_VIEW_MODE_PARAM]?: SearchParam
  }
}

export type DocumentsDetail = {
  packageKey: Key
  versionKey: Key
  documentKey?: Key
  search?: {
    [REF_SEARCH_PARAM]?: SearchParam
    [EXPAND_NAVIGATION_MENU_SEARCH_PARAM]?: SearchParam
  }
}

export type DocumentPreviewDetail = {
  documentKey: Key
} & DocumentsDetail

export type OperationsComparisonDetail = {
  packageKey: Key
  versionKey: Key
  apiType: ApiType
  operationKey: Key
  search: {
    [OPERATION_SEARCH_PARAM]?: SearchParam
    [REF_SEARCH_PARAM]: SearchParam
    [PACKAGE_SEARCH_PARAM]?: SearchParam
    [VERSION_SEARCH_PARAM]?: SearchParam
    [DOCUMENT_SEARCH_PARAM]?: SearchParam
    [SEARCH_TEXT_PARAM_KEY]?: SearchParam
    [FILTERS_SEARCH_PARAM]?: SearchParam
  }
}

export type GroupsOperationsComparisonDetail = {
  packageKey: Key
  versionKey: Key
  groupKey: Key
  apiType: ApiType
  operationKey: Key
  search: {
    [OPERATION_SEARCH_PARAM]?: SearchParam
    [REF_SEARCH_PARAM]: SearchParam
    [PACKAGE_SEARCH_PARAM]?: SearchParam
    [VERSION_SEARCH_PARAM]?: SearchParam
    [DOCUMENT_SEARCH_PARAM]?: SearchParam
    [GROUP_SEARCH_PARAM]?: SearchParam
    [SEARCH_TEXT_PARAM_KEY]?: SearchParam
    [FILTERS_SEARCH_PARAM]?: SearchParam
  }
}

export type FirstGroupOperationDetail = {
  packageKey: Key
  versionKey: Key
  groupKey: Key
  apiType: ApiType
  operationKey: Key
  search: {
    [DOCUMENT_SEARCH_PARAM]?: SearchParam
    [FILTERS_SEARCH_PARAM]?: SearchParam
    [GROUP_SEARCH_PARAM]?: SearchParam
  }
}

export type OperationsSwapperDetail = {
  packageKey: Key
  versionKey: Key
  apiType: ApiType
  originOperationKey: Key
  search: {
    mode?: SearchParam
    [PACKAGE_SEARCH_PARAM]?: SearchParam
    [OPERATION_SEARCH_PARAM]?: SearchParam
    [VERSION_SEARCH_PARAM]?: SearchParam
    [REF_SEARCH_PARAM]: SearchParam
    [DOCUMENT_SEARCH_PARAM]?: SearchParam
    [FILTERS_SEARCH_PARAM]?: SearchParam
  }
}

export type GroupsOperationsSwapperDetail = {
  packageKey: Key
  versionKey: Key
  previousGroup: Key
  apiType: ApiType
  originOperationKey: Key
  search: {
    mode?: SearchParam
    [PACKAGE_SEARCH_PARAM]?: SearchParam
    [OPERATION_SEARCH_PARAM]?: SearchParam
    [VERSION_SEARCH_PARAM]?: SearchParam
    [REF_SEARCH_PARAM]: SearchParam
    [DOCUMENT_SEARCH_PARAM]?: SearchParam
    [GROUP_SEARCH_PARAM]?: SearchParam
    [FILTERS_SEARCH_PARAM]?: SearchParam
  }
}

export type ComparisonDetail = {
  packageKey: Key
  versionKey: Key
  search: {
    [VERSION_SEARCH_PARAM]?: SearchParam
    [PACKAGE_SEARCH_PARAM]?: SearchParam
    [REF_SEARCH_PARAM]?: SearchParam
    [API_TYPE_SEARCH_PARAM]: SearchParam
    [FILTERS_SEARCH_PARAM]?: SearchParam
    [TAG_SEARCH_PARAM]?: SearchParam
  }
}

export type GroupCompareContentDetail = {
  packageKey: Key
  versionKey: Key
  previousGroup: Key
  search: {
    [GROUP_SEARCH_PARAM]?: SearchParam
    [FILTERS_SEARCH_PARAM]?: SearchParam
    [TAG_SEARCH_PARAM]?: SearchParam
  }
}

export type PackageSettingsDetail = {
  packageKey: Key
  tab?: PackageSettingsPageRoute
}

export type SettingsDetail = {
  tab?: SettingsPageRoute
}

export type GroupDetail = {
  groupKey: Key
}

export type WorkspaceDetail = {
  workspaceKey: Key
}

type NavigationEventBus = {
  navigateToOverview: (detail?: OverviewDetail) => void
  navigateToOperations: (detail?: OperationsDetail) => void
  navigateToVersionsComparison: (detail?: ComparisonDetail) => void
  navigateToOperationsComparison: (detail?: OperationsComparisonDetail) => void
  navigateToGroupsOperationsComparison: (detail?: GroupsOperationsComparisonDetail) => void
  navigateToGroup: (detail?: GroupDetail) => void
  navigateToGroupCompareContent: (detail?: GroupCompareContentDetail) => void
  navigateToGroupsOperationsSwapper: (detail?: GroupsOperationsSwapperDetail) => void
  navigateToFirstGroupOperation: (detail?: FirstGroupOperationDetail) => void
  navigateToOperationsSwapper: (detail?: OperationsSwapperDetail) => void
  navigateToComparison: (detail?: ComparisonDetail) => void
  navigateToWorkspace: (detail?: WorkspaceDetail) => void
  navigateToDocuments: (detail?: DocumentsDetail) => void
  navigateToDocumentPreview: (detail?: DocumentPreviewDetail) => void
  navigateToPackage: (detail?: PackageDetail) => void
  navigateToVersion: (detail?: VersionDetail) => void
  navigateToSettings: (detail?: SettingsDetail) => void
  navigateToAgent: () => void
  navigateToEditor: () => void
}

function navigationProvider(): NavigationEventBus {
  const eventBus = createEventBus({
    events: {
      navigateToOverview: slot<OverviewDetail>(),
      navigateToOperations: slot<OperationsDetail>(),
      navigateToVersionsComparison: slot<ComparisonDetail>(),
      navigateToOperationsComparison: slot<OperationsComparisonDetail>(),
      navigateToGroupsOperationsComparison: slot<GroupsOperationsComparisonDetail>(),
      navigateToGroupsOperationsSwapper: slot<GroupsOperationsSwapperDetail>(),
      navigateToOperationsSwapper: slot<OperationsSwapperDetail>(),
      navigateToFirstGroupOperation: slot<FirstGroupOperationDetail>(),
      navigateToComparison: slot<ComparisonDetail>(),
      navigateToGroupCompareContent: slot<GroupCompareContentDetail>(),
      navigateToGroup: slot<GroupDetail>(),
      navigateToWorkspace: slot<WorkspaceDetail>(),
      navigateToDocuments: slot<DocumentsDetail>(),
      navigateToDocumentPreview: slot<DocumentPreviewDetail>(),
      navigateToPackage: slot<PackageDetail>(),
      navigateToVersion: slot<VersionDetail>(),
      navigateToSettings: slot<SettingsDetail>(),
      navigateToAgent: slot(),
      navigateToEditor: slot(),
    },
  })

  eventBus.navigateToOverview.on((detail: OverviewDetail) => {
    dispatchEvent(new CustomEvent(NAVIGATE_TO_OVERVIEW, { detail }))
  })
  eventBus.navigateToOperations.on((detail: OperationsDetail) => {
    dispatchEvent(new CustomEvent(NAVIGATE_TO_OPERATIONS, { detail }))
  })
  eventBus.navigateToVersionsComparison.on((detail: ComparisonDetail) => {
    dispatchEvent(new CustomEvent(NAVIGATE_TO_VERSIONS_COMPARISON, { detail }))
  })
  eventBus.navigateToOperationsComparison.on((detail: OperationsComparisonDetail) => {
    dispatchEvent(new CustomEvent(NAVIGATE_TO_OPERATIONS_COMPARISON, { detail }))
  })
  eventBus.navigateToGroupsOperationsComparison.on((detail: GroupsOperationsComparisonDetail) => {
    dispatchEvent(new CustomEvent(NAVIGATE_TO_GROUPS_OPERATIONS_COMPARISON, { detail }))
  })
  eventBus.navigateToGroup.on((detail: GroupDetail) => {
    dispatchEvent(new CustomEvent(NAVIGATE_TO_GROUP, { detail }))
  })
  eventBus.navigateToGroupsOperationsSwapper.on((detail: GroupsOperationsSwapperDetail) => {
    dispatchEvent(new CustomEvent(NAVIGATE_TO_GROUPS_OPERATIONS_SWAPPER, { detail }))
  })
  eventBus.navigateToFirstGroupOperation.on((detail: FirstGroupOperationDetail) => {
    dispatchEvent(new CustomEvent(NAVIGATE_TO_FIRST_GROUP_OPERATION, { detail }))
  })
  eventBus.navigateToOperationsSwapper.on((detail: OperationsSwapperDetail) => {
    dispatchEvent(new CustomEvent(NAVIGATE_TO_OPERATIONS_SWAPPER, { detail }))
  })
  eventBus.navigateToComparison.on((detail: ComparisonDetail) => {
    dispatchEvent(new CustomEvent(NAVIGATE_TO_COMPARISON, { detail }))
  })
  eventBus.navigateToGroupCompareContent.on((detail: GroupCompareContentDetail) => {
    dispatchEvent(new CustomEvent(NAVIGATE_TO_GROUP_COMPARE_CONTENT, { detail }))
  })
  eventBus.navigateToWorkspace.on((detail: WorkspaceDetail) => {
    dispatchEvent(new CustomEvent(NAVIGATE_TO_WORKSPACE, { detail }))
  })
  eventBus.navigateToDocuments.on((detail: DocumentsDetail) => {
    dispatchEvent(new CustomEvent(NAVIGATE_TO_DOCUMENTS, { detail }))
  })
  eventBus.navigateToDocumentPreview.on((detail: DocumentPreviewDetail) => {
    dispatchEvent(new CustomEvent(NAVIGATE_TO_DOCUMENT_PREVIEW, { detail }))
  })
  eventBus.navigateToPackage.on((detail: PackageDetail) => {
    dispatchEvent(new CustomEvent(NAVIGATE_TO_PACKAGE, { detail }))
  })
  eventBus.navigateToVersion.on((detail: VersionDetail) => {
    dispatchEvent(new CustomEvent(NAVIGATE_TO_VERSION, { detail }))
  })
  eventBus.navigateToSettings.on((detail: SettingsDetail) => {
    dispatchEvent(new CustomEvent(NAVIGATE_TO_SETTINGS, { detail }))
  })
  eventBus.navigateToAgent.on(() => {
    dispatchEvent(new CustomEvent(NAVIGATE_TO_AGENT))
  })
  eventBus.navigateToEditor.on(() => {
    dispatchEvent(new CustomEvent(NAVIGATE_TO_EDITOR))
  })

  return eventBus as unknown as NavigationEventBus
}

const EventBusContext = createContext<NavigationEventBus>()

export function useNavigation(): NavigationEventBus {
  return useContext(EventBusContext)
}

export const NavigationProvider: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  const [navigationEventBus] = useState(navigationProvider)
  const navigate = useNavigate()

  /* eslint-disable react-hooks/exhaustive-deps */
  const handleNavigateToOverview = useCallback(({ detail }: CustomEvent<OverviewDetail>) => navigate(getOverviewPath(detail)), [])
  const handleNavigateToOperations = useCallback(({ detail }: CustomEvent<OperationsDetail>) => navigate(getOperationsPath(detail)), [])
  const handleNavigateToVersionsComparison = useCallback(({ detail }: CustomEvent<ComparisonDetail>) => navigate(getComparisonPath(detail)), [])
  const handleNavigateToOperationsComparison = useCallback(({ detail }: CustomEvent<OperationsComparisonDetail>) => navigate(getOperationsComparisonPath(detail)), [])
  const handleNavigateToGroupsOperationsComparison = useCallback(({ detail }: CustomEvent<GroupsOperationsComparisonDetail>) => navigate(getGroupsOperationsPath(detail)), [])
  const handleNavigateToFirstGroupOperation = useCallback(({ detail }: CustomEvent<FirstGroupOperationDetail>) => navigate(getFirstGroupOperationPath(detail)), [])
  const handleNavigateToGroup = useCallback(({ detail }: CustomEvent<GroupDetail>) => navigate(getGroupPath(detail)), [])
  const handleNavigateToGroupsOperationsSwapper = useCallback(({ detail }: CustomEvent<GroupsOperationsSwapperDetail>) => navigate(getGroupsOperationsSwapperPath(detail)), [])
  const handleNavigateToOperationsSwapper = useCallback(({ detail }: CustomEvent<OperationsSwapperDetail>) => navigate(getOperationsSwapperPath(detail)), [])
  const handleNavigateToComparison = useCallback(({ detail }: CustomEvent<ComparisonDetail>) => navigate(getComparisonPath(detail)), [])
  const handleNavigateToGroupCompareContent = useCallback(({ detail }: CustomEvent<GroupCompareContentDetail>) => navigate(getGroupCompareContentPath(detail)), [])
  const handleNavigateToWorkspace = useCallback(({ detail }: CustomEvent<WorkspaceDetail>) => navigate(getWorkspacePath(detail)), [])
  const handleNavigateToDocuments = useCallback(({ detail }: CustomEvent<DocumentsDetail>) => navigate(getDocumentPath(detail)), [])
  const handleNavigateToDocumentPreview = useCallback(({ detail }: CustomEvent<DocumentPreviewDetail>) => navigate(getDocumentPreviewPath(detail)), [])
  const handleNavigateToPackage = useCallback(({ detail }: CustomEvent<PackageDetail>) => navigate(getPackagePath(detail)), [])
  const handleNavigateToVersion = useCallback(({ detail }: CustomEvent<VersionDetail>) => navigate(getVersionPath(detail)), [])
  const handleNavigateToSettings = useCallback(({ detail }: CustomEvent<SettingsDetail>) => navigate(getSettingsPath(detail)), [])
  const handleNavigateToAgent = useCallback(() => navigateToApplication(AGENT_ROUTE), [])
  const handleNavigateToEditor = useCallback(() => navigateToApplication(EDITOR_ROUTE), [])
  /* eslint-enable */

  useEvent(NAVIGATE_TO_OVERVIEW, handleNavigateToOverview)
  useEvent(NAVIGATE_TO_OPERATIONS, handleNavigateToOperations)
  useEvent(NAVIGATE_TO_VERSIONS_COMPARISON, handleNavigateToVersionsComparison)
  useEvent(NAVIGATE_TO_OPERATIONS_COMPARISON, handleNavigateToOperationsComparison)
  useEvent(NAVIGATE_TO_GROUPS_OPERATIONS_COMPARISON, handleNavigateToGroupsOperationsComparison)
  useEvent(NAVIGATE_TO_FIRST_GROUP_OPERATION, handleNavigateToFirstGroupOperation)
  useEvent(NAVIGATE_TO_GROUP, handleNavigateToGroup)
  useEvent(NAVIGATE_TO_GROUPS_OPERATIONS_SWAPPER, handleNavigateToGroupsOperationsSwapper)
  useEvent(NAVIGATE_TO_OPERATIONS_SWAPPER, handleNavigateToOperationsSwapper)
  useEvent(NAVIGATE_TO_COMPARISON, handleNavigateToComparison)
  useEvent(NAVIGATE_TO_GROUP_COMPARE_CONTENT, handleNavigateToGroupCompareContent)
  useEvent(NAVIGATE_TO_WORKSPACE, handleNavigateToWorkspace)
  useEvent(NAVIGATE_TO_DOCUMENTS, handleNavigateToDocuments)
  useEvent(NAVIGATE_TO_DOCUMENT_PREVIEW, handleNavigateToDocumentPreview)
  useEvent(NAVIGATE_TO_PACKAGE, handleNavigateToPackage)
  useEvent(NAVIGATE_TO_VERSION, handleNavigateToVersion)
  useEvent(NAVIGATE_TO_SETTINGS, handleNavigateToSettings)
  useEvent(NAVIGATE_TO_AGENT, handleNavigateToAgent)
  useEvent(NAVIGATE_TO_EDITOR, handleNavigateToEditor)

  return (
    <EventBusContext.Provider value={navigationEventBus}>
      {children}
    </EventBusContext.Provider>
  )
})

//all pathnames in these functions should use PATH_PATTERNS from 'routes.ts'
export function getOverviewPath({
  packageKey,
  versionKey,
  tab = SUMMARY_PAGE,
  search,
}: OverviewDetail): Partial<Path> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)
  return {
    pathname: generatePath(`${OVERVIEW_PATH_PATTERN}${tab}`, { packageId, versionId }),
    search: search ? `${optionalSearchParams(search)}` : undefined,
  }
}

export function getOperationsPath({
  packageKey,
  versionKey,
  apiType,
  operationKey,
  search,
}: OperationsDetail): Partial<Path> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)
  const operationId = operationKey ? encodeURIComponent(operationKey) : ''
  return {
    pathname: generatePath(
      `${OPERATIONS_PAGE_PATH_PATTERN}${operationId}`,
      { packageId, versionId, apiType },
    ),
    ...(search ? { search: `${optionalSearchParams(search)}` } : {}),
  }
}

export function getGroupsOperationsPath({
  packageKey,
  versionKey,
  groupKey,
  apiType,
  operationKey,
  search,
}: GroupsOperationsComparisonDetail): Partial<Path> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)
  const groupId = encodeURIComponent(groupKey)
  const operationId = encodeURIComponent(operationKey)
  return {
    pathname: generatePath(
      GROUPS_OPERATIONS_COMPARE_PAGE_PATH_PATTERN,
      { packageId, versionId, groupId, apiType, operationId },
    ),
    ...(search ? { search: `${optionalSearchParams(search)}` } : {}),
  }
}

export function getFirstGroupOperationPath({
  packageKey,
  versionKey,
  groupKey,
  apiType,
  operationKey,
  search,
}: FirstGroupOperationDetail): Partial<Path> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)
  const groupId = encodeURIComponent(groupKey)
  const operationId = encodeURIComponent(operationKey)
  return {
    pathname: generatePath(
      GROUPS_OPERATIONS_COMPARE_PAGE_PATH_PATTERN,
      { packageId, versionId, groupId, apiType, operationId },
    ),
    search: search ? `${optionalSearchParams(search)}` : undefined,
  }
}

export function getApiChangesPath({
  packageKey,
  versionKey,
  apiType,
  search,
}: ApiChangesDetail): Partial<Path> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)
  return {
    pathname: generatePath(
      API_CHANGES_PAGE_PATH_PATTERN,
      { packageId, versionId, apiType },
    ),
    search: search ? `${optionalSearchParams(search)}` : undefined,
  }
}

export function getDeprecatedPath({
  packageKey,
  versionKey,
  apiType,
  search,
}: DeprecatedDetail): Partial<Path> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)
  return {
    pathname: generatePath(DEPRECATED_PAGE_PATH_PATTERN, { packageId, versionId, apiType }),
    search: search ? `${optionalSearchParams(search)}` : undefined,
  }
}

export function getDocumentPath({
  packageKey,
  versionKey,
  documentKey,
  search,
}: DocumentsDetail): Partial<Path> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)
  const documentId = documentKey ? encodeURIComponent(documentKey) : ''
  return {
    pathname: generatePath(DOCUMENTS_PAGE_PATH_PATTERN, { packageId, versionId, documentId }),
    ...(search ? { search: `${optionalSearchParams(search)}` } : {}),
  }
}

export function getDocumentPreviewPath({
  packageKey,
  versionKey,
  documentKey,
  search,
}: DocumentPreviewDetail): Partial<Path> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)
  const documentId = encodeURIComponent(documentKey)
  return {
    pathname: generatePath(PREVIEW_PAGE_PATH_PATTERN, { packageId, versionId, documentId }),
    ...(search ? { search: `${optionalSearchParams(search)}` } : {}),
  }
}

export function getOperationsComparisonPath({
  packageKey,
  versionKey,
  apiType,
  operationKey,
  search,
}: OperationsComparisonDetail): Partial<Path> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)
  const operationId = encodeURIComponent(operationKey)
  return {
    pathname: generatePath(OPERATION_COMPARE_PAGE_PATH_PATTERN, { packageId, versionId, operationId, apiType }),
    ...(search ? { search: `${optionalSearchParams(search)}` } : {}),
  }
}

export function getGroupsOperationsSwapperPath({
  packageKey,
  versionKey,
  previousGroup,
  apiType,
  originOperationKey,
  search,
}: GroupsOperationsSwapperDetail): Partial<Path> {
  const packageId = encodeURIComponent(packageKey!)
  const versionId = encodeURIComponent(versionKey!)
  const groupId = encodeURIComponent(previousGroup!)
  const operationId = encodeURIComponent(originOperationKey)
  return {
    pathname: generatePath(
      GROUPS_OPERATIONS_COMPARE_PAGE_PATH_PATTERN,
      { packageId, versionId, groupId, operationId, apiType },
    ),
    ...(search ? { search: `${optionalSearchParams(search)}` } : {}),
  }
}

export function getOperationsSwapperPath({
  packageKey,
  versionKey,
  apiType,
  originOperationKey,
  search,
}: OperationsSwapperDetail): Partial<Path> {
  const packageId = encodeURIComponent(packageKey!)
  const versionId = encodeURIComponent(versionKey!)
  const operationId = encodeURIComponent(originOperationKey)
  return {
    pathname: generatePath(
      OPERATION_COMPARE_PAGE_PATH_PATTERN,
      { packageId, versionId, operationId, apiType },
    ),
    ...(search ? { search: `${optionalSearchParams(search)}` } : {}),
  }
}

export function getComparisonPath({
  packageKey,
  versionKey,
  search,
}: ComparisonDetail): Partial<Path> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)
  return {
    pathname: generatePath(VERSION_COMPARE_PAGE_PATH_PATTERN, { packageId, versionId }),
    ...(search ? { search: `${optionalSearchParams(search)}` } : {}),
  }
}

export function getGroupCompareContentPath({
  packageKey,
  versionKey,
  previousGroup,
  search,
}: GroupCompareContentDetail): Partial<Path> {
  const packageId = encodeURIComponent(packageKey!)
  const versionId = encodeURIComponent(versionKey!)
  const groupId = encodeURIComponent(previousGroup!)
  return {
    pathname: generatePath(GROUPS_COMPARE_PAGE_PATH_PATTERN, { packageId, versionId, groupId }),
    ...(search ? { search: `${optionalSearchParams(search)}` } : {}),
  }
}

export function getPackageSettingsPath({
  packageKey,
  tab = GENERAL_PAGE,
}: PackageSettingsDetail): Partial<Path> {
  const packageId = encodeURIComponent(packageKey)
  return {
    pathname: generatePath(`${PACKAGE_SETTINGS_PAGE_PATH_PATTERN}${tab}`, { packageId }),
  }
}

export function getSettingsPath({
  tab,
}: SettingsDetail = {
  tab: USER_ROLES_PAGE,
}): Partial<Path> {
  return {
    pathname: `${SETTINGS_PAGE_PATH_PATTERN}${tab}`,
  }
}

export function getWorkspacePath({
  workspaceKey,
}: { workspaceKey: Key }): Partial<Path> {
  const workspaceId = encodeURIComponent(workspaceKey)
  return {
    pathname: generatePath(WORKSPACES_PAGE_PATH_PATTERN, { workspaceId }),
  }
}

export function getGroupPath({
  groupKey,
}: GroupDetail): Partial<Path> {
  const groupId = encodeURIComponent(groupKey)
  return {
    pathname: generatePath(GROUPS_PAGE_PATH_PATTERN, { groupId }),
  }
}

export function getPackagePath({
  packageKey,
}: PackageDetail): Partial<Path> {
  const packageId = encodeURIComponent(packageKey)
  return {
    pathname: generatePath(PACKAGE_PAGE_PATH_PATTERN, { packageId }),
  }
}

export function getVersionPath({
  packageKey,
  versionKey,
  edit,
}: VersionDetail): Partial<Path> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)
  return {
    pathname: generatePath(
      `${VERSION_PAGE_PATH_PATTERN}${edit ? CONFIGURATION_PAGE : ''}`,
      { packageId, versionId },
    ),
  }
}

//For navigation between different applications within the same window
export function navigateToApplication(pathname: string): void {
  window.open(`/${pathname}`, '_self')
}
