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
import { FILE_P_PETSTORE20, FILE_P_PETSTORE30, PK11, PK12, V_P_DSH_OVERVIEW_R } from '@test-data/portal'
import { VERSION_DOCUMENTS_TAB } from '@portal/entities'
import { TICKET_BASE_URL } from '@test-setup'

test.describe('7.2 Documents actions (Dashboard)', () => {

  test('[P-DCDFI-1] Filtering documents by Packages on the Documents tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4862` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { documentsTab } = versionPage

      await portalPage.gotoVersion(V_P_DSH_OVERVIEW_R, VERSION_DOCUMENTS_TAB)

      await documentsTab.sidebar.packageFilterAc.click()

      await expect.soft(documentsTab.sidebar.packageFilterAc.getListItem()).toHaveCount(2)

      await documentsTab.sidebar.packageFilterAc.getListItem(PK11.name).click()

      await expect(documentsTab.sidebar.getDocRestButton(FILE_P_PETSTORE30.testMeta!.docName)).toBeVisible()
      await expect(documentsTab.sidebar.getDocRestButton(FILE_P_PETSTORE20.testMeta!.docName)).not.toBeVisible()

      await documentsTab.sidebar.packageFilterAc.clear()
      await documentsTab.sidebar.packageFilterAc.click()
      await documentsTab.sidebar.packageFilterAc.getListItem(PK12.name).click()

      await expect(documentsTab.sidebar.getDocRestButton(FILE_P_PETSTORE20.testMeta!.docName)).toBeVisible()
      await expect(documentsTab.sidebar.getDocRestButton(FILE_P_PETSTORE30.testMeta!.docName)).not.toBeVisible()
    })
})
