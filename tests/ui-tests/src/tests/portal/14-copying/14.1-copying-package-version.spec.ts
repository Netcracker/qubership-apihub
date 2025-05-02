import { test } from '@fixtures'
import { PortalPage } from '@portal/pages/PortalPage'
import { expect } from '@services/expect-decorator'
import { DRAFT_VERSION_STATUS, NO_PREV_RELEASE_VERSION, RELEASE_VERSION_STATUS } from '@shared/entities'
import { P_PK_CP_EMPTY, P_PK_CP_PATTERN, P_PK_CP_RELEASE, P_WS_MAIN_R, RV_PATTERN_NEW, V_P_PKG_COPYING_RELEASE_N, V_P_PKG_COPYING_SOURCE_R, VERSION_COPIED_MSG } from '@test-data/portal'
import { PUBLISH_TIMEOUT, TICKET_BASE_URL } from '@test-setup'
import { SYSADMIN } from '@test-data'

test.describe('14.1 Copying Package Version', () => {

  const sourceVersion = V_P_PKG_COPYING_SOURCE_R

  test.skip('[P-CPAP-1.1] Copy Version dialog field validation logic',
    {
      tag: '@smoke',
      annotation: [
        {
          type: 'Description',
          description: 'Verifies the behavior of fields in the Copy Version dialog. The test checks pre-populated fields in the dialog, field clearing behavior, package field disabling when workspace is cleared, and ensures cleared target version fields are not auto-populated when workspace/package is selected.',
        },
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-9363` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-1403` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { copyVersionDialog } = versionPage
      const targetWorkspace = P_WS_MAIN_R
      const targetPackage = P_PK_CP_EMPTY

      await test.step('Open Copy Version dialog', async () => {
        await portalPage.gotoVersion(sourceVersion)
        await versionPage.toolbar.copyBtn.click()

        await expect(copyVersionDialog.workspaceAc).toHaveValue(targetWorkspace.name)
        await expect(copyVersionDialog.packageAc).toBeEnabled()
        await expect(copyVersionDialog.packageAc).toBeEmpty()
        await expect(copyVersionDialog.versionAc).toHaveValue(sourceVersion.version)
        await expect(copyVersionDialog.statusAc).toHaveValue(sourceVersion.status)
        for (const label of sourceVersion.metadata!.versionLabels!) {
          await expect(copyVersionDialog.labelsAc.getChip(label)).toBeVisible()
        }
      })

      await test.step('Clear fields', async () => {
        await copyVersionDialog.workspaceAc.clear()
        await copyVersionDialog.versionAc.clear()
        await copyVersionDialog.labelsAc.hover()
        await copyVersionDialog.labelsAc.clearBtn.click()

        await expect(copyVersionDialog.packageAc).toBeDisabled()
      })

      await test.step('Set target Workspace', async () => {
        await copyVersionDialog.fillForm({
          workspace: targetWorkspace,
        })

        await expect(copyVersionDialog.workspaceAc).toHaveValue(targetWorkspace.name)
        await expect(copyVersionDialog.packageAc).toBeEnabled()
        await expect(copyVersionDialog.packageAc).toBeEmpty()
        await expect(copyVersionDialog.versionAc).toBeEmpty()
        await expect(copyVersionDialog.statusAc).toHaveValue(sourceVersion.status)
        await expect(copyVersionDialog.labelsAc.getChip()).toHaveCount(0)
      })

      await test.step('Set target Package', async () => {
        await copyVersionDialog.fillForm({
          package: targetPackage,
        })

        await expect(copyVersionDialog.packageAc).toHaveValue(targetPackage.name)
        await expect(copyVersionDialog.versionAc).toBeEmpty()
        await expect(copyVersionDialog.statusAc).toHaveValue(sourceVersion.status)
        await expect(copyVersionDialog.labelsAc.getChip()).toHaveCount(0)
      })

      await test.step('Set target Version Info', async () => {
        await copyVersionDialog.fillForm({
          version: '2000.2',
          status: DRAFT_VERSION_STATUS,
          labels: ['label-1', 'label-2'],
          previousVersion: NO_PREV_RELEASE_VERSION,
        })

        await expect(copyVersionDialog.workspaceAc).toHaveValue(targetWorkspace.name)
        await expect(copyVersionDialog.packageAc).toHaveValue(targetPackage.name)
        await expect(copyVersionDialog.versionAc).toHaveValue('2000.2')
        await expect(copyVersionDialog.statusAc).toHaveValue(DRAFT_VERSION_STATUS)
        await expect(copyVersionDialog.labelsAc.getChip()).toHaveCount(2)
        await expect(copyVersionDialog.labelsAc.getChip('label-1')).toBeVisible()
        await expect(copyVersionDialog.labelsAc.getChip('label-2')).toBeVisible()
      })
    })

  test('[P-CPAP-1.2] Copy Version to an empty package',
    {
      tag: '@smoke',
      annotation: [
        {
          type: 'Description',
          description: 'Verifies the Copy Version functionality to an empty package. The test validates version copying process and verifies the copied version content (operations, documents, deprecated items).',
        },
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-9363` },
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-9365` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab, operationsTab, deprecatedTab, documentsTab, copyVersionDialog } = versionPage
      const targetWorkspace = P_WS_MAIN_R
      const targetPackage = P_PK_CP_EMPTY

      await test.step('Open Copy Version dialog', async () => {
        await portalPage.gotoVersion(sourceVersion)
        await versionPage.toolbar.copyBtn.click()

        await expect(copyVersionDialog.workspaceAc).toHaveValue(targetWorkspace.name)
      })

      await test.step('Set target Package', async () => {
        await copyVersionDialog.fillForm({
          package: targetPackage,
        })

        await expect(copyVersionDialog.packageAc).toHaveValue(targetPackage.name)
      })

      await test.step('Set target Version Info and copy Version', async () => {
        await copyVersionDialog.fillForm({
          version: '2000.2',
          status: DRAFT_VERSION_STATUS,
          labels: ['label-1', 'label-2'],
          previousVersion: NO_PREV_RELEASE_VERSION,
        })
        await copyVersionDialog.copyBtn.click()

        await expect(copyVersionDialog.copyBtn).toBeHidden({ timeout: PUBLISH_TIMEOUT })
        await expect(portalPage.snackbar).toContainText(VERSION_COPIED_MSG)
      })

      await test.step('Navigate to the target Package summary', async () => {
        await portalPage.snackbar.checkItOutLink.click()

        await expect(overviewTab.summaryTab.body.labels).toContainText('label-1')
        await expect(overviewTab.summaryTab.body.labels).toContainText('label-2')
        await expect(overviewTab.summaryTab.body.summary.currentVersion).toHaveText('2000.2')
        await expect(overviewTab.summaryTab.body.summary.revision).not.toBeEmpty() //not a specific number because it changes every retry
        await expect(overviewTab.summaryTab.body.summary.previousVersion).toHaveText('-')
        await expect(overviewTab.summaryTab.body.summary.publishedBy).toHaveText(SYSADMIN.name)
        await expect(overviewTab.summaryTab.body.summary.publicationDate).not.toBeEmpty()
        await expect(overviewTab.summaryTab.body.restApi.operations).toHaveText('19')
        await expect(overviewTab.summaryTab.body.restApi.deprecatedOperations).toHaveText('2')

        await expect(versionPage.apiChangesTab).toBeDisabled()
      })

      await test.step('Navigate to the "Operations" tab', async () => {
        await versionPage.operationsTab.click()

        await expect(operationsTab.table.getOperationRow()).toHaveCount(19)

        await operationsTab.sidebar.groupFilterAc.click()

        await expect(operationsTab.sidebar.groupFilterAc.getListItem('v1')).toBeVisible()
      })

      await test.step('Navigate to the "Deprecated" tab', async () => {
        await versionPage.deprecatedTab.click()

        await expect(deprecatedTab.table.getOperationRow()).toHaveCount(4)
      })

      await test.step('Navigate to the "Documents" tab', async () => {
        await versionPage.documentsTab.click()

        await expect(documentsTab.sidebar.getAllFiles()).toHaveCount(1)
      })

      await test.step('Open the Version selector', async () => {
        await versionPage.toolbar.versionSlt.click()
        await versionPage.toolbar.versionSlt.draftBtn.click()

        await expect(versionPage.toolbar.versionSlt.getVersionRow()).toHaveCount(1)
      })
    })

  test('[P-CPAP-4] Copy Version with previous version (package)',
    {
      tag: '@smoke',
      annotation: [
        {
          type: 'Description',
          description: 'Verifies copying a version to a package using previous version. Tests specifying a previous version during copying, validating the status can be set to Release, and proper version relationship is established. Confirms all copied content (operations, API changes, deprecated items, documents) are correctly displayed, and verifies version history shows both versions.',
        },
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-9370` },
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-9371` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab, operationsTab, apiChangesTab, deprecatedTab, documentsTab, copyVersionDialog } = versionPage
      const targetWorkspace = P_WS_MAIN_R
      const targetPackage = P_PK_CP_RELEASE

      await test.step('Open Copy Version dialog', async () => {
        await portalPage.gotoVersion(sourceVersion)
        await versionPage.toolbar.copyBtn.click()

        await expect(copyVersionDialog.workspaceAc).toHaveValue(targetWorkspace.name)
      })

      await test.step('Set target Package', async () => {
        await copyVersionDialog.fillForm({
          package: targetPackage,
        })

        await expect(copyVersionDialog.packageAc).toHaveValue(targetPackage.name)
        await expect(copyVersionDialog.previousVersionAc).toHaveValue(NO_PREV_RELEASE_VERSION)
      })

      await test.step('Set target Version Info and copy Version', async () => {
        await copyVersionDialog.fillForm({
          version: '2000.2',
          status: RELEASE_VERSION_STATUS,
          labels: ['label-1', 'label-2'],
          previousVersion: V_P_PKG_COPYING_RELEASE_N.version,
        })
        await copyVersionDialog.copyBtn.click()

        await expect(copyVersionDialog.copyBtn).toBeHidden({ timeout: PUBLISH_TIMEOUT })
        await expect(portalPage.snackbar).toContainText(VERSION_COPIED_MSG)
      })

      await test.step('Navigate to the target Package summary', async () => {
        await portalPage.snackbar.checkItOutLink.click()

        await expect(overviewTab.summaryTab.body.labels).toContainText('label-1')
        await expect(overviewTab.summaryTab.body.labels).toContainText('label-2')
        await expect(overviewTab.summaryTab.body.summary.currentVersion).toHaveText('2000.2')
        await expect(overviewTab.summaryTab.body.summary.revision).not.toBeEmpty() //not a specific number because it changes every retry
        await expect(overviewTab.summaryTab.body.summary.previousVersion).toHaveText(V_P_PKG_COPYING_RELEASE_N.version)
        await expect(overviewTab.summaryTab.body.summary.publishedBy).toHaveText(SYSADMIN.name)
        await expect(overviewTab.summaryTab.body.summary.publicationDate).not.toBeEmpty()
        await expect(overviewTab.summaryTab.body.restApi.operations).toHaveText('19')
        await expect(overviewTab.summaryTab.body.restApi.deprecatedOperations).toHaveText('2')
      })

      await test.step('Navigate to the "Operations" tab', async () => {
        await versionPage.operationsTab.click()

        await expect(operationsTab.table.getOperationRow()).toHaveCount(19)
      })

      await test.step('Navigate to the "API Changes" tab', async () => {
        await versionPage.apiChangesTab.click()

        await expect(apiChangesTab.table.getOperationRow()).toHaveCount(5)
      })

      await test.step('Navigate to the "Deprecated" tab', async () => {
        await versionPage.deprecatedTab.click()

        await expect(deprecatedTab.table.getOperationRow()).toHaveCount(4)
      })

      await test.step('Navigate to the "Documents" tab', async () => {
        await versionPage.documentsTab.click()

        await expect(documentsTab.sidebar.getAllFiles()).toHaveCount(1)
      })

      await test.step('Open the Version selector', async () => {
        await versionPage.toolbar.versionSlt.click()

        await expect(versionPage.toolbar.versionSlt.getVersionRow()).toHaveCount(2)
      })
    })

  test('[P-CPAP-4-N] Copy Version with wrong pattern (package)',
    {
      tag: '@smoke',
      annotation: [
        {
          type: 'Description',
          description: 'The test attempts to create a version that violates the target package pattern requirement and confirms the appropriate error message is displayed, preventing invalid version creation.',
        },
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-9369` },
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-9370` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { copyVersionDialog } = versionPage
      const targetWorkspace = P_WS_MAIN_R
      const targetPackage = P_PK_CP_PATTERN

      await test.step('Open source Version', async () => {
        await portalPage.gotoVersion(sourceVersion)
        await versionPage.toolbar.copyBtn.click()

        await expect(copyVersionDialog.workspaceAc).toHaveValue(targetWorkspace.name)
      })

      await test.step('Set copying parameters', async () => {
        await copyVersionDialog.fillForm({
          package: targetPackage,
          version: '2000.2',
          status: RELEASE_VERSION_STATUS,
          previousVersion: NO_PREV_RELEASE_VERSION,
        })
      })

      await test.step('Try to copy Version', async () => {
        await copyVersionDialog.copyBtn.click()

        await expect(copyVersionDialog.errorMsg).toHaveText(`Release version must match the following regular expression: ${RV_PATTERN_NEW}`)
      })
    })
})
