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

import { AgentPage } from '@agent/pages'
import { test } from '@fixtures'
import { PortalPage } from '@portal/pages/PortalPage'
import { expect } from '@services/expect-decorator'
import { FILE_ICON, GRAPHQL_ICON, MARKDOWN_ICON, OPENAPI_ICON, SWAGGER_ICON } from '@shared/entities'
import {
  CONFIG_PKG_RESTORE_FILE_TOOLTIP,
  CONFIG_PKG_VERSION_TOOLTIP,
  FILE_P_ARCHIVE,
  FILE_P_GQL_SMALL,
  FILE_P_JSON_SCHEMA_JSON,
  FILE_P_JSON_SCHEMA_YAML,
  FILE_P_MARKDOWN,
  FILE_P_MSOFFICE,
  FILE_P_PETSTORE20,
  FILE_P_PETSTORE30,
  FILE_P_PETSTORE30_CHANGED,
  FILE_P_PETSTORE31,
  FILE_P_PICTURE,
  PK_PUB_IMM_3,
  PK_PUB_VAR_1,
  PK_PUB_VAR_2,
  V_P_PKG_EDITING_FOR_NEW_REVISION_N,
  V_P_PKG_EDITING_FOR_NEW_VERSION_N,
  V_P_PKG_EDITING_SEARCH_R,
} from '@test-data/portal'
import { PUBLISH_TIMEOUT, TICKET_BASE_URL } from '@test-setup'
import { isLocalHost } from '@services/utils'

