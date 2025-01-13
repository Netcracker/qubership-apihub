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
  GET_PET_BY_TAG_V1,
  GET_PET_BY_TAG_V2_SWAGGER,
  PK11,
  PK12,
  V_P_DSH_CHANGELOG_REST_CHANGED_R,
  V_P_DSH_OVERVIEW_R,
} from '@test-data/portal'
import { VERSION_OPERATIONS_TAB_REST } from '@portal/entities'
import { TICKET_BASE_URL } from '@test-setup'

test.describe('10.2.1 Operations tab REST API (Dashboard)', () => {

  const testDashboard = D11
  const versionOverview = V_P_DSH_OVERVIEW_R
  const versionChangedRest = V_P_DSH_CHANGELOG_REST_CHANGED_R

  test('[P-OTDFI-1] Filtering operations by Packages on the Operations tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5641` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { operationsTab } = versionPage

      await portalPage.gotoVersion(versionOverview, VERSION_OPERATIONS_TAB_REST)

      await expect.soft(operationsTab.sidebar.groupFilterAc).toBeDisabled()
      await expect(operationsTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()
      await expect.soft(operationsTab.table.getOperationRow(GET_PET_BY_TAG_V2_SWAGGER)).toBeVisible()

      await operationsTab.sidebar.packageFilterAc.click()

      await expect.soft(operationsTab.sidebar.packageFilterAc.getListItem()).toHaveCount(2)

      await operationsTab.sidebar.packageFilterAc.getListItem(PK11.name).click()

      await expect(operationsTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()
      await expect(operationsTab.table.getOperationRow(GET_PET_BY_TAG_V2_SWAGGER)).not.toBeVisible()

      await operationsTab.sidebar.packageFilterAc.clear()
      await operationsTab.sidebar.packageFilterAc.click()
      await operationsTab.sidebar.packageFilterAc.getListItem(PK12.name).click()

      await expect(operationsTab.table.getOperationRow(GET_PET_BY_TAG_V2_SWAGGER)).toBeVisible()
      await expect(operationsTab.table.getOperationRow(GET_PET_BY_TAG_V1)).not.toBeVisible()
    })

  test('[P-OTDEO-1] Exporting operations on the Operations tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8629` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { operationsTab } = versionPage

      await portalPage.gotoVersion(versionChangedRest, VERSION_OPERATIONS_TAB_REST)

      await test.step('Download all operations', async () => {

        const file = await operationsTab.toolbar.exportMenu.downloadAll()

        await expectFile.soft(file).toHaveName(`APIOperations_${testDashboard.packageId}_${V_P_DSH_CHANGELOG_REST_CHANGED_R.version}.xlsx`)
      })

      await test.step('Download filtered operations', async () => {

        await operationsTab.sidebar.apiKindFilterAc.click()
        await operationsTab.sidebar.apiKindFilterAc.noBwcItm.click()

        const file = await operationsTab.toolbar.exportMenu.downloadFiltered()

        await expectFile.soft(file).toHaveName(`APIOperations_${testDashboard.packageId}_${V_P_DSH_CHANGELOG_REST_CHANGED_R.version}.xlsx`)
      })
    })
})
