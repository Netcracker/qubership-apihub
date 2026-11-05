import { test } from '@fixtures'
import { PortalPage } from '@portal/pages/PortalPage'
import { expect, expectText } from '@services/expect-decorator'
import { FILE_ICON, GRAPHQL_ICON, MARKDOWN_ICON, NO_PREV_VERSION, OPENAPI_ICON, SWAGGER_ICON } from '@shared/entities'
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
  PK11,
  PK_PUB_IMM_3,
  PK_PUB_VAR_1,
  PK_PUB_VAR_2,
  V_P_PKG_DRAFT_R,
  V_P_PKG_EDITING_FOR_NEW_REVISION_N,
  V_P_PKG_EDITING_FOR_NEW_VERSION_N,
  V_P_PKG_EDITING_SEARCH_R,
  V_P_PKG_OPERATIONS_REST_R,
} from '@test-data/portal'
import type { Version } from '@test-data/props'
import { PUBLISH_TIMEOUT, TICKET_BASE_URL } from '@test-setup'
import { collectRequestedUrls, mockPreviousVersionInConfig } from './previous-version-package.support'

test.describe('4.3.2 Package publishing via Portal', () => {

  test('[P-PVC-2] Check Upload options',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8914` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { methodsForUploadDialog, configureVersionTab } = versionPage
      const testPackage = PK_PUB_IMM_3

      await test.step('Portal option', async () => {
        await portalPage.gotoPackage(testPackage)
        await versionPage.howToUploadBtn.click()
        await methodsForUploadDialog.toPortalBtn.click()

        await expect(configureVersionTab.filesUploader).toBeVisible()
      })

      // Agent option: covered by [A-GEN-5] Navigation from the Upload options (Agent project).

      await test.step('VS Code Extension option', async () => {
        await portalPage.gotoPackage(testPackage)
        await versionPage.howToUploadBtn.click()

        await expect(methodsForUploadDialog.toVsCodeExtensionBtn).toBeVisible()
      })

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
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-1226` },
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

        //! await expect(packageSettingsPage.versionsTab.getVersionRow('publish-draft')).toBeVisible() //Issue TestCase-B-1226
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

      await expect(configureVersionTab.browseFilesBtn).toBeEnabled()

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
          await expect(configureVersionTab.browseFilesBtn).toBeEnabled()

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
        await versionPage.documentsTab.sidebar.getFileButton(FILE_P_PETSTORE20.testMeta!.docName).click()

        await expect.soft(versionPage.documentsTab.oasView.overview.labels).toHaveText('labellabel 2')
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

      await expect(configureVersionTab.browseFilesBtn).toBeEnabled()

      await configureVersionTab.filesUploader.setInputFiles(FILE_P_PETSTORE30_CHANGED)

      await test.step('Publish Release Version', async () => {
        await configureVersionTab.publishBtn.click()
        await configureVersionTab.publishVersionDialog.fillForm({
          version: '2000.3',
          status: 'release',
          previousVersion: `${testVersion.version} ${testVersion.status}`,
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

  test.describe('Previous version package', () => {
    const URL_ANNOTATION = { type: 'URL', description: 'https://github.com/Netcracker/qubership-apihub/issues/815' }
    const MSG_OPTION_SAME_PACKAGE_RELEASE =
      `${V_P_PKG_EDITING_FOR_NEW_REVISION_N.version} ${V_P_PKG_EDITING_FOR_NEW_REVISION_N.status}`
    const MSG_OPTION_OTHER_PACKAGE_RELEASE = `${V_P_PKG_OPERATIONS_REST_R.version} ${V_P_PKG_OPERATIONS_REST_R.status}`
    const MSG_OPTION_OTHER_PACKAGE_DRAFT = `${V_P_PKG_DRAFT_R.version} ${V_P_PKG_DRAFT_R.status}`
    // A package that does not exist, as a deleted one or one the user cannot read
    const PKG_ID_MISSING = `${PK_PUB_VAR_2.packageId}MISSING`

    /**
     * Published by P-PVC-8 with a previous version from PK11.
     * Its key differs from the previous version's: the backend rejects the same key as a dependency cycle.
     */
    const V_P_PKG_FOREIGN_PREV_N: Version = {
      pkg: PK_PUB_VAR_2,
      version: '2211.2',
      status: 'release',
    }

    test('[P-PVC-7] Select the previous version package',
      {
        annotation: URL_ANNOTATION,
      },
      async ({ sysadminPage: page }) => {

        const portalPage = new PortalPage(page)
        const { configureVersionTab } = portalPage.versionPackagePage
        const { publishVersionDialog } = configureVersionTab
        const { previousVersionPackageAc, previousVersionAc } = publishVersionDialog

        await portalPage.gotoVersionEditing(V_P_PKG_EDITING_FOR_NEW_VERSION_N)
        await configureVersionTab.publishBtn.click()

        await test.step('Verify the current package is selected by default', async () => {
          await expect(previousVersionPackageAc).toHaveValue(PK_PUB_VAR_2.name)
        })

        await publishVersionDialog.fillForm({
          status: 'draft',
          previousVersion: MSG_OPTION_SAME_PACKAGE_RELEASE,
        })

        await test.step('Verify a version of the current package is selected', async () => {
          await expect(previousVersionAc).toHaveValue(V_P_PKG_EDITING_FOR_NEW_REVISION_N.version)
        })

        await publishVersionDialog.fillForm({ previousVersionPackage: PK11 })

        await test.step('Verify the previous version is reset after the package change', async () => {
          await expect(previousVersionPackageAc).toHaveValue(PK11.name)
          await expect(previousVersionAc).toHaveValue(NO_PREV_VERSION)
        })

        await previousVersionAc.click()

        await test.step('Verify draft and release versions of the selected package are offered', async () => {
          await expect.soft(previousVersionAc.getListItem(MSG_OPTION_OTHER_PACKAGE_RELEASE)).toBeVisible()
          await expect.soft(previousVersionAc.getListItem(MSG_OPTION_OTHER_PACKAGE_DRAFT)).toBeVisible()
          await expect.soft(previousVersionAc.getListItem(MSG_OPTION_SAME_PACKAGE_RELEASE)).toBeHidden()
        })

        await previousVersionAc.dropdownBtn.click()
        await publishVersionDialog.fillForm({ status: 'release' })
        await previousVersionAc.click()

        await test.step('Verify only release versions are offered for a release version', async () => {
          await expect(previousVersionAc.getListItem(MSG_OPTION_OTHER_PACKAGE_RELEASE)).toBeVisible()
          await expect(previousVersionAc.getListItem(MSG_OPTION_OTHER_PACKAGE_DRAFT)).toBeHidden()
        })
      })

    test('[P-PVC-8] Publish a version with a previous version from another package',
      {
        annotation: URL_ANNOTATION,
      },
      async ({ sysadminPage: page }) => {

        const portalPage = new PortalPage(page)
        const { versionPackagePage: versionPage } = portalPage
        const { configureVersionTab, overviewTab } = versionPage
        const { publishVersionDialog } = configureVersionTab
        const { summary } = overviewTab.summaryTab.body

        await portalPage.gotoVersionEditing(V_P_PKG_EDITING_FOR_NEW_VERSION_N)
        await configureVersionTab.publishBtn.click()
        await publishVersionDialog.fillForm({
          version: V_P_PKG_FOREIGN_PREV_N.version,
          status: V_P_PKG_FOREIGN_PREV_N.status,
          previousVersionPackage: PK11,
          previousVersion: MSG_OPTION_OTHER_PACKAGE_RELEASE,
        })
        await publishVersionDialog.publishBtn.click()

        await test.step('Verify the version is published into the current package with the previous version', async () => {
          await expect(publishVersionDialog.publishBtn).toBeHidden({ timeout: PUBLISH_TIMEOUT })
          await expect(versionPage.toolbar.title).toHaveText(PK_PUB_VAR_2.name)
          await expect.soft(versionPage.toolbar.versionSlt).toHaveText(V_P_PKG_FOREIGN_PREV_N.version)
          await expect.soft(summary.previousVersion).toHaveText(V_P_PKG_OPERATIONS_REST_R.version)
        })

        await summary.previousVersionLink.click()

        await test.step('Verify the previous version opens in another package', async () => {
          await expect(versionPage.toolbar.title).toHaveText(PK11.name)
          await expect.soft(versionPage.toolbar.versionSlt).toHaveText(V_P_PKG_OPERATIONS_REST_R.version)
        })

        await portalPage.gotoVersionEditing(V_P_PKG_FOREIGN_PREV_N)
        await configureVersionTab.publishBtn.click()

        await test.step('Verify the saved previous version package and version are filled in', async () => {
          await expect(publishVersionDialog.previousVersionPackageAc).toHaveValue(PK11.name)
          await expect(publishVersionDialog.previousVersionAc).toHaveValue(V_P_PKG_OPERATIONS_REST_R.version)
        })
      })

    test('[P-PVC-9] Edit a version whose previous version package is not available',
      {
        annotation: URL_ANNOTATION,
      },
      async ({ sysadminPage: page }) => {

        const portalPage = new PortalPage(page)
        const { configureVersionTab } = portalPage.versionPackagePage
        const { publishVersionDialog } = configureVersionTab
        const testVersion = V_P_PKG_EDITING_FOR_NEW_VERSION_N

        await mockPreviousVersionInConfig(page, testVersion.pkg.packageId, {
          packageId: PKG_ID_MISSING,
          version: V_P_PKG_EDITING_FOR_NEW_REVISION_N.version,
        })
        const requestedUrls = collectRequestedUrls(page)

        await portalPage.gotoVersionEditing(testVersion)
        await configureVersionTab.publishBtn.click()

        await test.step('Verify the dialog stays open with the saved package ID and version', async () => {
          await expect(publishVersionDialog.previousVersionPackageAc).toHaveValue(PKG_ID_MISSING)
          await expect(publishVersionDialog.previousVersionAc).toHaveValue(V_P_PKG_EDITING_FOR_NEW_REVISION_N.version)
        })

        // A 404 for any of these requests would replace the page with the error page
        await test.step('Verify the versions of the missing package are not requested', async () => {
          await expectText(requestedUrls.join('\n')).not.toContain(`/packages/${PKG_ID_MISSING}/versions`)
        })
      })
  })
})
