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
import { ALIAS_MAX_CHARS_ERROR_MSG, FAVORITE_ICON, UNFAVORITE_ICON } from '@shared/entities'
import { CREATE_TIMEOUT, TICKET_BASE_URL } from '@test-setup'
import { SETTINGS_TAB_GENERAL } from '@portal/entities'
import {
  P_GR_CHILD_LVL2,
  P_GR_CRUD,
  P_PK_ALIAS_MORE_10,
  P_PK_CREATE,
  P_PK_DELETE,
  P_PK_FAV_LIST,
  P_PK_SAME_ALIAS,
  P_PK_UNFAV_FAV_PAGE,
  P_PK_UNFAV_LIST,
  P_WS_MAIN_R,
  VAR_GR,
} from '@test-data/portal'

test.describe('4.3.1 Package actions', () => {

  const testWorkspace = P_WS_MAIN_R
  const testGroup = P_GR_CRUD

  test('[P-PKOPR-1.1] Creating Package',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4484` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { createPackageDialog, versionPackagePage: versionPage } = portalPage

      await portalPage.gotoGroup(testGroup)
      await portalPage.toolbar.createPackageMenu.click()
      await portalPage.toolbar.createPackageMenu.packageItm.click()

      await test.step('Create Package', async () => {
        await createPackageDialog.fillForm({
          name: P_PK_CREATE.name,
          alias: P_PK_CREATE.alias,
        })
        await createPackageDialog.createBtn.click()

        await expect(createPackageDialog.createBtn).toBeHidden()
        await expect(portalPage.snackbar).toHaveText('SuccessPackage has been created')
        await expect(versionPage.toolbar.title).toHaveText(P_PK_CREATE.name)
      })
    })

  test('[P-PKOPR-1.2] Creating Package with parent group changing',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4484` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { createPackageDialog, versionPackagePage: versionPage } = portalPage

      await portalPage.gotoGroup(testGroup)
      await portalPage.toolbar.createPackageMenu.click()
      await portalPage.toolbar.createPackageMenu.packageItm.click()

      await test.step('Create Package', async () => {
        await createPackageDialog.fillForm({
          name: P_PK_CREATE.name,
          alias: P_PK_CREATE.alias,
          parentName: P_GR_CHILD_LVL2.name,
        })
        await createPackageDialog.createBtn.click()

        await expect(createPackageDialog.createBtn).toBeHidden()
        await expect(portalPage.snackbar).toHaveText('SuccessPackage has been created')
        await expect(versionPage.toolbar.title).toHaveText(P_PK_CREATE.name)
        await expect(versionPage.toolbar.breadcrumbs).toHaveText(`${P_GR_CHILD_LVL2.parents[0].name}/${P_GR_CHILD_LVL2.parents[1].name}/${P_GR_CHILD_LVL2.parents[2].name}/${P_GR_CHILD_LVL2.parents[3].name}/${P_GR_CHILD_LVL2.name}`)
      })
    })

  test('[P-PKOPR-3] Deletion Package',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4486` },
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-B-1256` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { generalTab } = versionPage.packageSettingsPage

      await test.step('Open Package settings', async () => {
        await portalPage.gotoPackage(P_PK_DELETE, SETTINGS_TAB_GENERAL)

        await expect(generalTab.packageName).toHaveText(P_PK_DELETE.name)
      })

      await test.step('Delete Package', async () => {
        await generalTab.deleteBtn.click()
        await generalTab.deletePackageDialog.deleteBtn.click()

        await expect(generalTab.deletePackageDialog.deleteBtn).toBeHidden()
        // await expect(portalPage.snackbar).toHaveText(`SuccessPackage ${P_PK_DELETE.name} has been deleted`) //TODO: TestCase-B-1256
        await expect(portalPage.toolbar.title).toHaveText('Favorite')

        await portalPage.gotoGroup(testGroup)

        await expect(portalPage.table.getRow(P_PK_FAV_LIST)).toBeVisible()
        await expect(portalPage.table.getRow(P_PK_DELETE)).toBeHidden()
      })
    })

  test('[P-PKOPR-4] Adding Package to Favorites (packages list)',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-1418` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-A-9292` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)

      /** Case should start from root page to cover issues with cache */
      await test.step(`Go to the "${testGroup.name}" group`, async () => {
        await portalPage.goto()
        await portalPage.sidebar.getWorkspaceButton(testWorkspace).click()
        await portalPage.table.expandGroup(VAR_GR)
        await portalPage.table.expandGroup(testGroup)

        await expect(portalPage.table.getRow(P_PK_FAV_LIST).favoriteBtn).toHaveIcon(UNFAVORITE_ICON)

        await portalPage.table.getRow(P_PK_FAV_LIST).favoriteBtn.click()

        await expect(portalPage.table.getRow(P_PK_FAV_LIST).favoriteBtn).toHaveIcon(FAVORITE_ICON)
      })

      await test.step('Go to the "Favorite" page', async () => {
        await portalPage.sidebar.favoritesBtn.click()

        // await expect(portalPage.table.getRow(P_PK_FAV_LIST)).toBeVisible() //TODO: TestCase-A-9292
      })
    })

  test('[P-PKOPR-5.1] Removing Package from Favorites (packages list)',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4488` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-A-9292` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)

      /** Case should start from root page to cover issues with cache */
      await test.step(`Go to the "${testGroup.name}" group`, async () => {
        await portalPage.goto()
        await portalPage.sidebar.getWorkspaceButton(testWorkspace).click()
        await portalPage.table.expandGroup(VAR_GR)
        await portalPage.table.expandGroup(testGroup)

        await expect(portalPage.table.getRow(P_PK_UNFAV_LIST).favoriteBtn).toHaveIcon(FAVORITE_ICON)

        await portalPage.table.getRow(P_PK_UNFAV_LIST).favoriteBtn.click()

        await expect(portalPage.table.getRow(P_PK_UNFAV_LIST).favoriteBtn).toHaveIcon(UNFAVORITE_ICON)
      })

      await test.step('Go to the "Favorite" page', async () => {
        await portalPage.sidebar.favoritesBtn.click()

        // await expect(portalPage.table.getRow(P_PK_UNFAV_FAV_PAGE)).toBeHidden() //TODO: TestCase-A-9292
      })
    })

  test('[P-PKOPR-5.2] Removing Package from Favorites (favorite page)',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4488` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-A-9292` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)

      /** Expand test Group first to cover issues with cache */
      await test.step(`Go to the "${testGroup.name}" group`, async () => {
        await portalPage.goto()
        await portalPage.sidebar.getWorkspaceButton(testWorkspace).click()
        await portalPage.table.expandGroup(VAR_GR)
        await portalPage.table.expandGroup(testGroup)

        await expect(portalPage.table.getRow(P_PK_UNFAV_FAV_PAGE).favoriteBtn).toHaveIcon(FAVORITE_ICON)
      })

      await test.step('Go to the "Favorite" page', async () => {
        await portalPage.sidebar.favoritesBtn.click()
        await portalPage.table.getRow(P_PK_UNFAV_FAV_PAGE).favoriteBtn.click()

        await expect(portalPage.table.getRow(P_PK_UNFAV_FAV_PAGE)).toBeHidden()
      })

      await test.step(`Return to the "${testWorkspace.name}" workspace`, async () => {
        await portalPage.sidebar.getWorkspaceButton(testWorkspace).click()

        // await expect(portalPage.table.getRow(P_PK_UNFAV_FAV_PAGE).favoriteButton).toHaveIcon(UNFAVORITE_ICON) //TODO: TestCase-A-9292
      })
    })

  test('[P-PKOPR-6.1-N] Creating Package with the same alias',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4489` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { createPackageDialog } = portalPage

      await portalPage.gotoGroup(testGroup)
      await portalPage.toolbar.createPackageMenu.click()
      await portalPage.toolbar.createPackageMenu.packageItm.click()

      await test.step('Create Package', async () => {
        await createPackageDialog.fillForm({
          name: P_PK_SAME_ALIAS.name,
          alias: P_PK_SAME_ALIAS.alias,
        })
        await createPackageDialog.createBtn.click()
        await portalPage.waitForTimeout(CREATE_TIMEOUT)

        await expect(createPackageDialog.createBtn).toBeVisible()
        await expect(createPackageDialog.aliasTxtFld.errorMsg).toHaveText(`Alias '${P_PK_SAME_ALIAS.packageId}' is already reserved. Please use another alias.`)
        await expect(portalPage.snackbar).toHaveText(`ErrorAlias '${P_PK_SAME_ALIAS.packageId}' is already reserved. Please use another alias.`)
      })
    })

  test('[P-PKOPR-6.2] Creating Package with the same alias under another parent group',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4489` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { createPackageDialog, versionPackagePage: versionPage } = portalPage

      await portalPage.gotoGroup(testGroup)
      await portalPage.toolbar.createPackageMenu.click()
      await portalPage.toolbar.createPackageMenu.packageItm.click()

      await test.step('Create Package', async () => {
        await createPackageDialog.fillForm({
          name: P_PK_SAME_ALIAS.name,
          parentName: VAR_GR.name,
          alias: P_PK_SAME_ALIAS.alias,
        })
        await createPackageDialog.createBtn.click()

        await expect(createPackageDialog.createBtn).toBeHidden()
        await expect(portalPage.snackbar).toHaveText('SuccessPackage has been created')
        await expect(versionPage.toolbar.title).toHaveText(P_PK_SAME_ALIAS.name)
      })
    })

  test('[P-PKOPR-7-N] Creating Package with alias more than 10 symbols',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4490` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { createPackageDialog } = portalPage

      await portalPage.gotoGroup(testGroup)
      await portalPage.toolbar.createPackageMenu.click()
      await portalPage.toolbar.createPackageMenu.packageItm.click()

      await test.step('Create Package', async () => {
        await createPackageDialog.fillForm({
          name: P_PK_ALIAS_MORE_10.name,
          alias: P_PK_ALIAS_MORE_10.alias,
        })
        await createPackageDialog.createBtn.click()

        await expect(createPackageDialog.aliasTxtFld.errorMsg).toHaveText(ALIAS_MAX_CHARS_ERROR_MSG)
      })
    })
})
