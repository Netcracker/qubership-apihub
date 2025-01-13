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
import { expect, expectFile, expectText } from '@services/expect-decorator'
import { SUCCESS_MSG } from '@shared/entities'
import { PortalPage } from '@portal/pages/PortalPage'
import { BASE_ORIGIN, TICKET_BASE_URL } from '@test-setup'
import {
  FILE_P_ARCHIVE,
  FILE_P_GQL_SMALL,
  FILE_P_JSON_SCHEMA_JSON,
  FILE_P_JSON_SCHEMA_YAML,
  FILE_P_MARKDOWN,
  FILE_P_MSOFFICE,
  FILE_P_PETSTORE30,
  FILE_P_PICTURE,
  PK11,
  V_P_PKG_DOCUMENTS_R,
} from '@test-data/portal'
import { VERSION_DOCUMENTS_TAB } from '@portal/entities'

test.describe('7.1 Documents actions (Package)', () => {

  const testPackage = PK11
  const testVersion = V_P_PKG_DOCUMENTS_R

  test('[P-DCPSE-1] Search documents',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-1845` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { documentsTab } = versionPage

      await portalPage.gotoVersion(testVersion, VERSION_DOCUMENTS_TAB)

      await test.step('Part of a word', async () => {
        await documentsTab.sidebar.searchbar.fill('p')

        await expect.soft(documentsTab.sidebar.getAllFiles()).toHaveCount(5)
      })

      await test.step('Adding part of a word', async () => {
        await documentsTab.sidebar.searchbar.type('etstore')

        await expect.soft(documentsTab.sidebar.getAllFiles()).toHaveCount(3)
      })

      await test.step('Clearing a search query', async () => {
        await documentsTab.sidebar.searchbar.clear()

        await expect.soft(documentsTab.sidebar.getAllFiles()).toHaveCount(10)
      })

      await test.step('Two words', async () => {
        await documentsTab.sidebar.searchbar.clear()
        await documentsTab.sidebar.searchbar.fill('atui petstore')

        await expect.soft(documentsTab.sidebar.getAllFiles()).toHaveCount(3)
      })

      await test.step('Upper case', async () => {
        await documentsTab.sidebar.searchbar.clear()
        await documentsTab.sidebar.searchbar.fill('Petstore')

        await expect.soft(documentsTab.sidebar.getAllFiles()).toHaveCount(3)
      })

      await test.step('Invalid search query with valid substring', async () => {
        await documentsTab.sidebar.searchbar.clear()
        await documentsTab.sidebar.searchbar.fill('Petstore123')

        await expect.soft(documentsTab.sidebar.getAllFiles()).toHaveCount(0)
      })
    })

  test('[P-DCPOP-1] Opening the Document Preview page',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4860` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { documentsTab, documentPreviewPage: docPreviewPage } = versionPage
      const { docTitle, docName } = FILE_P_PETSTORE30.testMeta!

      await portalPage.gotoVersion(testVersion)

      await versionPage.documentsTab.click()
      await documentsTab.sidebar.getDocRestButton(docName).openActionMenu()
      await documentsTab.sidebar.getDocRestButton(docName).actionMenu.previewDocItm.click()

      await expect.soft(docPreviewPage.toolbar.title).toHaveText(docTitle!)
      await expect.soft(docPreviewPage.toolbar.simpleBtn).toBeVisible()
      await expect.soft(docPreviewPage.toolbar.detailedBtn).toBeVisible()
      await expect.soft(docPreviewPage.toolbar.breadcrumbs).toBeVisible()
      await expect.soft(docPreviewPage.toolbar.docBtn).toBeVisible()
      await expect.soft(docPreviewPage.toolbar.rawBtn).toBeVisible()
      await expect.soft(docPreviewPage.toolbar.exportDocumentMenu).toBeVisible()

      await docPreviewPage.toolbar.backBtn.click()

      await expect(versionPage.overviewTab).toBeVisible()
    })

  test('[P-DCPDN-1] Downloading a REST API document via action menu',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-1726` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { documentsTab } = versionPage
      const { slug } = FILE_P_PETSTORE30
      const { docName, jsonString, jsonRefString, yamlString, yamlRefString } = FILE_P_PETSTORE30.testMeta!

      await portalPage.gotoVersion(testVersion, VERSION_DOCUMENTS_TAB)

      const docButton = documentsTab.sidebar.getDocRestButton(docName)

      await test.step('Download document as zip', async () => {
        await docButton.openActionMenu()
        const file = await docButton.actionMenu.downloadZip()

        await expectFile.soft(file).toHaveName(`${slug}.zip`)
      })

      await test.step('Download document as yaml', async () => {
        await docButton.openActionMenu()
        const file = await docButton.actionMenu.downloadYaml()

        await expectFile.soft(file).toHaveName(`${slug}.yaml`)
        await expectFile.soft(file).toContainText(yamlString!)
        await expectFile.soft(file).toContainText(yamlRefString!)
      })

      await test.step('Download document as json', async () => {
        await docButton.openActionMenu()
        const file = await docButton.actionMenu.downloadJson()

        await expectFile.soft(file).toHaveName(`${slug}.json`)
        await expectFile.soft(file).toContainText(jsonString!)
        await expectFile.soft(file).toContainText(jsonRefString!)
      })

      await test.step('Download document as yaml (inline refs)', async () => {
        await docButton.openActionMenu()
        const file = await docButton.actionMenu.downloadYamlInlineRefs()

        await expectFile.soft(file).toHaveName(`${slug}.yaml`)
        await expectFile.soft(file).toContainText(yamlString!)
        await expectFile.soft(file).not.toContainText(yamlRefString!)
      })

      await test.step('Download document as json (inline refs)', async () => {
        await docButton.openActionMenu()
        const file = await docButton.actionMenu.downloadJsonInlineRefs()

        await expectFile.soft(file).toHaveName(`${slug}.json`)
        await expectFile.soft(file).toContainText(jsonString!)
        await expectFile.soft(file).not.toContainText(jsonRefString!)
      })
    })

  test('[P-DCPDN-2] Downloading a REST API document via download menu',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4983` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { documentsTab } = versionPage
      const { slug } = FILE_P_PETSTORE30
      const { jsonString, jsonRefString, yamlString, yamlRefString } = FILE_P_PETSTORE30.testMeta!

      await portalPage.gotoDocument(testVersion, slug)

      await test.step('Download document as zip', async () => {
        await documentsTab.openapiView.toolbar.downloadMenu.click()
        const file = await documentsTab.openapiView.toolbar.downloadMenu.downloadZip()

        await expectFile.soft(file).toHaveName(`${slug}.zip`)
      })

      await test.step('Download document as yaml', async () => {
        await documentsTab.openapiView.toolbar.downloadMenu.click()
        const file = await documentsTab.openapiView.toolbar.downloadMenu.downloadYaml()

        await expectFile.soft(file).toHaveName(`${slug}.yaml`)
        await expectFile.soft(file).toContainText(yamlString!)
        await expectFile.soft(file).toContainText(yamlRefString!)
      })

      await test.step('Download document as json', async () => {
        await documentsTab.openapiView.toolbar.downloadMenu.click()
        const file = await documentsTab.openapiView.toolbar.downloadMenu.downloadJson()

        await expectFile.soft(file).toHaveName(`${slug}.json`)
        await expectFile.soft(file).toContainText(jsonString!)
        await expectFile.soft(file).toContainText(jsonRefString!)
      })

      await test.step('Download document as yaml (inline refs)', async () => {
        await documentsTab.openapiView.toolbar.downloadMenu.click()
        const file = await documentsTab.openapiView.toolbar.downloadMenu.downloadYamlInlineRefs()

        await expectFile.soft(file).toHaveName(`${slug}.yaml`)
        await expectFile.soft(file).toContainText(yamlString!)
        await expectFile.soft(file).not.toContainText(yamlRefString!)
      })

      await test.step('Download document as json (inline refs)', async () => {
        await documentsTab.openapiView.toolbar.downloadMenu.click()
        const file = await documentsTab.openapiView.toolbar.downloadMenu.downloadJsonInlineRefs()

        await expectFile.soft(file).toHaveName(`${slug}.json`)
        await expectFile.soft(file).toContainText(jsonString!)
        await expectFile.soft(file).not.toContainText(jsonRefString!)
      })
    })

  test('[P-DCPDN-3] Downloading JSON Schema, MARKDOWN, Picture, Office, Archive files via action menu',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-1738` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { documentsTab } = versionPage

      await portalPage.gotoVersion(testVersion, VERSION_DOCUMENTS_TAB)

      await test.step('Download JSON Schema (json)', async () => {
        await documentsTab.sidebar.getDocFileButton(FILE_P_JSON_SCHEMA_JSON.slug).openActionMenu()
        const file = await documentsTab.sidebar.getDocFileButton(FILE_P_JSON_SCHEMA_JSON.slug).actionMenu.download()

        await expectFile.soft(file).toHaveName(FILE_P_JSON_SCHEMA_JSON.name)
        await expectFile.soft(file).toContainText(FILE_P_JSON_SCHEMA_JSON.testMeta!.jsonString!)
      })

      await test.step('Download JSON Schema (yaml)', async () => {
        await documentsTab.sidebar.getDocFileButton(FILE_P_JSON_SCHEMA_YAML.slug).openActionMenu()
        const file = await documentsTab.sidebar.getDocFileButton(FILE_P_JSON_SCHEMA_YAML.slug).actionMenu.download()

        await expectFile.soft(file).toHaveName(FILE_P_JSON_SCHEMA_YAML.name)
        await expectFile.soft(file).toContainText(FILE_P_JSON_SCHEMA_YAML.testMeta!.yamlString!)
      })

      await test.step('Download MARKDOWN', async () => {
        await documentsTab.sidebar.getDocMdButton(FILE_P_MARKDOWN.slug).openActionMenu()
        const file = await documentsTab.sidebar.getDocMdButton(FILE_P_MARKDOWN.slug).actionMenu.download()

        await expectFile.soft(file).toHaveName(FILE_P_MARKDOWN.name)
        await expectFile.soft(file).toContainText(FILE_P_MARKDOWN.testMeta!.mdString!)
      })

      await test.step('Download Picture file', async () => {
        await documentsTab.sidebar.getDocFileButton(FILE_P_PICTURE.slug).openActionMenu()
        const file = await documentsTab.sidebar.getDocFileButton(FILE_P_PICTURE.slug).actionMenu.download()

        await expectFile.soft(file).toHaveName(FILE_P_PICTURE.name)
      })

      await test.step('Download Office file', async () => {
        await documentsTab.sidebar.getDocFileButton(FILE_P_MSOFFICE.slug).openActionMenu()
        const file = await documentsTab.sidebar.getDocFileButton(FILE_P_MSOFFICE.slug).actionMenu.download()

        await expectFile.soft(file).toHaveName(FILE_P_MSOFFICE.name)
      })

      await test.step('Download Archive file', async () => {
        await documentsTab.sidebar.getDocFileButton(FILE_P_ARCHIVE.slug).openActionMenu()
        const file = await documentsTab.sidebar.getDocFileButton(FILE_P_ARCHIVE.slug).actionMenu.download()

        await expectFile.soft(file).toHaveName(FILE_P_ARCHIVE.name)
      })
    })

  test('[P-DCPDN-4] Downloading JSON Schema, MARKDOWN, Picture, Office, Archive files via download menu',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4984` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { documentsTab } = versionPage

      await portalPage.gotoVersion(testVersion, VERSION_DOCUMENTS_TAB)

      await test.step('Download JSON Schema (json)', async () => {
        await documentsTab.sidebar.getDocFileButton(FILE_P_JSON_SCHEMA_JSON.slug).click()
        await documentsTab.jsonSchemaView.toolbar.downloadMenu.click()
        const file = await documentsTab.jsonSchemaView.toolbar.downloadMenu.download()

        await expectFile.soft(file).toHaveName(FILE_P_JSON_SCHEMA_JSON.name)
        await expectFile.soft(file).toContainText(FILE_P_JSON_SCHEMA_JSON.testMeta!.jsonString!)
      })

      await test.step('Download JSON Schema (yaml)', async () => {
        await documentsTab.sidebar.getDocFileButton(FILE_P_JSON_SCHEMA_YAML.slug).click()
        await documentsTab.jsonSchemaView.toolbar.downloadMenu.click()
        const file = await documentsTab.jsonSchemaView.toolbar.downloadMenu.download()

        await expectFile.soft(file).toHaveName(FILE_P_JSON_SCHEMA_YAML.name)
        await expectFile.soft(file).toContainText(FILE_P_JSON_SCHEMA_YAML.testMeta!.yamlString!)
      })

      await test.step('Download MARKDOWN', async () => {
        await documentsTab.sidebar.getDocMdButton(FILE_P_MARKDOWN.slug).click()
        await documentsTab.mdView.toolbar.downloadMenu.click()
        const file = await documentsTab.mdView.toolbar.downloadMenu.download()

        await expectFile.soft(file).toHaveName(FILE_P_MARKDOWN.name)
        await expectFile.soft(file).toContainText(FILE_P_MARKDOWN.testMeta!.mdString!)
      })

      await test.step('Download Picture file', async () => {
        await documentsTab.sidebar.getDocFileButton(FILE_P_PICTURE.slug).click()
        await documentsTab.fileView.toolbar.downloadMenu.click()
        const file = await documentsTab.fileView.toolbar.downloadMenu.download()

        await expectFile.soft(file).toHaveName(FILE_P_PICTURE.name)
      })

      await test.step('Download Office file', async () => {
        await documentsTab.sidebar.getDocFileButton(FILE_P_MSOFFICE.slug).click()
        await documentsTab.fileView.toolbar.downloadMenu.click()
        const file = await documentsTab.fileView.toolbar.downloadMenu.download()

        await expectFile.soft(file).toHaveName(FILE_P_MSOFFICE.name)
      })

      await test.step('Download Archive file', async () => {
        await documentsTab.sidebar.getDocFileButton(FILE_P_ARCHIVE.slug).click()
        await documentsTab.fileView.toolbar.downloadMenu.click()
        const file = await documentsTab.fileView.toolbar.downloadMenu.download()

        await expectFile.soft(file).toHaveName(FILE_P_ARCHIVE.name)
      })
    })

  test('[P-DCPDN-5] Downloading Picture, Office, Archive files via placeholder',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4985` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { documentsTab } = versionPage

      await portalPage.gotoVersion(testVersion, VERSION_DOCUMENTS_TAB)

      await test.step('Download Picture file', async () => {
        await documentsTab.sidebar.getDocFileButton(FILE_P_PICTURE.slug).click()
        const file = await documentsTab.fileView.content.download()

        await expectFile.soft(file).toHaveName(FILE_P_PICTURE.name)
      })

      await test.step('Download Office file', async () => {
        await documentsTab.sidebar.getDocFileButton(FILE_P_MSOFFICE.slug).click()
        const file = await documentsTab.fileView.content.download()

        await expectFile.soft(file).toHaveName(FILE_P_MSOFFICE.name)
      })

      await test.step('Download Archive file', async () => {
        await documentsTab.sidebar.getDocFileButton(FILE_P_ARCHIVE.slug).click()
        const file = await documentsTab.fileView.content.download()

        await expectFile.soft(file).toHaveName(FILE_P_ARCHIVE.name)
      })
    })

  test('[P-DCPDN-6] Downloading a REST API document from the Document Preview page',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4511` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { documentPreviewPage } = versionPage
      const { slug } = FILE_P_PETSTORE30
      const { jsonString, jsonRefString, yamlString, yamlRefString } = FILE_P_PETSTORE30.testMeta!

      await portalPage.gotoDocument(testVersion, slug, true)

      await test.step('Download document as yaml', async () => {
        await documentPreviewPage.toolbar.exportDocumentMenu.click()
        const file = await documentPreviewPage.toolbar.exportDocumentMenu.downloadYaml()

        await expectFile.soft(file).toHaveName(`${slug}.yaml`)
        await expectFile.soft(file).toContainText(yamlString!)
        await expectFile.soft(file).toContainText(yamlRefString!)
      })

      await test.step('Download document as json', async () => {
        await documentPreviewPage.toolbar.exportDocumentMenu.click()
        const file = await documentPreviewPage.toolbar.exportDocumentMenu.downloadJson()

        await expectFile.soft(file).toHaveName(`${slug}.json`)
        await expectFile.soft(file).toContainText(jsonString!)
        await expectFile.soft(file).toContainText(jsonRefString!)
      })

      await test.step('Download document as yaml (inline refs)', async () => {
        await documentPreviewPage.toolbar.exportDocumentMenu.click()
        const file = await documentPreviewPage.toolbar.exportDocumentMenu.downloadYamlInlineRefs()

        await expectFile.soft(file).toHaveName(`${slug}.yaml`)
        await expectFile.soft(file).toContainText(yamlString!)
        await expectFile.soft(file).not.toContainText(yamlRefString!)
      })

      await test.step('Download document as json (inline refs)', async () => {
        await documentPreviewPage.toolbar.exportDocumentMenu.click()
        const file = await documentPreviewPage.toolbar.exportDocumentMenu.downloadJsonInlineRefs()

        await expectFile.soft(file).toHaveName(`${slug}.json`)
        await expectFile.soft(file).toContainText(jsonString!)
        await expectFile.soft(file).not.toContainText(jsonRefString!)
      })

      await test.step('Download HTML interactive', async () => {
        await documentPreviewPage.toolbar.exportDocumentMenu.click()
        const file = await documentPreviewPage.toolbar.exportDocumentMenu.downloadZip()

        await expectFile.soft(file).toHaveName(`${slug}.zip`)
      })
    })

  test('[P-DCPDN-7] Downloading a GraphQL document via action menu',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5633` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { documentsTab } = versionPage

      await portalPage.gotoVersion(testVersion, VERSION_DOCUMENTS_TAB)

      await documentsTab.sidebar.getDocMdButton(FILE_P_GQL_SMALL.slug).openActionMenu() // TODO need to create getDocGqlButton()
      const file = await documentsTab.sidebar.getDocMdButton(FILE_P_GQL_SMALL.slug).actionMenu.download()

      await expectFile.soft(file).toHaveName(FILE_P_GQL_SMALL.name)
      await expectFile.soft(file).toContainText(FILE_P_GQL_SMALL.testMeta!.gqlString!)
    })

  test('[P-DCPSH-1.1] Sharing a REST API document via action menu',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4512` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-1358` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { documentsTab } = versionPage
      const { slug } = FILE_P_PETSTORE30
      const { docName, jsonString, jsonRefString } = FILE_P_PETSTORE30.testMeta!

      await portalPage.gotoVersion(testVersion, VERSION_DOCUMENTS_TAB)

      const docButton = documentsTab.sidebar.getDocRestButton(docName)

      //TODO: TestCase-B-1358
      /*await test.step('Share link to the document page', async () => {
        await docButton.openActionMenu()
        const clipboard = await docButton.actionMenu.shareDocPageLink()

        await expect(portalPage.snackbar).toContainText(SUCCESS_MSG)
        await expect(portalPage.snackbar).toContainText('Link copied')
        await expectText(clipboard).toContain(`${BASE_URL}/portal/packages/${testPackage.packageId}/${DOCUMENTS_TEST_VERSION.version}/documents/${slug}`)
      })*/

      await test.step('Share page template', async () => {
        await docButton.openActionMenu()
        const clipboard = await docButton.actionMenu.sharePageTemplate()

        await expect(portalPage.snackbar).toContainText(SUCCESS_MSG)
        await expect(portalPage.snackbar).toContainText('Template copied')
        await expectText(clipboard).toContain(`apiDescriptionUrl="${BASE_ORIGIN}/api/v2/sharedFiles/`)
      })

      await test.step('Share public link to source', async () => {
        await docButton.openActionMenu()
        const clipboard = await docButton.actionMenu.shareSourceLink()

        await expect(portalPage.snackbar).toContainText(SUCCESS_MSG)
        await expect(portalPage.snackbar).toContainText('Link copied')
        await expectText(clipboard).toContain(`${BASE_ORIGIN}/api/v2/sharedFiles/`)

        const file = await portalPage.downloadFile(clipboard)

        await expectFile.soft(file).toHaveName(`${slug}.json`)
        await expectFile.soft(file).toContainText(jsonString!)
        await expectFile.soft(file).toContainText(jsonRefString!)
      })
    })

  test('[P-DCPSH-1.2] Sharing a public link to source of old revision of REST API document',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4512` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { documentsTab } = versionPage
      const { slug } = FILE_P_PETSTORE30
      const { docName, jsonString, jsonRefString } = FILE_P_PETSTORE30.testMeta!

      await portalPage.gotoVersion({ ...testVersion, version: `${testVersion.version}@1` }, VERSION_DOCUMENTS_TAB)

      const docButton = documentsTab.sidebar.getDocRestButton(docName)

      await test.step('Share public link to source', async () => {
        await docButton.openActionMenu()
        const clipboard = await docButton.actionMenu.shareSourceLink()

        await expect(portalPage.snackbar).toContainText(SUCCESS_MSG)
        await expect(portalPage.snackbar).toContainText('Link copied')
        await expectText(clipboard).toContain(`${BASE_ORIGIN}/api/v2/sharedFiles/`)

        const file = await portalPage.downloadFile(clipboard)

        await expectFile.soft(file).toHaveName(`${slug}.json`)
        await expectFile.soft(file).toContainText(jsonString!)
        await expectFile.soft(file).toContainText(jsonRefString!)
      })
    })

  test('[P-DCPSH-2] Sharing a REST API document via download menu',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5055` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { documentsTab } = versionPage
      const { slug } = FILE_P_PETSTORE30
      const { jsonString, jsonRefString } = FILE_P_PETSTORE30.testMeta!

      await portalPage.gotoDocument(testVersion, slug)

      await test.step('Share link to the document page', async () => {
        await documentsTab.openapiView.toolbar.downloadMenu.click()
        const clipboard = await documentsTab.openapiView.toolbar.downloadMenu.shareDocPageLink()

        await expect(portalPage.snackbar).toContainText(SUCCESS_MSG)
        await expect(portalPage.snackbar).toContainText('Link copied')
        await expectText(clipboard).toContain(`${BASE_ORIGIN}/portal/packages/${testPackage.packageId}/${V_P_PKG_DOCUMENTS_R.version}/documents/${slug}`)
      })

      await test.step('Share page template', async () => {
        await documentsTab.openapiView.toolbar.downloadMenu.click()
        const clipboard = await documentsTab.openapiView.toolbar.downloadMenu.sharePageTemplate()

        await expect(portalPage.snackbar).toContainText(SUCCESS_MSG)
        await expect(portalPage.snackbar).toContainText('Template copied')
        await expectText(clipboard).toContain(`apiDescriptionUrl="${BASE_ORIGIN}/api/v2/sharedFiles/`)
      })

      await test.step('Share public link to source', async () => {
        await documentsTab.openapiView.toolbar.downloadMenu.click()
        const clipboard = await documentsTab.openapiView.toolbar.downloadMenu.shareSourceLink()

        await expect(portalPage.snackbar).toContainText(SUCCESS_MSG)
        await expect(portalPage.snackbar).toContainText('Link copied')
        await expectText(clipboard).toContain(`${BASE_ORIGIN}/api/v2/sharedFiles/`)

        const file = await portalPage.downloadFile(clipboard)

        await expectFile.soft(file).toHaveName(`${slug}.json`)
        await expectFile.soft(file).toContainText(jsonString!)
        await expectFile.soft(file).toContainText(jsonRefString!)
      })
    })

  test('[P-DCPSH-3] Sharing a MARKDOWN document via action menu',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4513` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-1358` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { documentsTab } = versionPage
      const { slug } = FILE_P_MARKDOWN
      const { mdString } = FILE_P_MARKDOWN.testMeta!

      await portalPage.gotoVersion(testVersion, VERSION_DOCUMENTS_TAB)

      const docButton = documentsTab.sidebar.getDocRestButton(slug)

      //TODO: TestCase-B-1358
      /*await test.step('Share link to the document page', async () => {
        await docButton.openActionMenu()
        const clipboard = await docButton.actionMenu.shareDocPageLink()

        await expect(portalPage.snackbar).toContainText(SUCCESS_MSG)
        await expect(portalPage.snackbar).toContainText('Link copied')
        await expectText(clipboard).toContain(`${BASE_URL}/portal/packages/${testPackage.packageId}/${DOCUMENTS_TEST_VERSION.version}/documents/${slug}`)
      })*/

      await test.step('Share page template', async () => {
        await docButton.openActionMenu()
        const clipboard = await docButton.actionMenu.sharePageTemplate()

        await expect(portalPage.snackbar).toContainText(SUCCESS_MSG)
        await expect(portalPage.snackbar).toContainText('Template copied')
        await expectText(clipboard).toContain(`apiDescriptionUrl="${BASE_ORIGIN}/api/v2/sharedFiles/`)
      })

      await test.step('Share public link to source', async () => {
        await docButton.openActionMenu()
        const clipboard = await docButton.actionMenu.shareSourceLink()

        await expect(portalPage.snackbar).toContainText(SUCCESS_MSG)
        await expect(portalPage.snackbar).toContainText('Link copied')
        await expectText(clipboard).toContain(`${BASE_ORIGIN}/api/v2/sharedFiles/`)

        const file = await portalPage.downloadFile(clipboard)

        await expectFile.soft(file).toHaveName(`${slug}.md`)
        await expectFile.soft(file).toContainText(mdString!)
      })
    })

  test('[P-DCPSH-4] Sharing a MARKDOWN document via download menu',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5057` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { documentsTab } = versionPage
      const { slug } = FILE_P_MARKDOWN
      const { mdString } = FILE_P_MARKDOWN.testMeta!

      await portalPage.gotoDocument(testVersion, slug)

      await test.step('Share link to the document page', async () => {
        await documentsTab.openapiView.toolbar.downloadMenu.click()
        const clipboard = await documentsTab.openapiView.toolbar.downloadMenu.shareDocPageLink()

        await expect(portalPage.snackbar).toContainText(SUCCESS_MSG)
        await expect(portalPage.snackbar).toContainText('Link copied')
        await expectText(clipboard).toContain(`${BASE_ORIGIN}/portal/packages/${testPackage.packageId}/${V_P_PKG_DOCUMENTS_R.version}/documents/${slug}`)
      })

      await test.step('Share page template', async () => {
        await documentsTab.openapiView.toolbar.downloadMenu.click()
        const clipboard = await documentsTab.openapiView.toolbar.downloadMenu.sharePageTemplate()

        await expect(portalPage.snackbar).toContainText(SUCCESS_MSG)
        await expect(portalPage.snackbar).toContainText('Template copied')
        await expectText(clipboard).toContain(`apiDescriptionUrl="${BASE_ORIGIN}/api/v2/sharedFiles/`)
      })

      await test.step('Share public link to source', async () => {
        await documentsTab.openapiView.toolbar.downloadMenu.click()
        const clipboard = await documentsTab.openapiView.toolbar.downloadMenu.shareSourceLink()

        await expect(portalPage.snackbar).toContainText(SUCCESS_MSG)
        await expect(portalPage.snackbar).toContainText('Link copied')
        await expectText(clipboard).toContain(`${BASE_ORIGIN}/api/v2/sharedFiles/`)

        const file = await portalPage.downloadFile(clipboard)

        await expectFile.soft(file).toHaveName(`${slug}.md`)
        await expectFile.soft(file).toContainText(mdString!)
      })
    })
})
