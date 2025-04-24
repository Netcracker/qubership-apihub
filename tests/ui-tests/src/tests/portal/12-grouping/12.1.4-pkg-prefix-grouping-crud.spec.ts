import { test } from '@fixtures'
import { expect, expectFile } from '@services/expect-decorator'
import { PortalPage } from '@portal/pages/PortalPage'
import {
  API_PREFIX_GROUP,
  DEF_PREFIX_GROUP,
  INVALID_PREFIX_GROUP,
  OGR_PMGR_CHANGE_DESCRIPTION_N,
  OGR_PPGR_EDITING_N,
  OGR_PPGR_TMPL_UPLOAD_N,
  OGR_PREFIX_DELETION_MSG,
  OGR_PREFIX_EDITING_MSG,
  OGR_PREFIX_ERROR_MSG,
  OGR_TMPL_EXIST_MSG,
  P_PKG_PPGR_SETTINGS_R,
  V_PKG_PPGR_EDIT_N,
  V_PKG_PPGR_REST_CHANGED_R,
  V_PKG_PPGR_SETTINGS_R,
} from '@test-data/portal'
import { SETTINGS_TAB_API_CONFIG, VERSION_OPERATIONS_TAB_REST, VERSION_OVERVIEW_TAB_GROUPS } from '@portal/entities'
import { FILE_ICON } from '@shared/entities'
import { EMPTY_VALUE } from '@test-data/shared'
import { TICKET_BASE_URL } from '@test-setup'

