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
import { FAVORITE_ICON, PORTAL_WORKSPACES_PAGE_ROUTE, UNFAVORITE_ICON } from '@shared/entities'
import { SETTINGS_TAB_GENERAL } from '@portal/entities'
import {
  P_WS_CREATE_N,
  P_WS_DELETE_N,
  P_WS_FAV_LIST_N,
  P_WS_FAV_TITLE_N,
  P_WS_MAIN_R,
  P_WS_UNFAV_LIST_N,
  P_WS_UNFAV_TITLE_N,
  P_WS_UPDATE_N,
} from '@test-data/portal'
import { TICKET_BASE_URL } from '@test-setup'

test.describe('4.1 Workspace actions', () => {

  test('[P-WSOPR-1] Creating Workspace',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4474` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { createPackageDialog } = portalPage

      await portalPage.goto(PORTAL_WORKSPACES_PAGE_ROUTE)
      await portalPage.toolbar.createWorkspaceBtn.click()

      await test.step('Create Workspace', async () => {
        await createPackageDialog.fillForm({
          name: P_WS_CREATE_N.name,
          alias: P_WS_CREATE_N.alias,
        })
        await createPackageDialog.createBtn.click()

        await expect(createPackageDialog.createBtn).toBeHidden()
        await expect(portalPage.toolbar.title).toHaveText(P_WS_CREATE_N.name)
      })
    })

  test('[P-WSOPR-2] Updating Workspace',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4475` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { generalTab } = versionPage.packageSettingsPage

      await test.step('Open Workspace settings', async () => {
        await portalPage.gotoWorkspace(P_WS_UPDATE_N, SETTINGS_TAB_GENERAL)

        await expect(generalTab.packageName).toHaveText(P_WS_UPDATE_N.name)
        // await expect(generalTab.packageVisibility).toHaveText(PACKAGE_VISIBILITY_PUBLIC)
        await expect(generalTab.description).toHaveText(P_WS_UPDATE_N.description!)
      })

      await test.step('Update Workspace', async () => {
        await generalTab.editBtn.click()
        await generalTab.packageNameTxtFld.fill(P_WS_UPDATE_N.testMeta!.updatedName!)
        // await generalTab.packageVisibilitySwitch.click()
        await generalTab.descriptionTxtFld.fill(P_WS_UPDATE_N.testMeta!.updatedDescription!)
        await generalTab.saveBtn.click()

        await expect(portalPage.snackbar).toHaveText('SuccessPackage has been updated')
        await expect(generalTab.packageName).toHaveText(P_WS_UPDATE_N.testMeta!.updatedName!)
        // await expect(generalTab.packageVisibility).toHaveText(PACKAGE_VISIBILITY_PRIVATE)
        await expect(generalTab.description).toHaveText(P_WS_UPDATE_N.testMeta!.updatedDescription!)
      })
    })

  test('[P-WSOPR-3] Deletion Workspace',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4476` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { generalTab } = versionPage.packageSettingsPage

      await test.step('Open Workspace settings', async () => {
        await portalPage.gotoWorkspace(P_WS_DELETE_N, SETTINGS_TAB_GENERAL)

        await expect(generalTab.packageName).toHaveText(P_WS_DELETE_N.name)
      })

      await test.step('Delete Workspace', async () => {
        await generalTab.deleteBtn.click()
        await generalTab.deletePackageDialog.deleteBtn.click()

        await expect(generalTab.deletePackageDialog.deleteBtn).toBeHidden()

        await portalPage.goto(PORTAL_WORKSPACES_PAGE_ROUTE)
        await portalPage.table.getRow(P_WS_UPDATE_N).scrollIntoViewIfNeeded()

        await expect(portalPage.table.getRow(P_WS_MAIN_R)).toBeVisible()
        await expect(portalPage.table.getRow(P_WS_DELETE_N)).toBeHidden()
      })
    })

  test('[P-WSOPR-4.1] Adding Workspace to Favorites (workspaces list)',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4477` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)

      await portalPage.goto(PORTAL_WORKSPACES_PAGE_ROUTE)
      await portalPage.table.getRow(P_WS_FAV_LIST_N).scrollIntoViewIfNeeded()

      await expect(portalPage.table.getRow(P_WS_FAV_LIST_N).favoriteBtn).toHaveIcon(UNFAVORITE_ICON)

      await portalPage.table.getRow(P_WS_FAV_LIST_N).favoriteBtn.click()

      await expect(portalPage.table.getRow(P_WS_FAV_LIST_N).favoriteBtn).toHaveIcon(FAVORITE_ICON)
      await expect(portalPage.sidebar.getWorkspaceButton(P_WS_FAV_LIST_N)).toBeVisible()

    })

  test('[P-WSOPR-4.2] Adding Workspace to Favorites (workspace title)',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4477` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)

      await portalPage.gotoWorkspace(P_WS_FAV_TITLE_N)

      await expect(portalPage.toolbar.favoriteBtn).toHaveIcon(UNFAVORITE_ICON)

      await portalPage.toolbar.favoriteBtn.click()

      await expect(portalPage.toolbar.favoriteBtn).toHaveIcon(FAVORITE_ICON)
      await expect(portalPage.sidebar.getWorkspaceButton(P_WS_FAV_TITLE_N)).toBeVisible()
    })

  test('[P-WSOPR-5.1] Removing Workspace from Favorites (workspaces list)',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4478` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)

      await portalPage.goto(PORTAL_WORKSPACES_PAGE_ROUTE)
      await portalPage.table.getRow(P_WS_UNFAV_LIST_N).scrollIntoViewIfNeeded()

      await expect(portalPage.table.getRow(P_WS_UNFAV_LIST_N).favoriteBtn).toHaveIcon(FAVORITE_ICON)

      await portalPage.table.getRow(P_WS_UNFAV_LIST_N).favoriteBtn.click()

      await expect(portalPage.table.getRow(P_WS_UNFAV_LIST_N).favoriteBtn).toHaveIcon(UNFAVORITE_ICON)
      await expect(portalPage.sidebar.getWorkspaceButton(P_WS_MAIN_R)).toBeVisible()
      await expect(portalPage.sidebar.getWorkspaceButton(P_WS_UNFAV_LIST_N)).toBeHidden()
    })

  test('[P-WSOPR-5.2] Removing Workspace from Favorites (workspace title)',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4478` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)

      await portalPage.gotoWorkspace(P_WS_UNFAV_TITLE_N)

      await expect(portalPage.toolbar.favoriteBtn).toHaveIcon(FAVORITE_ICON)

      await portalPage.toolbar.favoriteBtn.click()

      await expect(portalPage.toolbar.favoriteBtn).toHaveIcon(UNFAVORITE_ICON)
      await expect(portalPage.sidebar.getWorkspaceButton(P_WS_MAIN_R)).toBeVisible()
      await expect(portalPage.sidebar.getWorkspaceButton(P_WS_UNFAV_TITLE_N)).toBeHidden()
    })

  test('[P-WSOPR-6] Search Workspace',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4479` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)

      await portalPage.goto(PORTAL_WORKSPACES_PAGE_ROUTE)

      await test.step('Search Workspace by Name', async () => {

        await test.step('General', async () => {
          await portalPage.toolbar.searchbar.fill(P_WS_MAIN_R.name)

          await expect(portalPage.table.getRow()).toHaveCount(1)
          await expect(portalPage.table.getRow(P_WS_MAIN_R)).toBeVisible()
        })

        await test.step('Clearing a search query', async () => {
          await portalPage.toolbar.searchbar.clear()

          await portalPage.table.getRow(P_WS_UPDATE_N).scrollIntoViewIfNeeded()

          await expect(portalPage.table.getRow(P_WS_MAIN_R)).toBeVisible()
          await expect(portalPage.table.getRow(P_WS_UPDATE_N)).toBeVisible()
        })

        await test.step('Case sensitive', async () => {
          await portalPage.toolbar.searchbar.clear()
          await portalPage.toolbar.searchbar.fill(P_WS_MAIN_R.name.toLowerCase())

          await expect.soft(portalPage.table.getRow()).toHaveCount(1)
          await expect(portalPage.table.getRow(P_WS_MAIN_R)).toBeVisible()
        })

        await test.step('Invalid search query with valid substring', async () => {
          await portalPage.toolbar.searchbar.clear()
          await portalPage.toolbar.searchbar.fill(`${P_WS_MAIN_R.name}123`)

          await expect.soft(portalPage.table.getRow()).toHaveCount(0)
        })
      })

      await test.step('Search Project by ID', async () => {

        await test.step('General', async () => {
          await portalPage.toolbar.searchbar.clear()
          await portalPage.toolbar.searchbar.fill(P_WS_MAIN_R.packageId)

          await expect(portalPage.table.getRow()).toHaveCount(1)
          await expect(portalPage.table.getRow(P_WS_MAIN_R)).toBeVisible()
        })

        await test.step('Case sensitive', async () => {
          await portalPage.toolbar.searchbar.clear()
          await portalPage.toolbar.searchbar.fill(P_WS_MAIN_R.packageId.toLowerCase())

          await expect.soft(portalPage.table.getRow()).toHaveCount(1)
          await expect(portalPage.table.getRow(P_WS_MAIN_R)).toBeVisible()
        })

        await test.step('Invalid search query with valid substring', async () => {
          await portalPage.toolbar.searchbar.clear()
          await portalPage.toolbar.searchbar.fill(`${P_WS_MAIN_R.packageId}123`)

          await expect.soft(portalPage.table.getRow()).toHaveCount(0)
        })
      })
    })
})
