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
import { expect, expectFile } from '@services/expect-decorator'
import { PortalPage } from '@portal/pages/PortalPage'
import {
  D11,
  GET_PET_BY_TAG_V2_SWAGGER,
  PK11,
  PK12,
  UPDATE_USER_V1,
  V_P_DSH_CHANGELOG_REST_CHANGED_R,
} from '@test-data/portal'
import { VERSION_CHANGES_TAB_REST } from '@portal/entities'
import { TICKET_BASE_URL } from '@test-setup'

test.describe('6.2 API Changes (Dashboard)', () => {

  const testDashboard = D11
  const versionChangedRest = V_P_DSH_CHANGELOG_REST_CHANGED_R

  test('[P-CHDFI-1] Filtering operations by Packages on the API Changes tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5638` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { apiChangesTab } = versionPage

      await portalPage.gotoVersion(versionChangedRest, VERSION_CHANGES_TAB_REST)

      await expect.soft(apiChangesTab.sidebar.groupFilterAc).toBeDisabled()
      await expect(apiChangesTab.table.getOperationRow(UPDATE_USER_V1)).toBeVisible()
      await expect(apiChangesTab.table.getOperationRow(GET_PET_BY_TAG_V2_SWAGGER)).toBeVisible()

      await apiChangesTab.sidebar.packageFilterAc.click()
      await apiChangesTab.sidebar.packageFilterAc.getListItem(PK11.name).click()

      await expect(apiChangesTab.table.getOperationRow(UPDATE_USER_V1)).toBeVisible()
      await expect(apiChangesTab.table.getOperationRow(GET_PET_BY_TAG_V2_SWAGGER)).not.toBeVisible()

      await apiChangesTab.sidebar.packageFilterAc.clear()
      await apiChangesTab.sidebar.packageFilterAc.click()
      await apiChangesTab.sidebar.packageFilterAc.getListItem(PK12.name).click()

      await expect(apiChangesTab.table.getOperationRow(GET_PET_BY_TAG_V2_SWAGGER)).toBeVisible()
      await expect(apiChangesTab.table.getOperationRow(UPDATE_USER_V1)).not.toBeVisible()
    })

  test('[P-CHDEC-1] Exporting changes',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8630` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { apiChangesTab } = versionPage

      await portalPage.gotoVersion(versionChangedRest, VERSION_CHANGES_TAB_REST)

      await test.step('Download all changes', async () => {

        const file = await apiChangesTab.toolbar.exportMenu.downloadAll()

        await expectFile.soft(file).toHaveName(`APIChanges_${testDashboard.packageId}_${V_P_DSH_CHANGELOG_REST_CHANGED_R.version}.xlsx`)
      })

      await test.step('Download filtered changes', async () => {

        await apiChangesTab.toolbar.nonBreakingChangesFilterBtn.click()

        const file = await apiChangesTab.toolbar.exportMenu.downloadFiltered()

        await expectFile.soft(file).toHaveName(`APIChanges_${testDashboard.packageId}_${V_P_DSH_CHANGELOG_REST_CHANGED_R.version}.xlsx`)
      })
    })
})