test.describe('12.1.4 Prefix grouping: CRUD', () => {

  test('[P-GOP-1] Set prefix for package',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8368` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { packageSettingsPage } = versionPage
      const { apiSpecConfigTab } = packageSettingsPage
      const { editPrefixDialog } = apiSpecConfigTab

      await portalPage.gotoPackage(P_PKG_PPGR_SETTINGS_R, SETTINGS_TAB_API_CONFIG)

      await test.step('Set invalid prefix', async () => {
        await apiSpecConfigTab.prefix.hover()
        await apiSpecConfigTab.editBtn.click()
        await editPrefixDialog.prefixTxtFld.fill(INVALID_PREFIX_GROUP)
        await editPrefixDialog.saveBtn.click()

        await expect(editPrefixDialog.errorMsg).toHaveText(OGR_PREFIX_ERROR_MSG)
      })

      await test.step('Set valid prefix', async () => {
        await editPrefixDialog.prefixTxtFld.fill(DEF_PREFIX_GROUP)
        await editPrefixDialog.saveBtn.click()

        await expect(editPrefixDialog.saveBtn).toBeHidden()
        await expect(apiSpecConfigTab.prefix).toHaveText(DEF_PREFIX_GROUP)
      })
    })

  test('[P-GOP-2] Recalculate groups by new prefix',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8374` },
      ],
    },
    async ({ sysadminPage: page, apihubTDM: tdm }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { operationsTab } = versionPage
      const { packageSettingsPage } = versionPage
      const { apiSpecConfigTab } = packageSettingsPage
      const { editPrefixDialog } = apiSpecConfigTab
      const testPackage = P_PKG_PPGR_SETTINGS_R

      await test.step('Prerequisites: set default group prefix', async () => {
        await tdm.updatePackage({ ...testPackage, restGroupingPrefix: DEF_PREFIX_GROUP })
        await tdm.recalculateGroups(testPackage)
      })

      await portalPage.gotoVersion(V_PKG_PPGR_SETTINGS_R, VERSION_OPERATIONS_TAB_REST)

      await test.step('Check initial groups', async () => {
        await operationsTab.sidebar.groupFilterAc.click()

        await expect(operationsTab.sidebar.groupFilterAc.getListItem('v1')).toBeVisible()
        await expect(operationsTab.sidebar.groupFilterAc.getListItem('api')).toBeHidden()
      })

      await test.step('Set new prefix', async () => {
        await versionPage.toolbar.settingsBtn.click()
        await apiSpecConfigTab.click()
        await apiSpecConfigTab.prefix.hover()
        await apiSpecConfigTab.editBtn.click()
        await editPrefixDialog.prefixTxtFld.fill(API_PREFIX_GROUP)
        await editPrefixDialog.recalculateChx.click()
        await editPrefixDialog.saveBtn.click()

        await expect(editPrefixDialog.saveBtn).toBeHidden()
        await expect(apiSpecConfigTab.prefix).toHaveText(API_PREFIX_GROUP)

        await packageSettingsPage.exitBtn.click()
      })

      await test.step('Check new groups', async () => {
        await operationsTab.sidebar.groupFilterAc.click()

        await expect(operationsTab.sidebar.groupFilterAc.getListItem('api')).toBeVisible()
        await expect(operationsTab.sidebar.groupFilterAc.getListItem('v1')).toBeHidden()
      })
    })

  test('[P-GOP-3] Delete prefix for package',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10179` },
      ],
    },
    async ({ sysadminPage: page, apihubTDM: tdm }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { operationsTab } = versionPage
      const { packageSettingsPage } = versionPage
      const { apiSpecConfigTab } = packageSettingsPage
      const { editPrefixDialog } = apiSpecConfigTab
      const testPackage = P_PKG_PPGR_SETTINGS_R

      await test.step('Prerequisites: set default group prefix', async () => {
        await tdm.updatePackage({ ...testPackage, restGroupingPrefix: DEF_PREFIX_GROUP })
        await tdm.recalculateGroups(testPackage)
      })

      await test.step('Check initial groups', async () => {
        await portalPage.gotoVersion(V_PKG_PPGR_SETTINGS_R, VERSION_OPERATIONS_TAB_REST)
        await operationsTab.sidebar.groupFilterAc.click()

        await expect(operationsTab.sidebar.groupFilterAc.getListItem('v1')).toBeVisible()
        await expect(operationsTab.sidebar.groupFilterAc.getListItem('v2')).toBeVisible()
      })

      await test.step('Delete prefix', async () => {
        await portalPage.gotoPackage(P_PKG_PPGR_SETTINGS_R, SETTINGS_TAB_API_CONFIG)
        await apiSpecConfigTab.prefix.hover()
        await apiSpecConfigTab.editBtn.click()
        await editPrefixDialog.prefixTxtFld.clear()
        await editPrefixDialog.recalculateChx.click()
        await editPrefixDialog.saveBtn.click()

        await expect(editPrefixDialog.saveBtn).toBeHidden()
        await expect(apiSpecConfigTab.prefix).toHaveText(EMPTY_VALUE)
      })

      await test.step('Check groups deletion', async () => {
        await portalPage.gotoVersion(V_PKG_PPGR_SETTINGS_R, VERSION_OPERATIONS_TAB_REST)

        await expect(operationsTab.sidebar.groupFilterAc).toBeDisabled()
      })
    })

  test('[P-GOP-4.1] Change description of group',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10181` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab } = versionPage
      const { groupsTab } = overviewTab
      const { createUpdateOperationGroupDialog: updateDialog } = groupsTab
      const testVersion = V_PKG_PPGR_EDIT_N
      const { groupName, description, testMeta } = OGR_PPGR_EDITING_N

      await test.step('Check default description', async () => {
        await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)

        await expect(groupsTab.getGroupRow(groupName).descriptionCell).toHaveText(description!)

        await groupsTab.getGroupRow(groupName).hover()

        await expect(groupsTab.getGroupRow(groupName).addBtn).toBeDisabled()
        await expect(groupsTab.getGroupRow(groupName).deleteBtn).toBeDisabled()

        await groupsTab.getGroupRow(groupName).addBtn.hover({ force: true })

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(OGR_PREFIX_EDITING_MSG)

        await groupsTab.getGroupRow(groupName).deleteBtn.hover({ force: true })

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(OGR_PREFIX_DELETION_MSG)
      })

      await test.step('Change description', async () => {
        await groupsTab.getGroupRow(groupName).openEditGroupParametersDialog()

        await expect(updateDialog.groupNameTxtFld).toBeDisabled()
        await expect(updateDialog.apiTypeAc).toBeDisabled()

        await updateDialog.fillForm({ description: testMeta!.changedDescription })
        await updateDialog.updateBtn.click()

        await expect(updateDialog.updateBtn).toBeHidden()
        await expect(groupsTab.getGroupRow(groupName).descriptionCell).toHaveText(testMeta!.changedDescription!)
      })
    })

  test('[P-GOP-4.2] Upload OAS template',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10181` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab } = versionPage
      const { groupsTab } = overviewTab
      const { createUpdateOperationGroupDialog: updateDialog } = groupsTab
      const testVersion = V_PKG_PPGR_EDIT_N
      const { groupName, testMeta } = OGR_PPGR_TMPL_UPLOAD_N

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)
      await groupsTab.getGroupRow(groupName).openEditGroupParametersDialog()

      await updateDialog.fillForm({ template: testMeta!.templateYaml })

      await expect(updateDialog.notDownloadableFilePreview).toBeVisible()

      await updateDialog.notDownloadableFilePreview.deleteBtn.click()

      await expect(updateDialog.browseBtn).toBeEnabled()

      await updateDialog.fillForm({ template: testMeta!.templateJson })

      await expect(updateDialog.notDownloadableFilePreview).toBeVisible()
      await expect(updateDialog.notDownloadableFilePreview).toHaveText(testMeta!.templateJson!.name)

      await updateDialog.updateBtn.click()

      await expect(updateDialog.updateBtn).toBeHidden()
      await expect(groupsTab.getGroupRow(groupName).nameCell).toHaveIcon(FILE_ICON)
      await expect(groupsTab.getGroupRow(groupName).nameCell.templateIcon).toBeVisible()

      await groupsTab.getGroupRow(groupName).nameCell.templateIcon.hover()

      await expect(portalPage.tooltip).toHaveCount(1)
      await expect(portalPage.tooltip).toHaveText(OGR_TMPL_EXIST_MSG)
    })

  test('[P-GOP-4.3] Download OAS template',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10181` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab } = versionPage
      const { groupsTab } = overviewTab
      const { createUpdateOperationGroupDialog: updateDialog } = groupsTab
      const testVersion = V_PKG_PPGR_EDIT_N
      const { groupName } = OGR_PPGR_TMPL_UPLOAD_N

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)
      await groupsTab.getGroupRow(groupName).openEditGroupParametersDialog()

      const file = await updateDialog.downloadTemplate()

      await expectFile(file).toHaveName(OGR_PMGR_CHANGE_DESCRIPTION_N.template!.name)
    })

  test('[P-GOP-5] Downloading for REST API prefix group',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10182` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab } = versionPage
      const { groupsTab } = overviewTab
      const testVersion = V_PKG_PPGR_REST_CHANGED_R
      const testPackage = V_PKG_PPGR_REST_CHANGED_R.pkg
      const groupName = 'v1'

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)

      await test.step('Download as combined YAML', async () => {
        const file = await groupsTab.getGroupRow(groupName).downloadCombinedYaml()

        await expectFile(file).toHaveName(`${groupName}_${testPackage.packageId}_${testVersion.version}.yaml`)
      })

      await test.step('Download as combined JSON', async () => {
        const file = await groupsTab.getGroupRow(groupName).downloadCombinedJson()

        await expectFile(file).toHaveName(`${groupName}_${testPackage.packageId}_${testVersion.version}.json`)
      })

      await test.step('Download as reduced YAML', async () => {
        const file = await groupsTab.getGroupRow(groupName).downloadReducedYaml()

        await expectFile(file).toHaveName(`${groupName}_${testPackage.packageId}_${testVersion.version}.zip`)
      })

      await test.step('Download as reduced JSON', async () => {
        const file = await groupsTab.getGroupRow(groupName).downloadReducedJson()

        await expectFile(file).toHaveName(`${groupName}_${testPackage.packageId}_${testVersion.version}.zip`)
      })

      await test.step('Download as reduced HTML', async () => {
        const file = await groupsTab.getGroupRow(groupName).downloadReducedHtml()

        await expectFile(file).toHaveName(`${groupName}_${testPackage.packageId}_${testVersion.version}.zip`)
      })
    })
})
