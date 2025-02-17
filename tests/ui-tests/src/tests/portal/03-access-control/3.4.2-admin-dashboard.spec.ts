import { test } from '@fixtures'
import { expect, expectFile } from '@services/expect-decorator'
import { PortalPage } from '@portal/pages/PortalPage'
import {
  CREATE_LIST_OF_USERS_V1,
  DSH_P_ADMIN_DELETING_N,
  DSH_P_ADMIN_EDITING_N,
  DSH_P_ADMIN_N,
  FILE_P_PETSTORE30,
  FILE_P_PETSTORE30_CHANGELOG_BASE,
  GRP_P_ADMIN_CRUD_N,
  OGR_DSH_UAC_ADMIN_REST_DOWNLOADING_N,
  ORG_DSH_UAC_ADMIN_REST_CHANGING_OPERATIONS_N,
  ORG_DSH_UAC_ADMIN_REST_DELETING_N,
  ORG_DSH_UAC_ADMIN_REST_EDITING_PARAMS_N,
  PKG_P_ADMIN_N,
  RV_PATTERN_DEF,
  RV_PATTERN_NEW,
  TOKEN_ADMIN_DASHBOARD,
  V_P_DSH_UAC_ADMIN_CHANGED_N,
  V_P_DSH_UAC_ADMIN_DELETING_N,
  V_P_DSH_UAC_ADMIN_EDIT_DSH_DEF_RELEASE_N,
  V_P_DSH_UAC_ADMIN_EDITING_ARCHIVED_N,
  V_P_DSH_UAC_ADMIN_EDITING_DRAFT_N,
  V_P_DSH_UAC_ADMIN_EDITING_RELEASE_N,
  VERSION_DELETED_MSG,
} from '@test-data/portal'
import {
  SETTINGS_TAB_GENERAL,
  SETTINGS_TAB_TOKENS,
  SETTINGS_TAB_USERS,
  SETTINGS_TAB_VERSIONS,
  VERSION_OVERVIEW_TAB_GROUPS,
} from '@portal/entities'
import type { VersionStatuses } from '@shared/entities'
import {
  API_TITLES_MAP,
  ARCHIVED_VERSION_STATUS,
  DRAFT_VERSION_STATUS,
  RELEASE_VERSION_STATUS,
  REST_API_TYPE,
} from '@shared/entities'
import { PUBLISH_TIMEOUT, SNAPSHOT_TIMEOUT, TICKET_BASE_URL } from '@test-setup'
import { EMPTY_VALUE } from '@test-data/shared'
import { TEST_USER_1, TEST_USER_2, TEST_USER_3, TEST_USER_4 } from '@test-data'

