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
import { expect, expectText } from '@services/expect-decorator'
import { PortalPage } from '@portal/pages/PortalPage'
import {
  GRP_P_UAC_G1_N,
  GRP_P_UAC_G2_N,
  PKG_P_UAC_G_ASSIGN_N,
  PKG_P_UAC_G_INHER_N,
  PKG_P_UAC_G_MULT1_N,
  PKG_P_UAC_G_MULT2_N,
  PKG_P_UAC_G_MULT3_N,
  PKG_P_UAC_G_TOKENS_N,
  TOKEN_GEN_DEFAULT,
  TOKEN_GEN_DEL,
  WSP_P_UAC_GENERAL_N,
} from '@test-data/portal'
import { SETTINGS_TAB_GENERAL, SETTINGS_TAB_TOKENS, SETTINGS_TAB_USERS } from '@portal/entities'
import { SEARCH_TIMEOUT, TICKET_BASE_URL } from '@test-setup'
import { SYSADMIN, TEST_USER_1, TEST_USER_2, TEST_USER_3, TEST_USER_4 } from '@test-data'

test.describe('03.0 Access Control. General.', () => {

  test('[P-ACG-01] Roles assignee',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-9651` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { accessControlTab } = versionPage.packageSettingsPage
      const { addUserDialog } = accessControlTab

      await portalPage.gotoPackage(PKG_P_UAC_G_ASSIGN_N, SETTINGS_TAB_GENERAL)
      await accessControlTab.click()

      await test.step(`Set "Viewer" role for "${TEST_USER_1.name}"`, async () => {
        await accessControlTab.addUserBtn.click()
        await addUserDialog.fillForm(TEST_USER_1.name, 'Viewer')
        await addUserDialog.addBtn.click()

        await expect(accessControlTab.getUserRow(TEST_USER_1.name).adminChx).not.toBeChecked()
        await expect(accessControlTab.getUserRow(TEST_USER_1.name).ownerChx).not.toBeChecked()
        await expect(accessControlTab.getUserRow(TEST_USER_1.name).releaseManagerChx).not.toBeChecked()
        await expect(accessControlTab.getUserRow(TEST_USER_1.name).editorChx).not.toBeChecked()
        await expect(accessControlTab.getUserRow(TEST_USER_1.name).viewerChx).toBeChecked()
      })

      await test.step(`Set "Editor" role for "${TEST_USER_2.name}"`, async () => {
        await accessControlTab.addUserBtn.click()
        await addUserDialog.fillForm(TEST_USER_2.name, 'Editor')
        await addUserDialog.addBtn.click()

        await expect(accessControlTab.getUserRow(TEST_USER_2.name).adminChx).not.toBeChecked()
        await expect(accessControlTab.getUserRow(TEST_USER_2.name).ownerChx).not.toBeChecked()
        await expect(accessControlTab.getUserRow(TEST_USER_2.name).releaseManagerChx).not.toBeChecked()
        await expect(accessControlTab.getUserRow(TEST_USER_2.name).editorChx).toBeChecked()
        await expect(accessControlTab.getUserRow(TEST_USER_2.name).viewerChx).not.toBeChecked()
      })

      await test.step(`Set "Owner" role for "${TEST_USER_3.name}"`, async () => {
        await accessControlTab.addUserBtn.click()
        await addUserDialog.fillForm(TEST_USER_3.name, 'Owner')
        await addUserDialog.addBtn.click()

        await expect(accessControlTab.getUserRow(TEST_USER_3.name).adminChx).not.toBeChecked()
        await expect(accessControlTab.getUserRow(TEST_USER_3.name).ownerChx).toBeChecked()
        await expect(accessControlTab.getUserRow(TEST_USER_3.name).releaseManagerChx).not.toBeChecked()
        await expect(accessControlTab.getUserRow(TEST_USER_3.name).editorChx).not.toBeChecked()
        await expect(accessControlTab.getUserRow(TEST_USER_3.name).viewerChx).not.toBeChecked()
      })

      await test.step(`Set "Admin" role for "${TEST_USER_4.name}"`, async () => {
        await accessControlTab.addUserBtn.click()
        await addUserDialog.fillForm(TEST_USER_4.name, 'Admin')
        await addUserDialog.addBtn.click()

        await expect(accessControlTab.getUserRow(TEST_USER_4.name).adminChx).toBeChecked()
        await expect(accessControlTab.getUserRow(TEST_USER_4.name).ownerChx).not.toBeChecked()
        await expect(accessControlTab.getUserRow(TEST_USER_4.name).releaseManagerChx).not.toBeChecked()
        await expect(accessControlTab.getUserRow(TEST_USER_4.name).editorChx).not.toBeChecked()
        await expect(accessControlTab.getUserRow(TEST_USER_4.name).viewerChx).not.toBeChecked()
      })
    })

  test('[P-ACG-02] Roles inheritance',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8583` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { accessControlTab } = versionPage.packageSettingsPage
      const { addUserDialog } = accessControlTab
      const testUserName = TEST_USER_1.name
      const tooltipInheritedMsg = 'The role is inherited from '
      const tooltipRemoveMsg = 'You cannot remove the user with inherited role'

      await test.step(`Set "Viewer" role for "${WSP_P_UAC_GENERAL_N.name}" workspace`, async () => {
        await portalPage.gotoPackage(WSP_P_UAC_GENERAL_N, SETTINGS_TAB_USERS)
        await accessControlTab.addUserBtn.click()
        await addUserDialog.fillForm(testUserName, 'Viewer')
        await addUserDialog.addBtn.click()

        await expect(accessControlTab.getUserRow(testUserName).viewerChx).toBeChecked()
      })

      await test.step(`Set "Editor" role for "${GRP_P_UAC_G1_N.name}" group`, async () => {
        await portalPage.gotoPackage(GRP_P_UAC_G1_N, SETTINGS_TAB_USERS)
        await accessControlTab.addUserBtn.click()
        await addUserDialog.fillForm(testUserName, 'Editor')
        await addUserDialog.addBtn.click()

        await expect(accessControlTab.getUserRow(testUserName).editorChx).toBeChecked()
      })

      await test.step(`Set "Owner" role for "${GRP_P_UAC_G2_N.name}" group`, async () => {
        await portalPage.gotoPackage(GRP_P_UAC_G2_N, SETTINGS_TAB_USERS)
        await accessControlTab.addUserBtn.click()
        await addUserDialog.fillForm(testUserName, 'Owner')
        await addUserDialog.addBtn.click()

        await expect(accessControlTab.getUserRow(testUserName).ownerChx).toBeChecked()
      })

      await test.step(`Set "Admin" role for "${PKG_P_UAC_G_INHER_N.name}" package`, async () => {
        await portalPage.gotoPackage(PKG_P_UAC_G_INHER_N, SETTINGS_TAB_USERS)
        await accessControlTab.addUserBtn.click()
        await addUserDialog.fillForm(testUserName, 'Admin')
        await addUserDialog.addBtn.click()
      })

      await test.step('Check checkboxes', async () => {
        await expect(accessControlTab.getUserRow(testUserName).viewerChx).toBeChecked()
        await expect(accessControlTab.getUserRow(testUserName).viewerChx).toBeDisabled()
        await expect(accessControlTab.getUserRow(testUserName).editorChx).toBeChecked()
        await expect(accessControlTab.getUserRow(testUserName).editorChx).toBeDisabled()
        await expect(accessControlTab.getUserRow(testUserName).ownerChx).toBeChecked()
        await expect(accessControlTab.getUserRow(testUserName).ownerChx).toBeDisabled()
        await expect(accessControlTab.getUserRow(testUserName).adminChx).toBeChecked()
        await expect(accessControlTab.getUserRow(testUserName).adminChx).toBeEnabled()
      })

      await test.step('Check tooltips', async () => {
        await accessControlTab.getUserRow(testUserName).viewerChx.hover({ force: true })

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(tooltipInheritedMsg + WSP_P_UAC_GENERAL_N.name)

        await accessControlTab.getUserRow(testUserName).userCell.hover()
        await accessControlTab.getUserRow(testUserName).editorChx.hover({ force: true })

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(tooltipInheritedMsg + GRP_P_UAC_G1_N.name)

        await accessControlTab.getUserRow(testUserName).userCell.hover()
        await accessControlTab.getUserRow(testUserName).ownerChx.hover({ force: true })

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(tooltipInheritedMsg + GRP_P_UAC_G2_N.name)
      })

      await test.step('Remove User (negative)', async () => {
        await accessControlTab.getUserRow(testUserName).hover({ force: true })
        await accessControlTab.getUserRow(testUserName).deleteBtn.hover({ force: true })

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(tooltipRemoveMsg)
      })
    })

  test('[P-ACG-03.1] Adding/removing role by checkbox clicking and check Undo',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-9652` },
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { accessControlTab } = versionPage.packageSettingsPage
      const testUserName = TEST_USER_1.name

      await portalPage.gotoPackage(PKG_P_UAC_G_MULT1_N, SETTINGS_TAB_USERS)

      await test.step('Add "Release Manager" role by checkbox clicking', async () => {
        await accessControlTab.getUserRow(testUserName).releaseManagerChx.click()

        await expect(accessControlTab.getUserRow(testUserName).releaseManagerChx).toBeChecked()
      })

      await test.step('Remove "Release Manager" role by checkbox clicking', async () => {
        await accessControlTab.getUserRow(testUserName).releaseManagerChx.click()

        await expect(accessControlTab.getUserRow(testUserName).releaseManagerChx).not.toBeChecked()
      })

      await test.step('Undo changes', async () => {
        await portalPage.snackbar.undoBtn.click()

        await expect(accessControlTab.getUserRow(testUserName).releaseManagerChx).toBeChecked()
      })
    })

  test('[P-ACG-03.2] Adding multiple roles by checkbox clicking',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-9652` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { accessControlTab } = versionPage.packageSettingsPage
      const testUserName = TEST_USER_2.name

      await portalPage.gotoPackage(PKG_P_UAC_G_MULT1_N, SETTINGS_TAB_USERS)
      await accessControlTab.getUserRow(testUserName).editorChx.click()
      await accessControlTab.getUserRow(testUserName).viewerChx.click()

      await expect(accessControlTab.getUserRow(testUserName).adminChx).toBeChecked()
      await expect(accessControlTab.getUserRow(testUserName).ownerChx).not.toBeChecked()
      await expect(accessControlTab.getUserRow(testUserName).releaseManagerChx).not.toBeChecked()
      await expect(accessControlTab.getUserRow(testUserName).editorChx).toBeChecked()
      await expect(accessControlTab.getUserRow(testUserName).viewerChx).toBeChecked()
    })

  test('[P-ACG-03.3] Adding multiple roles in the pop-up',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-9652` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { accessControlTab } = versionPage.packageSettingsPage
      const { addUserDialog } = accessControlTab
      const testUserName = TEST_USER_3.name

      await portalPage.gotoPackage(PKG_P_UAC_G_MULT1_N, SETTINGS_TAB_USERS)
      await accessControlTab.addUserBtn.click()
      await addUserDialog.fillForm(testUserName, ['Editor', 'Viewer'])
      await addUserDialog.addBtn.click()

      await expect(accessControlTab.getUserRow(testUserName).adminChx).not.toBeChecked()
      await expect(accessControlTab.getUserRow(testUserName).ownerChx).not.toBeChecked()
      await expect(accessControlTab.getUserRow(testUserName).releaseManagerChx).not.toBeChecked()
      await expect(accessControlTab.getUserRow(testUserName).editorChx).toBeChecked()
      await expect(accessControlTab.getUserRow(testUserName).viewerChx).toBeChecked()
    })

  test('[P-ACG-03.4] Adding another role in the pop-up',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-9652` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { accessControlTab } = versionPage.packageSettingsPage
      const { addUserDialog } = accessControlTab
      const testUserName = TEST_USER_4.name

      await portalPage.gotoPackage(PKG_P_UAC_G_MULT1_N, SETTINGS_TAB_USERS)
      await accessControlTab.addUserBtn.click()
      await addUserDialog.fillForm(testUserName, ['Editor'])
      await addUserDialog.addBtn.click()

      await expect(accessControlTab.getUserRow(testUserName).adminChx).toBeChecked()
      await expect(accessControlTab.getUserRow(testUserName).ownerChx).not.toBeChecked()
      await expect(accessControlTab.getUserRow(testUserName).releaseManagerChx).not.toBeChecked()
      await expect(accessControlTab.getUserRow(testUserName).editorChx).toBeChecked()
      await expect(accessControlTab.getUserRow(testUserName).viewerChx).not.toBeChecked()
    })

  test('[P-ACG-03.5] Adding a role for multiple users in the pop-up',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-9652` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { accessControlTab } = versionPage.packageSettingsPage
      const { addUserDialog } = accessControlTab
      const testUser2Name = TEST_USER_2.name
      const testUser3Name = TEST_USER_3.name

      await portalPage.gotoPackage(PKG_P_UAC_G_MULT2_N, SETTINGS_TAB_USERS)
      await accessControlTab.addUserBtn.click()
      await addUserDialog.fillForm([testUser2Name, testUser3Name], 'Editor')
      await addUserDialog.addBtn.click()

      await expect(accessControlTab.getUserRow(testUser2Name).adminChx).not.toBeChecked()
      await expect(accessControlTab.getUserRow(testUser2Name).ownerChx).not.toBeChecked()
      await expect(accessControlTab.getUserRow(testUser2Name).releaseManagerChx).not.toBeChecked()
      await expect(accessControlTab.getUserRow(testUser2Name).editorChx).toBeChecked()
      await expect(accessControlTab.getUserRow(testUser2Name).viewerChx).not.toBeChecked()
      await expect(accessControlTab.getUserRow(testUser3Name).adminChx).not.toBeChecked()
      await expect(accessControlTab.getUserRow(testUser3Name).ownerChx).not.toBeChecked()
      await expect(accessControlTab.getUserRow(testUser3Name).releaseManagerChx).not.toBeChecked()
      await expect(accessControlTab.getUserRow(testUser3Name).editorChx).toBeChecked()
      await expect(accessControlTab.getUserRow(testUser3Name).viewerChx).not.toBeChecked()
    })

  test('[P-ACG-03.6] Removing the admin role by Admin',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-9652` },
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { accessControlTab } = versionPage.packageSettingsPage
      const testUserName = TEST_USER_1.name
      const tooltipMsg = 'You do not have permission to manage user roles in current package'

      await portalPage.gotoPackage(PKG_P_UAC_G_MULT2_N, SETTINGS_TAB_USERS)

      await expect(accessControlTab.getUserRow(testUserName).adminChx).toBeEnabled()

      await accessControlTab.getUserRow(testUserName).adminChx.click()

      await expect(accessControlTab.getUserRow(testUserName).adminChx).toBeDisabled()

      await accessControlTab.getUserRow(testUserName).adminChx.hover({ force: true })

      await expect(portalPage.tooltip).toHaveCount(1)
      await expect(portalPage.tooltip).toHaveText(tooltipMsg)

      await accessControlTab.getUserRow(testUserName).deleteBtn.hover({ force: true })

      await expect(portalPage.tooltip).toHaveCount(1)
      await expect(portalPage.tooltip).toHaveText(tooltipMsg)
    })

  test('[P-ACG-03.7] Deleting a user by checkbox clicking',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-9652` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { accessControlTab } = versionPage.packageSettingsPage
      const testUserName = TEST_USER_1.name

      await portalPage.gotoPackage(PKG_P_UAC_G_MULT3_N, SETTINGS_TAB_USERS)

      await expect(accessControlTab.getUserRow(testUserName)).toBeVisible()

      await accessControlTab.getUserRow(testUserName).adminChx.click()

      await expect(accessControlTab.getUserRow(testUserName)).toBeHidden()

      await portalPage.reload()

      await expect(accessControlTab.getUserRow(testUserName)).toBeHidden()
    })

  test('[P-ACG-03.8] Deleting a user by clicking the Delete button',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-9652` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { accessControlTab } = versionPage.packageSettingsPage
      const testUserName = TEST_USER_2.name

      await portalPage.gotoPackage(PKG_P_UAC_G_MULT3_N, SETTINGS_TAB_USERS)

      await expect(accessControlTab.getUserRow(testUserName)).toBeVisible()

      await accessControlTab.getUserRow(testUserName).hover()
      await accessControlTab.getUserRow(testUserName).deleteBtn.click()
      await accessControlTab.deleteUserDialog.removeBtn.click()

      await expect(accessControlTab.getUserRow(testUserName)).toBeHidden()

      await portalPage.reload()

      await expect(accessControlTab.getUserRow(testUserName)).toBeHidden()
    })

  test('[P-ACG-03.9] User search',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-9652` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { accessControlTab } = versionPage.packageSettingsPage

      await portalPage.gotoPackage(PKG_P_UAC_G_TOKENS_N, SETTINGS_TAB_USERS)

      await test.step('Part of a word', async () => {
        await accessControlTab.searchbar.fill('x_ATUI')
        await portalPage.waitForTimeout(SEARCH_TIMEOUT.middle)

        await expect.soft(accessControlTab.getUserRow()).toHaveCount(4)
      })

      await test.step('Adding part of a word', async () => {
        await accessControlTab.searchbar.fill('_User1')

        await expect.soft(accessControlTab.getUserRow()).toHaveCount(1)
      })

      await test.step('Clearing a search query', async () => {
        await accessControlTab.searchbar.clear()

        await expect.soft(accessControlTab.getUserRow()).toHaveCount(4)
      })

      await test.step('Case sensitive', async () => {
        await accessControlTab.searchbar.clear()
        await accessControlTab.searchbar.fill(TEST_USER_1.name.toLowerCase())

        await expect.soft(accessControlTab.getUserRow()).toHaveCount(1)
      })

      await test.step('Invalid search query with valid substring', async () => {
        await accessControlTab.searchbar.clear()
        await accessControlTab.searchbar.fill(`${TEST_USER_1.name}123`)

        await expect.soft(accessControlTab.getUserRow()).toHaveCount(0)
      })
    })

  test('[P-ACG-04.1] Token generation for current user',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-9655` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { accessTokensTab } = versionPage.packageSettingsPage
      const tooltipMsg = 'Copy and save this token because it won’t be saved'
      const defaultTokenName = TOKEN_GEN_DEFAULT.name
      const currentUserTokenName = 'Current User token'

      await portalPage.gotoPackage(PKG_P_UAC_G_TOKENS_N, SETTINGS_TAB_TOKENS)

      await expect(accessTokensTab.createdForAc).toHaveValue(SYSADMIN.name)

      await test.step('Generate token with empty name (negative)', async () => {
        await accessTokensTab.generateBtn.click()

        await expect(accessTokensTab.nameTxtFld).toBeEmpty()
      })

      await test.step('Generate token with exist name (negative)', async () => {
        await accessTokensTab.nameTxtFld.fill(defaultTokenName)
        await accessTokensTab.generateBtn.click()

        await expect(portalPage.snackbar).toContainText(`API key with name ${defaultTokenName} already exists`)
      })

      await test.step('Generate token for current user', async () => {
        await accessTokensTab.nameTxtFld.fill(currentUserTokenName)
        await accessTokensTab.generateBtn.click()

        await expect(accessTokensTab.tokenValueTxtFld).not.toBeEmpty()
        await expect(accessTokensTab.tokenValueTxtFld.copyBtn).toBeVisible()
        await expect(accessTokensTab.tokenWarning).toHaveText(tooltipMsg)
        await expect(accessTokensTab.getTokenRow(currentUserTokenName).roles).toHaveText('System administrator')
        await expect(accessTokensTab.getTokenRow(currentUserTokenName).createdAt).not.toBeEmpty()
        await expect(accessTokensTab.getTokenRow(currentUserTokenName).createdBy).toHaveText(SYSADMIN.name)
        // await expect(accessTokensTab.getTokenRow(currentUserTokenName).createdFor).toHaveText(SYSADMIN.name) //!Issue: the field is empty, maybe playwright's bug

        await portalPage.reload()

        await expect(accessTokensTab.tokenValueTxtFld).toBeHidden()
        await expect(accessTokensTab.generateBtn).toBeVisible()
      })
    })

  test('[P-ACG-04.2] Token generation for another user and copying',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-9655` },
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { accessTokensTab } = versionPage.packageSettingsPage
      const anotherUserTokenName = 'Another User token'

      await portalPage.gotoPackage(PKG_P_UAC_G_TOKENS_N, SETTINGS_TAB_TOKENS)

      await test.step('Generate token for another user', async () => {
        await accessTokensTab.nameTxtFld.fill(anotherUserTokenName)
        await accessTokensTab.rolesAc.click()
        await accessTokensTab.rolesAc.getListItem('Editor').click()
        await accessTokensTab.createdForAc.fill(TEST_USER_2.name)
        await accessTokensTab.createdForAc.getListItem(TEST_USER_2.name, { exact: false }).click()
        await accessTokensTab.generateBtn.click()

        await expect(accessTokensTab.tokenValueTxtFld).not.toBeEmpty()
        await expect(accessTokensTab.tokenValueTxtFld.copyBtn).toBeVisible()
        await expect(accessTokensTab.getTokenRow(anotherUserTokenName).roles).toHaveText('Editor')
        await expect(accessTokensTab.getTokenRow(anotherUserTokenName).createdAt).not.toBeEmpty()
        await expect(accessTokensTab.getTokenRow(anotherUserTokenName).createdBy).toHaveText(TEST_USER_1.name)
        await expect(accessTokensTab.getTokenRow(anotherUserTokenName).createdFor).toHaveText(TEST_USER_2.name)
      })

      await test.step('Copy token', async () => {
        const token = await accessTokensTab.copyToken()

        await expectText(token).toMatch(/[a-z0-9]+/)
      })
    })

  test('[P-ACG-04.3] Token removing',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-9655` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { accessTokensTab } = versionPage.packageSettingsPage

      await portalPage.gotoPackage(PKG_P_UAC_G_TOKENS_N, SETTINGS_TAB_TOKENS)
      await accessTokensTab.getTokenRow(TOKEN_GEN_DEL.name).hover()
      await accessTokensTab.getTokenRow(TOKEN_GEN_DEL.name).deleteBtn.click()

      await expect(accessTokensTab.getTokenRow(TOKEN_GEN_DEL.name)).toBeHidden()

      await portalPage.reload()

      await expect(accessTokensTab.getTokenRow(TOKEN_GEN_DEL.name)).toBeHidden()
    })
})
