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
import {
  CREATE_LIST_OF_USERS_V1,
  CREATE_LIST_OF_USERS_V1_UPDATED,
  GET_PET_BY_TAG_V1,
  GQL_GET_USER,
  LOGS_USER_V1,
  PK11,
  UPDATE_USER_V1,
  V_P_PKG_DEPRECATED_REST_CHANGED_R,
  V_P_PKG_DEPRECATED_REST_NO_DEPRECATED_R,
  V_P_PKG_OPERATIONS_MULTI_TYPE_R,
} from '@test-data/portal'
import { VERSION_DEPRECATED_TAB_REST } from '@portal/entities'
import { TICKET_BASE_URL } from '@test-setup'

test.describe('8.1 Deprecated (Package)', () => {

  const testPackage = PK11
  const versionDeprecatedRest = V_P_PKG_DEPRECATED_REST_CHANGED_R
  const versionOperationsMulti = V_P_PKG_OPERATIONS_MULTI_TYPE_R
  const versionNoDeprecatedRest = V_P_PKG_DEPRECATED_REST_NO_DEPRECATED_R

  test('[P-DEPOP-1] Opening the Deprecated tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5188` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { deprecatedTab } = versionPage

      await portalPage.gotoVersion(versionDeprecatedRest)

      await versionPage.deprecatedTab.click()

      await expect.soft(deprecatedTab.sidebar.apiKindFilterAc).toBeVisible()
      await expect.soft(deprecatedTab.sidebar.groupFilterAc).toBeDisabled()
      await expect.soft(deprecatedTab.sidebar.searchbar).toBeVisible()
      await expect.soft(deprecatedTab.toolbar.searchbar).toBeVisible()
      await expect.soft(deprecatedTab.toolbar.exportMenu).toBeVisible()
    })

  test('[P-DEPSE-1] Search operations on the Deprecated tab',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5187` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { deprecatedTab } = versionPage

      await portalPage.gotoVersion(versionDeprecatedRest, VERSION_DEPRECATED_TAB_REST)

      await test.step('Search by title', async () => {

        await test.step('Part of a word', async () => {
          await deprecatedTab.toolbar.searchbar.fill('us')

          await expect.soft(deprecatedTab.table.getOperationRow()).toHaveCount(3)
        })

        await test.step('Adding part of a word', async () => {
          await deprecatedTab.toolbar.searchbar.type('ers')

          await expect.soft(deprecatedTab.table.getOperationRow()).toHaveCount(1)
        })

        await test.step('Clearing a search query', async () => {
          await deprecatedTab.toolbar.searchbar.clear()

          await expect.soft(deprecatedTab.table.getOperationRow()).toHaveCount(4)
        })

        await test.step('Two words', async () => {
          await deprecatedTab.toolbar.searchbar.clear()
          await deprecatedTab.toolbar.searchbar.fill('creates list')

          await expect.soft(deprecatedTab.table.getOperationRow()).toHaveCount(1)
        })

        await test.step('Upper case', async () => {
          await deprecatedTab.toolbar.searchbar.clear()
          await deprecatedTab.toolbar.searchbar.fill('Creates')

          await expect.soft(deprecatedTab.table.getOperationRow()).toHaveCount(1)
        })

        await test.step('Invalid search query with valid substring', async () => {
          await deprecatedTab.toolbar.searchbar.clear()
          await deprecatedTab.toolbar.searchbar.fill('Creates123')

          await expect.soft(deprecatedTab.table.noOperationsPlaceholder).toBeVisible()
        })
      })

      await test.step('Search by path', async () => {

        await test.step('Part of a word', async () => {
          await deprecatedTab.toolbar.searchbar.fill('/api/v1/user')

          await expect.soft(deprecatedTab.table.getOperationRow()).toHaveCount(3)
        })

        await test.step('Adding part of a word', async () => {
          await deprecatedTab.toolbar.searchbar.type('/createWithList')

          await expect.soft(deprecatedTab.table.getOperationRow()).toHaveCount(1)
        })

        await test.step('Clearing a search query', async () => {
          await deprecatedTab.toolbar.searchbar.clear()

          await expect.soft(deprecatedTab.table.getOperationRow()).toHaveCount(4)
        })

        await test.step('Upper case', async () => {
          await deprecatedTab.toolbar.searchbar.clear()
          await deprecatedTab.toolbar.searchbar.fill('/api/v1/User')

          await expect.soft(deprecatedTab.table.getOperationRow()).toHaveCount(3)
        })

        await test.step('Invalid search query with valid substring', async () => {
          await deprecatedTab.toolbar.searchbar.clear()
          await deprecatedTab.toolbar.searchbar.fill('/api/v1/user/createWithList123')

          await expect.soft(deprecatedTab.table.noOperationsPlaceholder).toBeVisible()
        })
      })
    })

  test('[P-DEPSE-2] Search tags on the Deprecated tab',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5189` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { deprecatedTab } = versionPage

      await portalPage.gotoVersion(versionDeprecatedRest, VERSION_DEPRECATED_TAB_REST)

      await test.step('Part of a word', async () => {
        await deprecatedTab.sidebar.searchbar.fill('p')

        await expect.soft(deprecatedTab.sidebar.getTagButton()).toHaveCount(1)
      })

      await test.step('Adding part of a word', async () => {
        await deprecatedTab.sidebar.searchbar.fill('pet')

        await expect.soft(deprecatedTab.sidebar.getTagButton()).toHaveCount(1)
      })

      await test.step('Clearing a search query', async () => {
        await deprecatedTab.sidebar.searchbar.clear()

        await expect.soft(deprecatedTab.sidebar.getTagButton()).toHaveCount(2)
      })

      await test.step('Upper case', async () => {
        await deprecatedTab.sidebar.searchbar.clear()
        await deprecatedTab.sidebar.searchbar.fill('Pet')

        await expect.soft(deprecatedTab.sidebar.getTagButton()).toHaveCount(1)
      })

      await test.step('Invalid search query with valid substring', async () => {
        await deprecatedTab.sidebar.searchbar.clear()
        await deprecatedTab.sidebar.searchbar.fill('Pet123')

        await expect.soft(deprecatedTab.sidebar.getTagButton()).toHaveCount(0)
      })

      await test.step('Select item during search', async () => {
        await deprecatedTab.sidebar.searchbar.fill('p')

        await deprecatedTab.sidebar.getTagButton('pet').click()
        await expect(deprecatedTab.sidebar.getTagButton()).toHaveCount(1)
        await expect(deprecatedTab.sidebar.searchbar).toHaveValue('p')
      })
    })

  test('[P-DEPVW-1] Switching operations API Type on the Deprecated tab',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5186` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { deprecatedTab } = versionPage

      await portalPage.gotoVersion(versionOperationsMulti, VERSION_DEPRECATED_TAB_REST)

      await deprecatedTab.toolbar.sltApiType.click()
      await deprecatedTab.toolbar.sltApiType.graphQlItm.click()

      await expect.soft(deprecatedTab.toolbar.sltApiType).toHaveText(GRAPHQL_API_TYPE_TITLE)
      await expect(deprecatedTab.table.getOperationRow(GQL_GET_USER)).toBeVisible()
      await expect(deprecatedTab.table.getOperationRow(GET_PET_BY_TAG_V1)).not.toBeVisible()

      await deprecatedTab.toolbar.sltApiType.click()
      await deprecatedTab.toolbar.sltApiType.restApiItm.click()

      await expect.soft(deprecatedTab.toolbar.sltApiType).toHaveText(REST_API_TYPE_TITLE)
      await expect(deprecatedTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()
      await expect(deprecatedTab.table.getOperationRow(GQL_GET_USER)).not.toBeVisible()
    })

  test('[P-DEPVW-2] Checking for the absence of the API type selector when there is only one operation type on the Deprecated tab',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5190` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { deprecatedTab } = versionPage

      await portalPage.gotoVersion(versionDeprecatedRest, VERSION_DEPRECATED_TAB_REST)

      await expect.soft(deprecatedTab).toBeVisible()
      await expect.soft(deprecatedTab.toolbar.sltApiType).not.toBeVisible()
    })

  test('[P-DEPFI-1] Filtering operations by Tag on the Deprecated tab',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5183` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { deprecatedTab } = versionPage

      await portalPage.gotoVersion(versionDeprecatedRest, VERSION_DEPRECATED_TAB_REST)

      await expect(deprecatedTab.sidebar.getTagButton()).toHaveCount(2)
      await expect(deprecatedTab.sidebar.getTagButton('pet')).toBeVisible()
      await expect(deprecatedTab.sidebar.getTagButton('user')).toBeVisible()

      await deprecatedTab.sidebar.getTagButton('pet').click()

      await expect.soft(deprecatedTab.table.getOperationRow()).toHaveCount(1)

      await deprecatedTab.sidebar.getTagButton('user').click()

      await expect.soft(deprecatedTab.table.getOperationRow()).toHaveCount(3)

      await deprecatedTab.sidebar.getTagButton('user').click()

      await expect.soft(deprecatedTab.table.getOperationRow()).toHaveCount(4)
    })

  test('[P-DEPFI-2] Filtering operations by Kind on the Deprecated tab',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5185` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { deprecatedTab } = versionPage

      await portalPage.gotoVersion(versionDeprecatedRest, VERSION_DEPRECATED_TAB_REST)

      await deprecatedTab.sidebar.apiKindFilterAc.click()
      await deprecatedTab.sidebar.apiKindFilterAc.bwcItm.click()

      await expect.soft(deprecatedTab.table.getOperationRow()).toHaveCount(2)

      await deprecatedTab.sidebar.apiKindFilterAc.fill('no bwc')

      await expect.soft(deprecatedTab.sidebar.apiKindFilterAc.getListItem()).toHaveCount(1)

      await deprecatedTab.sidebar.apiKindFilterAc.noBwcItm.click()

      await expect.soft(deprecatedTab.table.getOperationRow()).toHaveCount(2)

      await deprecatedTab.sidebar.apiKindFilterAc.click()
      await deprecatedTab.sidebar.apiKindFilterAc.allItm.click()

      await expect.soft(deprecatedTab.table.getOperationRow()).toHaveCount(4)
    })

  test('[P-DEPFI-4] Hide/Show filters on the Deprecated tab (List view)',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6496` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { deprecatedTab } = versionPage

      await portalPage.gotoVersion(versionDeprecatedRest, VERSION_DEPRECATED_TAB_REST)

      await deprecatedTab.toolbar.filtersBtn.click()

      await expect(deprecatedTab.sidebar.apiKindFilterAc).not.toBeVisible()
      await expect.soft(deprecatedTab.table.getOperationRow(UPDATE_USER_V1)).toBeVisible()
      await expect.soft(deprecatedTab.toolbar.filtersBtn).toBePressed()
      await expect(deprecatedTab.operationPreview).not.toBeVisible()

      await deprecatedTab.toolbar.filtersBtn.click()

      await expect(deprecatedTab.sidebar.apiKindFilterAc).toBeVisible()
      await expect.soft(deprecatedTab.table.getOperationRow(UPDATE_USER_V1)).toBeVisible()
      await expect.soft(deprecatedTab.toolbar.filtersBtn).not.toBePressed()
      await expect(deprecatedTab.operationPreview).not.toBeVisible()
    })

  test('[P-DEPFI-5] Hide/Show filters on the Deprecated tab (Detailed view)',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6497` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { deprecatedTab } = versionPage

      await portalPage.gotoVersion(versionDeprecatedRest, VERSION_DEPRECATED_TAB_REST)

      await deprecatedTab.toolbar.detailedViewBtn.click()
      await deprecatedTab.toolbar.filtersBtn.click()

      await expect(deprecatedTab.sidebar.apiKindFilterAc).not.toBeVisible()
      await expect.soft(deprecatedTab.table.getOperationRow(UPDATE_USER_V1)).toBeVisible()
      await expect.soft(deprecatedTab.toolbar.filtersBtn).toBePressed()
      await expect.soft(deprecatedTab.operationPreview).toBeVisible()

      await deprecatedTab.toolbar.filtersBtn.click()

      await expect(deprecatedTab.sidebar.apiKindFilterAc).toBeVisible()
      await expect.soft(deprecatedTab.table.getOperationRow(UPDATE_USER_V1)).toBeVisible()
      await expect.soft(deprecatedTab.toolbar.filtersBtn).not.toBePressed()
      await expect.soft(deprecatedTab.operationPreview).toBeVisible()
    })

  test('[P-DEPVW-3] Viewing operation details on the Deprecated tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5432` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { deprecatedTab } = versionPage

      await portalPage.gotoVersion(versionDeprecatedRest, VERSION_DEPRECATED_TAB_REST)

      await expect.soft(deprecatedTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toContainText(GET_PET_BY_TAG_V1.title)
      await expect.soft(deprecatedTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toContainText('Deprecated')
      await expect.soft(deprecatedTab.table.getOperationRow(GET_PET_BY_TAG_V1).tagsCell).toContainText(GET_PET_BY_TAG_V1.tags!)
      await expect.soft(deprecatedTab.table.getOperationRow(GET_PET_BY_TAG_V1).kindCell).toContainText(GET_PET_BY_TAG_V1.apiKind)
      await expect.soft(deprecatedTab.table.getOperationRow(GET_PET_BY_TAG_V1).detailsCell).toHaveText(GET_PET_BY_TAG_V1.deprecated!.details!)
      await expect.soft(deprecatedTab.table.getOperationRow(GET_PET_BY_TAG_V1).deprecatedSinceCell).toHaveText(GET_PET_BY_TAG_V1.deprecated!.since!)

      await expect.soft(deprecatedTab.table.getOperationRow(CREATE_LIST_OF_USERS_V1_UPDATED).detailsCell).toHaveText(CREATE_LIST_OF_USERS_V1_UPDATED.deprecated!.details!)
      await expect.soft(deprecatedTab.table.getOperationRow(CREATE_LIST_OF_USERS_V1_UPDATED).deprecatedSinceCell).toBeEmpty()

      await expect.soft(deprecatedTab.table.getOperationRow(LOGS_USER_V1).detailsCell).toHaveText(LOGS_USER_V1.deprecated!.details!)
      await expect.soft(deprecatedTab.table.getOperationRow(LOGS_USER_V1).deprecatedSinceCell).toBeEmpty()

      await expect.soft(deprecatedTab.table.getOperationRow(UPDATE_USER_V1).detailsCell).toHaveText(UPDATE_USER_V1.deprecated!.details!)
      await expect.soft(deprecatedTab.table.getOperationRow(UPDATE_USER_V1).deprecatedSinceCell).toHaveText(UPDATE_USER_V1.deprecated!.since!)
    })

  test('[P-DEPVW-4] Expanding operation details on the Deprecated tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5192` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { deprecatedTab } = versionPage

      await portalPage.gotoVersion(versionDeprecatedRest, VERSION_DEPRECATED_TAB_REST)

      await deprecatedTab.table.getOperationRow(CREATE_LIST_OF_USERS_V1_UPDATED).expandBtn.click()

      await expect.soft(deprecatedTab.table.getDeprecatedDescriptionRow(CREATE_LIST_OF_USERS_V1_UPDATED.deprecatedItem!.description).deprecatedSinceCell).toHaveText(CREATE_LIST_OF_USERS_V1_UPDATED.deprecatedItem!.since)

      await deprecatedTab.table.getOperationRow(LOGS_USER_V1).expandBtn.click()

      await expect.soft(deprecatedTab.table.getDeprecatedDescriptionRow(LOGS_USER_V1.deprecatedItem!.description).deprecatedSinceCell).toHaveText(LOGS_USER_V1.deprecatedItem!.since)

      await deprecatedTab.table.getOperationRow(CREATE_LIST_OF_USERS_V1_UPDATED).collapseBtn.click()

      await expect.soft(deprecatedTab.table.getDeprecatedDescriptionRow(CREATE_LIST_OF_USERS_V1_UPDATED.deprecatedItem!.description)).not.toBeVisible()
    })

  test('[P-DEPVW-5] Opening operation details from the Deprecated tab',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5191` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { operationPage } = portalPage
      const { deprecatedTab } = versionPage

      await portalPage.gotoVersion(versionDeprecatedRest, VERSION_DEPRECATED_TAB_REST)

      await deprecatedTab.table.openOperation(GET_PET_BY_TAG_V1)

      await expect.soft(operationPage.toolbar.title).toContainText(GET_PET_BY_TAG_V1.title)
      await expect.soft(operationPage.docView).toBeVisible()

      await operationPage.toolbar.backBtn.click()

      await expect(versionPage.deprecatedTab).toBeVisible()
      await expect(deprecatedTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()
    })

  test('[P-DEPVW-6] Switching operations on the Deprecated tab',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6498` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { deprecatedTab } = versionPage

      await portalPage.gotoVersion(versionDeprecatedRest, VERSION_DEPRECATED_TAB_REST)

      await deprecatedTab.toolbar.detailedViewBtn.click()

      await expect(deprecatedTab.operationPreview.viewDoc).toBeVisible()

      await deprecatedTab.table.getOperationRow(CREATE_LIST_OF_USERS_V1).click()

      await expect(deprecatedTab.operationPreview.operationTitle).toHaveText(CREATE_LIST_OF_USERS_V1.title)
    })

  test('[P-DEPVW-7] Switching Doc/Simple/Raw modes of Preview on the Deprecated tab',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6499` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { deprecatedTab } = versionPage

      await portalPage.gotoVersion(versionDeprecatedRest, VERSION_DEPRECATED_TAB_REST)

      await deprecatedTab.toolbar.detailedViewBtn.click()

      await expect.soft(deprecatedTab.operationPreview.btnDoc).toBePressed()

      await deprecatedTab.operationPreview.btnSimple.click()

      await expect.soft(deprecatedTab.operationPreview.btnSimple).toBePressed()
      await expect.soft(deprecatedTab.operationPreview.viewDoc).toBeVisible()

      await deprecatedTab.operationPreview.btnRaw.click()

      await expect.soft(deprecatedTab.operationPreview.btnRaw).toBePressed()
      await expect.soft(deprecatedTab.operationPreview.viewRaw).toBeVisible()

      await deprecatedTab.operationPreview.btnDoc.click()

      await expect.soft(deprecatedTab.operationPreview.btnDoc).toBePressed()
      await expect(deprecatedTab.operationPreview.viewDoc).toBeVisible()
    })

  test('[P-DEPVW-8] Switching List/Detailed View on the Deprecated tab',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6500` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { deprecatedTab } = versionPage

      await portalPage.gotoVersion(versionDeprecatedRest, VERSION_DEPRECATED_TAB_REST)

      await deprecatedTab.toolbar.detailedViewBtn.click()

      await expect(deprecatedTab.operationPreview).toBeVisible()

      await deprecatedTab.toolbar.listViewBtn.click()

      await expect(deprecatedTab.operationPreview).not.toBeVisible()
      await expect.soft(deprecatedTab.toolbar.listViewBtn).toBePressed()
      await expect.soft(deprecatedTab.toolbar.detailedViewBtn).not.toBePressed()
      await expect.soft(deprecatedTab.sidebar.apiKindFilterAc).toBeVisible()
      await expect.soft(deprecatedTab.table.getOperationRow(UPDATE_USER_V1)).toBeVisible()

      await deprecatedTab.toolbar.detailedViewBtn.click()

      await expect(deprecatedTab.operationPreview).toBeVisible()
      await expect.soft(deprecatedTab.toolbar.detailedViewBtn).toBePressed()
      await expect.soft(deprecatedTab.toolbar.listViewBtn).not.toBePressed()
      await expect.soft(deprecatedTab.sidebar.apiKindFilterAc).toBeVisible()
      await expect.soft(deprecatedTab.table.getOperationRow(UPDATE_USER_V1)).toBeVisible()
    })

  test('[P-DEPDN-1] Exporting operations on the Deprecated tab',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5193` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { deprecatedTab } = versionPage

      await portalPage.gotoVersion(versionDeprecatedRest, VERSION_DEPRECATED_TAB_REST)

      await test.step('Download all operations', async () => {

        const file = await deprecatedTab.toolbar.exportMenu.downloadAll()

        await expectFile.soft(file).toHaveName(`DeprecatedOperations_${testPackage.packageId}_${V_P_PKG_DEPRECATED_REST_CHANGED_R.version}.xlsx`)
      })

      await test.step('Download filtered operations', async () => {

        await deprecatedTab.sidebar.apiKindFilterAc.click()
        await deprecatedTab.sidebar.apiKindFilterAc.noBwcItm.click()

        const file = await deprecatedTab.toolbar.exportMenu.downloadFiltered()

        await expectFile.soft(file).toHaveName(`DeprecatedOperations_${testPackage.packageId}_${V_P_PKG_DEPRECATED_REST_CHANGED_R.version}.xlsx`)
      })
    })

  test('[P-DEPDN-2] Checking the disabling of the "Export operations" menu when there are no deprecated operations/items',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5198` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { deprecatedTab } = versionPage

      await portalPage.gotoVersion(versionNoDeprecatedRest, VERSION_DEPRECATED_TAB_REST)

      await expect.soft(deprecatedTab.table.noOperationsPlaceholder).toBeVisible()
      await expect(deprecatedTab.toolbar.exportMenu).not.toBeEnabled()
    })
})
