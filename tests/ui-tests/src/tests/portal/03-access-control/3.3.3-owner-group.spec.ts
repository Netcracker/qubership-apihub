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
  GRP_P_OWNER_CRUD_N,
  GRP_P_OWNER_DELETING_N,
  GRP_P_OWNER_EDITING_N,
  GRP_P_OWNER_N,
  GRP_P_OWNER_ROOT_N,
  NO_PERM_ADD_MEMBER,
  NO_PERM_GEN_TOKEN,
  NO_PERM_MANAGE_ROLES,
  RV_PATTERN_DEF,
  RV_PATTERN_NEW,
} from '@test-data/portal'
import { SETTINGS_TAB_GENERAL } from '@portal/entities'
import { EMPTY_VALUE } from '@test-data/shared'
import { TICKET_BASE_URL } from '@test-setup'

test.describe('03.3.3 Access Control. Owner role. (Group)', () => {

  const rootGroup = GRP_P_OWNER_ROOT_N
  const crudGroup = GRP_P_OWNER_CRUD_N
  const testGroup = GRP_P_OWNER_N

  test('[P-ACOG-01.1] Group. Owner. Settings.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10547` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-1019` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const {
        accessTokensTab,
        accessControlTab,
      } = versionPage.packageSettingsPage

      await portalPage.gotoGroup(rootGroup)
      await portalPage.table.getRow(testGroup).openSettings()

      await test.step('View "Access Tokens" tab', async () => {
        await accessTokensTab.click()

        await expect(accessTokensTab.nameTxtFld).toBeDisabled()
        await expect(accessTokensTab.rolesAc).toBeDisabled()
        await expect(accessTokensTab.createdForAc).toBeDisabled()
        await expect(accessTokensTab.generateBtn).toBeDisabled()

        await accessTokensTab.generateBtn.hover({ force: true })

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(NO_PERM_GEN_TOKEN)

        await accessTokensTab.getTokenRow(1).hover()

        await expect(accessTokensTab.getTokenRow(1).deleteBtn).toBeDisabled()

        await accessTokensTab.getTokenRow(1).deleteBtn.hover({ force: true })

        await expect(portalPage.tooltip).toHaveCount(1)
        //! await expect(portalPage.tooltip).toHaveText(NO_PERM_REVOKE_TOKEN) //Issue: TestCase-B-1019
      })

      await test.step('View "User Access Control" tab', async () => {
        await accessControlTab.click()

        await expect(accessControlTab.addUserBtn).toBeDisabled()

        await accessControlTab.addUserBtn.hover({ force: true })

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(NO_PERM_ADD_MEMBER)

        await accessControlTab.getUserRow(1).hover()

        await expect(accessControlTab.getUserRow(1).adminChx).toBeDisabled()
        await expect(accessControlTab.getUserRow(1).deleteBtn).toBeDisabled()

        await accessControlTab.getUserRow(1).adminChx.hover({ force: true })

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(NO_PERM_MANAGE_ROLES)

        await accessControlTab.getUserRow(1).deleteBtn.hover({ force: true })

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(NO_PERM_MANAGE_ROLES)
      })
    })

  test('[P-ACOG-01.2] Group. Owner. Create Group.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10547` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { createPackageDialog, versionPackagePage: versionPage } = portalPage
      const groupName = 'GRP-owner-created'
      const groupAlias = 'GOWNERC'

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

  test('[P-ACOG-01.3] Group. Owner. Edit Group.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10547` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { generalTab } = versionPage.packageSettingsPage
      const testGroup = GRP_P_OWNER_EDITING_N
      const changedName = 'GRP-owner-renamed'
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

  test('[P-ACOG-01.4] Group. Owner. Delete Group.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10547` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { generalTab } = versionPage.packageSettingsPage
      const testGroup = GRP_P_OWNER_DELETING_N

      await test.step('Open Group settings', async () => {
        await portalPage.gotoGroup(testGroup, SETTINGS_TAB_GENERAL)

        await expect(generalTab.groupName).toHaveText(testGroup.name)
      })

      await test.step('Delete Group', async () => {
        await generalTab.deleteBtn.click()
        await generalTab.deletePackageDialog.deleteBtn.click()

        await expect(generalTab.deletePackageDialog.deleteBtn).toBeHidden()
        await expect(portalPage.toolbar.title).toHaveText('Favorite')

        await portalPage.gotoGroup(crudGroup)

        await expect(portalPage.table.getRow(GRP_P_OWNER_EDITING_N)).toBeVisible()
        await expect(portalPage.table.getRow(testGroup)).toBeHidden()
      })
    })
})
