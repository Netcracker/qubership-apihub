import { test } from '@fixtures'
import { expect, expectFile, expectText } from '@services/expect-decorator'
import { SUCCESS_MSG } from '@shared/entities'
import { PortalPage } from '@portal/pages/PortalPage'
import { BASE_URL, TICKET_BASE_URL } from '@test-setup'
import {
  FILE_P_ARCHIVE,
  FILE_P_GQL_SMALL,
  FILE_P_JSON_SCHEMA_JSON,
  FILE_P_JSON_SCHEMA_YAML,
  FILE_P_MARKDOWN,
  FILE_P_MSOFFICE,
  FILE_P_PETSTORE30,
  FILE_P_PICTURE,
  V_P_PKG_DOCUMENTS_R,
} from '@test-data/portal'
import { VERSION_DOCUMENTS_TAB } from '@portal/entities'

test.describe('7.1 Documents actions (Package)', () => {

  const testVersion = V_P_PKG_DOCUMENTS_R

  test('[P-DCPSE-1] Search documents.',
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

  test('[P-DCPPR-1] Opening the Document Preview page.',
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
      await documentsTab.sidebar.getFileButton(docName).openActionMenu()
      await documentsTab.sidebar.getFileButton(docName).actionMenu.previewItm.click()

      await expect.soft(docPreviewPage.toolbar.title).toHaveText(docTitle!)
      await expect.soft(docPreviewPage.toolbar.simpleBtn).toBeVisible()
      await expect.soft(docPreviewPage.toolbar.detailedBtn).toBeVisible()
      await expect.soft(docPreviewPage.toolbar.breadcrumbs).toBeVisible()
      await expect.soft(docPreviewPage.toolbar.docBtn).toBeVisible()
      await expect.soft(docPreviewPage.toolbar.rawBtn).toBeVisible()
      await expect.soft(docPreviewPage.toolbar.moreMenu).toBeVisible()

      await docPreviewPage.toolbar.backBtn.click()

      await expect(versionPage.overviewTab).toBeVisible()
    })

  test('[P-DCPDN-3] Downloading JSON Schema, MARKDOWN, Picture, Office, Archive files via action menu.',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-1738` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { documentsTab, exportSettingsDialog } = versionPage

      await portalPage.gotoVersion(testVersion, VERSION_DOCUMENTS_TAB)

      await test.step('Download JSON Schema (json)', async () => {
        const fileButton = documentsTab.sidebar.getFileButton(FILE_P_JSON_SCHEMA_JSON.slug)

        await fileButton.openActionMenu()
        await fileButton.actionMenu.exportItm.click()

        const file = await exportSettingsDialog.performExport()

        await expectFile.soft(file).toHaveName(FILE_P_JSON_SCHEMA_JSON.name)
        await expectFile.soft(file).toContainText(FILE_P_JSON_SCHEMA_JSON.testMeta!.jsonString!)
      })

      await test.step('Download JSON Schema (yaml)', async () => {
        const fileButton = documentsTab.sidebar.getFileButton(FILE_P_JSON_SCHEMA_YAML.slug)

        await fileButton.openActionMenu()
        await fileButton.actionMenu.exportItm.click()

        const file = await exportSettingsDialog.performExport()

        await expectFile.soft(file).toHaveName(FILE_P_JSON_SCHEMA_YAML.name)
        await expectFile.soft(file).toContainText(FILE_P_JSON_SCHEMA_YAML.testMeta!.yamlString!)
      })

      await test.step('Download MARKDOWN', async () => {
        const fileButton = documentsTab.sidebar.getFileButton(FILE_P_MARKDOWN.slug)

        await fileButton.openActionMenu()
        await fileButton.actionMenu.exportItm.click()

        const file = await exportSettingsDialog.performExport()

        await expectFile.soft(file).toHaveName(FILE_P_MARKDOWN.name)
        await expectFile.soft(file).toContainText(FILE_P_MARKDOWN.testMeta!.mdString!)
      })

      await test.step('Download Picture file', async () => {
        const fileButton = documentsTab.sidebar.getFileButton(FILE_P_PICTURE.slug)

        await fileButton.openActionMenu()
        await fileButton.actionMenu.exportItm.click()

        const file = await exportSettingsDialog.performExport()

        await expectFile.soft(file).toHaveName(FILE_P_PICTURE.name)
      })

      await test.step('Download Office file', async () => {
        const fileButton = documentsTab.sidebar.getFileButton(FILE_P_MSOFFICE.slug)

        await fileButton.openActionMenu()
        await fileButton.actionMenu.exportItm.click()

        const file = await exportSettingsDialog.performExport()

        await expectFile.soft(file).toHaveName(FILE_P_MSOFFICE.name)
      })

      await test.step('Download Archive file', async () => {
        const fileButton = documentsTab.sidebar.getFileButton(FILE_P_ARCHIVE.slug)

        await fileButton.openActionMenu()
        await fileButton.actionMenu.exportItm.click()

        const file = await exportSettingsDialog.performExport()

        await expectFile.soft(file).toHaveName(FILE_P_ARCHIVE.name)
      })
    })

  test('[P-DCPDN-4] Downloading JSON Schema, MARKDOWN, Picture, Office, Archive files via More menu.',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4984` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { documentsTab, exportSettingsDialog } = versionPage

      await portalPage.gotoVersion(testVersion, VERSION_DOCUMENTS_TAB)

      await test.step('Download JSON Schema (json)', async () => {
        await documentsTab.sidebar.getFileButton(FILE_P_JSON_SCHEMA_JSON.slug).click()
        await documentsTab.toolbar.moreMenu.click()
        await documentsTab.toolbar.moreMenu.exportItm.click()

        const file = await exportSettingsDialog.performExport()

        await expectFile.soft(file).toHaveName(FILE_P_JSON_SCHEMA_JSON.name)
        await expectFile.soft(file).toContainText(FILE_P_JSON_SCHEMA_JSON.testMeta!.jsonString!)
      })

      await test.step('Download JSON Schema (yaml)', async () => {
        await documentsTab.sidebar.getFileButton(FILE_P_JSON_SCHEMA_YAML.slug).click()
        await documentsTab.toolbar.moreMenu.click()
        await documentsTab.toolbar.moreMenu.exportItm.click()

        const file = await exportSettingsDialog.performExport()

        await expectFile.soft(file).toHaveName(FILE_P_JSON_SCHEMA_YAML.name)
        await expectFile.soft(file).toContainText(FILE_P_JSON_SCHEMA_YAML.testMeta!.yamlString!)
      })

      await test.step('Download MARKDOWN', async () => {
        await documentsTab.sidebar.getFileButton(FILE_P_MARKDOWN.slug).click()
        await documentsTab.toolbar.moreMenu.click()
        await documentsTab.toolbar.moreMenu.exportItm.click()

        const file = await exportSettingsDialog.performExport()

        await expectFile.soft(file).toHaveName(FILE_P_MARKDOWN.name)
        await expectFile.soft(file).toContainText(FILE_P_MARKDOWN.testMeta!.mdString!)
      })

      await test.step('Download Picture file', async () => {
        await documentsTab.sidebar.getFileButton(FILE_P_PICTURE.slug).click()
        await documentsTab.toolbar.moreMenu.click()
        await documentsTab.toolbar.moreMenu.exportItm.click()

        const file = await exportSettingsDialog.performExport()

        await expectFile.soft(file).toHaveName(FILE_P_PICTURE.name)
      })

      await test.step('Download Office file', async () => {
        await documentsTab.sidebar.getFileButton(FILE_P_MSOFFICE.slug).click()
        await documentsTab.toolbar.moreMenu.click()
        await documentsTab.toolbar.moreMenu.exportItm.click()

        const file = await exportSettingsDialog.performExport()

        await expectFile.soft(file).toHaveName(FILE_P_MSOFFICE.name)
      })

      await test.step('Download Archive file', async () => {
        await documentsTab.sidebar.getFileButton(FILE_P_ARCHIVE.slug).click()
        await documentsTab.toolbar.moreMenu.click()
        await documentsTab.toolbar.moreMenu.exportItm.click()

        const file = await exportSettingsDialog.performExport()

        await expectFile.soft(file).toHaveName(FILE_P_ARCHIVE.name)
      })
    })

  test('[P-DCPDN-5] Downloading Picture, Office, Archive files via placeholder.',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4985` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { documentsTab, exportSettingsDialog } = versionPage

      await portalPage.gotoVersion(testVersion, VERSION_DOCUMENTS_TAB)

      await test.step('Download Picture file', async () => {
        await documentsTab.sidebar.getFileButton(FILE_P_PICTURE.slug).click()
        await documentsTab.fileView.downloadBtn.click()

        const file = await exportSettingsDialog.performExport()

        await expectFile.soft(file).toHaveName(FILE_P_PICTURE.name)
      })

      await test.step('Download Office file', async () => {
        await documentsTab.sidebar.getFileButton(FILE_P_MSOFFICE.slug).click()
        await documentsTab.fileView.downloadBtn.click()

        const file = await exportSettingsDialog.performExport()

        await expectFile.soft(file).toHaveName(FILE_P_MSOFFICE.name)
      })

      await test.step('Download Archive file', async () => {
        await documentsTab.sidebar.getFileButton(FILE_P_ARCHIVE.slug).click()
        await documentsTab.fileView.downloadBtn.click()

        const file = await exportSettingsDialog.performExport()

        await expectFile.soft(file).toHaveName(FILE_P_ARCHIVE.name)
      })
    })

  test('[P-DCPDN-7] Downloading a GraphQL document via action menu.',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5633` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { documentsTab, exportSettingsDialog } = versionPage

      await portalPage.gotoVersion(testVersion, VERSION_DOCUMENTS_TAB)

      const fileButton = documentsTab.sidebar.getFileButton(FILE_P_GQL_SMALL.slug)

      await fileButton.openActionMenu()
      await fileButton.actionMenu.exportItm.click()

      const file = await exportSettingsDialog.performExport()

      await expectFile.soft(file).toHaveName(FILE_P_GQL_SMALL.name)
      await expectFile.soft(file).toContainText(FILE_P_GQL_SMALL.testMeta!.gqlString!)
    })

  test('[P-DCPDN-8] Downloading a GraphQL document via More menu.',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-11972` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { documentsTab, exportSettingsDialog } = versionPage

      await portalPage.gotoVersion(testVersion, VERSION_DOCUMENTS_TAB)

      const fileButton = documentsTab.sidebar.getFileButton(FILE_P_GQL_SMALL.slug)

      await fileButton.openActionMenu()
      await fileButton.actionMenu.exportItm.click()

      const file = await exportSettingsDialog.performExport()

      await expectFile.soft(file).toHaveName(FILE_P_GQL_SMALL.name)
      await expectFile.soft(file).toContainText(FILE_P_GQL_SMALL.testMeta!.gqlString!)
    })

  test('[P-DCPSH-1.1] Sharing a REST API document via action menu.',
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

      await portalPage.gotoVersion(testVersion, VERSION_DOCUMENTS_TAB)

      const docButton = documentsTab.sidebar.getFileButton(docName)

      await test.step('Copy page template', async () => {
        await docButton.openActionMenu()
        const clipboard = await docButton.actionMenu.copyPageTemplate()

        await expect(portalPage.snackbar).toContainText(SUCCESS_MSG)
        await expect(portalPage.snackbar).toContainText('Template copied')
        await expectText(clipboard).toContain(`apiDescriptionUrl="${BASE_URL.origin}/api/v2/sharedFiles/`)
      })

      await test.step('Copy public link to source', async () => {
        await docButton.openActionMenu()
        const clipboard = await docButton.actionMenu.copyPublicLink()

        await expect(portalPage.snackbar).toContainText(SUCCESS_MSG)
        await expect(portalPage.snackbar).toContainText('Link copied')
        await expectText(clipboard).toContain(`${BASE_URL.origin}/api/v2/sharedFiles/`)

        const file = await portalPage.downloadFile(clipboard)

        await expectFile.soft(file).toHaveName(`${slug}.json`)
        await expectFile.soft(file).toContainText(jsonString!)
        await expectFile.soft(file).toContainText(jsonRefString!)
      })
    })

  test('[P-DCPSH-1.2] Sharing a public link to source of old revision of REST API document.',
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

      const docButton = documentsTab.sidebar.getFileButton(docName)

      await test.step('Copy public link to source', async () => {
        await docButton.openActionMenu()
        const clipboard = await docButton.actionMenu.copyPublicLink()

        await expect(portalPage.snackbar).toContainText(SUCCESS_MSG)
        await expect(portalPage.snackbar).toContainText('Link copied')
        await expectText(clipboard).toContain(`${BASE_URL.origin}/api/v2/sharedFiles/`)

        const file = await portalPage.downloadFile(clipboard)

        await expectFile.soft(file).toHaveName(`${slug}.json`)
        await expectFile.soft(file).toContainText(jsonString!)
        await expectFile.soft(file).toContainText(jsonRefString!)
      })
    })

  test('[P-DCPSH-2] Sharing a REST API document via More menu.',
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

      await test.step('Copy page template', async () => {
        await documentsTab.toolbar.moreMenu.click()
        const clipboard = await documentsTab.toolbar.moreMenu.copyPageTemplate()

        await expect(portalPage.snackbar).toContainText(SUCCESS_MSG)
        await expect(portalPage.snackbar).toContainText('Template copied')
        await expectText(clipboard).toContain(`apiDescriptionUrl="${BASE_URL.origin}/api/v2/sharedFiles/`)
      })

      await test.step('Copy public link to source', async () => {
        await documentsTab.toolbar.moreMenu.click()
        const clipboard = await documentsTab.toolbar.moreMenu.copyPublicLink()

        await expect(portalPage.snackbar).toContainText(SUCCESS_MSG)
        await expect(portalPage.snackbar).toContainText('Link copied')
        await expectText(clipboard).toContain(`${BASE_URL.origin}/api/v2/sharedFiles/`)

        const file = await portalPage.downloadFile(clipboard)

        await expectFile.soft(file).toHaveName(`${slug}.json`)
        await expectFile.soft(file).toContainText(jsonString!)
        await expectFile.soft(file).toContainText(jsonRefString!)
      })
    })

  test('[P-DCPSH-3] Sharing a MARKDOWN document via action menu.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4513` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { documentsTab } = versionPage
      const { slug } = FILE_P_MARKDOWN
      const { mdString } = FILE_P_MARKDOWN.testMeta!

      await portalPage.gotoVersion(testVersion, VERSION_DOCUMENTS_TAB)

      const docButton = documentsTab.sidebar.getFileButton(slug)

      await test.step('Copy public link to source', async () => {
        await docButton.openActionMenu()
        const clipboard = await docButton.actionMenu.copyPublicLink()

        await expect(portalPage.snackbar).toContainText(SUCCESS_MSG)
        await expect(portalPage.snackbar).toContainText('Link copied')
        await expectText(clipboard).toContain(`${BASE_URL.origin}/api/v2/sharedFiles/`)

        const file = await portalPage.downloadFile(clipboard)

        await expectFile.soft(file).toHaveName(`${slug}.md`)
        await expectFile.soft(file).toContainText(mdString!)
      })
    })

  test('[P-DCPSH-4] Sharing a MARKDOWN document via More menu.',
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

      await test.step('Copy public link to source', async () => {
        await documentsTab.toolbar.moreMenu.click()
        const clipboard = await documentsTab.toolbar.moreMenu.copyPublicLink()

        await expect(portalPage.snackbar).toContainText(SUCCESS_MSG)
        await expect(portalPage.snackbar).toContainText('Link copied')
        await expectText(clipboard).toContain(`${BASE_URL.origin}/api/v2/sharedFiles/`)

        const file = await portalPage.downloadFile(clipboard)

        await expectFile.soft(file).toHaveName(`${slug}.md`)
        await expectFile.soft(file).toContainText(mdString!)
      })
    })

  test('[P-DCPSH-5] Sharing a GraphQL document via action menu.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-11973` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { documentsTab } = versionPage
      const { slug, name } = FILE_P_GQL_SMALL
      const { gqlString } = FILE_P_GQL_SMALL.testMeta!

      await portalPage.gotoVersion(testVersion, VERSION_DOCUMENTS_TAB)

      const docButton = documentsTab.sidebar.getFileButton(slug)

      await test.step('Copy public link to source', async () => {
        await docButton.openActionMenu()
        const clipboard = await docButton.actionMenu.copyPublicLink()

        await expect(portalPage.snackbar).toContainText(SUCCESS_MSG)
        await expect(portalPage.snackbar).toContainText('Link copied')
        await expectText(clipboard).toContain(`${BASE_URL.origin}/api/v2/sharedFiles/`)

        const file = await portalPage.downloadFile(clipboard)

        await expectFile.soft(file).toHaveName(name)
        await expectFile.soft(file).toContainText(gqlString!)
      })
    })

  test('[P-DCPSH-6] Sharing a GraphQL document via More menu.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-11973` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { documentsTab } = versionPage
      const { slug, name } = FILE_P_GQL_SMALL
      const { gqlString } = FILE_P_GQL_SMALL.testMeta!

      await portalPage.gotoDocument(testVersion, slug)

      await test.step('Copy public link to source', async () => {
        await documentsTab.toolbar.moreMenu.click()
        const clipboard = await documentsTab.toolbar.moreMenu.copyPublicLink()

        await expect(portalPage.snackbar).toContainText(SUCCESS_MSG)
        await expect(portalPage.snackbar).toContainText('Link copied')
        await expectText(clipboard).toContain(`${BASE_URL.origin}/api/v2/sharedFiles/`)

        const file = await portalPage.downloadFile(clipboard)

        await expectFile.soft(file).toHaveName(name)
        await expectFile.soft(file).toContainText(gqlString!)
      })
    })
})
