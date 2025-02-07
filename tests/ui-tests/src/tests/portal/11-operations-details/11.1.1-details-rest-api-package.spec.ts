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
import { VERSION_OPERATIONS_TAB_REST } from '@portal/entities'
import { PortalPage } from '@portal/pages/PortalPage'
import { OperationPage } from '@portal/pages/PortalPage/OperationPage'
import { getAuthDataFromPage } from '@services/auth'
import { expect } from '@services/expect-decorator'
import { JsonSchemaView } from '@shared/components/custom'
import {
  GET_PET_BY_TAG_V1,
  GET_SYSTEM_INFO,
  IMM_GR,
  P_PK_PGND,
  P_WS_MAIN_R,
  PK11,
  UPDATE_PET_V1,
  V_P_PKG_OPERATIONS_REST_R,
  V_P_PKG_PLAYGROUND_R,
} from '@test-data/portal'
import { SEARCH_TIMEOUT, TICKET_BASE_URL } from '@test-setup'
import { getPlaygroundCustomServer } from '@services/utils'

test.describe('11.1.1 Operations details REST API (Package)', () => {

  const testPackage = PK11
  const versionOperationsRest = V_P_PKG_OPERATIONS_REST_R
  const versionPlayground = V_P_PKG_PLAYGROUND_R

  test('[P-ODPOP-1] Operations details: Opening / Back navigation',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4534` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { operationsTab } = versionPage
      const { operationPage } = portalPage

      await portalPage.gotoVersion(versionOperationsRest, VERSION_OPERATIONS_TAB_REST)
      await operationsTab.table.getOperationRow(UPDATE_PET_V1).operationLink.click()

      await expect.soft(operationPage.toolbar.title).toContainText(UPDATE_PET_V1.title)
      await expect.soft(operationPage.docView).toBeVisible()

      await operationPage.toolbar.backBtn.click()

      await expect.soft(versionPage.operationsTab).toBeVisible()
      await expect.soft(operationsTab.table.getOperationRow(UPDATE_PET_V1)).toBeVisible()
    })

  test('[P-ODPOP-2] Operations details: Navigation through breadcrumbs',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4538` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { operationPage } = portalPage
      const testWorkspace = P_WS_MAIN_R
      const testGroup = IMM_GR

      await portalPage.gotoOperation(versionOperationsRest, UPDATE_PET_V1)
      await operationPage.toolbar.breadcrumbs.clickPackageVersionLink({
        pkg: testPackage,
        version: versionOperationsRest.version,
      })

      await expect.soft(versionPage.toolbar.title).toHaveText(testPackage.name)
      await expect.soft(versionPage.toolbar.versionSlt).toHaveText(versionOperationsRest.version)

      await portalPage.gotoOperation(versionOperationsRest, UPDATE_PET_V1)
      await operationPage.toolbar.breadcrumbs.clickWorkspaceLink(testWorkspace)

      await expect.soft(portalPage.toolbar.titleText).toHaveText(testWorkspace.name)
      await expect.soft(portalPage.table.getRow(testGroup)).toBeVisible()
    })

  test('[P-ODPVW-1] Operations details: Switching between Doc/Simple/Graph/Raw views',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4539` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { operationPage } = portalPage

      await portalPage.gotoOperation(versionOperationsRest, UPDATE_PET_V1)
      await operationPage.toolbar.simpleBtn.click()

      await expect.soft(operationPage.docView).toBeVisible()

      await operationPage.toolbar.graphBtn.click()

      await expect.soft(operationPage.graphView).toBeVisible()

      await operationPage.toolbar.rawBtn.click()

      await expect.soft(operationPage.rawView).toBeVisible()

      await operationPage.toolbar.docBtn.click()

      await expect.soft(operationPage.docView).toBeVisible()
    })

  test('[P-ODPVW-2] Operations details: Switching between YAML/JSON modes in Raw view',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4541` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { operationPage } = portalPage

      await portalPage.gotoOperation(versionOperationsRest, UPDATE_PET_V1)
      await operationPage.toolbar.rawBtn.click()
      await operationPage.rawView.jsonBtn.click()

      await expect.soft(operationPage.rawView).toContainText(UPDATE_PET_V1.testJsonString!)

      await operationPage.rawView.yamlBtn.click()

      await expect.soft(operationPage.rawView).toContainText(UPDATE_PET_V1.testYamlString!)
    })

  test('[P-ODPVW-3] Operations details: Checking Related Operations menu',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4542` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { operationPage } = portalPage
      const { operationSlt } = operationPage.toolbar

      await portalPage.gotoOperation(versionOperationsRest, UPDATE_PET_V1)

      await expect(operationPage.docView).toBeVisible()

      await operationSlt.click()

      await expect.soft(operationSlt.related.getOperationListItem(GET_PET_BY_TAG_V1)).toBeVisible()

      await portalPage.waitForTimeout(SEARCH_TIMEOUT.middle) //WA for collapse tag

      await operationSlt.related.getTagButton(GET_PET_BY_TAG_V1.tags).click()

      await expect.soft(operationSlt.related.getOperationListItem(GET_PET_BY_TAG_V1)).not.toBeVisible()

      await operationSlt.related.getTagButton(GET_PET_BY_TAG_V1.tags).click()
      await operationSlt.related.getOperationListItem(GET_PET_BY_TAG_V1).link.click()

      await expect.soft(operationPage.toolbar.title).toContainText(GET_PET_BY_TAG_V1.title)

      await operationSlt.click()

      await expect.soft(operationSlt.recent.getOperationListItem(UPDATE_PET_V1)).toBeVisible()
    })

  test('[P-ODPVW-4] Operations details: Checking Models sidebar',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4543` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { operationPage } = portalPage
      const schemaView = new JsonSchemaView(page)

      await portalPage.gotoOperation(versionOperationsRest, UPDATE_PET_V1)

      await expect.soft(operationPage.sidebar.getModelButton('Category')).not.toBeVisible()

      await operationPage.sidebar.getSectionButton('Request').expandBtn.click()

      await expect.soft(operationPage.sidebar.getModelButton('Category')).toBeVisible()

      await operationPage.sidebar.getModelButton('Category').click()

      await expect.soft(schemaView).not.toContainText('categoryobject<Category>')

      await operationPage.sidebar.getModelButton('Pet').click()

      await expect.soft(schemaView).toContainText('categoryobject<Category>')

      await operationPage.sidebar.getSectionButton('Request').collapseBtn.click()

      await expect.soft(operationPage.sidebar.getModelButton('Category')).not.toBeVisible()
    })

  test('[P-ODPVW-5] Operations details: Checking Dependant operations list',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6422` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { operationPage } = portalPage
      const { dependantOperationsWindow } = operationPage
      const pagePromise = page.context().waitForEvent('page')

      await portalPage.gotoOperation(versionOperationsRest, UPDATE_PET_V1)
      await operationPage.sidebar.getSectionButton('Request').expandBtn.click()
      await operationPage.sidebar.getModelButton('Pet').click()
      await operationPage.sidebar.getModelButton('Pet').actionMenu.click()
      await operationPage.sidebar.getModelButton('Pet').actionMenu.dependantOperationsItm.click()

      await expect.soft(dependantOperationsWindow.operationsList.getOperationListItem(GET_PET_BY_TAG_V1)).toBeVisible()

      await dependantOperationsWindow.operationsList.getTagButton(GET_PET_BY_TAG_V1.tags).click()

      await expect.soft(dependantOperationsWindow.operationsList.getOperationListItem(GET_PET_BY_TAG_V1)).not.toBeVisible()

      await dependantOperationsWindow.operationsList.getTagButton(GET_PET_BY_TAG_V1.tags).click()
      await dependantOperationsWindow.operationsList.getOperationListItem(GET_PET_BY_TAG_V1).link.click()

      const openedOperationPage = new OperationPage(await pagePromise)

      await expect.soft(openedOperationPage.toolbar.title).toContainText(GET_PET_BY_TAG_V1.title)

      await dependantOperationsWindow.closeBtn.click()

      await expect.soft(dependantOperationsWindow.operationsList.getOperationListItem(GET_PET_BY_TAG_V1)).not.toBeVisible()
    })

  test('[P-ODPPG-1] Operations details: Checking Playground',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4540` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { operationPage } = portalPage
      const accessToken = (await getAuthDataFromPage(page)).token
      const testPackage = P_PK_PGND

      await portalPage.gotoOperation(versionPlayground, GET_SYSTEM_INFO)
      await operationPage.toolbar.playgroundBtn.click()

      await test.step('Check servers list', async () => {
        await operationPage.playgroundPanel.serverSlt.click()

        await expect(operationPage.playgroundPanel.serverSlt.getListItem()).toHaveCount(4) //The "Add Custom Server" button is also a list item
        // Covering TestCase-B-1221
        await expect(operationPage.playgroundPanel.serverSlt.getListItem('Petstore server https://petstore.swagger.io/api/v1', { exact: false })).toBeVisible()
        await expect(operationPage.playgroundPanel.serverSlt.getListItem('Petstore server https://dev.petstore.swagger.io/api/v1', { exact: false })).toBeVisible()
        await expect(operationPage.playgroundPanel.serverSlt.getListItem('Petstore server https://test.petstore.swagger.io/api/v1', { exact: false })).toBeVisible()
      })

      await test.step('Add Custom servers', async () => {

        //Skipped because Agent is needed
        await test.step.skip('Add server with wrong namespace (negative)', async () => {
          await operationPage.playgroundPanel.serverSlt.addCustomServerBtn.click()
          await operationPage.playgroundPanel.addServerDialog.cloudAc.click()
          await operationPage.playgroundPanel.addServerDialog.cloudAc.getListItem('k8s-apps3').click()
          await operationPage.playgroundPanel.addServerDialog.namespaceAc.click()
          await operationPage.playgroundPanel.addServerDialog.namespaceAc.getListItem('api-hub-ci').click()

          await expect.soft(operationPage.playgroundPanel.addServerDialog.namespaceAc.errorMsg).toHaveText(`Service with ${testPackage.serviceName} not found in selected namespace`)
        })

        await test.step('Add server 1', async () => {
          await operationPage.playgroundPanel.serverSlt.addCustomServerBtn.click() //WA: remove after fix previous step
          await operationPage.playgroundPanel.addServerDialog.cloudAc.clear()
          await operationPage.playgroundPanel.addServerDialog.urlTxtFld.fill('https://api')
          await operationPage.playgroundPanel.addServerDialog.addBtn.click()
          await operationPage.playgroundPanel.serverSlt.click()

          await expect(operationPage.playgroundPanel.serverSlt.getListItem('Custom Server 1', { exact: false })).toBeVisible()
        })

        await test.step('Add server 2 and select it', async () => {
          await operationPage.playgroundPanel.serverSlt.addCustomServerBtn.click()
          await operationPage.playgroundPanel.addServerDialog.urlTxtFld.fill(getPlaygroundCustomServer())
          await operationPage.playgroundPanel.addServerDialog.addBtn.click()
          await operationPage.playgroundPanel.serverSlt.click()

          await expect(operationPage.playgroundPanel.serverSlt.getListItem('Custom Server 1', { exact: false })).toBeVisible() //Cover TestCase-A-4737
          await expect(operationPage.playgroundPanel.serverSlt.getListItem('Custom Server 2', { exact: false })).toBeVisible()

          await operationPage.playgroundPanel.serverSlt.getListItem('Custom Server 2', { exact: false }).click()
        })
      })

      await test.step('Send request without token (negative)', async () => {
        await operationPage.playgroundPanel.sendBtn.click()

        await expect(operationPage.playgroundPanel).toContainText('"message": "Unauthorized",')
      })

      await test.step('Send request with token', async () => {
        await operationPage.playgroundPanel.tokenTxtFld.fill(accessToken)

        await operationPage.playgroundPanel.sendBtn.click()

        await expect(operationPage.playgroundPanel).toContainText('"backendVersion"')
      })

      await test.step('Close Playground', async () => {
        await operationPage.toolbar.playgroundBtn.click()
        await expect(operationPage.playgroundPanel).not.toBeVisible()
      })
    })

  test('[P-ODPEX-1] Operations details: Checking Examples',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6423` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-1115` }],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { operationPage } = portalPage
      const { examplesPanel } = operationPage

      await portalPage.gotoOperation(versionOperationsRest, UPDATE_PET_V1)
      await operationPage.toolbar.examplesBtn.click()

      await expect.soft(examplesPanel.exampleSlt).toBeVisible()
      await expect.soft(examplesPanel.generateBtn).toBeVisible()

      await examplesPanel.responseTabBtn.click()

      await expect.soft(examplesPanel.getCodeButton(200)).toBeVisible()
      // await expect.soft(examplesPanel).toContainText(UPDATE_PET_V1.testExampleString!) //TODO monaco initializing error for CI

      await examplesPanel.getCodeButton(404).click()

      await expect.soft(examplesPanel).not.toContainText(UPDATE_PET_V1.testExampleString!) //TODO monaco initializing error for CI

      await examplesPanel.requestTabBtn.click()

      // await expect.soft(examplesPanel).toContainText(UPDATE_PET_V1.testExampleString!) //TODO monaco initializing error for CI

      await examplesPanel.fullScreenBtn.click()
      await examplesPanel.closeFullScreenBtn.click({ position: { x: 1, y: 1 } }) //TODO TestCase-B-1115
      await operationPage.toolbar.examplesBtn.click()

      await expect.soft(examplesPanel).not.toBeVisible()
    })
})