test.describe('03.4.2 Access Control. Admin role. (Dashboard)', () => {

  const crudGroup = GRP_P_ADMIN_CRUD_N
  const testPackage = PKG_P_ADMIN_N
  const testDashboard = DSH_P_ADMIN_N
  const testDashboardForEditing = DSH_P_ADMIN_EDITING_N
  const testVersion = V_P_DSH_UAC_ADMIN_CHANGED_N
  const downloadingGroupName = OGR_DSH_UAC_ADMIN_REST_DOWNLOADING_N.groupName

  test('[P-ACAD-01.1] Dashboard. Admin. Shared and Overview tabs.',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10614` },
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

  test('[P-ACAD-01.2] Dashboard. Admin. Create manual group.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10614` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { groupsTab } = portalPage.versionDashboardPage.overviewTab
      const { createUpdateOperationGroupDialog: createDialog, editOperationGroupDialog } = groupsTab
      const groupName = 'uac-admin-created'

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)

      await expect(groupsTab.getGroupRow(1)).toBeVisible()

      await groupsTab.createGroupBtn.click()
      await createDialog.fillForm({
        groupName: groupName,
        apiType: REST_API_TYPE,
      })
      await createDialog.createBtn.click()

      await expect(createDialog.createBtn).toBeHidden()
      await expect(editOperationGroupDialog.saveBtn).toBeEnabled()

      await editOperationGroupDialog.saveBtn.click()

      await expect(editOperationGroupDialog.saveBtn).toBeHidden()

      await expect.soft(groupsTab.getGroupRow(groupName).apiTypeCell).toHaveText(API_TITLES_MAP[REST_API_TYPE])
      await expect.soft(groupsTab.getGroupRow(groupName).operationsNumberCell).toHaveText('0')
    })

  test('[P-ACAD-01.3] Dashboard. Admin. Edit manual group.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10614` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { groupsTab } = portalPage.versionDashboardPage.overviewTab
      const { createUpdateOperationGroupDialog: updateDialog } = groupsTab
      const manualGroupName = ORG_DSH_UAC_ADMIN_REST_EDITING_PARAMS_N.groupName
      const updatedDescription = 'updated description'
      const updatedManualGroupName = 'uac-admin-updated'

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)
      await groupsTab.getGroupRow(manualGroupName).openEditGroupParametersDialog()

      await expect(updateDialog.apiTypeAc).toBeDisabled()

      await updateDialog.fillForm({
        groupName: updatedManualGroupName,
        description: updatedDescription,
      })
      await updateDialog.updateBtn.click()

      await expect(updateDialog.updateBtn).toBeHidden()
      await expect(groupsTab.getGroupRow(updatedManualGroupName)).toBeVisible()
      await expect(groupsTab.getGroupRow(manualGroupName)).toBeHidden()
      await expect(groupsTab.getGroupRow(updatedManualGroupName).descriptionCell).toHaveText(updatedDescription)
    })

  test('[P-ACAD-01.4] Dashboard. Admin. Delete manual group.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10614` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { groupsTab } = portalPage.versionDashboardPage.overviewTab
      const { deleteOperationGroupDialog } = groupsTab
      const { groupName } = ORG_DSH_UAC_ADMIN_REST_DELETING_N

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)
      await groupsTab.getGroupRow(groupName).openDeleteGroupDialog()
      await deleteOperationGroupDialog.deleteBtn.click()

      await expect(deleteOperationGroupDialog.deleteBtn).toBeHidden()
      await expect(groupsTab.getGroupRow(1)).toBeVisible()
      await expect(groupsTab.getGroupRow(groupName)).toBeHidden()
    })

  test('[P-ACAD-01.5] Dashboard. Admin. Change operations in manual group.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10614` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { groupsTab } = portalPage.versionDashboardPage.overviewTab
      const { editOperationGroupDialog } = groupsTab
      const manualGroup = ORG_DSH_UAC_ADMIN_REST_CHANGING_OPERATIONS_N

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)
      await groupsTab.getGroupRow(manualGroup.groupName).openEditGroupDialog()
      await editOperationGroupDialog.leftList.getOperationListItem(manualGroup.testMeta!.toAdd![0].operations[0]).checkbox.click()
      await editOperationGroupDialog.toRightBtn.click()

      await expect(editOperationGroupDialog.rightList.getOperationListItem()).toHaveCount(2)

      await editOperationGroupDialog.saveBtn.click()

      await expect(editOperationGroupDialog.saveBtn).toBeHidden()
      await expect(groupsTab.getGroupRow(manualGroup.groupName).operationsNumberCell).toHaveText('2')
    })

  test('[P-ACAD-01.6] Dashboard. Admin. Download operation group.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10614` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { groupsTab } = portalPage.versionDashboardPage.overviewTab

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)

      await test.step('Download as combined YAML', async () => {
        const file = await groupsTab.getGroupRow(downloadingGroupName).downloadCombinedYaml()

        await expectFile(file).toHaveName(`${downloadingGroupName}_${testDashboard.packageId}_${testVersion.version}.yaml`)
      })

      await test.step('Download as combined JSON', async () => {
        const file = await groupsTab.getGroupRow(downloadingGroupName).downloadCombinedJson()

        await expectFile(file).toHaveName(`${downloadingGroupName}_${testDashboard.packageId}_${testVersion.version}.json`)
      })

      await test.step('Download as reduced YAML', async () => {
        const file = await groupsTab.getGroupRow(downloadingGroupName).downloadReducedYaml()

        await expectFile(file).toHaveName(`${downloadingGroupName}_${testDashboard.packageId}_${testVersion.version}.zip`)
      })

      await test.step('Download as reduced JSON', async () => {
        const file = await groupsTab.getGroupRow(downloadingGroupName).downloadReducedJson()

        await expectFile(file).toHaveName(`${downloadingGroupName}_${testDashboard.packageId}_${testVersion.version}.zip`)
      })

      await test.step('Download as reduced HTML', async () => {
        const file = await groupsTab.getGroupRow(downloadingGroupName).downloadReducedHtml()

        await expectFile(file).toHaveName(`${downloadingGroupName}_${testDashboard.packageId}_${testVersion.version}.zip`)
      })
    })

  test('[P-ACAD-01.7] Dashboard. Admin. Download operations on the all main tabs.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10614` },
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

        await expect(apiChangesTab.table.getOperationRow(CREATE_LIST_OF_USERS_V1)).toBeVisible() //wait changes before download

        const file = await operationsTab.toolbar.exportMenu.downloadAll()

        await expectFile(file).toHaveName(`APIChanges_${testDashboard.packageId}_${testVersion.version}.xlsx`)
      })

      await test.step('Download operations on the "Deprecated" tab', async () => {
        await deprecatedTab.click()
        const file = await operationsTab.toolbar.exportMenu.downloadAll()

        await expectFile(file).toHaveName(`DeprecatedOperations_${testDashboard.packageId}_${testVersion.version}.xlsx`)
      })
    })

  test('[P-ACAD-01.8] Dashboard. Admin. Download documents.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10614` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { documentsTab } = versionPage
      const { slug } = FILE_P_PETSTORE30_CHANGELOG_BASE
      const { docName } = FILE_P_PETSTORE30.testMeta!

      await portalPage.gotoVersion(testVersion)
      await documentsTab.click()
      await documentsTab.sidebar.packageFilterAc.set(testPackage.name)
      const docButton = documentsTab.sidebar.getDocRestButton(docName)

      await test.step('Download document as Interactive HTML', async () => {
        await docButton.openActionMenu()
        const file = await docButton.actionMenu.downloadZip()

        await expectFile.soft(file).toHaveName(`${slug}.zip`)
      })

      await test.step('Download document as YAML', async () => {
        await docButton.openActionMenu()
        const file = await docButton.actionMenu.downloadYaml()

        await expectFile.soft(file).toHaveName(`${slug}.yaml`)
      })

      await test.step('Download document as JSON', async () => {
        await docButton.openActionMenu()
        const file = await docButton.actionMenu.downloadJson()

        await expectFile.soft(file).toHaveName(`${slug}.json`)
      })

      await test.step('Download document as YAML (inline refs)', async () => {
        await docButton.openActionMenu()
        const file = await docButton.actionMenu.downloadYamlInlineRefs()

        await expectFile.soft(file).toHaveName(`${slug}.yaml`)
      })

      await test.step('Download document as JSON (inline refs)', async () => {
        await docButton.openActionMenu()
        const file = await docButton.actionMenu.downloadJsonInlineRefs()

        await expectFile.soft(file).toHaveName(`${slug}.json`)
      })
    })

  test('[P-ACAD-02.1] Dashboard. Admin. Publishing.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10615` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { configureVersionTab } = versionPage
      const stepsProps: { version: string; status: VersionStatuses }[] = [
        {
          version: '2000.1',
          status: RELEASE_VERSION_STATUS,
        },
        {
          version: 'published-draft',
          status: DRAFT_VERSION_STATUS,
        },
        {
          version: 'published-archived',
          status: ARCHIVED_VERSION_STATUS,
        },
      ]

      for (const step of stepsProps) {
        await test.step(`Publish "${step.status}" version`, async () => {
          await portalPage.gotoVersion(testVersion)
          await versionPage.toolbar.editVersionBtn.click()
          await configureVersionTab.publishBtn.click()
          await configureVersionTab.publishVersionDialog.fillForm({ version: step.version, status: step.status })
          await configureVersionTab.publishVersionDialog.publishBtn.click()

          await expect(configureVersionTab.publishVersionDialog.publishBtn).toBeHidden({ timeout: PUBLISH_TIMEOUT })
          await expect(versionPage.toolbar.versionSlt).toHaveText(step.version)
          await expect(versionPage.toolbar.status).toHaveText(step.status)
        })
      }
    })

  test('[P-ACAD-02.2] Dashboard. Admin. Versions.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10615` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { versionsTab } = versionPage.packageSettingsPage
      const { editVersionDialog } = versionsTab
      const testVersions = [
        V_P_DSH_UAC_ADMIN_EDITING_RELEASE_N,
        V_P_DSH_UAC_ADMIN_EDITING_DRAFT_N,
        V_P_DSH_UAC_ADMIN_EDITING_ARCHIVED_N,
      ]
      const testStatus = ARCHIVED_VERSION_STATUS
      const testLabel = 'new-label'

      await portalPage.gotoDashboard(testDashboard, SETTINGS_TAB_VERSIONS)

      for (const testVersion of testVersions) {
        await test.step(`Edit "${testVersion.status}" version`, async () => {
          const testVersionRow = versionsTab.getVersionRow(testVersion.version)

          await testVersionRow.openEditVersionDialog()
          await editVersionDialog.fillForm({
            status: testStatus,
            labels: [testLabel],
          })
          await editVersionDialog.saveBtn.click()

          await expect(versionsTab.editVersionDialog.saveBtn).toBeHidden()
          await expect(testVersionRow.statusCell).toHaveText(testStatus)
          await expect(testVersionRow.labelsCell).toHaveText(testLabel)
        })
      }

      await test.step('Delete version', async () => {
        const testVersionRow = versionsTab.getVersionRow(V_P_DSH_UAC_ADMIN_DELETING_N.version)

        await testVersionRow.openDeleteVersionDialog()
        await versionsTab.deleteVersionDialog.deleteBtn.click()

        await expect(versionsTab.deleteVersionDialog.deleteBtn).toBeHidden({ timeout: SNAPSHOT_TIMEOUT })
        await expect(portalPage.snackbar).toContainText(VERSION_DELETED_MSG)
        await expect(testVersionRow).toBeHidden()
      })
    })

  test('[P-ACAD-02.3] Dashboard. Admin. Create Dashboard.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10615` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { createPackageDialog, versionDashboardPage: versionPage } = portalPage
      const dashboardName = 'DSH-admin-created'
      const dashboardAlias = 'DADMINC'

      await portalPage.gotoGroup(crudGroup)
      await portalPage.toolbar.createPackageMenu.click()
      await portalPage.toolbar.createPackageMenu.dashboardItm.click()

      await test.step('Create Dashboard', async () => {
        await createPackageDialog.fillForm({
          name: dashboardName,
          alias: dashboardAlias,
        })
        await createPackageDialog.createBtn.click()

        await expect(createPackageDialog.createBtn).toBeHidden()
        // await expect(portalPage.snackbar).toHaveText('SuccessPackage has been created') //Dashboards don't have a notification
        await expect(versionPage.toolbar.title).toHaveText(dashboardName)
      })
    })

  test('[P-ACAD-02.4] Dashboard. Admin. Edit Dashboard.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10615` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { generalTab } = versionPage.packageSettingsPage
      const changedName = 'DSH-admin-renamed'
      const serviceName = `dsh-admin-${process.env.TEST_ID_N}`
      const changedDescription = 'changed description'
      const defReleaseVersion = V_P_DSH_UAC_ADMIN_EDIT_DSH_DEF_RELEASE_N

      await test.step('Open Dashboard settings', async () => {
        await portalPage.gotoDashboard(testDashboardForEditing, SETTINGS_TAB_GENERAL)

        await expect(generalTab.dashboardName).toHaveText(testDashboardForEditing.name)
        await expect(generalTab.alias).toHaveText(testDashboardForEditing.alias)
        await expect(generalTab.serviceName).toHaveText(EMPTY_VALUE)
        await expect(generalTab.parentGroup).toHaveText(testDashboardForEditing.parentId)
        // await expect(generalTab.packageVisibility).toHaveText(PACKAGE_VISIBILITY_PUBLIC)
        await expect(generalTab.description).toHaveText(EMPTY_VALUE)
        await expect(generalTab.defReleaseVersion).toHaveText(EMPTY_VALUE)
        await expect(generalTab.pattern).toHaveText(RV_PATTERN_DEF)
      })

      await test.step('Set dashboard parameters', async () => {
        await generalTab.editBtn.click()
        await generalTab.dashboardNameTxtFld.fill(changedName)
        await generalTab.serviceNameTxtFld.fill(serviceName)
        // await generalTab.packageVisibilitySwitch.click()
        await generalTab.descriptionTxtFld.fill(changedDescription)
        await generalTab.defReleaseVersionAc.click()
        await generalTab.defReleaseVersionAc.getListItem(`${defReleaseVersion.version} ${defReleaseVersion.status}`).click()
        await generalTab.patternTxtFld.fill(RV_PATTERN_NEW)
        await generalTab.saveBtn.click()

        await expect(generalTab.dashboardName).toHaveText(changedName)
        await expect(generalTab.alias).toHaveText(testDashboardForEditing.alias)
        await expect(generalTab.serviceName).toHaveText(serviceName)
        await expect(generalTab.parentGroup).toHaveText(testDashboardForEditing.parentId)
        // await expect(generalTab.packageVisibility).toHaveText(PACKAGE_VISIBILITY_PRIVATE)
        await expect(generalTab.description).toHaveText(changedDescription)
        await expect(generalTab.defReleaseVersion).toHaveText(defReleaseVersion.version)
        await expect(generalTab.pattern).toHaveText(RV_PATTERN_NEW)
      })
    })

  test('[P-ACAD-02.5] Dashboard. Admin. Delete Dashboard.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10615` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { generalTab } = versionPage.packageSettingsPage
      const testDashboard = DSH_P_ADMIN_DELETING_N

      await test.step('Open Dashboard settings', async () => {
        await portalPage.gotoDashboard(testDashboard, SETTINGS_TAB_GENERAL)

        await expect(generalTab.dashboardName).toHaveText(testDashboard.name)
      })

      await test.step('Delete Dashboard', async () => {
        await generalTab.deleteBtn.click()
        await generalTab.deletePackageDialog.deleteBtn.click()

        await expect(generalTab.deletePackageDialog.deleteBtn).toBeHidden()
        await expect(portalPage.toolbar.title).toHaveText('Favorite')

        await portalPage.gotoGroup(crudGroup)

        await expect(portalPage.table.getRow(testDashboardForEditing)).toBeVisible()
        await expect(portalPage.table.getRow(testDashboard)).toBeHidden()
      })
    })

  test('[P-ACAD-02.6] Dashboard. Admin. Generate token.',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10615` },
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { accessTokensTab } = versionPage.packageSettingsPage
      const testTokenName = 'Generated token'
      const testUserName = TEST_USER_1.name

      await portalPage.gotoDashboard(testDashboardForEditing, SETTINGS_TAB_TOKENS)

      await expect(accessTokensTab.createdForAc).toHaveValue(testUserName)

      await accessTokensTab.nameTxtFld.fill(testTokenName)
      await accessTokensTab.generateBtn.click()

      await expect(accessTokensTab.tokenValueTxtFld).not.toBeEmpty()
      await expect(accessTokensTab.tokenValueTxtFld.copyBtn).toBeVisible()
      await expect(accessTokensTab.getTokenRow(testTokenName).roles).toHaveText('Admin')
      await expect(accessTokensTab.getTokenRow(testTokenName).createdAt).not.toBeEmpty()
      await expect(accessTokensTab.getTokenRow(testTokenName).createdBy).toHaveText(testUserName)
      // await expect(accessTokensTab.getTokenRow(testTokenName).createdFor).toHaveText(testUserName) //!Issue: the field is empty, maybe playwright's bug
    })

  test('[P-ACAD-02.7] Dashboard. Admin. Revoke token.',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10615` },
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { accessTokensTab } = versionPage.packageSettingsPage
      const testTokenName = TOKEN_ADMIN_DASHBOARD.name

      await portalPage.gotoDashboard(testDashboardForEditing, SETTINGS_TAB_TOKENS)
      await accessTokensTab.getTokenRow(testTokenName).hover()
      await accessTokensTab.getTokenRow(testTokenName).deleteBtn.click()

      await expect(accessTokensTab.getTokenRow(testTokenName)).toBeHidden()
    })

  test('[P-ACAD-02.8] Dashboard. Admin. Add user.',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10615` },
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { accessControlTab } = versionPage.packageSettingsPage
      const { addUserDialog } = accessControlTab
      const testUserName = TEST_USER_4.name

      await portalPage.gotoDashboard(testDashboardForEditing, SETTINGS_TAB_GENERAL)
      await accessControlTab.click()
      await accessControlTab.addUserBtn.click()
      await addUserDialog.fillForm(testUserName, 'Admin')
      await addUserDialog.addBtn.click()

      await expect(accessControlTab.getUserRow(testUserName).adminChx).toBeChecked()
      await expect(accessControlTab.getUserRow(testUserName).ownerChx).not.toBeChecked()
      await expect(accessControlTab.getUserRow(testUserName).editorChx).not.toBeChecked()
      await expect(accessControlTab.getUserRow(testUserName).viewerChx).not.toBeChecked()
    })

  test('[P-ACAD-02.9] Dashboard. Admin. Change user role.',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10615` },
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { accessControlTab } = versionPage.packageSettingsPage
      const testUserName = TEST_USER_2.name

      await portalPage.gotoDashboard(testDashboardForEditing, SETTINGS_TAB_USERS)

      await test.step('Add role', async () => {
        await accessControlTab.getUserRow(testUserName).editorChx.click()

        await expect(accessControlTab.getUserRow(testUserName).editorChx).toBeChecked()
      })

      await test.step('Remove role', async () => {
        await accessControlTab.getUserRow(testUserName).editorChx.click()

        await expect(accessControlTab.getUserRow(testUserName).editorChx).not.toBeChecked()
      })

      await test.step('Undo changes', async () => {
        await portalPage.snackbar.undoBtn.click()

        await expect(accessControlTab.getUserRow(testUserName).editorChx).toBeChecked()
      })
    })

  test('[P-ACAD-02.10] Dashboard. Admin. Delete user.',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10615` },
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { accessControlTab } = versionPage.packageSettingsPage
      const testUserName = TEST_USER_3.name

      await portalPage.gotoDashboard(testDashboardForEditing, SETTINGS_TAB_USERS)

      await expect(accessControlTab.getUserRow(testUserName)).toBeVisible()

      await accessControlTab.getUserRow(testUserName).hover()
      await accessControlTab.getUserRow(testUserName).deleteBtn.click()
      await accessControlTab.deleteUserDialog.removeBtn.click()

      await expect(accessControlTab.getUserRow(testUserName)).toBeHidden()
    })
})
