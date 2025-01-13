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
import { FILE_ICON, GRAPHQL_ICON, MARKDOWN_ICON, OPENAPI_ICON, SWAGGER_ICON } from '@shared/entities'
import { PortalPage } from '@portal/pages/PortalPage'
import {
  DEL_PET_V1,
  DEL_PET_V3,
  FILE_P_ARCHIVE,
  FILE_P_GQL_SMALL,
  FILE_P_JSON_SCHEMA_JSON,
  FILE_P_JSON_SCHEMA_YAML,
  FILE_P_MARKDOWN,
  FILE_P_MSOFFICE,
  FILE_P_PETSTORE20,
  FILE_P_PETSTORE30,
  FILE_P_PETSTORE31,
  FILE_P_PICTURE,
  GET_PET_BY_TAG_V2_SWAGGER,
  IMM_GR,
  P_WS_MAIN_R,
  PK11,
  V_P_PKG_DOCUMENTS_R,
} from '@test-data/portal'
import { TICKET_BASE_URL } from '@test-setup'

test.describe('7.3 Documents viewing (Package)', () => {

  const testPackage = PK11
  const testVersion = V_P_PKG_DOCUMENTS_R

  test('[P-DCPOP-1] Opening the Documents tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4866` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { documentsTab } = versionPage

      await portalPage.gotoVersion(testVersion)

      await versionPage.documentsTab.click()

      await expect.soft(documentsTab.sidebar.searchbar).toBeVisible()
      await expect.soft(documentsTab.sidebar.getDocRestButton(FILE_P_PETSTORE20.testMeta!.docName)).toHaveIcon(SWAGGER_ICON)
      await expect.soft(documentsTab.sidebar.getDocRestButton(FILE_P_PETSTORE30.testMeta!.docName)).toHaveIcon(OPENAPI_ICON)
      await expect.soft(documentsTab.sidebar.getDocRestButton(FILE_P_PETSTORE31.testMeta!.docName)).toHaveIcon(OPENAPI_ICON)
      await expect.soft(documentsTab.sidebar.getDocFileButton(FILE_P_GQL_SMALL.slug)).toHaveIcon(GRAPHQL_ICON)
      await expect.soft(documentsTab.sidebar.getDocFileButton(FILE_P_JSON_SCHEMA_JSON.slug)).toHaveIcon(FILE_ICON) // WA - should be JSON_SCHEMA_ICON
      await expect.soft(documentsTab.sidebar.getDocFileButton(FILE_P_JSON_SCHEMA_YAML.slug)).toHaveIcon(FILE_ICON) // WA - should be JSON_SCHEMA_ICON
      await expect.soft(documentsTab.sidebar.getDocFileButton(FILE_P_MSOFFICE.slug)).toHaveIcon(FILE_ICON)
      await expect.soft(documentsTab.sidebar.getDocMdButton(FILE_P_MARKDOWN.slug)).toHaveIcon(MARKDOWN_ICON)
      await expect.soft(documentsTab.sidebar.getDocFileButton(FILE_P_PICTURE.slug)).toHaveIcon(FILE_ICON)
      await expect.soft(documentsTab.sidebar.getDocFileButton(FILE_P_ARCHIVE.slug)).toHaveIcon(FILE_ICON)
    })

  test('[P-DCPVW-1] Viewing a Swagger 2.0 Document',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-1843` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { documentsTab } = versionPage
      const { slug } = FILE_P_PETSTORE20
      const {
        docTitle,
        docVersion,
        email,
        license,
        description,
        termsOfService,
        externalDocs,
      } = FILE_P_PETSTORE20.testMeta!
      const labels = testVersion.files![0].labels!

      await portalPage.gotoDocument(testVersion, slug)

      await test.step('Overview', async () => {
        await expect.soft(documentsTab.openapiView.toolbar.title).toHaveText(`${docTitle}${docVersion}`)
        for (const label of labels) {
          await expect.soft(documentsTab.openapiView.overview.labels).toContainText(label)
        }
        await expect.soft(portalPage.getLinkByName(email!)).toBeVisible()
        await expect.soft(portalPage.getLinkByName(license!)).toBeVisible()
        await expect.soft(portalPage.getLinkByName(description!)).toBeVisible()
        await expect.soft(portalPage.getLinkByName(termsOfService!)).toBeVisible()
        await expect.soft(portalPage.getLinkByName(externalDocs!)).toBeVisible()
      })

      await test.step('Operations', async () => {
        await documentsTab.openapiView.toolbar.operationsBtn.click()

        await expect.soft(documentsTab.openapiView.toolbar.searchbar).toBeVisible()
        await expect.soft(documentsTab.openapiView.table.getTagRow(GET_PET_BY_TAG_V2_SWAGGER.tags)).toBeVisible()
        await expect.soft(documentsTab.openapiView.table.getOperationRow(GET_PET_BY_TAG_V2_SWAGGER).endpointCell).toContainText('Deprecated')
        await expect.soft(documentsTab.openapiView.table.getOperationRow(GET_PET_BY_TAG_V2_SWAGGER).kindCell).toHaveText(GET_PET_BY_TAG_V2_SWAGGER.apiKind)
      })

      await test.step('Back to Overview', async () => {
        await documentsTab.openapiView.toolbar.overviewBtn.click()

        await expect.soft(documentsTab.openapiView.toolbar.searchbar).not.toBeVisible()
        await expect.soft(portalPage.getLinkByName(email!)).toBeVisible()
      })
    })

  test('[P-DCPVW-2] Viewing an OpenApi 3.0 Document',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4520` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { documentsTab } = versionPage
      const { slug } = FILE_P_PETSTORE30
      const {
        docTitle,
        docVersion,
        email,
        license,
        description,
        termsOfService,
        externalDocs,
      } = FILE_P_PETSTORE30.testMeta!
      const labels = testVersion.files![1].labels!

      await portalPage.gotoDocument(testVersion, slug)

      await test.step('Overview', async () => {
        await expect.soft(documentsTab.openapiView.toolbar.title).toHaveText(`${docTitle}${docVersion}`)
        for (const label of labels) {
          await expect.soft(documentsTab.openapiView.overview.labels).toContainText(label)
        }
        await expect.soft(portalPage.getLinkByName(email!)).toBeVisible()
        await expect.soft(portalPage.getLinkByName(license!)).toBeVisible()
        await expect.soft(portalPage.getLinkByName(description!)).toBeVisible()
        await expect.soft(portalPage.getLinkByName(termsOfService!)).toBeVisible()
        await expect.soft(portalPage.getLinkByName(externalDocs!)).toBeVisible()
      })

      await test.step('Operations', async () => {
        await documentsTab.openapiView.toolbar.operationsBtn.click()

        await expect.soft(documentsTab.openapiView.toolbar.searchbar).toBeVisible()
        await expect.soft(documentsTab.openapiView.table.getTagRow(DEL_PET_V1.tags)).toBeVisible()
        await expect.soft(documentsTab.openapiView.table.getOperationRow(DEL_PET_V1).kindCell).toHaveText(DEL_PET_V1.apiKind)
      })
    })

  test('[P-DCPVW-3] Viewing an OpenApi 3.1 Document',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4521` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { documentsTab } = versionPage
      const { slug } = FILE_P_PETSTORE31
      const {
        docTitle,
        docVersion,
        email,
        license,
        description,
        termsOfService,
        externalDocs,
      } = FILE_P_PETSTORE31.testMeta!

      await portalPage.gotoDocument(testVersion, slug)

      await test.step('Overview', async () => {
        await expect.soft(documentsTab.openapiView.toolbar.title).toHaveText(`${docTitle}${docVersion}`)
        await expect.soft(documentsTab.openapiView.overview.labels).not.toBeVisible()
        await expect.soft(portalPage.getLinkByName(email!)).toBeVisible()
        await expect.soft(portalPage.getLinkByName(license!)).toBeVisible()
        await expect.soft(portalPage.getLinkByName(description!)).toBeVisible()
        await expect.soft(portalPage.getLinkByName(termsOfService!)).toBeVisible()
        await expect.soft(portalPage.getLinkByName(externalDocs!)).toBeVisible()
      })

      await test.step('Operations', async () => {
        await documentsTab.openapiView.toolbar.operationsBtn.click()

        await expect.soft(documentsTab.openapiView.toolbar.searchbar).toBeVisible()
        await expect.soft(documentsTab.openapiView.table.getTagRow(DEL_PET_V3.tags)).toBeVisible()
        await expect.soft(documentsTab.openapiView.table.getOperationRow(DEL_PET_V3).kindCell).toHaveText(DEL_PET_V3.apiKind)
      })
    })

  test('[P-DCPVW-4] Viewing a JSON Schema Document',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4522` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { documentsTab } = versionPage

      await test.step('Schema JSON', async () => {
        await portalPage.gotoDocument(testVersion, FILE_P_JSON_SCHEMA_JSON.slug)

        await expect.soft(documentsTab.jsonSchemaView.toolbar.title).toHaveText(FILE_P_JSON_SCHEMA_JSON.slug)
        await expect.soft(documentsTab.jsonSchemaView.viewer).toBeVisible()
        await expect.soft(documentsTab.openapiView.toolbar.searchbar).not.toBeVisible()
        await expect.soft(documentsTab.openapiView.toolbar.overviewBtn).not.toBeVisible()
        await expect.soft(documentsTab.openapiView.toolbar.operationsBtn).not.toBeVisible()
      })

      await test.step('Schema YAML', async () => {
        await portalPage.gotoDocument(testVersion, FILE_P_JSON_SCHEMA_YAML.slug)

        await expect.soft(documentsTab.jsonSchemaView.toolbar.title).toHaveText(FILE_P_JSON_SCHEMA_YAML.slug)
        await expect.soft(documentsTab.jsonSchemaView.viewer).toBeVisible()
        await expect.soft(documentsTab.openapiView.toolbar.searchbar).not.toBeVisible()
        await expect.soft(documentsTab.openapiView.toolbar.overviewBtn).not.toBeVisible()
        await expect.soft(documentsTab.openapiView.toolbar.operationsBtn).not.toBeVisible()
      })
    })

  test('[P-DCPVW-5] Viewing a MARKDOWN Document',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-1725` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { documentsTab } = versionPage
      const { slug } = FILE_P_MARKDOWN
      const { txtString } = FILE_P_MARKDOWN.testMeta!

      await portalPage.gotoDocument(testVersion, slug)

      await expect.soft(documentsTab.mdView.toolbar.title).toHaveText(slug)
      await expect.soft(documentsTab.mdView.viewer).toContainText(txtString!)
      await expect.soft(documentsTab.openapiView.toolbar.searchbar).not.toBeVisible()
      await expect.soft(documentsTab.openapiView.toolbar.overviewBtn).not.toBeVisible()
      await expect.soft(documentsTab.openapiView.toolbar.operationsBtn).not.toBeVisible()
    })

  test('[P-DCPVW-6] Search Operations on the Document details page',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4523` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { documentsTab } = versionPage
      const { slug } = FILE_P_PETSTORE30

      await portalPage.gotoDocument(testVersion, slug)

      await documentsTab.openapiView.toolbar.operationsBtn.click()

      await test.step('Part of a word', async () => {
        await documentsTab.openapiView.toolbar.searchbar.fill('f')

        await expect.soft(documentsTab.openapiView.table.getOperationRow()).toHaveCount(5 + 3 + 2)
      })

      await test.step('Adding part of a word', async () => {
        await documentsTab.openapiView.toolbar.searchbar.type('inds')

        await expect.soft(documentsTab.openapiView.table.getOperationRow()).toHaveCount(2)
      })

      await test.step('Clearing a search query', async () => {
        await documentsTab.openapiView.toolbar.searchbar.clear()

        await expect.soft(documentsTab.openapiView.table.getOperationRow()).toHaveCount(9 + 5 + 7)
      })

      await test.step('Two words', async () => {
        await documentsTab.openapiView.toolbar.searchbar.clear()
        await documentsTab.openapiView.toolbar.searchbar.fill('find pet')

        await expect.soft(documentsTab.openapiView.table.getOperationRow()).toHaveCount(1)
      })

      await test.step('Upper case', async () => {
        await documentsTab.openapiView.toolbar.searchbar.clear()
        await documentsTab.openapiView.toolbar.searchbar.fill('Finds')

        await expect.soft(documentsTab.openapiView.table.getOperationRow()).toHaveCount(2)
      })

      await test.step('Invalid search query with valid substring', async () => {
        await documentsTab.openapiView.toolbar.searchbar.clear()
        await documentsTab.openapiView.toolbar.searchbar.fill('Finds123')

        await expect.soft(documentsTab.openapiView.table.getOperationRow()).toHaveCount(0)
      })
    })

  test('[P-DCPVW-7] Expanding / collapsing Tags and search on the Document details page',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4981` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { documentsTab } = versionPage
      const { slug } = FILE_P_PETSTORE30

      await portalPage.gotoDocument(testVersion, slug)

      await documentsTab.openapiView.toolbar.operationsBtn.click()

      await test.step('Collapse tag', async () => {
        await documentsTab.openapiView.table.getTagRow('pet').collapseBtn.click()

        await expect.soft(documentsTab.openapiView.table.getOperationRow()).toHaveCount(5 + 7)
      })

      await test.step('Search operation', async () => {
        await documentsTab.openapiView.toolbar.searchbar.fill('find')

        await expect.soft(documentsTab.openapiView.table.getTagRow()).toHaveCount(2)
        await expect.soft(documentsTab.openapiView.table.getOperationRow()).toHaveCount(1)
      })

      await test.step('Expand tag', async () => {
        await documentsTab.openapiView.table.getTagRow('pet').expandBtn.click()

        await expect.soft(documentsTab.openapiView.table.getOperationRow()).toHaveCount(4)
      })

      await test.step('Clear search query', async () => {
        await documentsTab.openapiView.toolbar.searchbar.clear()

        await expect.soft(documentsTab.openapiView.table.getTagRow()).toHaveCount(3)
        await expect.soft(documentsTab.openapiView.table.getOperationRow()).toHaveCount(9 + 5 + 7)
      })
    })

  test('[P-DCPVW-8] Opening the Operations details page from the Document details page',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4524` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { operationPage } = portalPage
      const { documentsTab } = versionPage
      const { slug } = FILE_P_PETSTORE30

      await portalPage.gotoDocument(testVersion, slug)

      await documentsTab.openapiView.toolbar.operationsBtn.click()

      await documentsTab.openapiView.table.openOperation(DEL_PET_V1)

      await expect.soft(operationPage.toolbar.title).toContainText(DEL_PET_V1.title)
    })

  test('[P-DCPPV-3] Switching between Doc and Raw view on the Document Preview page',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4804` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { documentPreviewPage } = versionPage

      await portalPage.gotoDocument(testVersion, FILE_P_PETSTORE30.slug, true)

      await expect.soft(documentPreviewPage.apiSpecView).toBeVisible()

      await documentPreviewPage.toolbar.rawBtn.click()

      await expect.soft(documentPreviewPage.rawView).toBeVisible()

      await documentPreviewPage.toolbar.docBtn.click()

      await expect.soft(documentPreviewPage.apiSpecView).toBeVisible()
    })

  test('[P-DCPPV-4] Navigation through breadcrumbs on the Document Preview page',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4863` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { documentPreviewPage } = versionPage
      const testWorkspace = P_WS_MAIN_R
      const testGroup = IMM_GR

      await portalPage.gotoDocument(testVersion, FILE_P_PETSTORE30.slug, true)
      await documentPreviewPage.toolbar.breadcrumbs.clickPackageVersionLink({
        pkg: testPackage,
        version: testVersion.version,
      })

      await expect.soft(versionPage.toolbar.title).toHaveText(testPackage.name)
      await expect.soft(versionPage.toolbar.versionSlt).toHaveText(testVersion.version)

      await portalPage.gotoDocument(testVersion, FILE_P_PETSTORE30.slug, true)
      await documentPreviewPage.toolbar.breadcrumbs.clickWorkspaceLink(testWorkspace)

      await expect.soft(portalPage.toolbar.titleText).toHaveText(testWorkspace.name)
      await expect.soft(portalPage.table.getRow(testGroup)).toBeVisible()
    })
})
