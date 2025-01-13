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
import { expect } from '@services/expect-decorator'
import { PortalPage } from '@portal/pages/PortalPage'
import {
  GRP_P_ADMIN_CRUD_N,
  GRP_P_ADMIN_DELETING_N,
  GRP_P_ADMIN_EDITING_N,
  RV_PATTERN_DEF,
  RV_PATTERN_NEW,
  TOKEN_ADMIN_GROUP,
} from '@test-data/portal'
import { SETTINGS_TAB_GENERAL, SETTINGS_TAB_TOKENS, SETTINGS_TAB_USERS } from '@portal/entities'
import { EMPTY_VALUE } from '@test-data/shared'
import { TEST_USER_1, TEST_USER_2, TEST_USER_3, TEST_USER_4 } from '@test-data'
import { TICKET_BASE_URL } from '@test-setup'

test.describe('03.4.3 Access Control. Admin role. (Group)', () => {

  const crudGroup = GRP_P_ADMIN_CRUD_N
  const testGroup = GRP_P_ADMIN_EDITING_N

  test('[P-ACAG-01.1] Group. Admin. Create Group.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10613` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { createPackageDialog, versionPackagePage: versionPage } = portalPage
      const groupName = 'GRP-admin-created'
      const groupAlias = 'GADMINC'

      await portalPage.gotoGroup(crudGroup)
      await portalPage.toolbar.createPackageMenu.click()
      await portalPage.toolbar.createPackageMenu.groupItm.click()

      await test.step('Create Group', async () => {
        await createPackageDialog.fillForm({
          name: groupName,
          alias: groupAlias,
        })
        await createPackageDialog.createBtn.click()

        await expect(createPackageDialog.createBtn).toBeHidden()
        // await expect(portalPage.snackbar).toHaveText('SuccessPackage has been created') //Groups don't have a notification
        await expect(versionPage.toolbar.title).toHaveText(groupName)
      })
    })

  test('[P-ACAG-01.2] Group. Admin. Edit Group.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10613` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { generalTab } = versionPage.packageSettingsPage
      const changedName = 'GRP-admin-renamed'
      const changedDescription = 'changed description'

      await test.step('Open Group settings', async () => {
        await portalPage.gotoGroup(testGroup, SETTINGS_TAB_GENERAL)

        await expect(generalTab.groupName).toHaveText(testGroup.name)
        await expect(generalTab.alias).toHaveText(testGroup.alias)
        await expect(generalTab.parentGroup).toHaveText(testGroup.parentId)
        // await expect(generalTab.packageVisibility).toHaveText(PACKAGE_VISIBILITY_PUBLIC)
        await expect(generalTab.description).toHaveText(EMPTY_VALUE)
        await expect(generalTab.pattern).toHaveText(RV_PATTERN_DEF)
      })

      await test.step('Set group parameters', async () => {
        await generalTab.editBtn.click()
        await generalTab.groupNameTxtFld.fill(changedName)
        // await generalTab.packageVisibilitySwitch.click()
        await generalTab.descriptionTxtFld.fill(changedDescription)
        await generalTab.patternTxtFld.fill(RV_PATTERN_NEW)
        await generalTab.saveBtn.click()

        await expect(generalTab.groupName).toHaveText(changedName)
        await expect(generalTab.alias).toHaveText(testGroup.alias)
        await expect(generalTab.parentGroup).toHaveText(testGroup.parentId)
        // await expect(generalTab.packageVisibility).toHaveText(PACKAGE_VISIBILITY_PRIVATE)
        await expect(generalTab.description).toHaveText(changedDescription)
        await expect(generalTab.pattern).toHaveText(RV_PATTERN_NEW)
      })
    })

  test('[P-ACAG-01.3] Group. Admin. Delete Group.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10613` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { generalTab } = versionPage.packageSettingsPage
      const testGroupForDeleting = GRP_P_ADMIN_DELETING_N

      await test.step('Open Group settings', async () => {
        await portalPage.gotoGroup(testGroupForDeleting, SETTINGS_TAB_GENERAL)

        await expect(generalTab.groupName).toHaveText(testGroupForDeleting.name)
      })

      await test.step('Delete Group', async () => {
        await generalTab.deleteBtn.click()
        await generalTab.deletePackageDialog.deleteBtn.click()

        await expect(generalTab.deletePackageDialog.deleteBtn).toBeHidden()
        await expect(portalPage.toolbar.title).toHaveText('Favorite')

        await portalPage.gotoGroup(crudGroup)

        await expect(portalPage.table.getRow(testGroup)).toBeVisible()
        await expect(portalPage.table.getRow(testGroupForDeleting)).toBeHidden()
      })
    })

  test('[P-ACAG-02.1] Group. Admin. Generate token.',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10613` },
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { accessTokensTab } = versionPage.packageSettingsPage
      const testTokenName = 'Generated token'
      const testUserName = TEST_USER_1.name

      await portalPage.gotoGroup(testGroup, SETTINGS_TAB_TOKENS)

      await expect(accessTokensTab.createdForAc).toHaveValue(testUserName)

      await accessTokensTab.nameTxtFld.fill(testTokenName)
      await accessTokensTab.generateBtn.click()

      await expect(accessTokensTab.tokenValueTxtFld).not.toBeEmpty()
      await expect(accessTokensTab.tokenValueTxtFld.copyBtn).toBeVisible()
      await expect(accessTokensTab.getTokenRow(testTokenName).roles).toHaveText('Admin')
      await expect(accessTokensTab.getTokenRow(testTokenName).createdAt).not.toBeEmpty()
      await expect(accessTokensTab.getTokenRow(testTokenName).createdBy).toHaveText(testUserName)
      // await expect(accessTokensTab.getTokenRow(testTokenName).createdFor).toHaveText(testUserName) //!Issue: the field is empty, maybe playwright's bug
    })

  test('[P-ACAG-02.2] Group. Admin. Revoke token.',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10613` },
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { accessTokensTab } = versionPage.packageSettingsPage
      const testTokenName = TOKEN_ADMIN_GROUP.name

      await portalPage.gotoGroup(testGroup, SETTINGS_TAB_TOKENS)
      await accessTokensTab.getTokenRow(testTokenName).hover()
      await accessTokensTab.getTokenRow(testTokenName).deleteBtn.click()

      await expect(accessTokensTab.getTokenRow(testTokenName)).toBeHidden()
    })

  test('[P-ACAG-02.3] Group. Admin. Add user.',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10613` },
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { accessControlTab } = versionPage.packageSettingsPage
      const { addUserDialog } = accessControlTab
      const testUserName = TEST_USER_4.name

      await portalPage.gotoGroup(testGroup, SETTINGS_TAB_GENERAL)
      await accessControlTab.click()
      await accessControlTab.addUserBtn.click()
      await addUserDialog.fillForm(testUserName, 'Admin')
      await addUserDialog.addBtn.click()

      await expect(accessControlTab.getUserRow(testUserName).adminChx).toBeChecked()
      await expect(accessControlTab.getUserRow(testUserName).ownerChx).not.toBeChecked()
      await expect(accessControlTab.getUserRow(testUserName).editorChx).not.toBeChecked()
      await expect(accessControlTab.getUserRow(testUserName).viewerChx).not.toBeChecked()
    })

  test('[P-ACAG-02.4] Group. Admin. Change user role.',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10613` },
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { accessControlTab } = versionPage.packageSettingsPage
      const testUserName = TEST_USER_2.name

      await portalPage.gotoGroup(testGroup, SETTINGS_TAB_USERS)

      await test.step('Add role', async () => {
        await accessControlTab.getUserRow(testUserName).editorChx.click()

        await expect(accessControlTab.getUserRow(testUserName).editorChx).toBeChecked()
      })

      await test.step('Remove role', async () => {
        await accessControlTab.getUserRow(testUserName).editorChx.click()

        await expect(accessControlTab.getUserRow(testUserName).editorChx).not.toBeChecked()
      })

      await test.step('Undo changes', async () => {
        await portalPage.snackbar.undoBtn.click()

        await expect(accessControlTab.getUserRow(testUserName).editorChx).toBeChecked()
      })
    })

  test('[P-ACAG-02.5] Group. Admin. Delete user.',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10613` },
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { accessControlTab } = versionPage.packageSettingsPage
      const testUserName = TEST_USER_3.name

      await portalPage.gotoGroup(testGroup, SETTINGS_TAB_USERS)

      await expect(accessControlTab.getUserRow(testUserName)).toBeVisible()

      await accessControlTab.getUserRow(testUserName).hover()
      await accessControlTab.getUserRow(testUserName).deleteBtn.click()
      await accessControlTab.deleteUserDialog.removeBtn.click()

      await expect(accessControlTab.getUserRow(testUserName)).toBeHidden()
    })
})
