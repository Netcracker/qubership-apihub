import { test } from '@fixtures'
import { expect, expectFile } from '@services/expect-decorator'
import { PortalPage } from '@portal/pages/PortalPage'
import {
  DSH_P_VIEWER_R,
  NO_PERM_CREATE_GROUP,
  NO_PERM_DEL_PACKAGE,
  NO_PERM_DEL_VERSION,
  NO_PERM_EDIT_PACKAGE,
  NO_PERM_EDIT_VERSION,
  NO_PERM_SEE_PAGE,
  OGR_UAC_DSH_REST,
  PKG_P_VIEWER_R,
  V_P_DSH_UAC_VIEWER_CHANGED_R,
} from '@test-data/portal'
import {
  SETTINGS_TAB_GENERAL,
  SETTINGS_TAB_TOKENS,
  SETTINGS_TAB_USERS,
  VERSION_OVERVIEW_TAB_GROUPS,
} from '@portal/entities'
import { TICKET_BASE_URL } from '@test-setup'

test.describe('03.1.2 Access Control. Viewer role. (Dashboard)', () => {

  const testPackage = PKG_P_VIEWER_R
  const testDashboard = DSH_P_VIEWER_R
  const testVersion = V_P_DSH_UAC_VIEWER_CHANGED_R
  const manualGroupName = OGR_UAC_DSH_REST.groupName

  test('[P-ACVD-01.1] Dashboard. Viewer. Shared and Overview tabs.',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8578` },
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { overviewTab } = versionPage

      await portalPage.goto()

      await test.step('View "Shared" tab', async () => {
        await portalPage.sidebar.sharedBtn.click()

        await expect(portalPage.table.getRow(testDashboard)).toBeVisible()
      })

      await test.step('View "Overview" tab', async () => {
        await portalPage.gotoVersion(testVersion)

        await expect(overviewTab.summaryTab.body.summary.currentVersion).toHaveText(testVersion.version)

        await overviewTab.activityHistoryTab.click()

        await expect(overviewTab.activityHistoryTab.getHistoryRecord(`Created ${testDashboard.name} dashboard`)).toBeVisible()

        await overviewTab.revisionsTab.click()

        await expect(overviewTab.revisionsTab.getRevisionRow('@1')).toBeVisible()

        await overviewTab.groupsTab.click()

        await expect(overviewTab.groupsTab.getGroupRow(1)).toBeVisible()

        await overviewTab.packagesTab.click()

        await expect(overviewTab.packagesTab.getPackageRow(testPackage)).toBeVisible()
      })
    })

  test('[P-ACVD-01.2] Dashboard. Viewer. Manipulations with operation groups.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8578` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-999` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { groupsTab } = portalPage.versionDashboardPage.overviewTab

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)

      await test.step('Create manual group', async () => {
        await expect(groupsTab.createGroupBtn).toBeDisabled()

        await groupsTab.createGroupBtn.hover({ force: true })

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(NO_PERM_CREATE_GROUP)
      })

      await test.step('Edit groups (manual)', async () => {

        await groupsTab.getGroupRow(manualGroupName).hover()
        await groupsTab.getGroupRow(manualGroupName).editBtn.hover()

        //TODO: TestCase-B-999
        /*await expect(groupsTab.getGroupRow(MAN_GROUP_NAME).editBtn).toBeDisabled()
        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(NO_PERM_EDIT_GROUP)*/
      })

      await test.step('Delete groups (manual)', async () => {

        await groupsTab.getGroupRow(manualGroupName).hover()
        await groupsTab.getGroupRow(manualGroupName).deleteBtn.hover()

        //TODO: TestCase-B-999
        /*await expect(groupsTab.getGroupRow(MAN_GROUP_NAME).deleteBtn).toBeDisabled()
        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(NO_PERM_DEL_GROUP)*/
      })

      await test.step('Change operations in groups (manual)', async () => {

        await groupsTab.getGroupRow(manualGroupName).hover()
        await groupsTab.getGroupRow(manualGroupName).addBtn.hover()

        //TODO: TestCase-B-999
        /*await expect(groupsTab.getGroupRow(MAN_GROUP_NAME).addBtn).toBeDisabled()
        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(NO_PERM_EDIT_OPERATIONS_IN_GROUP)*/
      })
    })

  test('[P-ACVD-01.4] Dashboard. Viewer. Download operations on the all main tabs.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8578` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { operationsTab, apiChangesTab, deprecatedTab } = versionPage

      await portalPage.gotoVersion(testVersion)

      await test.step('Download operations on the "Operations" tab', async () => {
        await operationsTab.click()
        const file = await operationsTab.toolbar.exportMenu.downloadAll()

        await expectFile(file).toHaveName(`APIOperations_${testDashboard.packageId}_${testVersion.version}.xlsx`)
      })

      await test.step('Download operations on the "API Changes" tab', async () => {
        await apiChangesTab.click()
        const file = await operationsTab.toolbar.exportMenu.downloadAll()

        await expectFile(file).toHaveName(`APIChanges_${testDashboard.packageId}_${testVersion.version}.xlsx`)
      })

      await test.step('Download operations on the "Deprecated" tab', async () => {
        await deprecatedTab.click()
        const file = await operationsTab.toolbar.exportMenu.downloadAll()

        await expectFile(file).toHaveName(`DeprecatedOperations_${testDashboard.packageId}_${testVersion.version}.xlsx`)
      })
    })

  test('[P-ACVD-02] Dashboard. Viewer. Settings.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8580` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-1019` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const {
        generalTab,
        versionsTab,
        accessTokensTab,
        accessControlTab,
        noPermissionPlaceholder,
      } = versionPage.packageSettingsPage

      await portalPage.gotoDashboard(testDashboard)

      await test.step('View "Overview" tab', async () => {
        await expect(versionPage.toolbar.editVersionBtn).toBeDisabled()

        await versionPage.toolbar.editVersionBtn.hover({ force: true })

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(NO_PERM_EDIT_VERSION)
      })

      await portalPage.gotoDashboard(testDashboard, SETTINGS_TAB_GENERAL)

      await test.step('View "General" tab', async () => {
        await expect(generalTab.editBtn).toBeDisabled()
        await expect(generalTab.deleteBtn).toBeDisabled()

        await generalTab.editBtn.hover({ force: true })

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(NO_PERM_EDIT_PACKAGE)

        await generalTab.deleteBtn.hover({ force: true })

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(NO_PERM_DEL_PACKAGE)
      })

      await test.step('View "Versions" tab', async () => {
        await versionsTab.click()
        const versionRow = versionsTab.getVersionRow(1)
        await versionRow.hover()

        await expect(versionRow.editBtn).toBeDisabled()
        await expect(versionRow.deleteBtn).toBeDisabled()

        await versionRow.editBtn.hover({ force: true })

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(NO_PERM_EDIT_VERSION)

        await versionRow.deleteBtn.hover({ force: true })

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(NO_PERM_DEL_VERSION)
      })

      await test.step('View "Access Tokens" tab', async () => {
        await expect(accessTokensTab).not.toBeVisible()
        await portalPage.gotoDashboard(testDashboard, SETTINGS_TAB_TOKENS)
        await expect(noPermissionPlaceholder).toHaveText(NO_PERM_SEE_PAGE)
      })

      await test.step('View "User Access Control" tab', async () => {
        await expect(accessControlTab).not.toBeVisible()
        await portalPage.gotoDashboard(testDashboard, SETTINGS_TAB_USERS)
        await expect(noPermissionPlaceholder).toHaveText(NO_PERM_SEE_PAGE)
      })
    })
})
