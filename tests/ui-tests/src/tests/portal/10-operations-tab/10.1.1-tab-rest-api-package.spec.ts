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
import { GRAPHQL_API_TYPE_TITLE, REST_API_TYPE_TITLE } from '@shared/entities'
import { PortalPage } from '@portal/pages/PortalPage'
import { SEARCH_TIMEOUT, TICKET_BASE_URL } from '@test-setup'
import {
  DEL_PET_V1,
  GET_PET_BY_TAG_V1,
  GET_SYSTEM_INFO,
  GQL_LIST_PETS,
  PK11,
  UPDATE_USER_V1,
  V_P_PKG_OPERATIONS_MULTI_TYPE_R,
  V_P_PKG_OPERATIONS_REST_R,
  V_P_PKG_WITHOUT_OPERATIONS_R,
} from '@test-data/portal'
import { VERSION_OPERATIONS_TAB_REST } from '@portal/entities'

test.describe('10.1.1 Operations tab REST API (Package)', () => {

  const testPackage = PK11
  const versionOperationsRest = V_P_PKG_OPERATIONS_REST_R
  const versionOperationsMulti = V_P_PKG_OPERATIONS_MULTI_TYPE_R
  const versionWithoutOperations = V_P_PKG_WITHOUT_OPERATIONS_R

  test('[P-OTPOP-1] Opening the Operations tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-1724` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { operationsTab } = versionPage
      const testOperationRow = operationsTab.table.getOperationRow(GET_SYSTEM_INFO)

      await portalPage.gotoPackage(testPackage)
      await versionPage.operationsTab.click()

      await expect.soft(operationsTab.sidebar.apiKindFilterAc).toBeVisible()
      await expect.soft(operationsTab.sidebar.groupFilterAc).toBeDisabled()
      await expect.soft(operationsTab.sidebar.searchbar).toBeVisible()
      await expect.soft(operationsTab.sidebar.getTagButton('pet')).toBeVisible()
      await expect.soft(operationsTab.toolbar.sltApiType).toBeVisible()
      await expect.soft(operationsTab.toolbar.searchbar).toBeVisible()
      await expect.soft(operationsTab.toolbar.filtersBtn).toBeVisible()
      await expect.soft(operationsTab.toolbar.listViewBtn).toBePressed()
      await expect.soft(operationsTab.toolbar.detailedViewBtn).toBeVisible()
      await expect.soft(operationsTab.toolbar.exportMenu).toBeVisible()
      await expect.soft(testOperationRow).toBeVisible()
    })

  test('[P-OTPVW-1] Switching operations API Type on the Operations tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4757` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { operationsTab } = versionPage

      await portalPage.gotoVersion(versionOperationsMulti, VERSION_OPERATIONS_TAB_REST)

      await operationsTab.toolbar.sltApiType.click()
      await operationsTab.toolbar.sltApiType.graphQlItm.click()

      await expect.soft(operationsTab.toolbar.sltApiType).toHaveText(GRAPHQL_API_TYPE_TITLE)
      await expect(operationsTab.table.getOperationRow(GQL_LIST_PETS)).toBeVisible()
      await expect(operationsTab.table.getOperationRow(UPDATE_USER_V1)).not.toBeVisible()

      await operationsTab.toolbar.sltApiType.click()
      await operationsTab.toolbar.sltApiType.restApiItm.click()

      await expect.soft(operationsTab.toolbar.sltApiType).toHaveText(REST_API_TYPE_TITLE)
      await expect(operationsTab.table.getOperationRow(UPDATE_USER_V1)).toBeVisible()
      await expect(operationsTab.table.getOperationRow(GQL_LIST_PETS)).not.toBeVisible()
    })

  test('[P-OTPVW-2] Checking for the absence of the API type selector when there is only one operation type on the Operations tab',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4464` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { operationsTab } = versionPage

      await portalPage.gotoVersion(versionOperationsRest, VERSION_OPERATIONS_TAB_REST)

      await expect(operationsTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()
      await expect(operationsTab.toolbar.sltApiType).not.toBeVisible()
    })

  test('[P-OTPSE-1] Search Tags on the Operations tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4465` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { operationsTab } = versionPage

      await portalPage.gotoVersion(versionOperationsRest, VERSION_OPERATIONS_TAB_REST)

      await test.step('Part of a word', async () => {
        await operationsTab.sidebar.searchbar.fill('pe')
        await portalPage.waitForTimeout(SEARCH_TIMEOUT.middle)

        await expect.soft(operationsTab.sidebar.getTagButton()).toHaveCount(1)
      })

      await test.step('Adding part of a word', async () => {
        await operationsTab.sidebar.searchbar.type('t')
        await portalPage.waitForTimeout(SEARCH_TIMEOUT.middle)

        await expect.soft(operationsTab.sidebar.getTagButton()).toHaveCount(1)
      })

      await test.step('Clearing a search query', async () => {
        await operationsTab.sidebar.searchbar.clear()

        await expect.soft(operationsTab.sidebar.getTagButton()).toHaveCount(3)
      })

      await test.step('Case sensitive', async () => {
        await operationsTab.sidebar.searchbar.clear()
        await operationsTab.sidebar.searchbar.fill('Pet')

        await expect.soft(operationsTab.sidebar.getTagButton()).toHaveCount(1)
      })

      await test.step('Invalid search query with valid substring', async () => {
        await operationsTab.sidebar.searchbar.clear()
        await operationsTab.sidebar.searchbar.fill('pet123')

        await expect.soft(operationsTab.sidebar.getTagButton()).toHaveCount(0)
      })
    })

  test('[P-OTPSE-2] Search Operations on the Operations tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4466` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { operationsTab } = versionPage

      await portalPage.gotoVersion(versionOperationsRest, VERSION_OPERATIONS_TAB_REST)

      await test.step('Search operation by title', async () => {

        await test.step('Part of a word', async () => {
          await operationsTab.toolbar.searchbar.fill('Find')

          await expect.soft(operationsTab.table.getOperationRow()).toHaveCount(4)
        })

        await test.step('Adding part of a word', async () => {
          await operationsTab.toolbar.searchbar.type('s')

          await expect.soft(operationsTab.table.getOperationRow()).toHaveCount(2)
        })

        await test.step('Clearing a search query', async () => {
          await operationsTab.toolbar.searchbar.clear()

          await expect.soft(operationsTab.table.getOperationRow()).toHaveCount(19)
        })

        await test.step('Two words', async () => {
          await operationsTab.toolbar.searchbar.clear()
          await operationsTab.toolbar.searchbar.fill('Finds Pets')

          await expect.soft(operationsTab.table.getOperationRow()).toHaveCount(2)
          await expect.soft(operationsTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()
        })

        await test.step('Case sensitive', async () => {
          await operationsTab.toolbar.searchbar.clear()
          await operationsTab.toolbar.searchbar.fill(GET_PET_BY_TAG_V1.title.toLowerCase())

          await expect.soft(operationsTab.table.getOperationRow()).toHaveCount(1)
          await expect.soft(operationsTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()
        })

        await test.step('Invalid search query with valid substring', async () => {
          await operationsTab.toolbar.searchbar.clear()
          await operationsTab.toolbar.searchbar.fill(`${GET_PET_BY_TAG_V1.title}123`)

          await expect.soft(operationsTab.table.getOperationRow()).toHaveCount(0)
        })
      })

      await test.step('Search operation by path', async () => {

        await test.step('Part of a word', async () => {
          await operationsTab.toolbar.searchbar.fill('/api/v1/pet/findBy')

          await expect.soft(operationsTab.table.getOperationRow()).toHaveCount(2)
        })

        await test.step('Adding part of a word', async () => {
          await operationsTab.toolbar.searchbar.type('Tags')

          await expect.soft(operationsTab.table.getOperationRow()).toHaveCount(1)
          await expect.soft(operationsTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()
          await expect.soft(operationsTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toContainText('Deprecated')
        })

        await test.step('Case sensitive', async () => {
          await operationsTab.toolbar.searchbar.clear()
          await operationsTab.toolbar.searchbar.fill(GET_PET_BY_TAG_V1.path.toLowerCase())

          await expect.soft(operationsTab.table.getOperationRow()).toHaveCount(1)
          await expect.soft(operationsTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()
        })

        await test.step('Invalid search query with valid substring', async () => {
          await operationsTab.toolbar.searchbar.clear()
          await operationsTab.toolbar.searchbar.fill(`${GET_PET_BY_TAG_V1.path}123`)

          await expect.soft(operationsTab.table.getOperationRow()).toHaveCount(0)
        })
      })
    })

  test('[P-OTPFI-1] Filtering Operations by Tags on the Operations tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4467` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { operationsTab } = versionPage

      await portalPage.gotoVersion(versionOperationsRest, VERSION_OPERATIONS_TAB_REST)

      await operationsTab.sidebar.getTagButton('pet').click()

      await expect.soft(operationsTab.table.getOperationRow()).toHaveCount(9)

      await operationsTab.sidebar.getTagButton('store').click()

      await expect.soft(operationsTab.table.getOperationRow()).toHaveCount(5)

      await operationsTab.sidebar.getTagButton('store').click()

      await expect.soft(operationsTab.table.getOperationRow()).toHaveCount(19)
    })

  test('[P-OTPFI-2] Filtering Operations by Kind on the Operations tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4758` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { operationsTab } = versionPage

      await portalPage.gotoVersion(versionOperationsRest, VERSION_OPERATIONS_TAB_REST)

      await operationsTab.sidebar.apiKindFilterAc.click()
      await operationsTab.sidebar.apiKindFilterAc.experimentalItm.click()

      await expect.soft(operationsTab.table.getOperationRow()).toHaveCount(1)

      await operationsTab.sidebar.apiKindFilterAc.fill('no bwc')

      await expect.soft(operationsTab.sidebar.apiKindFilterAc.getListItem()).toHaveCount(1)

      await operationsTab.sidebar.apiKindFilterAc.noBwcItm.click()

      await expect.soft(operationsTab.table.getOperationRow()).toHaveCount(3)

      await operationsTab.sidebar.apiKindFilterAc.click()
      await operationsTab.sidebar.apiKindFilterAc.allItm.click()

      await expect.soft(operationsTab.table.getOperationRow()).toHaveCount(19)
    })

  test('[P-OTPFI-3] Complex filtering Operations with search on the Operations tab',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4759` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { operationsTab } = versionPage

      await portalPage.gotoVersion(versionOperationsRest, VERSION_OPERATIONS_TAB_REST)

      await operationsTab.toolbar.searchbar.fill('delete')

      await expect.soft(operationsTab.table.getOperationRow()).toHaveCount(3)

      await operationsTab.sidebar.getTagButton('pet').click()

      await expect.soft(operationsTab.table.getOperationRow()).toHaveCount(1)

      await operationsTab.sidebar.apiKindFilterAc.click()
      await operationsTab.sidebar.apiKindFilterAc.noBwcItm.click()

      await expect.soft(operationsTab.table.getOperationRow()).toHaveCount(0)

      await operationsTab.toolbar.searchbar.clear()

      await expect.soft(operationsTab.table.getOperationRow()).toHaveCount(1)

      await operationsTab.sidebar.getTagButton('pet').click()

      await expect.soft(operationsTab.table.getOperationRow()).toHaveCount(3)

      await operationsTab.sidebar.apiKindFilterAc.click()
      await operationsTab.sidebar.apiKindFilterAc.allItm.click()

      await expect.soft(operationsTab.table.getOperationRow()).toHaveCount(19)

      await operationsTab.sidebar.apiKindFilterAc.click()
      await operationsTab.sidebar.apiKindFilterAc.noBwcItm.click()

      await expect.soft(operationsTab.table.getOperationRow()).toHaveCount(3)

      await operationsTab.sidebar.getTagButton('pet').click()

      await expect.soft(operationsTab.table.getOperationRow()).toHaveCount(1)

      await operationsTab.toolbar.searchbar.fill('delete')

      await expect.soft(operationsTab.table.getOperationRow()).toHaveCount(0)

      await operationsTab.toolbar.searchbar.clear()

      await expect.soft(operationsTab.table.getOperationRow()).toHaveCount(1)

      await operationsTab.sidebar.getTagButton('pet').click()

      await expect.soft(operationsTab.table.getOperationRow()).toHaveCount(3)

      await operationsTab.sidebar.apiKindFilterAc.click()
      await operationsTab.sidebar.apiKindFilterAc.allItm.click()

      await expect.soft(operationsTab.table.getOperationRow()).toHaveCount(19)
    })

  test('[P-OTPFI-4] Hide/Show filters on the Operations tab (List view)',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6340` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { operationsTab } = versionPage

      await portalPage.gotoVersion(versionOperationsRest, VERSION_OPERATIONS_TAB_REST)

      await operationsTab.toolbar.listViewBtn.click()
      await operationsTab.toolbar.filtersBtn.click()

      await expect(operationsTab.sidebar.apiKindFilterAc).not.toBeVisible()
      await expect.soft(operationsTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()
      await expect.soft(operationsTab.toolbar.filtersBtn).toBePressed()
      await expect(operationsTab.operationPreview).not.toBeVisible()

      await operationsTab.toolbar.filtersBtn.click()

      await expect(operationsTab.sidebar.apiKindFilterAc).toBeVisible()
      await expect.soft(operationsTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()
      await expect.soft(operationsTab.toolbar.filtersBtn).not.toBePressed()
      await expect(operationsTab.operationPreview).not.toBeVisible()
    })

  test('[P-OTPFI-5] Hide/Show filters on the Operations tab (Detailed view)',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4552` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { operationsTab } = versionPage

      await portalPage.gotoVersion(versionOperationsRest, VERSION_OPERATIONS_TAB_REST)

      await operationsTab.toolbar.detailedViewBtn.click()
      await operationsTab.toolbar.filtersBtn.click()

      await expect(operationsTab.sidebar.apiKindFilterAc).not.toBeVisible()
      await expect.soft(operationsTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()
      await expect.soft(operationsTab.toolbar.filtersBtn).toBePressed()
      await expect.soft(operationsTab.operationPreview).toBeVisible()

      await operationsTab.toolbar.filtersBtn.click()

      await expect(operationsTab.sidebar.apiKindFilterAc).toBeVisible()
      await expect.soft(operationsTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()
      await expect.soft(operationsTab.toolbar.filtersBtn).not.toBePressed()
      await expect.soft(operationsTab.operationPreview).toBeVisible()
    })

  test('[P-OTPVW-3] Viewing operation details on the Operations tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6501` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { operationsTab } = versionPage

      await portalPage.gotoVersion(versionOperationsRest, VERSION_OPERATIONS_TAB_REST)

      await expect.soft(operationsTab.table.getOperationRow(GET_PET_BY_TAG_V1).operationLink).toHaveText(GET_PET_BY_TAG_V1.title)
      await expect.soft(operationsTab.table.getOperationRow(GET_PET_BY_TAG_V1).tagsCell).toHaveText(GET_PET_BY_TAG_V1.tags!)
      await expect.soft(operationsTab.table.getOperationRow(GET_PET_BY_TAG_V1).kindCell).toHaveText(GET_PET_BY_TAG_V1.apiKind)
      await expect.soft(operationsTab.table.getOperationRow(GET_PET_BY_TAG_V1).metadataCell).toHaveText(GET_PET_BY_TAG_V1.customMetadata!)
    })

  test('[P-OTPVW-4] Switching operations on the Operations tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4551` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { operationsTab } = versionPage

      await portalPage.gotoVersion(versionOperationsRest, VERSION_OPERATIONS_TAB_REST)

      await operationsTab.toolbar.detailedViewBtn.click()

      await operationsTab.table.getOperationRow(DEL_PET_V1).click()

      await expect(operationsTab.operationPreview.operationTitle).toHaveText(DEL_PET_V1.title)
    })

  test('[P-OTPVW-5] Switching Doc/Simple/Raw modes of Preview on the Operations tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4550` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { operationsTab } = versionPage

      await portalPage.gotoVersion(versionOperationsRest, VERSION_OPERATIONS_TAB_REST)

      await operationsTab.toolbar.detailedViewBtn.click()

      await expect.soft(operationsTab.operationPreview.btnDoc).toBePressed()

      await operationsTab.operationPreview.btnSimple.click()

      await expect.soft(operationsTab.operationPreview.btnSimple).toBePressed()
      await expect.soft(operationsTab.operationPreview.viewDoc).toBeVisible()

      await operationsTab.operationPreview.btnRaw.click()

      await expect.soft(operationsTab.operationPreview.btnRaw).toBePressed()
      await expect.soft(operationsTab.operationPreview.viewRaw).toBeVisible()

      await operationsTab.operationPreview.btnDoc.click()

      await expect.soft(operationsTab.operationPreview.btnDoc).toBePressed()
      await expect(operationsTab.operationPreview.viewDoc).toBeVisible()
    })

  test('[P-OTPVW-6] Switching List/Detailed View on the Operations tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4844` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { operationsTab } = versionPage

      await portalPage.gotoVersion(versionOperationsRest, VERSION_OPERATIONS_TAB_REST)

      await operationsTab.toolbar.detailedViewBtn.click()

      await expect(operationsTab.operationPreview).toBeVisible()

      await operationsTab.toolbar.listViewBtn.click()

      await expect(operationsTab.operationPreview).not.toBeVisible()
      await expect.soft(operationsTab.toolbar.listViewBtn).toBePressed()
      await expect.soft(operationsTab.toolbar.detailedViewBtn).not.toBePressed()
      await expect.soft(operationsTab.sidebar.apiKindFilterAc).toBeVisible()
      await expect.soft(operationsTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()

      await operationsTab.toolbar.detailedViewBtn.click()

      await expect(operationsTab.operationPreview).toBeVisible()
      await expect.soft(operationsTab.toolbar.detailedViewBtn).toBePressed()
      await expect.soft(operationsTab.toolbar.listViewBtn).not.toBePressed()
      await expect.soft(operationsTab.sidebar.apiKindFilterAc).toBeVisible()
      await expect.soft(operationsTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()
    })

  test('[P-OTPDN-1] Exporting operations on the Operations tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6508` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { operationsTab } = versionPage

      await portalPage.gotoVersion(versionOperationsRest, VERSION_OPERATIONS_TAB_REST)

      await test.step('Download all operations', async () => {

        const file = await operationsTab.toolbar.exportMenu.downloadAll()

        await expectFile.soft(file).toHaveName(`APIOperations_${testPackage.packageId}_${V_P_PKG_OPERATIONS_REST_R.version}.xlsx`)
      })

      await test.step('Download filtered operations', async () => {

        await operationsTab.sidebar.apiKindFilterAc.click()
        await operationsTab.sidebar.apiKindFilterAc.noBwcItm.click()

        const file = await operationsTab.toolbar.exportMenu.downloadFiltered()

        await expectFile.soft(file).toHaveName(`APIOperations_${testPackage.packageId}_${V_P_PKG_OPERATIONS_REST_R.version}.xlsx`)
      })
    })

  test('[P-OTPDN-2] Checking the disabling of the "Export operations" menu when there are no operations',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6509` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { operationsTab } = versionPage

      await portalPage.gotoVersion(versionWithoutOperations, VERSION_OPERATIONS_TAB_REST)

      await expect.soft(operationsTab.table.noOperationsPlaceholder).toBeVisible()
      await expect(operationsTab.toolbar.exportMenu).not.toBeEnabled()
    })
})
