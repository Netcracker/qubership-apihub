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

import { test } from '@fixtures'
import { PortalPage } from '@portal/pages/PortalPage'
import { expect } from '@services/expect-decorator'
import {
  D11,
  D12,
  PK11,
  PK12,
  PK13,
  V_P_DSH_OVERVIEW_NESTED_R,
  V_P_DSH_OVERVIEW_R,
  V_P_PKG_FOR_DASHBOARDS_DELETED_R,
  V_P_PKG_FOR_DASHBOARDS_REST_BASE_R,
  V_P_PKG_OPERATIONS_REST_R,
} from '@test-data/portal'
import { SYSADMIN } from '@test-data'
import { TICKET_BASE_URL } from '@test-setup'

test.describe('5.3 Dashboard details', () => {

  test('[P-DTDOP-1] Opening a Dashboard with content',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4495` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { overviewTab } = versionPage
      const testLabels = V_P_DSH_OVERVIEW_R.metadata!.versionLabels!.reduce((result, label) => {
        result += label
        return result
      }, '')

      await portalPage.gotoDashboard(D11)

      await expect.soft(versionPage.toolbar.title).toHaveText(D11.name)
      await expect.soft(versionPage.toolbar.breadcrumbs).toBeVisible()
      await expect.soft(versionPage.toolbar.versionSlt).toHaveText(V_P_DSH_OVERVIEW_R.version)
      await expect.soft(versionPage.toolbar.status).toHaveText(V_P_DSH_OVERVIEW_R.status)
      await expect.soft(versionPage.toolbar.editVersionBtn).toBeVisible()
      await expect.soft(versionPage.toolbar.compareMenu).toBeVisible()
      await expect.soft(versionPage.toolbar.settingsBtn).toBeVisible()
      await expect.soft(versionPage.overviewTab).toBeVisible()
      await expect.soft(versionPage.operationsTab).toBeVisible()
      await expect.soft(versionPage.deprecatedTab).toBeVisible()
      await expect.soft(versionPage.apiChangesTab).toBeVisible()
      await expect.soft(versionPage.documentsTab).toBeVisible()
      await expect.soft(versionPage.sidebar.expandBtn).toBeVisible()
      await expect.soft(overviewTab.summaryTab).toBeVisible()
      // TODO Move to another test
      await expect.soft(overviewTab.summaryTab.body.labels).toHaveText(testLabels)
      await expect.soft(overviewTab.summaryTab.body.summary.currentVersion).toHaveText(V_P_DSH_OVERVIEW_R.version)
      await expect.soft(overviewTab.summaryTab.body.summary.revision).toHaveText('2')
      // await expect.soft(overviewTab.summaryTab.body.summary.previousVersion).toHaveText(DASH_OVERVIEW_TEST_VERSION.previousVersion!)
      await expect.soft(overviewTab.summaryTab.body.summary.publishedBy).toHaveText(SYSADMIN.name)
      await expect.soft(overviewTab.summaryTab.body.summary.publicationDate).not.toBeEmpty()
    })

  test('[P-DTDPK-1] Dashboard Packages tab viewing',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5895` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-1023` }],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { overviewTab } = versionPage

      await portalPage.gotoVersion(V_P_DSH_OVERVIEW_R)

      await overviewTab.packagesTab.click()

      await expect.soft(overviewTab.packagesTab.getPackageRow(D12).versionCell).toHaveText(V_P_DSH_OVERVIEW_NESTED_R.version)
      await expect.soft(overviewTab.packagesTab.getPackageRow(D12).statusCell).toHaveText(V_P_DSH_OVERVIEW_NESTED_R.status)
      await expect.soft(overviewTab.packagesTab.getPackageRow(PK11).versionCell).toHaveText(V_P_PKG_OPERATIONS_REST_R.version)
      await expect.soft(overviewTab.packagesTab.getPackageRow(PK11).statusCell).toHaveText(V_P_PKG_OPERATIONS_REST_R.status)
      await expect.soft(overviewTab.packagesTab.notExistAlertIcon).toBeVisible()
      await expect.soft(overviewTab.packagesTab.getPackageRow(D12).packageCell.notExistIndicatorIcon).toBeVisible()

      await overviewTab.packagesTab.getPackageRow(D12).expandBtn.click()

      await expect.soft(overviewTab.packagesTab.getExcludedPackageRow(PK11).versionCell).toHaveText(V_P_PKG_OPERATIONS_REST_R.version)
      await expect.soft(overviewTab.packagesTab.getExcludedPackageRow(PK11).statusCell).toHaveText(V_P_PKG_OPERATIONS_REST_R.status)
      await expect.soft(overviewTab.packagesTab.getPackageRow(PK12).versionCell).toHaveText(V_P_PKG_FOR_DASHBOARDS_REST_BASE_R.version)
      await expect.soft(overviewTab.packagesTab.getPackageRow(PK12).statusCell).toHaveText(V_P_PKG_FOR_DASHBOARDS_REST_BASE_R.status)
      // await expect.soft(overviewTab.packagesTab.getReferenceRow(PK13).versionCell).toHaveText(PKG_FOR_DASHBOARDS_DELETED_TEST_VERSION.version) // TODO TestCase-B-1023
      await expect.soft(overviewTab.packagesTab.getPackageRow(PK13).statusCell).toHaveText(V_P_PKG_FOR_DASHBOARDS_DELETED_R.status)
      await expect.soft(overviewTab.packagesTab.getPackageRow(PK13).packageCell.notExistAlertIcon).toBeVisible()
    })
})
