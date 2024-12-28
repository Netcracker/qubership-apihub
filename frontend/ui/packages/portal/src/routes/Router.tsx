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

import type { RouteObject } from 'react-router-dom'
import { createBrowserRouter, createRoutesFromElements, Navigate, Route } from 'react-router-dom'

import type { ReactNode } from 'react'
import {
  API_CHANGES_PAGE,
  COMPARE_PAGE,
  CONFIGURATION_PAGE,
  DEPRECATED_PAGE,
  DOCUMENTS_PAGE,
  FAVORITE_PAGE,
  GROUPS_PAGE,
  OPERATIONS_PAGE,
  PACKAGE_SETTINGS_PAGE,
  PREVIEW_PAGE,
  PRIVATE_PAGE,
  SHARED_PAGE,
  SUMMARY_ROUTE,
  VERSION_ID,
  WORKSPACES_PAGE,
} from '../routes'
import { NavigationProvider } from './NavigationProvider'
import { SettingsPage } from './root/SettingsPage/SettingsPage'
import { ConfigurePage } from './root/PortalPage/ConfigurePage'
import { BasePage } from '@apihub/routes/root/BasePage/BasePage'
import { MainPage } from '@apihub/routes/root/MainPage/MainPage'
import { FavoritePage } from '@apihub/routes/root/MainPage/MainPageSubpages/FavoritePage'
import { SharedPage } from '@apihub/routes/root/MainPage/MainPageSubpages/SharedPage'
import { PrivatePage } from '@apihub/routes/root/MainPage/MainPageSubpages/PrivatePage/PrivatePage'
import { WorkspacesPage } from '@apihub/routes/root/MainPage/MainPageSubpages/WorkspacesPage'
import { WorkspacePage } from '@apihub/routes/root/MainPage/MainPageSubpages/WorkspacePage'
import { GroupPage } from '@apihub/routes/root/MainPage/MainPageSubpages/GroupPage'
import { PackagePage } from '@apihub/routes/root/PortalPage/PackagePage/PackagePage'
import { PackageSettingsPage } from '@apihub/routes/root/PortalPage/PackageSettingsPage/PackageSettingsPage'
import { SPECIAL_VERSION_KEY } from '@apihub/entities/versions'
import { VersionPage } from '@apihub/routes/root/PortalPage/VersionPage/VersionPage'
import { OperationPage } from '@apihub/routes/root/PortalPage/VersionPage/OperationPage/OperationPage'
import { DocumentPreviewPage } from '@apihub/routes/root/PortalPage/VersionPage/DocumentPreviewPage/DocumentPreviewPage'
import { ChangesSummaryProvider } from '@apihub/routes/root/PortalPage/VersionPage/ChangesSummaryProvider'
import { VersionComparePage } from '@apihub/routes/root/PortalPage/VersionPage/VersionComparePage/VersionComparePage'
import {
  OperationsComparisonPage,
} from '@apihub/routes/root/PortalPage/VersionPage/OperationsComparisonPage/OperationsComparisonPage'
import { GroupComparePage } from '@apihub/routes/root/PortalPage/VersionPage/GroupComparePage/GroupComparePage'
import {
  DifferentOperationGroupsComparisonPage,
} from '@apihub/routes/root/PortalPage/VersionPage/OperationsComparisonPage/DifferentOperationGroupsComparisonPage'
import { ErrorPage, NOT_FOUND_TITLE } from '@netcracker/qubership-apihub-ui-shared/components/ErrorPage'
import { LoginPage } from '@netcracker/qubership-apihub-ui-shared/pages/login'

export const router = createBrowserRouter(
  createRoutes([
    <Route path="/" element={<NavigationProvider><BasePage/></NavigationProvider>}>
      <Route index element={<Navigate to="portal" replace/>}/>
      <Route path="portal">
        <Route element={<MainPage/>}>
          <Route index element={<Navigate to={FAVORITE_PAGE} replace/>}/>
          <Route path={FAVORITE_PAGE} element={<FavoritePage/>}/>
          <Route path={SHARED_PAGE} element={<SharedPage/>}/>
          <Route path={PRIVATE_PAGE} element={<PrivatePage/>}/>
          <Route path={WORKSPACES_PAGE} element={<WorkspacesPage/>}/>
          <Route path={`${WORKSPACES_PAGE}/:workspaceKey`} element={<WorkspacePage/>}/>
          <Route path={`${GROUPS_PAGE}/:groupId`} element={<GroupPage/>}/>
        </Route>
        <Route path="settings/*" element={<SettingsPage/>}/>
        <Route path="packages/:packageId">
          <Route index element={<PackagePage/>}/>
          <Route path={`${SPECIAL_VERSION_KEY}/${PACKAGE_SETTINGS_PAGE}/*`} element={<PackageSettingsPage/>}/>
          <Route path={`:${VERSION_ID}/*`}>
            <Route element={<VersionPage/>}/>
            <Route index element={<Navigate to={SUMMARY_ROUTE} replace/>}/>
            <Route path="*" element={<VersionPage/>}/>
            <Route path={`${API_CHANGES_PAGE}/:apiType`} element={<VersionPage/>}/>
            <Route path={`${OPERATIONS_PAGE}/:apiType`}>
              <Route index element={<VersionPage/>}/>
              <Route path=":operationId/*" element={<OperationPage/>}/>
            </Route>
            <Route path={`${DEPRECATED_PAGE}/:apiType`} element={<VersionPage/>}/>
            <Route path={DOCUMENTS_PAGE}>
              <Route index element={<VersionPage/>}/>
              <Route path=":documentId">
                <Route index element={<VersionPage/>}/>
                <Route path={PREVIEW_PAGE} element={<DocumentPreviewPage/>}/>
              </Route>
            </Route>
            <Route path={`${COMPARE_PAGE}/*`}>
              <Route index element={(
                <ChangesSummaryProvider>
                  <VersionComparePage/>
                </ChangesSummaryProvider>
              )}/>
              <Route path=":apiType/:operationId" element={<OperationsComparisonPage/>}/>
            </Route>
            <Route path="groups/:group/compare">
              <Route index element={(
                <ChangesSummaryProvider>
                  <GroupComparePage/>
                </ChangesSummaryProvider>
              )}/>
              <Route path=":apiType/:operationId" element={
                <ChangesSummaryProvider>
                  <DifferentOperationGroupsComparisonPage/>
                </ChangesSummaryProvider>}/>
            </Route>
            <Route
              path={CONFIGURATION_PAGE}
              element={<ConfigurePage/>}
            />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<ErrorPage title={NOT_FOUND_TITLE} homePath="/portal"/>}/>
    </Route>,
    <Route path="/login" element={<LoginPage applicationName={'APIHUB Portal'}/>}/>,
  ]),
)

function createRoutes(routers: ReactNode[]): RouteObject[] {
  return routers.map((router, index) => createRoutesFromElements(router, [index])).flat()
}
