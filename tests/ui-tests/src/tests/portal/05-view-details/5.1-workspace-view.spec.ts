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
import { SEARCH_TIMEOUT, TICKET_BASE_URL } from '@test-setup'
import { TEST_PREFIX } from '@test-data'
import {
  DSH_P_HIERARCHY_BREAKING_R,
  GRP_P_HIERARCHY_R,
  IMM_GR,
  P_WS_MAIN_R,
  PKG_P_HIERARCHY_BREAKING_R,
  V_P_DSH_HIERARCHY_BREAKING_CHANGED_R,
  V_P_DSH_HIERARCHY_NO_CHANGES_CHANGED_R,
  V_P_DSH_HIERARCHY_NON_BREAKING_CHANGED_R,
  V_P_PKG_HIERARCHY_BREAKING_CHANGED_R,
  V_P_PKG_HIERARCHY_NO_CHANGES_CHANGED_R,
  V_P_PKG_HIERARCHY_NON_BREAKING_CHANGED_R,
} from '@test-data/portal'

test.describe('5.1 Workspace view (packages list)', () => {

  const testWorkspace = P_WS_MAIN_R

  test('[P-WSVOP-1] Opening workspace view from the Workspaces page',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4592` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)

      await portalPage.goto()
      await portalPage.sidebar.workspacesBtn.click()

      await expect.soft(portalPage.toolbar.title).toHaveText('Workspaces')

      await portalPage.table.openPackage(testWorkspace)

      await expect(portalPage.toolbar.titleText).toHaveText(testWorkspace.name)
      await expect(portalPage.toolbar.searchbar).toBeVisible()
      await expect(portalPage.toolbar.treeViewButton).toBeVisible()
      await expect(portalPage.toolbar.listViewButton).toBeVisible()
      await expect(portalPage.toolbar.createPackageMenu).toBeVisible()
      await expect(portalPage.table.getRow(IMM_GR)).toBeVisible()
    })

  test('[P-WSVOP-2] Opening workspace view from the Favorite workspaces on the sidebar',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4593` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)

      await portalPage.goto()
      await portalPage.sidebar.getWorkspaceButton(testWorkspace).click()

      await expect(portalPage.toolbar.titleText).toHaveText(testWorkspace.name)
      await expect(portalPage.table.getRow(IMM_GR)).toBeVisible()
    })

  test('[P-WSVIW-1] Viewing packages in Hierarchy',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-1413` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const versionPkgBreaking = V_P_PKG_HIERARCHY_BREAKING_CHANGED_R
      const versionPkgNonBreaking = V_P_PKG_HIERARCHY_NON_BREAKING_CHANGED_R
      const versionPkgNoChanges = V_P_PKG_HIERARCHY_NO_CHANGES_CHANGED_R
      const versionDshBreaking = V_P_DSH_HIERARCHY_BREAKING_CHANGED_R
      const versionDshNonBreaking = V_P_DSH_HIERARCHY_NON_BREAKING_CHANGED_R
      const versionDshNoChanges = V_P_DSH_HIERARCHY_NO_CHANGES_CHANGED_R
      const breakingPackage = PKG_P_HIERARCHY_BREAKING_R

      await portalPage.gotoWorkspace(testWorkspace)
      await portalPage.table.expandGroup(IMM_GR)
      await portalPage.table.expandGroup(GRP_P_HIERARCHY_R)

      await expect(portalPage.table.getRow(versionPkgBreaking.pkg).nameCell).toHaveText(breakingPackage.name)
      await expect(portalPage.table.getRow(versionPkgBreaking.pkg).serviceNameCell).toHaveText(breakingPackage.serviceName!)
      await expect(portalPage.table.getRow(versionPkgBreaking.pkg).lastReleaseCell).toHaveText(versionPkgBreaking.version)
      await expect(portalPage.table.getRow(versionPkgBreaking.pkg).bwcStatusCell).toHaveIcon('CancelIcon')
      await expect(portalPage.table.getRow(versionPkgBreaking.pkg).bwcStatusCell).toHaveText('3')
      await expect(portalPage.table.getRow(versionPkgNonBreaking.pkg).lastReleaseCell).toHaveText(versionPkgNonBreaking.version)
      await expect(portalPage.table.getRow(versionPkgNonBreaking.pkg).bwcStatusCell).toHaveIcon('ErrorRoundedIcon')
      await expect(portalPage.table.getRow(versionPkgNonBreaking.pkg).bwcStatusCell).toHaveText('1')
      await expect(portalPage.table.getRow(versionPkgNoChanges.pkg).lastReleaseCell).toHaveText(versionPkgNoChanges.version)
      await expect(portalPage.table.getRow(versionPkgNoChanges.pkg).bwcStatusCell).toHaveIcon('CheckCircleRoundedIcon')
      await expect(portalPage.table.getRow(versionPkgNoChanges.pkg).bwcStatusCell).toHaveText('0')

      await expect(portalPage.table.getRow(versionDshBreaking.pkg).lastReleaseCell).toHaveText(versionDshBreaking.version)
      await expect(portalPage.table.getRow(versionDshBreaking.pkg).bwcStatusCell).toHaveIcon('CancelIcon')
      await expect(portalPage.table.getRow(versionDshBreaking.pkg).bwcStatusCell).toHaveText('3')
      await expect(portalPage.table.getRow(versionDshNonBreaking.pkg).lastReleaseCell).toHaveText(versionDshNonBreaking.version)
      await expect(portalPage.table.getRow(versionDshNonBreaking.pkg).bwcStatusCell).toHaveIcon('ErrorRoundedIcon')
      await expect(portalPage.table.getRow(versionDshNonBreaking.pkg).bwcStatusCell).toHaveText('1')
      await expect(portalPage.table.getRow(versionDshNoChanges.pkg).lastReleaseCell).toHaveText(versionDshNoChanges.version)
      await expect(portalPage.table.getRow(versionDshNoChanges.pkg).bwcStatusCell).toHaveIcon('CheckCircleRoundedIcon')
      await expect(portalPage.table.getRow(versionDshNoChanges.pkg).bwcStatusCell).toHaveText('0')
    })

  test('[P-WSVIW-2] Viewing packages in Flat list',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4457` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const versionPkgBreaking = V_P_PKG_HIERARCHY_BREAKING_CHANGED_R
      const versionPkgNonBreaking = V_P_PKG_HIERARCHY_NON_BREAKING_CHANGED_R
      const versionPkgNoChanges = V_P_PKG_HIERARCHY_NO_CHANGES_CHANGED_R
      const versionDshBreaking = V_P_DSH_HIERARCHY_BREAKING_CHANGED_R
      const versionDshNonBreaking = V_P_DSH_HIERARCHY_NON_BREAKING_CHANGED_R
      const versionDshNoChanges = V_P_DSH_HIERARCHY_NO_CHANGES_CHANGED_R
      const breakingPackage = PKG_P_HIERARCHY_BREAKING_R
      const breakingDashboard = DSH_P_HIERARCHY_BREAKING_R

      await portalPage.gotoWorkspace(testWorkspace)
      await portalPage.toolbar.listViewButton.click()

      await expect(portalPage.table.getRow(versionPkgBreaking.pkg).nameCell).toHaveText(breakingPackage.name)
      await expect(portalPage.table.getRow(versionPkgBreaking.pkg).serviceNameCell).toHaveText(breakingPackage.serviceName!)
      await expect(portalPage.table.getRow(versionPkgBreaking.pkg).lastReleaseCell).toHaveText(versionPkgBreaking.version)
      await expect(portalPage.table.getRow(versionPkgBreaking.pkg).bwcStatusCell).toHaveIcon('CancelIcon')
      await expect(portalPage.table.getRow(versionPkgBreaking.pkg).bwcStatusCell).toHaveText('3')
      await expect(portalPage.table.getRow(versionPkgBreaking.pkg).groupCell).toHaveText(PKG_P_HIERARCHY_BREAKING_R.parentPath!)
      await expect(portalPage.table.getRow(versionPkgNonBreaking.pkg).lastReleaseCell).toHaveText(versionPkgNonBreaking.version)
      await expect(portalPage.table.getRow(versionPkgNonBreaking.pkg).bwcStatusCell).toHaveIcon('ErrorRoundedIcon')
      await expect(portalPage.table.getRow(versionPkgNonBreaking.pkg).bwcStatusCell).toHaveText('1')
      await expect(portalPage.table.getRow(versionPkgNoChanges.pkg).lastReleaseCell).toHaveText(versionPkgNoChanges.version)
      await expect(portalPage.table.getRow(versionPkgNoChanges.pkg).bwcStatusCell).toHaveIcon('CheckCircleRoundedIcon')
      await expect(portalPage.table.getRow(versionPkgNoChanges.pkg).bwcStatusCell).toHaveText('0')

      await expect(portalPage.table.getRow(versionDshBreaking.pkg).lastReleaseCell).toHaveText(versionDshBreaking.version)
      await expect(portalPage.table.getRow(versionPkgBreaking.pkg).bwcStatusCell).toHaveIcon('CancelIcon')
      await expect(portalPage.table.getRow(versionPkgBreaking.pkg).bwcStatusCell).toHaveText('3')
      await expect(portalPage.table.getRow(versionPkgBreaking.pkg).groupCell).toHaveText(breakingDashboard.parentPath!)
      await expect(portalPage.table.getRow(versionDshNonBreaking.pkg).lastReleaseCell).toHaveText(versionDshNonBreaking.version)
      await expect(portalPage.table.getRow(versionDshNonBreaking.pkg).bwcStatusCell).toHaveIcon('ErrorRoundedIcon')
      await expect(portalPage.table.getRow(versionDshNonBreaking.pkg).bwcStatusCell).toHaveText('1')
      await expect(portalPage.table.getRow(versionDshNoChanges.pkg).lastReleaseCell).toHaveText(versionDshNoChanges.version)
      await expect(portalPage.table.getRow(versionDshNoChanges.pkg).bwcStatusCell).toHaveIcon('CheckCircleRoundedIcon')
      await expect(portalPage.table.getRow(versionDshNoChanges.pkg).bwcStatusCell).toHaveText('0')

      await expect(portalPage.table.getRow(IMM_GR)).toBeHidden()
    })

  test('[P-WSVSE-1] Search packages in Hierarchy',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4458` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)

      await portalPage.gotoWorkspace(P_WS_MAIN_R)

      await test.step('Search Package by Name', async () => {
        await portalPage.toolbar.searchbar.fill(PKG_P_HIERARCHY_BREAKING_R.name)

        await expect.soft(portalPage.table.getRow()).toHaveCount(1)
        await expect.soft(portalPage.table.getRow(PKG_P_HIERARCHY_BREAKING_R)).toBeVisible()
      })

      await test.step('Search Package by ID', async () => {
        await portalPage.toolbar.searchbar.clear()
        await portalPage.waitForTimeout(SEARCH_TIMEOUT.middle)
        await portalPage.toolbar.treeViewButton.click()
        await portalPage.toolbar.searchbar.fill(PKG_P_HIERARCHY_BREAKING_R.packageId)

        await expect(portalPage.table.getRow()).toHaveCount(1)
        await expect(portalPage.table.getRow(PKG_P_HIERARCHY_BREAKING_R)).toBeVisible()
      })
    })

  test('[P-WSVSE-2] Search packages in Flat list',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4459` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)

      await portalPage.gotoGroup(GRP_P_HIERARCHY_R)
      await portalPage.toolbar.listViewButton.click()

      await test.step('Search Package by Name', async () => {

        await test.step('Part of a word', async () => {
          await portalPage.toolbar.searchbar.fill(TEST_PREFIX)

          await expect.soft(portalPage.table.getRow()).toHaveCount(6)
        })

        await test.step('Adding part of a word', async () => {
          await portalPage.toolbar.searchbar.type('PKG-Breaking')

          await expect.soft(portalPage.table.getRow()).toHaveCount(1)
          await expect.soft(portalPage.table.getRow(PKG_P_HIERARCHY_BREAKING_R)).toBeVisible()
        })

        await test.step('Clearing a search query', async () => {
          await portalPage.toolbar.searchbar.clear()

          await expect.soft(portalPage.table.getRow()).toHaveCount(6)
        })

        await test.step('Case sensitive', async () => {
          await portalPage.toolbar.searchbar.clear()
          await portalPage.toolbar.searchbar.fill(PKG_P_HIERARCHY_BREAKING_R.name.toLowerCase())

          await expect.soft(portalPage.table.getRow()).toHaveCount(1)
        })

        await test.step('Invalid search query with valid substring', async () => {
          await portalPage.toolbar.searchbar.clear()
          await portalPage.toolbar.searchbar.fill(`${PKG_P_HIERARCHY_BREAKING_R.name}123`)

          await expect.soft(portalPage.table.getRow()).toHaveCount(0)
        })
      })

      await test.step('Search Package by ID', async () => {

        await test.step('Part of a word', async () => {
          await portalPage.toolbar.searchbar.clear()
          await portalPage.toolbar.searchbar.fill(P_WS_MAIN_R.alias)
          await portalPage.waitForTimeout(SEARCH_TIMEOUT.middle)

          await expect.soft(portalPage.table.getRow()).toHaveCount(6)
        })

        await test.step('Adding part of a word', async () => {
          await portalPage.toolbar.searchbar.type(`.${IMM_GR.alias}.${GRP_P_HIERARCHY_R.alias}.${PKG_P_HIERARCHY_BREAKING_R.alias}`)

          await expect.soft(portalPage.table.getRow()).toHaveCount(1)
          await expect.soft(portalPage.table.getRow(PKG_P_HIERARCHY_BREAKING_R)).toBeVisible()
        })

        await test.step('Clearing a search query', async () => {
          await portalPage.toolbar.searchbar.clear()

          await expect.soft(portalPage.table.getRow()).toHaveCount(6)
        })

        await test.step('Case sensitive', async () => {
          await portalPage.toolbar.searchbar.clear()
          await portalPage.toolbar.searchbar.fill(PKG_P_HIERARCHY_BREAKING_R.packageId.toLowerCase())

          await expect.soft(portalPage.table.getRow()).toHaveCount(1)
        })

        await test.step('Invalid search query with valid substring', async () => {
          await portalPage.toolbar.searchbar.clear()
          await portalPage.toolbar.searchbar.fill(`${PKG_P_HIERARCHY_BREAKING_R.packageId}123`)

          await expect.soft(portalPage.table.getRow()).toHaveCount(0)
        })
      })
    })

  test('[P-GRVIW-4] Navigation through breadcrumbs on the Group page',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4517` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const testGroup = IMM_GR

      await portalPage.gotoGroup(testGroup)
      await versionPage.toolbar.breadcrumbs.clickWorkspaceLink(testWorkspace)

      await expect.soft(portalPage.toolbar.titleText).toHaveText(testWorkspace.name)
      await expect.soft(portalPage.table.getRow(testGroup)).toBeVisible()
    })

  test('[P-WSVIW-3] Viewing "Workspaces" page',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8708` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)

      await portalPage.goto()
      await portalPage.sidebar.workspacesBtn.click()

      await expect.soft(portalPage.toolbar.searchbar).toBeVisible()
      await expect.soft(portalPage.toolbar.createWorkspaceBtn).toBeVisible()
      await expect(portalPage.table.getRow(testWorkspace)).toBeVisible()
      await expect.soft(portalPage.table.getRow(testWorkspace).favoriteBtn).toBeVisible()
      await expect.soft(portalPage.table.getRow(testWorkspace).nameCell).toHaveText(testWorkspace.name)
      await expect.soft(portalPage.table.getRow(testWorkspace).idCell).toHaveText(testWorkspace.packageId)
      await expect.soft(portalPage.table.getRow(testWorkspace).descriptionCell).toHaveText(testWorkspace.description!)
      await expect.soft(portalPage.table.getRow(testWorkspace).serviceNameCell).not.toBeVisible()
      await expect.soft(portalPage.table.getRow(testWorkspace).lastReleaseCell).not.toBeVisible()
      await expect.soft(portalPage.table.getRow(testWorkspace).bwcStatusCell).not.toBeVisible()
    })
})