test.describe('4.3.2 Package publishing via Portal', () => {

  test('[P-PVC-2] Check Upload options',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8914` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const agentPage = new AgentPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { methodsForUploadDialog, configureVersionTab } = versionPage
      const testPackage = PK_PUB_IMM_3

      await test.step('Portal option', async () => {
        await portalPage.gotoPackage(testPackage)
        await versionPage.howToUploadBtn.click()
        await methodsForUploadDialog.toPortalBtn.click()

        await expect(configureVersionTab.filesUploader).toBeVisible()
      })

      if (!isLocalHost()) {
        await test.step('Agent option', async () => {
          await portalPage.gotoPackage(testPackage)
          await versionPage.howToUploadBtn.click()
          await methodsForUploadDialog.toAgentBtn.click()

          await expect(agentPage.cloudAc).toBeVisible()
        })
      }

      await test.step('Got it', async () => {
        await portalPage.gotoPackage(testPackage)
        await versionPage.howToUploadBtn.click()
        await methodsForUploadDialog.gotItBtn.click()

        await expect(methodsForUploadDialog.gotItBtn).toBeHidden()
        await expect(versionPage.howToUploadBtn).toBeVisible()
      })
    })

  test('[P-PVC-3] Publish draft version',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8915` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-A-10451` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { configureVersionTab, packageSettingsPage } = versionPage

      await test.step('Open Configure Package Version tab', async () => {
        await portalPage.gotoPackage(PK_PUB_VAR_1)
        await versionPage.toolbar.createVersionBtn.click()

        await expect(configureVersionTab.publishBtn).toBeDisabled()
        await expect(configureVersionTab.exitBtn).toBeEnabled()
        await expect(configureVersionTab.browseFilesBtn).toBeEnabled()
        await expect(configureVersionTab.browseBtn).toBeEnabled()

        await configureVersionTab.infoIcon.hover()

        await expect(portalPage.tooltip).toHaveText(CONFIG_PKG_VERSION_TOOLTIP)
      })

      await configureVersionTab.filesUploader.setInputFiles(FILE_P_PETSTORE30)

      await test.step('Publish Draft Version', async () => {
        await configureVersionTab.publishBtn.click()
        await configureVersionTab.publishVersionDialog.fillForm({ version: 'publish-draft', status: 'draft' })
        await configureVersionTab.publishVersionDialog.publishBtn.click()

        await expect(configureVersionTab.publishVersionDialog.publishBtn).toBeHidden({ timeout: PUBLISH_TIMEOUT })
        await expect(versionPage.toolbar.versionSlt).toHaveText('publish-draft')
        await expect.soft(versionPage.toolbar.title).toHaveText(PK_PUB_VAR_1.name)
        await expect.soft(versionPage.toolbar.status).toHaveText('draft')
      })

      await test.step('Open Versions tab in settings', async () => { //Cover TestCase-A-4755
        await versionPage.toolbar.settingsBtn.click()
        await packageSettingsPage.versionsTab.click()

        //! await expect(packageSettingsPage.versionsTab.getVersionRow('publish-draft')).toBeVisible() //Issue TestCase-A-10451
      })
    })

  test('[P-PVC-4] Publish release version',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8917` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { configureVersionTab } = versionPage

      await test.step('Open Configure Package Version tab', async () => {
        await portalPage.gotoPackage(PK_PUB_VAR_2)
        await versionPage.toolbar.addNewVersionBtn.click()
      })

      await configureVersionTab.filesUploader.setInputFiles(FILE_P_GQL_SMALL)

      await test.step('Publish Release Version', async () => {
        await configureVersionTab.publishBtn.click()
        await configureVersionTab.publishVersionDialog.fillForm({ version: '2100.1', status: 'release' })
        await configureVersionTab.publishVersionDialog.publishBtn.click()

        await expect(configureVersionTab.publishVersionDialog.publishBtn).toBeHidden({ timeout: PUBLISH_TIMEOUT })
        await expect(versionPage.toolbar.versionSlt).toHaveText('2100.1')
        await expect.soft(versionPage.toolbar.title).toHaveText(PK_PUB_VAR_2.name)
        await expect.soft(versionPage.toolbar.status).toHaveText('release')
      })
    })

  test('[P-PVC-5.1] Edit release version',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8918` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { configureVersionTab, overviewTab } = versionPage
      const testPackage = V_P_PKG_EDITING_FOR_NEW_REVISION_N.pkg
      const testVersion = V_P_PKG_EDITING_FOR_NEW_REVISION_N

      await portalPage.gotoVersionEditing(testVersion)

      await expect(configureVersionTab.title).toHaveText(`${testPackage.name}: Edit Version`)
      await expect(configureVersionTab.version).toHaveText(`${testVersion.version}`)
      // await expect(configureVersionTab.status).toHaveText(`${testVersion.status}`) TODO: need to add 'VersionStatusChip' testid in UI

      await test.step('Config version', async () => {
        await test.step('Delete file', async () => {
          await configureVersionTab.getFileRow(FILE_P_PETSTORE30.name).hover()
          await configureVersionTab.getFileRow(FILE_P_PETSTORE30.name).removeBtn.click()
          await configureVersionTab.deleteFileDialog.deleteBtn.click()

          await expect(configureVersionTab.filesUploader).toBeVisible()
        })

        await test.step('Add new files', async () => {
          await configureVersionTab.filesUploader.setInputFiles([
            FILE_P_PETSTORE20,
            FILE_P_PETSTORE31,
            FILE_P_GQL_SMALL,
            FILE_P_JSON_SCHEMA_JSON,
            FILE_P_JSON_SCHEMA_YAML,
            FILE_P_MSOFFICE,
            FILE_P_MARKDOWN,
            FILE_P_PICTURE,
            FILE_P_ARCHIVE,
          ])

          await expect(configureVersionTab.getFileRow(FILE_P_PETSTORE20.name)).toHaveIcon(SWAGGER_ICON)
          await expect(configureVersionTab.getFileRow(FILE_P_PETSTORE31.name)).toHaveIcon(OPENAPI_ICON)
          await expect(configureVersionTab.getFileRow(FILE_P_GQL_SMALL.name)).toHaveIcon(GRAPHQL_ICON)
          // await expect(configureVersionTab.getFileRow(JSON_SCHEMA_JSON_TEST_FILE.fileId)).toHaveIcon(JSON_SCHEMA_ICON) // Icons aren't implemented yet
          // await expect(configureVersionTab.getFileRow(JSON_SCHEMA_YAML_TEST_FILE.fileId)).toHaveIcon(JSON_SCHEMA_ICON)
          await expect(configureVersionTab.getFileRow(FILE_P_MSOFFICE.name)).toHaveIcon(FILE_ICON)
          await expect(configureVersionTab.getFileRow(FILE_P_MARKDOWN.name)).toHaveIcon(MARKDOWN_ICON)
          await expect(configureVersionTab.getFileRow(FILE_P_PICTURE.name)).toHaveIcon(FILE_ICON)
          await expect(configureVersionTab.getFileRow(FILE_P_ARCHIVE.name)).toHaveIcon(FILE_ICON)
          await expect(configureVersionTab.getFileRow(FILE_P_PETSTORE30.name)).toBeHidden()
        })

        await test.step('Add labels', async () => {
          await configureVersionTab.getFileRow(FILE_P_PETSTORE20.name).hover()
          await configureVersionTab.getFileRow(FILE_P_PETSTORE20.name).editBtn.click()
          await configureVersionTab.editFileLabelsDialog.fillForm(['label', 'label 2'])
          await configureVersionTab.editFileLabelsDialog.saveBtn.click()

          await expect(configureVersionTab.getFileRow(FILE_P_PETSTORE20.name).labelsCell).toHaveText('labellabel 2')
        })
      })

      await test.step('Publish Release Version', async () => {
        await configureVersionTab.publishBtn.click()
        await configureVersionTab.publishVersionDialog.fillForm({ version: testVersion.version, status: 'release' })
        await configureVersionTab.publishVersionDialog.publishBtn.click()

        await expect(configureVersionTab.publishVersionDialog.publishBtn).toBeHidden({ timeout: PUBLISH_TIMEOUT })
        await expect(versionPage.toolbar.versionSlt).toHaveText(testVersion.version)
        await expect.soft(overviewTab.summaryTab.body.summary.revision).toHaveText('2')
      })

      await test.step('Navigate to the "Documents" tab', async () => {
        await versionPage.documentsTab.click()
        await versionPage.documentsTab.sidebar.getDocRestButton(FILE_P_PETSTORE20.testMeta!.docName).click()

        await expect.soft(versionPage.documentsTab.openapiView.overview.labels).toHaveText('labellabel 2')
      })
    })

  test('[P-PVC-5.2] Search files on the "Configuration" page',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8918` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { configureVersionTab } = versionPage
      const testVersion = V_P_PKG_EDITING_SEARCH_R

      await portalPage.gotoVersionEditing(testVersion)

      await test.step('Search file by name', async () => {

        await test.step('Part of a word', async () => {
          await configureVersionTab.searchbar.fill('atui_petstore')

          await expect.soft(configureVersionTab.getFileRow()).toHaveCount(2)
        })

        await test.step('Adding part of a word', async () => {
          await configureVersionTab.searchbar.type('30.yaml')

          await expect.soft(configureVersionTab.getFileRow()).toHaveCount(1)
        })

        await test.step('Clearing a search query', async () => {
          await configureVersionTab.searchbar.clear()

          await expect.soft(configureVersionTab.getFileRow()).toHaveCount(3)
        })

        await test.step('Case sensitive', async () => {
          await configureVersionTab.searchbar.clear()
          await configureVersionTab.searchbar.fill('ATUI_petstore30.yaml')

          await expect.soft(configureVersionTab.getFileRow()).toHaveCount(1)
          await expect.soft(configureVersionTab.getFileRow(FILE_P_PETSTORE30.name)).toBeVisible()
        })

        await test.step('Invalid search query with valid substring', async () => {
          await configureVersionTab.searchbar.clear()
          await configureVersionTab.searchbar.fill(`${FILE_P_PETSTORE30.name}123`)

          await expect.soft(configureVersionTab.getFileRow()).toHaveCount(0)
        })
      })

      await test.step('Search file by label', async () => {

        await test.step('Part of a word', async () => {
          await configureVersionTab.searchbar.fill('atui-')

          await expect.soft(configureVersionTab.getFileRow()).toHaveCount(1)
        })

        await test.step('Adding part of a word', async () => {
          await configureVersionTab.searchbar.type('label')

          await expect.soft(configureVersionTab.getFileRow()).toHaveCount(1)
        })

        await test.step('Clearing a search query', async () => {
          await configureVersionTab.searchbar.clear()

          await expect.soft(configureVersionTab.getFileRow()).toHaveCount(3)
        })

        await test.step('Case sensitive', async () => {
          await configureVersionTab.searchbar.clear()
          await configureVersionTab.searchbar.fill('ATUI-label')

          await expect.soft(configureVersionTab.getFileRow()).toHaveCount(1)
          await expect.soft(configureVersionTab.getFileRow(FILE_P_PETSTORE30.name)).toBeVisible()
        })

        await test.step('Invalid search query with valid substring', async () => {
          await configureVersionTab.searchbar.clear()
          await configureVersionTab.searchbar.fill('atui-label123')

          await expect.soft(configureVersionTab.getFileRow()).toHaveCount(0)
        })
      })
    })

  test('[P-PVC-5.3] View content of file and restore file on the "Configuration" page',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8918` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { configureVersionTab } = versionPage

      await portalPage.gotoVersionEditing(V_P_PKG_EDITING_SEARCH_R)

      await expect(configureVersionTab.getFileRow(FILE_P_PETSTORE30.name)).toBeVisible()

      await test.step('Add the file with same name', async () => {
        await configureVersionTab.buttonFilesUploader.setInputFiles(FILE_P_PETSTORE30)
        await configureVersionTab.getFileRow(FILE_P_PETSTORE30.name).infoIcon.hover()

        await expect(portalPage.tooltip).toHaveText(CONFIG_PKG_RESTORE_FILE_TOOLTIP)
      })

      await test.step('Restore the file', async () => {
        await configureVersionTab.getFileRow(FILE_P_PETSTORE30.name).restoreBtn.click()

        await expect(configureVersionTab.getFileRow(FILE_P_PETSTORE30.name).infoIcon).toBeHidden()
      })

      await test.step('View file content', async () => {
        await configureVersionTab.getFileRow(FILE_P_PETSTORE30.name).fileBtn.click()

        await expect(configureVersionTab.apiSpecPopup.docView).toBeVisible()

        await configureVersionTab.apiSpecPopup.rawBtn.click()

        await expect(configureVersionTab.apiSpecPopup.rawView).toContainText(FILE_P_PETSTORE30.testMeta!.yamlString!)
      })
    })

  test('[P-PVC-6] Publish second release version',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8919` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { configureVersionTab, apiChangesTab } = versionPage
      const testVersion = V_P_PKG_EDITING_FOR_NEW_VERSION_N

      await portalPage.gotoVersionEditing(testVersion)

      await test.step('Delete file', async () => {
        await configureVersionTab.getFileRow(FILE_P_PETSTORE30.name).hover()
        await configureVersionTab.getFileRow(FILE_P_PETSTORE30.name).removeBtn.click()
        await configureVersionTab.deleteFileDialog.deleteBtn.click()

        await expect(configureVersionTab.filesUploader).toBeVisible()
      })

      await configureVersionTab.filesUploader.setInputFiles(FILE_P_PETSTORE30_CHANGED)

      await test.step('Publish Release Version', async () => {
        await configureVersionTab.publishBtn.click()
        await configureVersionTab.publishVersionDialog.fillForm({
          version: '2000.3',
          status: 'release',
          previousVersion: testVersion.version,
        })
        await configureVersionTab.publishVersionDialog.publishBtn.click()

        await expect(configureVersionTab.publishVersionDialog.publishBtn).toBeHidden({ timeout: PUBLISH_TIMEOUT })
        await expect(versionPage.toolbar.versionSlt).toHaveText('2000.3')
      })

      await test.step('Navigate to the "API Changes" tab', async () => {
        await versionPage.apiChangesTab.click()

        await expect(apiChangesTab.toolbar.breakingChangesFilterBtn).toHaveText('2')
      })
    })
})
