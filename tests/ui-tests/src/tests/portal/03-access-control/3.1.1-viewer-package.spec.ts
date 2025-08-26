import { test } from '@fixtures'
import { expect, expectFile } from '@services/expect-decorator'
import { PortalPage } from '@portal/pages/PortalPage'
import {
  CREATE_LIST_OF_USERS_V1,
  GRP_P_VIEWER_ROOT_R,
  NO_PERM_ADD_MEMBER,
  NO_PERM_CREATE_GROUP,
  NO_PERM_DEL_PACKAGE,
  NO_PERM_DEL_VERSION,
  NO_PERM_EDIT_PACKAGE,
  NO_PERM_EDIT_VERSION,
  NO_PERM_GEN_TOKEN,
  NO_PERM_MANAGE_ROLES,
  OGR_PREFIX_DELETION_MSG,
  OGR_PREFIX_EDITING_MSG,
  ORG_UAC_PKG_REST,
  PKG_P_VIEWER_R,
  V_P_PKG_UAC_VIEWER_CHANGED_R,
} from '@test-data/portal'
import { VERSION_OVERVIEW_TAB_GROUPS } from '@portal/entities'
import { TICKET_BASE_URL } from '@test-setup'

test.describe('03.1.1 Access Control. Viewer role. (Package)', () => {

  const rootGroup = GRP_P_VIEWER_ROOT_R
  const testPackage = PKG_P_VIEWER_R
  const testVersion = V_P_PKG_UAC_VIEWER_CHANGED_R
  const prefixGroupName = 'v1'
  const manualGroupName = ORG_UAC_PKG_REST.groupName

  test('[P-ACVP-01.1] Package. Viewer. Shared and Overview tabs.',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8568` },
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab } = versionPage

      await portalPage.goto()

      await test.step('View "Shared" tab', async () => {
        await portalPage.sidebar.sharedBtn.click()

        await expect(portalPage.table.getRow(testPackage)).toBeVisible()
      })

      await test.step('View "Overview" tab', async () => {
        await portalPage.gotoVersion(testVersion)

        await expect(overviewTab.summaryTab.body.summary.currentVersion).toHaveText(testVersion.version)

        await overviewTab.activityHistoryTab.click()

        await expect(overviewTab.activityHistoryTab.getHistoryRecord(`Created ${testPackage.name} package`)).toBeVisible()

        await overviewTab.revisionsTab.click()

        await expect(overviewTab.revisionsTab.getRevisionRow('@1')).toBeVisible()

        await overviewTab.groupsTab.click()

        await expect(overviewTab.groupsTab.getGroupRow(1)).toBeVisible()
      })
    })

  test('[P-ACVP-01.2] Package. Viewer. Manipulations with operation groups.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8568` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-999` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { groupsTab } = portalPage.versionPackagePage.overviewTab

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)

      await test.step('Create manual group', async () => {
        await expect(groupsTab.createGroupBtn).toBeDisabled()

        await groupsTab.createGroupBtn.hover({ force: true })

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(NO_PERM_CREATE_GROUP)
      })

      await test.step('Edit groups (manual and prefix)', async () => {
        await groupsTab.getGroupRow(prefixGroupName).hover()
        await groupsTab.getGroupRow(prefixGroupName).editBtn.hover()

        //TODO: TestCase-B-999
        /*await expect(groupsTab.getGroupRow(PREFIX_GROUP_NAME).editBtn).toBeDisabled()
        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(NO_PERM_EDIT_GROUP)*/

        await groupsTab.getGroupRow(manualGroupName).hover()
        await groupsTab.getGroupRow(manualGroupName).editBtn.hover()

        //TODO: TestCase-B-999
        /*await expect(groupsTab.getGroupRow(MAN_GROUP_NAME).editBtn).toBeDisabled()
        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(NO_PERM_EDIT_GROUP)*/
      })

      await test.step('Delete groups (manual and prefix)', async () => {
        await groupsTab.getGroupRow(prefixGroupName).hover()
        await groupsTab.getGroupRow(prefixGroupName).deleteBtn.hover({ force: true })

        await expect(groupsTab.getGroupRow(prefixGroupName).deleteBtn).toBeDisabled()
        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(OGR_PREFIX_DELETION_MSG)

        await groupsTab.getGroupRow(manualGroupName).hover()
        await groupsTab.getGroupRow(manualGroupName).deleteBtn.hover()

        //TODO: TestCase-B-999
        /*await expect(groupsTab.getGroupRow(MAN_GROUP_NAME).deleteBtn).toBeDisabled()
        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(NO_PERM_DEL_GROUP)*/
      })

      await test.step('Change operations in groups (manual and prefix)', async () => {
        await groupsTab.getGroupRow(prefixGroupName).hover()
        await groupsTab.getGroupRow(prefixGroupName).addBtn.hover({ force: true })

        await expect(groupsTab.getGroupRow(prefixGroupName).addBtn).toBeDisabled()
        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(OGR_PREFIX_EDITING_MSG)

        await groupsTab.getGroupRow(manualGroupName).hover()
        await groupsTab.getGroupRow(manualGroupName).addBtn.hover()

        //TODO: TestCase-B-999
        /*await expect(groupsTab.getGroupRow(MAN_GROUP_NAME).addBtn).toBeDisabled()
        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(NO_PERM_EDIT_OPERATIONS_IN_GROUP)*/
      })
    })

  test('[P-ACVP-01.4] Package. Viewer. Download operations on the all main tabs.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8568` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { operationsTab, apiChangesTab, deprecatedTab } = versionPage

      await portalPage.gotoVersion(testVersion)

      await test.step('Download operations on the "Operations" tab', async () => {
        await operationsTab.click()
        const file = await operationsTab.toolbar.exportMenu.downloadAll()

        await expectFile(file).toHaveName(`APIOperations_${testPackage.packageId}_${testVersion.version}.xlsx`)
      })

      await test.step('Download operations on the "API Changes" tab', async () => {
        await apiChangesTab.click()

        await expect(apiChangesTab.table.getOperationRow(CREATE_LIST_OF_USERS_V1)).toBeVisible() //wait changes before download

        const file = await operationsTab.toolbar.exportMenu.downloadAll()

        await expectFile(file).toHaveName(`APIChanges_${testPackage.packageId}_${testVersion.version}.xlsx`)
      })

      await test.step('Download operations on the "Deprecated" tab', async () => {
        await deprecatedTab.click()
        const file = await operationsTab.toolbar.exportMenu.downloadAll()

        await expectFile(file).toHaveName(`DeprecatedOperations_${testPackage.packageId}_${testVersion.version}.xlsx`)
      })
    })

  test('[P-ACVP-02] Package. Viewer. Settings.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8569` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-1019` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const {
        generalTab,
        apiSpecConfigTab,
        versionsTab,
        accessTokensTab,
        accessControlTab,
      } = versionPage.packageSettingsPage

      await portalPage.gotoPackage(testPackage)

      await test.step('View "Overview" tab', async () => {
        await expect(versionPage.toolbar.editVersionBtn).toBeDisabled()

        await versionPage.toolbar.editVersionBtn.hover({ force: true })

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(NO_PERM_EDIT_VERSION)
      })

      await portalPage.gotoGroup(rootGroup)
      await portalPage.table.getRow(testPackage).openSettings()

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

      await test.step('View "API Specific Configuration" tab', async () => {
        await apiSpecConfigTab.click()

        //TODO: need change Edit button in UI project to have disabled state
        // await apiSpecConfigTab.prefix.hover()
        // await expect(apiSpecConfigTab.editBtn).toBeDisabled()

        await apiSpecConfigTab.prefix.click()

        await expect(apiSpecConfigTab.editPrefixDialog.saveBtn).toBeHidden()
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
        await accessTokensTab.click()

        await expect(accessTokensTab.nameTxtFld).toBeDisabled()
        await expect(accessTokensTab.rolesAc).toBeDisabled()
        await expect(accessTokensTab.createdForAc).toBeDisabled()
        await expect(accessTokensTab.generateBtn).toBeDisabled()

        await accessTokensTab.generateBtn.hover({ force: true })

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(NO_PERM_GEN_TOKEN)

        await expect(portalPage.tooltip).toHaveCount(1)
        // await expect(portalPage.tooltip).toHaveText(NO_PERM_REVOKE_TOKEN) //TODO: TestCase-B-1019
      })

      await test.step('View "User Access Control" tab', async () => {
        await accessControlTab.click()

        await expect(accessControlTab.addUserBtn).toBeDisabled()

        await accessControlTab.addUserBtn.hover({ force: true })

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(NO_PERM_ADD_MEMBER)
      })
    })
})
