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
import { SEARCH_TIMEOUT, TICKET_BASE_URL } from '@test-setup'
import {
  GRP_P_HIERARCHY_R,
  IMM_GR,
  P_WS_MAIN_R,
  PK11,
  PKG_P_HIERARCHY_BREAKING_R,
  V_P_PKG_ARCHIVED_R,
  V_P_PKG_CHANGELOG_MULTI_DEL_GQL_R,
  V_P_PKG_CHANGELOG_REST_ANNOTUNCLAS_R,
  V_P_PKG_DRAFT_R,
  V_P_PKG_OPERATIONS_REST_R,
  V_P_PKG_OVERVIEW_R,
  V_P_PKG_WITHOUT_LABELS_R,
} from '@test-data/portal'
import { SYSADMIN } from '@test-data'
import { isDevProxyMode } from '@services/utils'

test.describe('5.2.1 Package details', () => {

  test('[P-PKDTO-1] Opening Package from workspace page in tree view',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-1419` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab } = versionPage
      const testLabels = V_P_PKG_OVERVIEW_R.metadata!.versionLabels!.reduce((result, label) => {
        result += label
        return result
      }, '')

      await portalPage.goto()
      await portalPage.sidebar.getWorkspaceButton(P_WS_MAIN_R).click()
      await portalPage.table.expandGroup(IMM_GR)
      await portalPage.table.openPackage(PK11)

      await expect.soft(versionPage.toolbar.title).toHaveText(PK11.name)
      await expect.soft(versionPage.toolbar.breadcrumbs).toBeVisible()
      await expect.soft(versionPage.toolbar.versionSlt).toBeVisible()
      await expect.soft(versionPage.toolbar.status).toHaveText(V_P_PKG_OVERVIEW_R.status)
      await expect.soft(versionPage.toolbar.exportBtn).toBeVisible()
      await expect.soft(versionPage.toolbar.compareMenu).toBeVisible()
      await expect.soft(versionPage.toolbar.settingsBtn).toBeVisible()
      await expect.soft(versionPage.overviewTab).toBeVisible()
      await expect.soft(versionPage.operationsTab).toBeVisible()
      await expect.soft(versionPage.deprecatedTab).toBeVisible()
      await expect.soft(versionPage.apiChangesTab).toBeVisible()
      await expect.soft(versionPage.documentsTab).toBeVisible()
      await expect.soft(versionPage.sidebar.expandBtn).toBeVisible()
      await expect.soft(overviewTab.summaryTab).toBeVisible()
      // TODO Move to another test
      await expect.soft(overviewTab.summaryTab.body.labels).toHaveText(testLabels)
      await expect.soft(overviewTab.summaryTab.body.summary.currentVersion).toHaveText(V_P_PKG_OVERVIEW_R.version)
      await expect.soft(overviewTab.summaryTab.body.summary.revision).toHaveText('2')
      await expect.soft(overviewTab.summaryTab.body.summary.previousVersion).toHaveText(V_P_PKG_OVERVIEW_R.previousVersion!)
      await expect.soft(overviewTab.summaryTab.body.summary.publishedBy).toHaveText(SYSADMIN.name)
      await expect.soft(overviewTab.summaryTab.body.summary.publicationDate).not.toBeEmpty()
    })

  test('[P-PKDTO-2] Navigation through breadcrumbs on the Package details page',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4526` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const testWorkspace = P_WS_MAIN_R
      const testGroup = GRP_P_HIERARCHY_R
      const testPackage = PKG_P_HIERARCHY_BREAKING_R

      await portalPage.gotoPackage(testPackage)
      await versionPage.toolbar.breadcrumbs.clickGroupLink(testGroup)

      await expect.soft(portalPage.toolbar.titleText).toHaveText(testGroup.name)
      await expect.soft(portalPage.table.getRow(testPackage)).toBeVisible()

      await portalPage.gotoPackage(testPackage)
      await versionPage.toolbar.breadcrumbs.clickWorkspaceLink(testWorkspace)

      await expect.soft(portalPage.toolbar.titleText).toHaveText(testWorkspace.name)
      await expect.soft(portalPage.table.getRow(IMM_GR)).toBeVisible()
    })

  test.skip('[P-PKDTO-3.1] Viewing Validations in the Version summary',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4865` },
        { type: 'Issue', description: 'Need to rework' },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab } = versionPage

      await portalPage.gotoPackage(PK11)

      await test.step('Viewing REST API Validations', async () => {
        await expect.soft(overviewTab.summaryTab.body.restApi.operations).toHaveText('19')
        await expect.soft(overviewTab.summaryTab.body.restApi.deprecatedOperations).toHaveText('2')
        await expect.soft(overviewTab.summaryTab.body.restApi.noBwcOperations).toHaveText('3')
        await expect.soft(overviewTab.summaryTab.body.restApi.bwcErrors).toHaveText('2')
        await expect.soft(overviewTab.summaryTab.body.restApi.breakingChanges).toHaveText('2')
        await expect.soft(overviewTab.summaryTab.body.restApi.semiBreakingChanges).toHaveText('2')
        await expect.soft(overviewTab.summaryTab.body.restApi.deprecatedChanges).toHaveText('2')
        await expect.soft(overviewTab.summaryTab.body.restApi.nonBreakingChanges).toHaveText('2')
        await expect.soft(overviewTab.summaryTab.body.restApi.annotationChanges).toHaveText('1')
        await expect.soft(overviewTab.summaryTab.body.restApi.unclassifiedChanges).toHaveText('1')
      })

      await test.step('Viewing GraphQL Validations', async () => {
        await expect.soft(overviewTab.summaryTab.body.graphQl.operations).toHaveText('4')
        await expect.soft(overviewTab.summaryTab.body.graphQl.deprecatedOperations).toHaveText('1')
        await expect.soft(overviewTab.summaryTab.body.graphQl.noBwcOperations).toHaveText('0')
        await expect.soft(overviewTab.summaryTab.body.graphQl.bwcErrors).toHaveText('1')
        await expect.soft(overviewTab.summaryTab.body.graphQl.breakingChanges).toHaveText('1')
        await expect.soft(overviewTab.summaryTab.body.graphQl.deprecatedChanges).toHaveText('0')
        await expect.soft(overviewTab.summaryTab.body.graphQl.nonBreakingChanges).toHaveText('0')
      })
    })

  test.skip('[P-PKDTO-3.2] Viewing Validations if all operations were removed',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4865` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-1242` },
        { type: 'Issue', description: 'Need to rework' },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab } = versionPage

      await portalPage.gotoVersion(V_P_PKG_CHANGELOG_MULTI_DEL_GQL_R)

      await test.step('Viewing REST API Validations', async () => {
        await expect.soft(overviewTab.summaryTab.body.restApi.operations).toHaveText('19')
        await expect.soft(overviewTab.summaryTab.body.restApi.deprecatedOperations).toHaveText('1')
        await expect.soft(overviewTab.summaryTab.body.restApi.noBwcOperations).toHaveText('3')
        await expect.soft(overviewTab.summaryTab.body.restApi.bwcErrors).toHaveText('0')
        await expect.soft(overviewTab.summaryTab.body.restApi.breakingChanges).toHaveText('0')
        await expect.soft(overviewTab.summaryTab.body.restApi.semiBreakingChanges).toHaveText('0')
        await expect.soft(overviewTab.summaryTab.body.restApi.deprecatedChanges).toHaveText('0')
        await expect.soft(overviewTab.summaryTab.body.restApi.nonBreakingChanges).toHaveText('0')
        await expect.soft(overviewTab.summaryTab.body.restApi.annotationChanges).toHaveText('0')
        await expect.soft(overviewTab.summaryTab.body.restApi.unclassifiedChanges).toHaveText('0')
      })

      await test.step('Viewing GraphQL Validations', async () => {
        // await expect.soft(overviewTab.summaryTab.body.graphQl.operations).toHaveText('0') //Issue TestCase-B-1242
        // await expect.soft(overviewTab.summaryTab.body.graphQl.deprecatedOperations).toHaveText('0')
        // await expect.soft(overviewTab.summaryTab.body.graphQl.noBwcOperations).toHaveText('0')
        await expect.soft(overviewTab.summaryTab.body.graphQl.bwcErrors).toHaveText('5')
        await expect.soft(overviewTab.summaryTab.body.graphQl.breakingChanges).toHaveText('5')
        await expect.soft(overviewTab.summaryTab.body.graphQl.deprecatedChanges).toHaveText('0')
        await expect.soft(overviewTab.summaryTab.body.graphQl.nonBreakingChanges).toHaveText('0')
      })
    })

  test.skip('[P-PKDTO-4] Opening a Packages Summary page with Annotation/Unclassified changes only',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-9621` },
        { type: 'Issue', description: 'Need to rework' },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab } = versionPage

      await portalPage.gotoVersion(V_P_PKG_CHANGELOG_REST_ANNOTUNCLAS_R)

      await expect.soft(overviewTab.summaryTab.body.restApi.breakingChanges).toHaveText('0')
      await expect.soft(overviewTab.summaryTab.body.restApi.semiBreakingChanges).toHaveText('0')
      await expect.soft(overviewTab.summaryTab.body.restApi.deprecatedChanges).toHaveText('0')
      await expect.soft(overviewTab.summaryTab.body.restApi.nonBreakingChanges).toHaveText('0')
      await expect.soft(overviewTab.summaryTab.body.restApi.annotationChanges).toHaveText('1')
      await expect.soft(overviewTab.summaryTab.body.restApi.unclassifiedChanges).toHaveText('1')
    })

  test('[P-PKDTL-1] Expand/collapse the Package page sidebar',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4655` },
    },
    async ({ sysadminPage: page }) => {
      test.skip(isDevProxyMode(), 'Does not support dev proxy')

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage

      await portalPage.gotoPackage(PK11)

      await expect(versionPage.overviewTab).not.toHaveText(versionPage.overviewTab.componentName!)

      await versionPage.sidebar.expandBtn.click()

      await expect(versionPage.overviewTab).toHaveText(versionPage.overviewTab.componentName!)

      await versionPage.operationsTab.click()

      await expect(versionPage.operationsTab.toolbar.searchbar).toBeVisible()
      await expect(versionPage.overviewTab).toHaveText(versionPage.overviewTab.componentName!)

      await versionPage.documentsTab.click()

      await expect(versionPage.documentsTab.sidebar.searchbar).toBeVisible()
      await expect(versionPage.overviewTab).toHaveText(versionPage.overviewTab.componentName!)

      await versionPage.sidebar.collapseBtn.click()

      await expect(versionPage.overviewTab).not.toHaveText(versionPage.overviewTab.componentName!)

      await versionPage.operationsTab.click()

      await expect(versionPage.operationsTab.toolbar.searchbar).toBeVisible()
      await expect(versionPage.overviewTab).not.toHaveText(versionPage.overviewTab.componentName!)

      await versionPage.overviewTab.click()

      await expect(versionPage.overviewTab.summaryTab.body.summary.currentVersion).toBeVisible()
      await expect(versionPage.overviewTab).not.toHaveText(versionPage.overviewTab.componentName!)
    })

  test('[P-PKDTL-2] Exporting a Version (zip)',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4462` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { version } = V_P_PKG_OVERVIEW_R

      await portalPage.gotoPackage(PK11)

      const file = await versionPage.exportVersion()

      await expectFile(file).toHaveName(`${PK11.name}_${version}.zip`)
    })

  test('[P-PKDTV-1] View Versions selector',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4463` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { versionSlt } = versionPage.toolbar
      const standardLabels = V_P_PKG_OPERATIONS_REST_R.metadata!.versionLabels!.reduce((result, label) => {
        result += label
        return result
      }, '')
      const draftLabels = V_P_PKG_DRAFT_R.metadata!.versionLabels!.reduce((result, label) => {
        result += label
        return result
      }, '')
      const archivedLabels = V_P_PKG_ARCHIVED_R.metadata!.versionLabels!.reduce((result, label) => {
        result += label
        return result
      }, '')

      await portalPage.gotoPackage(PK11)
      await versionSlt.click()

      await expect.soft(versionSlt.releaseBtn).toBeVisible()
      // await expect.soft(versionSlt.releaseCandidateBtn).toBeVisible()
      await expect.soft(versionSlt.draftBtn).toBeVisible()
      // await expect.soft(versionSlt.deprecatedBtn).toBeVisible()
      await expect.soft(versionSlt.archivedBtn).toBeVisible()
      await expect.soft(versionSlt.getVersionRow(V_P_PKG_OPERATIONS_REST_R.version).publicationDateCell).not.toBeEmpty()
      await expect.soft(versionSlt.getVersionRow(V_P_PKG_OPERATIONS_REST_R.version).labelsCell).toHaveText(standardLabels)

      await versionPage.toolbar.versionSlt.draftBtn.click()
      await expect.soft(versionSlt.getVersionRow(V_P_PKG_DRAFT_R.version).publicationDateCell).not.toBeEmpty()
      await expect.soft(versionSlt.getVersionRow(V_P_PKG_DRAFT_R.version).labelsCell).toHaveText(draftLabels)
      await expect.soft(versionSlt.getVersionRow(V_P_PKG_WITHOUT_LABELS_R.version).labelsCell).toBeEmpty()

      await versionPage.toolbar.versionSlt.archivedBtn.click()
      await expect.soft(versionSlt.getVersionRow(V_P_PKG_ARCHIVED_R.version).publicationDateCell).not.toBeEmpty()
      await expect.soft(versionSlt.getVersionRow(V_P_PKG_ARCHIVED_R.version).labelsCell).toHaveText(archivedLabels)
    })

  test('[P-PKDTV-2] Search Version in the Versions selector',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-1842` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { versionSlt } = versionPage.toolbar

      await portalPage.gotoPackage(PK11)
      await versionSlt.click()

      await test.step('Search by Version', async () => {

        await test.step('Part of a word', async () => {
          await versionSlt.searchbar.fill('222')

          await expect.soft(versionSlt.getVersionRow()).toHaveCount(3)
        })

        await test.step('Adding part of a word', async () => {
          await versionSlt.searchbar.type('0.1')

          await expect.soft(versionSlt.getVersionRow()).toHaveCount(1)
          await expect.soft(versionSlt.getVersionRow('2220.1')).toBeVisible()
        })

        await test.step('Clearing a search query', async () => {
          await versionSlt.searchbar.clear()

          await expect.soft(versionSlt.getVersionRow()).toHaveCount(9)
        })

        await test.step('Invalid search query with valid substring', async () => {
          await versionSlt.searchbar.clear()
          await versionSlt.searchbar.fill('2220.1123')

          await expect.soft(versionSlt.getVersionRow()).toHaveCount(0)
        })

        await test.step('Case sensitive', async () => {
          await versionSlt.searchbar.clear()
          await versionSlt.draftBtn.click()
          await versionSlt.searchbar.fill('Test-Draft')

          await expect.soft(versionSlt.getVersionRow()).toHaveCount(1)
        })
      })

      await test.step('Search by Label', async () => {

        await test.step('Part of a word', async () => {
          await versionSlt.searchbar.clear()
          await versionSlt.releaseBtn.click()
          await versionSlt.searchbar.fill('Pack')

          await expect.soft(versionSlt.getVersionRow()).toHaveCount(3)
        })

        await test.step('Adding part of a word', async () => {
          await versionSlt.searchbar.type('age')
          await portalPage.waitForTimeout(SEARCH_TIMEOUT.middle)

          await expect.soft(versionSlt.getVersionRow()).toHaveCount(3)
        })

        await test.step('Two words', async () => {
          await versionSlt.searchbar.clear()
          await versionSlt.searchbar.fill('Package Rest')

          await expect.soft(versionSlt.getVersionRow()).toHaveCount(1)
          await expect.soft(versionSlt.getVersionRow(V_P_PKG_OPERATIONS_REST_R.version)).toBeVisible()
        })

        await test.step('Case sensitive', async () => {
          await versionSlt.searchbar.clear()

          await expect(versionSlt.getVersionRow()).toHaveCount(9)

          await versionSlt.searchbar.fill('package rest')

          await expect.soft(versionSlt.getVersionRow()).toHaveCount(1)
        })

        await test.step('Invalid search query with valid substring', async () => {
          await versionSlt.searchbar.clear()
          await versionSlt.searchbar.fill('Package Rest123')

          await expect.soft(versionSlt.getVersionRow()).toHaveCount(0)
        })
      })

      await test.step('Search by Label which presents in different tabs', async () => {
        await versionSlt.searchbar.clear()

        await expect(versionSlt.getVersionRow()).toHaveCount(9)

        await versionSlt.searchbar.fill('ATUI')

        await expect.soft(versionSlt.getVersionRow()).toHaveCount(3)
        await expect.soft(versionSlt.getVersionRow(V_P_PKG_OPERATIONS_REST_R.version)).toBeVisible()
      })
    })

  test('[P-PKDTV-3] Opening Version from the Versions selector',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4461` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { versionSlt } = versionPage.toolbar

      await portalPage.gotoPackage(PK11)
      await versionSlt.click()
      await versionSlt.draftBtn.click()
      await versionSlt.getVersionRow(V_P_PKG_DRAFT_R.version).click()

      await expect.soft(versionPage.toolbar.versionSlt).toHaveText(V_P_PKG_DRAFT_R.version)
      await expect.soft(versionPage.overviewTab.summaryTab.body.summary.currentVersion).toHaveText(V_P_PKG_DRAFT_R.version)
    })
})
