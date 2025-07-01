import { test } from '@fixtures'
import { expect, expectFile } from '@services/expect-decorator'
import { PortalPage } from '@portal/pages/PortalPage'
import { TICKET_BASE_URL } from '@test-setup'
import {
  DSH_P_ADMIN_N,
  DSH_P_EDITOR_N,
  DSH_P_OWNER_N,
  DSH_P_VIEWER_R,
  FILE_P_PETSTORE30,
  FILE_P_PETSTORE30_CHANGELOG_BASE,
  OGR_DMGR_DOWNLOAD_GQL_R,
  OGR_DMGR_DOWNLOAD_REST_R,
  OGR_DSH_UAC_ADMIN_REST_DOWNLOADING_N,
  OGR_DSH_UAC_EDITOR_REST_DOWNLOADING_N,
  OGR_DSH_UAC_OWNER_REST_DOWNLOADING_N,
  OGR_PMGR_DOWNLOAD_GQL_R,
  OGR_PMGR_DOWNLOAD_PUBLISH_N,
  OGR_PMGR_DOWNLOAD_REST_R,
  OGR_UAC_DSH_REST,
  ORG_PKG_UAC_ADMIN_REST_DOWNLOADING_N,
  ORG_PKG_UAC_EDITOR_REST_DOWNLOADING_N,
  ORG_PKG_UAC_OWNER_REST_DOWNLOADING_N,
  ORG_UAC_PKG_REST,
  P_DSH_DMGR_R,
  P_PKG_PMGR_R,
  PK11,
  PKG_P_ADMIN_N,
  PKG_P_EDITOR_N,
  PKG_P_OWNER_N,
  PKG_P_VIEWER_R,
  V_DSH_DMGR_CHANGED_R,
  V_P_DSH_UAC_ADMIN_CHANGED_N,
  V_P_DSH_UAC_EDITOR_CHANGED_N,
  V_P_DSH_UAC_OWNER_CHANGED_N,
  V_P_DSH_UAC_VIEWER_CHANGED_R,
  V_P_PKG_DOCUMENTS_R,
  V_P_PKG_UAC_ADMIN_CHANGED_N,
  V_P_PKG_UAC_EDITOR_CHANGED_N,
  V_P_PKG_UAC_OWNER_CHANGED_N,
  V_P_PKG_UAC_VIEWER_CHANGED_R,
  V_PKG_PMGR_CHANGED_R,
  V_PKG_PMGR_DOWNLOAD_PUBLISH_N,
  V_PKG_PPGR_REST_CHANGED_R,
} from '@test-data/portal'
import { VERSION_CHANGES_TAB_REST, VERSION_DOCUMENTS_TAB, VERSION_OVERVIEW_TAB_GROUPS } from '@portal/entities'
import { type DownloadedTestFile, ROOT_DOWNLOADS, TestFile } from '@shared/entities'
import path from 'node:path'

// Set timeout for all tests in this file to 140 seconds
test.setTimeout(140_000)

test.describe('03.1.1.0 Access Control. Viewer role. (Package)', () => {

  const testPackage = PKG_P_VIEWER_R
  const testVersion = V_P_PKG_UAC_VIEWER_CHANGED_R
  const prefixGroupName = 'v1'
  const manualGroupName = ORG_UAC_PKG_REST.groupName

  test('[P-ACVP-01.3] Package. Viewer. Exporting operation groups.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8568` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { exportSettingsDialog: exportDialog } = versionPage
      const { groupsTab } = versionPage.overviewTab

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)

      await test.step('Prefix group', async () => {

        await test.step('Export as combined YAML', async () => {
          await groupsTab.getGroupRow(prefixGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'combined', fileFormat: 'yaml' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${prefixGroupName}.yaml`)
        })

        await test.step('Export as combined JSON', async () => {
          await groupsTab.getGroupRow(prefixGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'combined', fileFormat: 'json' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${prefixGroupName}.json`)
        })

        await test.step('Export as combined HTML', async () => {
          await groupsTab.getGroupRow(prefixGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'combined', fileFormat: 'html' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${prefixGroupName}.zip`)
        })

        await test.step('Export as reduced YAML', async () => {
          await groupsTab.getGroupRow(prefixGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'yaml' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${prefixGroupName}.yaml`)
        })

        await test.step('Export as reduced JSON', async () => {
          await groupsTab.getGroupRow(prefixGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'json' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${prefixGroupName}.json`)
        })

        await test.step('Export as reduced HTML', async () => {
          await groupsTab.getGroupRow(prefixGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'html' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${prefixGroupName}.zip`)
        })
      })

      await test.step('Manual group', async () => {

        await test.step('Export as combined YAML', async () => {
          await groupsTab.getGroupRow(manualGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'combined', fileFormat: 'yaml' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${manualGroupName}.yaml`)
        })

        await test.step('Export as combined JSON', async () => {
          await groupsTab.getGroupRow(manualGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'combined', fileFormat: 'json' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${manualGroupName}.json`)
        })

        await test.step('Export as combined HTML', async () => {
          await groupsTab.getGroupRow(manualGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'combined', fileFormat: 'html' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${manualGroupName}.zip`)
        })

        await test.step('Export as reduced YAML', async () => {
          await groupsTab.getGroupRow(manualGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'yaml' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${manualGroupName}.yaml`)
        })

        await test.step('Export as reduced JSON', async () => {
          await groupsTab.getGroupRow(manualGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'json' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${manualGroupName}.json`)
        })

        await test.step('Export as reduced HTML', async () => {
          await groupsTab.getGroupRow(manualGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'html' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${manualGroupName}.zip`)
        })
      })
    })

  test('[P-ACVP-01.5] Package. Viewer. Exporting documents.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8568` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { exportSettingsDialog: exportDialog } = versionPage
      const { documentsTab } = versionPage
      const { slug } = FILE_P_PETSTORE30_CHANGELOG_BASE
      const { docName } = FILE_P_PETSTORE30.testMeta!

      await portalPage.gotoVersion(testVersion, VERSION_DOCUMENTS_TAB)

      const docButton = documentsTab.sidebar.getFileButton(docName)

      await test.step('Export as YAML', async () => {
        await docButton.openActionMenu()
        await docButton.actionMenu.exportItm.click()
        await exportDialog.fillForm({ fileFormat: 'yaml' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile.soft(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${slug}.yaml`)
      })

      await test.step('Export as JSON', async () => {
        await docButton.openActionMenu()
        await docButton.actionMenu.exportItm.click()
        await exportDialog.fillForm({ fileFormat: 'json' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile.soft(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${slug}.json`)
      })

      await test.step('Export as HTML', async () => {
        await docButton.openActionMenu()
        await docButton.actionMenu.exportItm.click()
        await exportDialog.fillForm({ fileFormat: 'html' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${slug}.zip`)
      })
    })
})

test.describe('03.1.2.0 Access Control. Viewer role. (Dashboard)', () => {

  const testPackage = PKG_P_VIEWER_R
  const testDashboard = DSH_P_VIEWER_R
  const testDashboardVersion = V_P_DSH_UAC_VIEWER_CHANGED_R
  const testPackageVersion = V_P_PKG_UAC_VIEWER_CHANGED_R
  const manualGroupName = OGR_UAC_DSH_REST.groupName

  test('[P-ACVD-01.3] Dashboard. Viewer. Exporting operation groups.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8578` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { exportSettingsDialog: exportDialog } = versionPage
      const { groupsTab } = versionPage.overviewTab

      await portalPage.gotoVersion(testDashboardVersion, VERSION_OVERVIEW_TAB_GROUPS)

      await test.step('Manual group', async () => {

        await test.step('Export as combined YAML', async () => {
          await groupsTab.getGroupRow(manualGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'combined', fileFormat: 'yaml' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testDashboard.packageId}_${testDashboardVersion.version}_${manualGroupName}.yaml`)
        })

        await test.step('Export as combined JSON', async () => {
          await groupsTab.getGroupRow(manualGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'combined', fileFormat: 'json' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testDashboard.packageId}_${testDashboardVersion.version}_${manualGroupName}.json`)
        })

        await test.step('Export as combined HTML', async () => {
          await groupsTab.getGroupRow(manualGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'combined', fileFormat: 'html' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testDashboard.packageId}_${testDashboardVersion.version}_${manualGroupName}.zip`)
        })

        await test.step('Export as reduced YAML', async () => {
          await groupsTab.getGroupRow(manualGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'yaml' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testDashboard.packageId}_${testDashboardVersion.version}_${manualGroupName}.yaml`)
        })

        await test.step('Export as reduced JSON', async () => {
          await groupsTab.getGroupRow(manualGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'json' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testDashboard.packageId}_${testDashboardVersion.version}_${manualGroupName}.json`)
        })

        await test.step('Export as reduced HTML', async () => {
          await groupsTab.getGroupRow(manualGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'html' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testDashboard.packageId}_${testDashboardVersion.version}_${manualGroupName}.zip`)
        })
      })
    })

  test('[P-ACVD-01.5] Dashboard. Viewer. Exporting documents.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8578` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { exportSettingsDialog: exportDialog } = versionPage
      const { documentsTab } = versionPage
      const { slug } = FILE_P_PETSTORE30_CHANGELOG_BASE
      const { docName } = FILE_P_PETSTORE30.testMeta!

      await portalPage.gotoVersion(testDashboardVersion)
      await documentsTab.click()
      await documentsTab.sidebar.packageFilterAc.click()
      await documentsTab.sidebar.packageFilterAc.getListItem(testPackage.name).click()
      const docButton = documentsTab.sidebar.getFileButton(docName)

      await test.step('Export as YAML', async () => {
        await docButton.openActionMenu()
        await docButton.actionMenu.exportItm.click()
        await exportDialog.fillForm({ fileFormat: 'yaml' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile.soft(file).toHaveName(`${testPackage.packageId}_${testPackageVersion.version}_${slug}.yaml`)
      })

      await test.step('Export as JSON', async () => {
        await docButton.openActionMenu()
        await docButton.actionMenu.exportItm.click()
        await exportDialog.fillForm({ fileFormat: 'json' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile.soft(file).toHaveName(`${testPackage.packageId}_${testPackageVersion.version}_${slug}.json`)
      })

      await test.step('Export as HTML', async () => {
        await docButton.openActionMenu()
        await docButton.actionMenu.exportItm.click()
        await exportDialog.fillForm({ fileFormat: 'html' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testPackage.packageId}_${testPackageVersion.version}_${slug}.zip`)
      })
    })
})

test.describe('03.2.1.0 Access Control. Editor role. (Package)', () => {

  const testPackage = PKG_P_EDITOR_N
  const testVersion = V_P_PKG_UAC_EDITOR_CHANGED_N
  const prefixGroupName = 'v1'
  const downloadingGroupName = ORG_PKG_UAC_EDITOR_REST_DOWNLOADING_N.groupName

  test('[P-ACEP-01.6] Package. Editor. Exporting operation groups.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10485` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { exportSettingsDialog: exportDialog } = versionPage
      const { groupsTab } = versionPage.overviewTab

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)

      await test.step('Prefix group', async () => {

        await test.step('Export as combined YAML', async () => {
          await groupsTab.getGroupRow(prefixGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'combined', fileFormat: 'yaml' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${prefixGroupName}.yaml`)
        })

        await test.step('Export as combined JSON', async () => {
          await groupsTab.getGroupRow(prefixGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'combined', fileFormat: 'json' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${prefixGroupName}.json`)
        })

        await test.step('Export as combined HTML', async () => {
          await groupsTab.getGroupRow(prefixGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'combined', fileFormat: 'html' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${prefixGroupName}.zip`)
        })

        await test.step('Export as reduced YAML', async () => {
          await groupsTab.getGroupRow(prefixGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'yaml' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${prefixGroupName}.yaml`)
        })

        await test.step('Export as reduced JSON', async () => {
          await groupsTab.getGroupRow(prefixGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'json' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${prefixGroupName}.json`)
        })

        await test.step('Export as reduced HTML', async () => {
          await groupsTab.getGroupRow(prefixGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'html' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${prefixGroupName}.zip`)
        })
      })

      await test.step('Manual group', async () => {

        await test.step('Export as combined YAML', async () => {
          await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'combined', fileFormat: 'yaml' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${downloadingGroupName}.yaml`)
        })

        await test.step('Export as combined JSON', async () => {
          await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'combined', fileFormat: 'json' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${downloadingGroupName}.json`)
        })

        await test.step('Export as combined HTML', async () => {
          await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'combined', fileFormat: 'html' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${downloadingGroupName}.zip`)
        })

        await test.step('Export as reduced YAML', async () => {
          await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'yaml' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${downloadingGroupName}.yaml`)
        })

        await test.step('Export as reduced JSON', async () => {
          await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'json' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${downloadingGroupName}.json`)
        })

        await test.step('Export as reduced HTML', async () => {
          await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'html' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${downloadingGroupName}.zip`)
        })
      })
    })

  test('[P-ACEP-01.8] Package. Editor. Exporting documents.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10485` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { exportSettingsDialog: exportDialog } = versionPage
      const { documentsTab } = versionPage
      const { slug } = FILE_P_PETSTORE30_CHANGELOG_BASE
      const { docName } = FILE_P_PETSTORE30.testMeta!

      await portalPage.gotoVersion(testVersion)
      await documentsTab.click()
      const docButton = documentsTab.sidebar.getFileButton(docName)

      await test.step('Export as YAML', async () => {
        await docButton.openActionMenu()
        await docButton.actionMenu.exportItm.click()
        await exportDialog.fillForm({ fileFormat: 'yaml' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile.soft(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${slug}.yaml`)
      })

      await test.step('Export as JSON', async () => {
        await docButton.openActionMenu()
        await docButton.actionMenu.exportItm.click()
        await exportDialog.fillForm({ fileFormat: 'json' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile.soft(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${slug}.json`)
      })

      await test.step('Export as HTML', async () => {
        await docButton.openActionMenu()
        await docButton.actionMenu.exportItm.click()
        await exportDialog.fillForm({ fileFormat: 'html' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${slug}.zip`)
      })
    })
})

test.describe('03.2.2.0 Access Control. Editor role. (Dashboard)', () => {

  const testPackage = PKG_P_EDITOR_N
  const testDashboard = DSH_P_EDITOR_N
  const testDashboardVersion = V_P_DSH_UAC_EDITOR_CHANGED_N
  const testPackageVersion = V_P_PKG_UAC_EDITOR_CHANGED_N
  const downloadingGroupName = OGR_DSH_UAC_EDITOR_REST_DOWNLOADING_N.groupName

  test('[P-ACED-01.6] Dashboard. Editor. Exporting operation group.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10488` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { exportSettingsDialog: exportDialog } = versionPage
      const { groupsTab } = versionPage.overviewTab

      await portalPage.gotoVersion(testDashboardVersion, VERSION_OVERVIEW_TAB_GROUPS)

      await test.step('Export as combined YAML', async () => {
        await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'combined', fileFormat: 'yaml' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testDashboard.packageId}_${testDashboardVersion.version}_${downloadingGroupName}.yaml`)
      })

      await test.step('Export as combined JSON', async () => {
        await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'combined', fileFormat: 'json' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testDashboard.packageId}_${testDashboardVersion.version}_${downloadingGroupName}.json`)
      })

      await test.step('Export as combined HTML', async () => {
        await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'combined', fileFormat: 'html' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testDashboard.packageId}_${testDashboardVersion.version}_${downloadingGroupName}.zip`)
      })

      await test.step('Export as reduced YAML', async () => {
        await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'yaml' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testDashboard.packageId}_${testDashboardVersion.version}_${downloadingGroupName}.yaml`)
      })

      await test.step('Export as reduced JSON', async () => {
        await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'json' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testDashboard.packageId}_${testDashboardVersion.version}_${downloadingGroupName}.json`)
      })

      await test.step('Export as reduced HTML', async () => {
        await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'html' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testDashboard.packageId}_${testDashboardVersion.version}_${downloadingGroupName}.zip`)
      })
    })

  test('[P-ACED-01.8] Dashboard. Editor. Exporting documents.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10488` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { exportSettingsDialog: exportDialog } = versionPage
      const { documentsTab } = versionPage
      const { slug } = FILE_P_PETSTORE30_CHANGELOG_BASE
      const { docName } = FILE_P_PETSTORE30.testMeta!

      await portalPage.gotoVersion(testDashboardVersion)
      await documentsTab.click()
      await documentsTab.sidebar.packageFilterAc.set(testPackage.name)
      const docButton = documentsTab.sidebar.getFileButton(docName)

      await test.step('Export as YAML', async () => {
        await docButton.openActionMenu()
        await docButton.actionMenu.exportItm.click()
        await exportDialog.fillForm({ fileFormat: 'yaml' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile.soft(file).toHaveName(`${testPackage.packageId}_${testPackageVersion.version}_${slug}.yaml`)
      })

      await test.step('Export as JSON', async () => {
        await docButton.openActionMenu()
        await docButton.actionMenu.exportItm.click()
        await exportDialog.fillForm({ fileFormat: 'json' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile.soft(file).toHaveName(`${testPackage.packageId}_${testPackageVersion.version}_${slug}.json`)
      })

      await test.step('Export as HTML', async () => {
        await docButton.openActionMenu()
        await docButton.actionMenu.exportItm.click()
        await exportDialog.fillForm({ fileFormat: 'html' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testPackage.packageId}_${testPackageVersion.version}_${slug}.zip`)
      })
    })
})

test.describe('03.3.1.0 Access Control. Owner role. (Package)', () => {

  const testPackage = PKG_P_OWNER_N
  const testVersion = V_P_PKG_UAC_OWNER_CHANGED_N
  const prefixGroupName = 'v1'
  const downloadingGroupName = ORG_PKG_UAC_OWNER_REST_DOWNLOADING_N.groupName

  test('[P-ACOP-01.6] Package. Owner. Exporting operation groups.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10545` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { exportSettingsDialog: exportDialog } = versionPage
      const { groupsTab } = versionPage.overviewTab

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)

      await test.step('Prefix group', async () => {

        await test.step('Export as combined YAML', async () => {
          await groupsTab.getGroupRow(prefixGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'combined', fileFormat: 'yaml' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${prefixGroupName}.yaml`)
        })

        await test.step('Export as combined JSON', async () => {
          await groupsTab.getGroupRow(prefixGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'combined', fileFormat: 'json' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${prefixGroupName}.json`)
        })

        await test.step('Export as combined HTML', async () => {
          await groupsTab.getGroupRow(prefixGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'combined', fileFormat: 'html' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${prefixGroupName}.zip`)
        })

        await test.step('Export as reduced YAML', async () => {
          await groupsTab.getGroupRow(prefixGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'yaml' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${prefixGroupName}.yaml`)
        })

        await test.step('Export as reduced JSON', async () => {
          await groupsTab.getGroupRow(prefixGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'json' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${prefixGroupName}.json`)
        })

        await test.step('Export as reduced HTML', async () => {
          await groupsTab.getGroupRow(prefixGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'html' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${prefixGroupName}.zip`)
        })
      })

      await test.step('Manual group', async () => {

        await test.step('Export as combined YAML', async () => {
          await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'combined', fileFormat: 'yaml' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${downloadingGroupName}.yaml`)
        })

        await test.step('Export as combined JSON', async () => {
          await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'combined', fileFormat: 'json' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${downloadingGroupName}.json`)
        })

        await test.step('Export as combined HTML', async () => {
          await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'combined', fileFormat: 'html' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${downloadingGroupName}.zip`)
        })

        await test.step('Export as reduced YAML', async () => {
          await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'yaml' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${downloadingGroupName}.yaml`)
        })

        await test.step('Export as reduced JSON', async () => {
          await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'json' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${downloadingGroupName}.json`)
        })

        await test.step('Export as reduced HTML', async () => {
          await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'html' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${downloadingGroupName}.zip`)
        })
      })
    })

  test('[P-ACOP-01.8] Package. Owner. Exporting documents.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10545` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { exportSettingsDialog: exportDialog } = versionPage
      const { documentsTab } = versionPage
      const { slug } = FILE_P_PETSTORE30_CHANGELOG_BASE
      const { docName } = FILE_P_PETSTORE30.testMeta!

      await portalPage.gotoVersion(testVersion)
      await documentsTab.click()
      const docButton = documentsTab.sidebar.getFileButton(docName)

      await test.step('Export as YAML', async () => {
        await docButton.openActionMenu()
        await docButton.actionMenu.exportItm.click()
        await exportDialog.fillForm({ fileFormat: 'yaml' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile.soft(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${slug}.yaml`)
      })

      await test.step('Export as JSON', async () => {
        await docButton.openActionMenu()
        await docButton.actionMenu.exportItm.click()
        await exportDialog.fillForm({ fileFormat: 'json' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile.soft(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${slug}.json`)
      })

      await test.step('Export as HTML', async () => {
        await docButton.openActionMenu()
        await docButton.actionMenu.exportItm.click()
        await exportDialog.fillForm({ fileFormat: 'html' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${slug}.zip`)
      })
    })
})

test.describe('03.3.2.0 Access Control. Owner role. (Dashboard)', () => {

  const testPackage = PKG_P_OWNER_N
  const testDashboard = DSH_P_OWNER_N
  const testDashboardVersion = V_P_DSH_UAC_OWNER_CHANGED_N
  const testPackageVersion = V_P_PKG_UAC_OWNER_CHANGED_N
  const downloadingGroupName = OGR_DSH_UAC_OWNER_REST_DOWNLOADING_N.groupName

  test('[P-ACOD-01.6] Dashboard. Owner. Exporting operation group.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10548` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { exportSettingsDialog: exportDialog } = versionPage
      const { groupsTab } = versionPage.overviewTab

      await portalPage.gotoVersion(testDashboardVersion, VERSION_OVERVIEW_TAB_GROUPS)

      await test.step('Export as combined YAML', async () => {
        await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'combined', fileFormat: 'yaml' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testDashboard.packageId}_${testDashboardVersion.version}_${downloadingGroupName}.yaml`)
      })

      await test.step('Export as combined JSON', async () => {
        await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'combined', fileFormat: 'json' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testDashboard.packageId}_${testDashboardVersion.version}_${downloadingGroupName}.json`)
      })

      await test.step('Export as combined HTML', async () => {
        await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'combined', fileFormat: 'html' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testDashboard.packageId}_${testDashboardVersion.version}_${downloadingGroupName}.zip`)
      })

      await test.step('Export as reduced YAML', async () => {
        await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'yaml' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testDashboard.packageId}_${testDashboardVersion.version}_${downloadingGroupName}.yaml`)
      })

      await test.step('Export as reduced JSON', async () => {
        await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'json' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testDashboard.packageId}_${testDashboardVersion.version}_${downloadingGroupName}.json`)
      })

      await test.step('Export as reduced HTML', async () => {
        await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'html' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testDashboard.packageId}_${testDashboardVersion.version}_${downloadingGroupName}.zip`)
      })
    })

  test('[P-ACOD-01.8] Dashboard. Owner. Exporting documents.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10548` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { exportSettingsDialog: exportDialog } = versionPage
      const { documentsTab } = versionPage
      const { slug } = FILE_P_PETSTORE30_CHANGELOG_BASE
      const { docName } = FILE_P_PETSTORE30.testMeta!

      await portalPage.gotoVersion(testDashboardVersion)
      await documentsTab.click()
      await documentsTab.sidebar.packageFilterAc.set(testPackage.name)
      const docButton = documentsTab.sidebar.getFileButton(docName)

      await test.step('Export as YAML', async () => {
        await docButton.openActionMenu()
        await docButton.actionMenu.exportItm.click()
        await exportDialog.fillForm({ fileFormat: 'yaml' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile.soft(file).toHaveName(`${testPackage.packageId}_${testPackageVersion.version}_${slug}.yaml`)
      })

      await test.step('Export as JSON', async () => {
        await docButton.openActionMenu()
        await docButton.actionMenu.exportItm.click()
        await exportDialog.fillForm({ fileFormat: 'json' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile.soft(file).toHaveName(`${testPackage.packageId}_${testPackageVersion.version}_${slug}.json`)
      })

      await test.step('Export as HTML', async () => {
        await docButton.openActionMenu()
        await docButton.actionMenu.exportItm.click()
        await exportDialog.fillForm({ fileFormat: 'html' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testPackage.packageId}_${testPackageVersion.version}_${slug}.zip`)
      })
    })
})

test.describe('03.4.1.0 Access Control. Admin role. (Package)', () => {

  const testPackage = PKG_P_ADMIN_N
  const testVersion = V_P_PKG_UAC_ADMIN_CHANGED_N
  const prefixGroupName = 'v1'
  const downloadingGroupName = ORG_PKG_UAC_ADMIN_REST_DOWNLOADING_N.groupName

  test('[P-ACAP-01.6] Package. Admin. Exporting operation groups.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10611` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { exportSettingsDialog: exportDialog } = versionPage
      const { groupsTab } = versionPage.overviewTab

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)

      await test.step('Prefix group', async () => {

        await test.step('Export as combined YAML', async () => {
          await groupsTab.getGroupRow(prefixGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'combined', fileFormat: 'yaml' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${prefixGroupName}.yaml`)
        })

        await test.step('Export as combined JSON', async () => {
          await groupsTab.getGroupRow(prefixGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'combined', fileFormat: 'json' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${prefixGroupName}.json`)
        })

        await test.step('Export as combined HTML', async () => {
          await groupsTab.getGroupRow(prefixGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'combined', fileFormat: 'html' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${prefixGroupName}.zip`)
        })

        await test.step('Export as reduced YAML', async () => {
          await groupsTab.getGroupRow(prefixGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'yaml' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${prefixGroupName}.yaml`)
        })

        await test.step('Export as reduced JSON', async () => {
          await groupsTab.getGroupRow(prefixGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'json' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${prefixGroupName}.json`)
        })

        await test.step('Export as reduced HTML', async () => {
          await groupsTab.getGroupRow(prefixGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'html' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${prefixGroupName}.zip`)
        })
      })

      await test.step('Manual group', async () => {

        await test.step('Export as combined YAML', async () => {
          await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'combined', fileFormat: 'yaml' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${downloadingGroupName}.yaml`)
        })

        await test.step('Export as combined JSON', async () => {
          await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'combined', fileFormat: 'json' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${downloadingGroupName}.json`)
        })

        await test.step('Export as combined HTML', async () => {
          await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'combined', fileFormat: 'html' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${downloadingGroupName}.zip`)
        })

        await test.step('Export as reduced YAML', async () => {
          await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'yaml' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${downloadingGroupName}.yaml`)
        })

        await test.step('Export as reduced JSON', async () => {
          await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'json' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${downloadingGroupName}.json`)
        })

        await test.step('Export as reduced HTML', async () => {
          await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
          await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'html' })

          const file = await exportDialog.performExport()

          await expect(exportDialog.exportBtn).toBeHidden()
          await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${downloadingGroupName}.zip`)
        })
      })
    })

  test('[P-ACAP-01.8] Package. Admin. Exporting documents.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10611` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { exportSettingsDialog: exportDialog } = versionPage
      const { documentsTab } = versionPage
      const { slug } = FILE_P_PETSTORE30_CHANGELOG_BASE
      const { docName } = FILE_P_PETSTORE30.testMeta!

      await portalPage.gotoVersion(testVersion)
      await documentsTab.click()
      const docButton = documentsTab.sidebar.getFileButton(docName)

      await test.step('Export as YAML', async () => {
        await docButton.openActionMenu()
        await docButton.actionMenu.exportItm.click()
        await exportDialog.fillForm({ fileFormat: 'yaml' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile.soft(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${slug}.yaml`)
      })

      await test.step('Export as JSON', async () => {
        await docButton.openActionMenu()
        await docButton.actionMenu.exportItm.click()
        await exportDialog.fillForm({ fileFormat: 'json' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile.soft(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${slug}.json`)
      })

      await test.step('Export as HTML', async () => {
        await docButton.openActionMenu()
        await docButton.actionMenu.exportItm.click()
        await exportDialog.fillForm({ fileFormat: 'html' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${slug}.zip`)
      })
    })
})

test.describe('03.4.2.0 Access Control. Admin role. (Dashboard)', () => {

  const testPackage = PKG_P_ADMIN_N
  const testDashboard = DSH_P_ADMIN_N
  const testDashboardVersion = V_P_DSH_UAC_ADMIN_CHANGED_N
  const testPackageVersion = V_P_PKG_UAC_ADMIN_CHANGED_N
  const downloadingGroupName = OGR_DSH_UAC_ADMIN_REST_DOWNLOADING_N.groupName

  test('[P-ACAD-01.6] Dashboard. Admin. Exporting operation group.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10614` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { exportSettingsDialog: exportDialog } = versionPage
      const { groupsTab } = versionPage.overviewTab

      await portalPage.gotoVersion(testDashboardVersion, VERSION_OVERVIEW_TAB_GROUPS)

      await test.step('Export as combined YAML', async () => {
        await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'combined', fileFormat: 'yaml' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testDashboard.packageId}_${testDashboardVersion.version}_${downloadingGroupName}.yaml`)
      })

      await test.step('Export as combined JSON', async () => {
        await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'combined', fileFormat: 'json' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testDashboard.packageId}_${testDashboardVersion.version}_${downloadingGroupName}.json`)
      })

      await test.step('Export as combined HTML', async () => {
        await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'combined', fileFormat: 'html' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testDashboard.packageId}_${testDashboardVersion.version}_${downloadingGroupName}.zip`)
      })

      await test.step('Export as reduced YAML', async () => {
        await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'yaml' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testDashboard.packageId}_${testDashboardVersion.version}_${downloadingGroupName}.yaml`)
      })

      await test.step('Export as reduced JSON', async () => {
        await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'json' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testDashboard.packageId}_${testDashboardVersion.version}_${downloadingGroupName}.json`)
      })

      await test.step('Export as reduced HTML', async () => {
        await groupsTab.getGroupRow(downloadingGroupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'html' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testDashboard.packageId}_${testDashboardVersion.version}_${downloadingGroupName}.zip`)
      })
    })

  test('[P-ACAD-01.8] Dashboard. Admin. Exporting documents.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10614` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { exportSettingsDialog: exportDialog } = versionPage
      const { documentsTab } = versionPage
      const { slug } = FILE_P_PETSTORE30_CHANGELOG_BASE
      const { docName } = FILE_P_PETSTORE30.testMeta!

      await portalPage.gotoVersion(testDashboardVersion)
      await documentsTab.click()
      await documentsTab.sidebar.packageFilterAc.set(testPackage.name)
      const docButton = documentsTab.sidebar.getFileButton(docName)

      await test.step('Export as YAML', async () => {
        await docButton.openActionMenu()
        await docButton.actionMenu.exportItm.click()
        await exportDialog.fillForm({ fileFormat: 'yaml' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile.soft(file).toHaveName(`${testPackage.packageId}_${testPackageVersion.version}_${slug}.yaml`)
      })

      await test.step('Export as JSON', async () => {
        await docButton.openActionMenu()
        await docButton.actionMenu.exportItm.click()
        await exportDialog.fillForm({ fileFormat: 'json' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile.soft(file).toHaveName(`${testPackage.packageId}_${testPackageVersion.version}_${slug}.json`)
      })

      await test.step('Export as HTML', async () => {
        await docButton.openActionMenu()
        await docButton.actionMenu.exportItm.click()
        await exportDialog.fillForm({ fileFormat: 'html' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testPackage.packageId}_${testPackageVersion.version}_${slug}.zip`)
      })
    })
})

test.describe('5.2.1.0 Package details', () => {
  test('[P-PKDTL-2] Exporting a Version (zip).',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4462` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { exportSettingsDialog } = versionPage
      const testVersion = V_P_PKG_DOCUMENTS_R

      await portalPage.gotoVersion(testVersion)
      await versionPage.toolbar.exportBtn.click()

      const file = await exportSettingsDialog.performExport()

      await expect(exportSettingsDialog.exportBtn).toBeHidden()
      await expectFile(file).toHaveName(`${PK11.packageId}_${testVersion.version}.zip`)
    })
})

test.describe('7.1.0 Documents actions (Package)', () => {

  const testPackage = PK11
  const testVersion = V_P_PKG_DOCUMENTS_R

  test('[P-DCPDN-1] Exporting a REST API document via action menu.',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-1726` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { exportSettingsDialog: exportDialog } = versionPage
      const { documentsTab } = versionPage
      const { slug } = FILE_P_PETSTORE30
      const { docName, jsonString, jsonRefString, yamlString, yamlRefString } = FILE_P_PETSTORE30.testMeta!

      await portalPage.gotoVersion(testVersion, VERSION_DOCUMENTS_TAB)

      const docButton = documentsTab.sidebar.getFileButton(docName)

      await test.step('Export as YAML', async () => {
        await docButton.openActionMenu()
        await docButton.actionMenu.exportItm.click()
        await exportDialog.fillForm({ fileFormat: 'yaml' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile.soft(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${slug}.yaml`)
        await expectFile.soft(file).toContainText(yamlString!)
        await expectFile.soft(file).toContainText(yamlRefString!)
      })

      await test.step('Export as JSON', async () => {
        await docButton.openActionMenu()
        await docButton.actionMenu.exportItm.click()
        await exportDialog.fillForm({ fileFormat: 'json' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile.soft(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${slug}.json`)
        await expectFile.soft(file).toContainText(jsonString!)
        await expectFile.soft(file).toContainText(jsonRefString!)
      })

      await test.step('Export as HTML', async () => {
        await docButton.openActionMenu()
        await docButton.actionMenu.exportItm.click()
        await exportDialog.fillForm({ fileFormat: 'html' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${slug}.zip`)
      })
    })

  test('[P-DCPDN-2] Exporting a REST API document via More menu.',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4983` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { exportSettingsDialog: exportDialog } = versionPage
      const { documentsTab } = versionPage
      const { slug } = FILE_P_PETSTORE30
      const { jsonString, jsonRefString, yamlString, yamlRefString } = FILE_P_PETSTORE30.testMeta!

      await portalPage.gotoDocument(testVersion, slug)

      await test.step('Export as YAML', async () => {
        await documentsTab.toolbar.moreMenu.click()
        await documentsTab.toolbar.moreMenu.exportItm.click()
        await exportDialog.fillForm({ fileFormat: 'yaml' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile.soft(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${slug}.yaml`)
        await expectFile.soft(file).toContainText(yamlString!)
        await expectFile.soft(file).toContainText(yamlRefString!)
      })

      await test.step('Export as JSON', async () => {
        await documentsTab.toolbar.moreMenu.click()
        await documentsTab.toolbar.moreMenu.exportItm.click()
        await exportDialog.fillForm({ fileFormat: 'json' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile.soft(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${slug}.json`)
        await expectFile.soft(file).toContainText(jsonString!)
        await expectFile.soft(file).toContainText(jsonRefString!)
      })

      await test.step('Export as HTML', async () => {
        await documentsTab.toolbar.moreMenu.click()
        await documentsTab.toolbar.moreMenu.exportItm.click()
        await exportDialog.fillForm({ fileFormat: 'html' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile.soft(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${slug}.zip`)
      })
    })

  test('[P-DCPDN-6] Exporting a REST API document from the Document Preview page.',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4511` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { exportSettingsDialog: exportDialog } = versionPage
      const { documentPreviewPage } = versionPage
      const { slug } = FILE_P_PETSTORE30
      const { jsonString, jsonRefString, yamlString, yamlRefString } = FILE_P_PETSTORE30.testMeta!

      await portalPage.gotoDocument(testVersion, slug, true)

      await test.step('Export as YAML', async () => {
        await documentPreviewPage.toolbar.moreMenu.click()
        await documentPreviewPage.toolbar.moreMenu.exportItm.click()
        await exportDialog.fillForm({ fileFormat: 'yaml' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile.soft(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${slug}.yaml`)
        await expectFile.soft(file).toContainText(yamlString!)
        await expectFile.soft(file).toContainText(yamlRefString!)
      })

      await test.step('Export as JSON', async () => {
        await documentPreviewPage.toolbar.moreMenu.click()
        await documentPreviewPage.toolbar.moreMenu.exportItm.click()
        await exportDialog.fillForm({ fileFormat: 'json' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile.soft(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${slug}.json`)
        await expectFile.soft(file).toContainText(jsonString!)
        await expectFile.soft(file).toContainText(jsonRefString!)
      })

      await test.step('Export as HTML', async () => {
        await documentPreviewPage.toolbar.moreMenu.click()
        await documentPreviewPage.toolbar.moreMenu.exportItm.click()
        await exportDialog.fillForm({ fileFormat: 'html' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile.soft(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${slug}.zip`)
      })
    })
})

test.describe('12.1.2.0 Manual grouping: Viewing (Packages)', () => {

  const testPackage = P_PKG_PMGR_R
  const testVersion = V_PKG_PMGR_CHANGED_R

  test('[P-MGOP-2.2.1] Exporting a REST API group.',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10191` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { exportSettingsDialog: exportDialog } = versionPage
      const { overviewTab } = versionPage
      const { groupsTab } = overviewTab
      const { groupName } = OGR_PMGR_DOWNLOAD_REST_R

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)

      await test.step('Export as combined YAML', async () => {
        await groupsTab.getGroupRow(groupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'combined', fileFormat: 'yaml' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${groupName}.yaml`)
      })

      await test.step('Export as combined JSON', async () => {
        await groupsTab.getGroupRow(groupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'combined', fileFormat: 'json' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${groupName}.json`)
      })

      await test.step('Export as combined HTML', async () => {
        await groupsTab.getGroupRow(groupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'combined', fileFormat: 'html' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${groupName}.zip`)
      })

      await test.step('Export as reduced YAML', async () => {
        await groupsTab.getGroupRow(groupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'yaml' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${groupName}.yaml`)
      })

      await test.step('Export as reduced JSON', async () => {
        await groupsTab.getGroupRow(groupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'json' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${groupName}.json`)
      })

      await test.step('Export as reduced HTML', async () => {
        await groupsTab.getGroupRow(groupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'html' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${groupName}.zip`)
      })
    })

  test('[P-MGOP-2.2.2-N] Exporting a GraphQL group (Negative).',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10191` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab } = versionPage
      const { groupsTab } = overviewTab
      const { groupName } = OGR_PMGR_DOWNLOAD_GQL_R

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)

      await groupsTab.getGroupRow(groupName).hover()

      await expect(groupsTab.getGroupRow(groupName).exportBtn).toBeDisabled()
    })

  test('[P-MGOP-2.2.3] Exporting the combined specification and its subsequent publication.',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10191` },
      ],
    },
    async ({ sysadminPage: page, apihubTDM: tdm }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab, apiChangesTab, exportSettingsDialog: exportDialog } = versionPage
      const { groupsTab } = overviewTab
      const testVersion = V_PKG_PMGR_DOWNLOAD_PUBLISH_N
      const testGroup = OGR_PMGR_DOWNLOAD_PUBLISH_N
      let downloadedFile: DownloadedTestFile
      let testGroupFile: TestFile

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)

      await test.step('Download group as combined YAML', async () => {
        await groupsTab.getGroupRow(testGroup.groupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'combined', fileFormat: 'yaml' })

        downloadedFile = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
      })

      await test.step('Publish version with downloaded file', async () => {
        testGroupFile = new TestFile(path.resolve(ROOT_DOWNLOADS, downloadedFile.fileId))

        await tdm.publishVersion({
          ...V_PKG_PMGR_DOWNLOAD_PUBLISH_N,
          version: 'grouping-download-publish',
          previousVersion: V_PKG_PMGR_DOWNLOAD_PUBLISH_N.version,
          status: 'draft',
          files: [{ file: testGroupFile }],
        })
      })

      await test.step('Check API Changes tab', async () => {
        await portalPage.gotoVersion({
          ...V_PKG_PMGR_DOWNLOAD_PUBLISH_N,
          version: 'grouping-download-publish',
        }, VERSION_CHANGES_TAB_REST)

        await expect(apiChangesTab.table.noChangesPlaceholder).toBeVisible()
      })
    })
})

test.describe('12.2.2.0 Manual grouping: Viewing (Dashboards)', () => {

  const testDashboard = P_DSH_DMGR_R
  const testVersion = V_DSH_DMGR_CHANGED_R

  test('[P-MGO-2.2.1] Exporting a REST API group.',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10184` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { exportSettingsDialog: exportDialog } = versionPage
      const { overviewTab } = versionPage
      const { groupsTab } = overviewTab
      const { groupName } = OGR_DMGR_DOWNLOAD_REST_R

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)

      await test.step('Export as combined YAML', async () => {
        await groupsTab.getGroupRow(groupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'combined', fileFormat: 'yaml' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testDashboard.packageId}_${testVersion.version}_${groupName}.yaml`)
      })

      await test.step('Export as combined JSON', async () => {
        await groupsTab.getGroupRow(groupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'combined', fileFormat: 'json' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testDashboard.packageId}_${testVersion.version}_${groupName}.json`)
      })

      await test.step('Export as combined HTML', async () => {
        await groupsTab.getGroupRow(groupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'combined', fileFormat: 'html' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testDashboard.packageId}_${testVersion.version}_${groupName}.zip`)
      })

      await test.step('Export as reduced YAML', async () => {
        await groupsTab.getGroupRow(groupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'yaml' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testDashboard.packageId}_${testVersion.version}_${groupName}.yaml`)
      })

      await test.step('Export as reduced JSON', async () => {
        await groupsTab.getGroupRow(groupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'json' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testDashboard.packageId}_${testVersion.version}_${groupName}.json`)
      })

      await test.step('Export as reduced HTML', async () => {
        await groupsTab.getGroupRow(groupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'html' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testDashboard.packageId}_${testVersion.version}_${groupName}.zip`)
      })
    })

  test('[P-MGO-2.2.2-N] Exporting a GraphQL group (Negative).',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10184` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab } = versionPage
      const { groupsTab } = overviewTab
      const { groupName } = OGR_DMGR_DOWNLOAD_GQL_R

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)

      await groupsTab.getGroupRow(groupName).hover()

      await expect(groupsTab.getGroupRow(groupName).exportBtn).toBeDisabled()
    })
})

test.describe('12.1.4.0 Prefix grouping: CRUD', () => {
  test('[P-GOP-5] Exporting a REST API prefix group.',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10182` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { exportSettingsDialog: exportDialog } = versionPage
      const { overviewTab } = versionPage
      const { groupsTab } = overviewTab
      const testVersion = V_PKG_PPGR_REST_CHANGED_R
      const testPackage = V_PKG_PPGR_REST_CHANGED_R.pkg
      const groupName = 'v1'

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)

      await test.step('Export as combined YAML', async () => {
        await groupsTab.getGroupRow(groupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'combined', fileFormat: 'yaml' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${groupName}.yaml`)
      })

      await test.step('Export as combined JSON', async () => {
        await groupsTab.getGroupRow(groupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'combined', fileFormat: 'json' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${groupName}.json`)
      })

      await test.step('Export as combined HTML', async () => {
        await groupsTab.getGroupRow(groupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'combined', fileFormat: 'html' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${groupName}.zip`)
      })

      await test.step('Export as reduced YAML', async () => {
        await groupsTab.getGroupRow(groupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'yaml' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${groupName}.yaml`)
      })

      await test.step('Export as reduced JSON', async () => {
        await groupsTab.getGroupRow(groupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'json' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${groupName}.json`)
      })

      await test.step('Export as reduced HTML', async () => {
        await groupsTab.getGroupRow(groupName).openExportDialog()
        await exportDialog.fillForm({ specType: 'reduced', fileFormat: 'html' })

        const file = await exportDialog.performExport()

        await expect(exportDialog.exportBtn).toBeHidden()
        await expectFile(file).toHaveName(`${testPackage.packageId}_${testVersion.version}_${groupName}.zip`)
      })
    })
})
