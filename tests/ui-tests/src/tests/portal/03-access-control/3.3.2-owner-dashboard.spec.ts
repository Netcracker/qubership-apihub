import { test } from '@fixtures'
import { expect, expectFile } from '@services/expect-decorator'
import { PortalPage } from '@portal/pages/PortalPage'
import {
  CREATE_LIST_OF_USERS_V1,
  DSH_P_OWNER_DELETING_N,
  DSH_P_OWNER_EDITING_N,
  DSH_P_OWNER_N,
  FILE_P_PETSTORE30,
  FILE_P_PETSTORE30_CHANGELOG_BASE,
  GRP_P_OWNER_CRUD_N,
  GRP_P_OWNER_ROOT_N,
  NO_PERM_ADD_MEMBER,
  NO_PERM_GEN_TOKEN,
  NO_PERM_MANAGE_ROLES,
  OGR_DSH_UAC_OWNER_REST_DOWNLOADING_N,
  ORG_DSH_UAC_OWNER_REST_CHANGING_OPERATIONS_N,
  ORG_DSH_UAC_OWNER_REST_DELETING_N,
  ORG_DSH_UAC_OWNER_REST_EDITING_PARAMS_N,
  PKG_P_OWNER_N,
  RV_PATTERN_DEF,
  RV_PATTERN_NEW,
  V_P_DSH_UAC_OWNER_CHANGED_N,
  V_P_DSH_UAC_OWNER_DELETING_N,
  V_P_DSH_UAC_OWNER_EDIT_DSH_DEF_RELEASE_N,
  V_P_DSH_UAC_OWNER_EDITING_ARCHIVED_N,
  V_P_DSH_UAC_OWNER_EDITING_DRAFT_N,
  V_P_DSH_UAC_OWNER_EDITING_RELEASE_N,
  VERSION_DELETED_MSG,
} from '@test-data/portal'
import { SETTINGS_TAB_GENERAL, SETTINGS_TAB_VERSIONS, VERSION_OVERVIEW_TAB_GROUPS } from '@portal/entities'
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

test.describe('03.3.2 Access Control. Owner role. (Dashboard)', () => {

  const rootGroup = GRP_P_OWNER_ROOT_N
  const crudGroup = GRP_P_OWNER_CRUD_N
  const testPackage = PKG_P_OWNER_N
  const testDashboard = DSH_P_OWNER_N
  const testVersion = V_P_DSH_UAC_OWNER_CHANGED_N
  const downloadingGroupName = OGR_DSH_UAC_OWNER_REST_DOWNLOADING_N.groupName

  test('[P-ACOD-01.1] Dashboard. Owner. Shared and Overview tabs.',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10548` },
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

  test('[P-ACOD-01.2] Dashboard. Owner. Create manual group.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10548` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { groupsTab } = portalPage.versionDashboardPage.overviewTab
      const { createUpdateOperationGroupDialog: createDialog, editOperationGroupDialog } = groupsTab
      const groupName = 'uac-owner-created'

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

  test('[P-ACOD-01.3] Dashboard. Owner. Edit manual group.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10548` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { groupsTab } = portalPage.versionDashboardPage.overviewTab
      const { createUpdateOperationGroupDialog: updateDialog } = groupsTab
      const manualGroupName = ORG_DSH_UAC_OWNER_REST_EDITING_PARAMS_N.groupName
      const updatedDescription = 'updated description'
      const updatedManualGroupName = 'uac-owner-updated'

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

  test('[P-ACOD-01.4] Dashboard. Owner. Delete manual group.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10548` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { groupsTab } = portalPage.versionDashboardPage.overviewTab
      const { deleteOperationGroupDialog } = groupsTab
      const { groupName } = ORG_DSH_UAC_OWNER_REST_DELETING_N

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)
      await groupsTab.getGroupRow(groupName).openDeleteGroupDialog()
      await deleteOperationGroupDialog.deleteBtn.click()

      await expect(deleteOperationGroupDialog.deleteBtn).toBeHidden()
      await expect(groupsTab.getGroupRow(1)).toBeVisible()
      await expect(groupsTab.getGroupRow(groupName)).toBeHidden()
    })

  test('[P-ACOD-01.5] Dashboard. Owner. Change operations in manual group.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10548` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { groupsTab } = portalPage.versionDashboardPage.overviewTab
      const { editOperationGroupDialog } = groupsTab
      const manualGroup = ORG_DSH_UAC_OWNER_REST_CHANGING_OPERATIONS_N

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)
      await groupsTab.getGroupRow(manualGroup.groupName).openEditGroupDialog()
      await editOperationGroupDialog.leftList.getOperationListItem(manualGroup.testMeta!.toAdd![0].operations[0]).checkbox.click()
      await editOperationGroupDialog.toRightBtn.click()

      await expect(editOperationGroupDialog.rightList.getOperationListItem()).toHaveCount(2)

      await editOperationGroupDialog.saveBtn.click()

      await expect(editOperationGroupDialog.saveBtn).toBeHidden()
      await expect(groupsTab.getGroupRow(manualGroup.groupName).operationsNumberCell).toHaveText('2')
    })

  test('[P-ACOD-01.6] Dashboard. Owner. Download operation group.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10548` },
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

  test('[P-ACOD-01.7] Dashboard. Owner. Download operations on the all main tabs.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10548` },
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

  test('[P-ACOD-01.8] Dashboard. Owner. Download documents.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10548` },
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

  test('[P-ACOD-02.1] Dashboard. Owner. Publishing.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10549` },
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

  test('[P-ACOD-02.2] Dashboard. Owner. Settings.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10549` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-1019` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const {
        accessTokensTab,
        accessControlTab,
      } = versionPage.packageSettingsPage

      await portalPage.gotoGroup(rootGroup)
      await portalPage.table.getRow(testDashboard).openSettings()

      await test.step('View "Access Tokens" tab', async () => {
        await accessTokensTab.click()

        await expect(accessTokensTab.nameTxtFld).toBeDisabled()
        await expect(accessTokensTab.rolesAc).toBeDisabled()
        await expect(accessTokensTab.createdForAc).toBeDisabled()
        await expect(accessTokensTab.generateBtn).toBeDisabled()

        await accessTokensTab.generateBtn.hover({ force: true })

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(NO_PERM_GEN_TOKEN)

        await accessTokensTab.getTokenRow(1).hover()

        await expect(accessTokensTab.getTokenRow(1).deleteBtn).toBeDisabled()

        await accessTokensTab.getTokenRow(1).deleteBtn.hover({ force: true })

        await expect(portalPage.tooltip).toHaveCount(1)
        //! await expect(portalPage.tooltip).toHaveText(NO_PERM_REVOKE_TOKEN) //Issue: TestCase-B-1019
      })

      await test.step('View "User Access Control" tab', async () => {
        await accessControlTab.click()

        await expect(accessControlTab.addUserBtn).toBeDisabled()

        await accessControlTab.addUserBtn.hover({ force: true })

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(NO_PERM_ADD_MEMBER)

        await accessControlTab.getUserRow(1).hover()

        await expect(accessControlTab.getUserRow(1).adminChx).toBeDisabled()
        await expect(accessControlTab.getUserRow(1).deleteBtn).toBeDisabled()

        await accessControlTab.getUserRow(1).adminChx.hover({ force: true })

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(NO_PERM_MANAGE_ROLES)

        await accessControlTab.getUserRow(1).deleteBtn.hover({ force: true })

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(NO_PERM_MANAGE_ROLES)
      })
    })

  test('[P-ACOD-02.3] Dashboard. Owner. Versions.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10549` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { versionsTab } = versionPage.packageSettingsPage
      const { editVersionDialog } = versionsTab
      const testVersions = [
        V_P_DSH_UAC_OWNER_EDITING_RELEASE_N,
        V_P_DSH_UAC_OWNER_EDITING_DRAFT_N,
        V_P_DSH_UAC_OWNER_EDITING_ARCHIVED_N,
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
        const testVersionRow = versionsTab.getVersionRow(V_P_DSH_UAC_OWNER_DELETING_N.version)

        await testVersionRow.openDeleteVersionDialog()
        await versionsTab.deleteVersionDialog.deleteBtn.click()

        await expect(versionsTab.deleteVersionDialog.deleteBtn).toBeHidden({ timeout: SNAPSHOT_TIMEOUT })
        await expect(portalPage.snackbar).toContainText(VERSION_DELETED_MSG)
        await expect(testVersionRow).toBeHidden()
      })
    })

  test('[P-ACOD-02.4] Dashboard. Owner. Create Dashboard.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10549` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { createPackageDialog, versionDashboardPage: versionPage } = portalPage
      const dashboardName = 'DSH-owner-created'
      const dashboardAlias = 'DOWNERC'

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

  test('[P-ACOD-02.5] Dashboard. Owner. Edit Dashboard.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10549` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { generalTab } = versionPage.packageSettingsPage
      const testDashboard = DSH_P_OWNER_EDITING_N
      const changedName = 'DSH-owner-renamed'
      const serviceName = `dsh-owner-${process.env.TEST_ID_N}`
      const changedDescription = 'changed description'
      const defReleaseVersion = V_P_DSH_UAC_OWNER_EDIT_DSH_DEF_RELEASE_N

      await test.step('Open Dashboard settings', async () => {
        await portalPage.gotoDashboard(testDashboard, SETTINGS_TAB_GENERAL)

        await expect(generalTab.dashboardName).toHaveText(testDashboard.name)
        await expect(generalTab.alias).toHaveText(testDashboard.alias)
        await expect(generalTab.serviceName).toHaveText(EMPTY_VALUE)
        await expect(generalTab.parentGroup).toHaveText(testDashboard.parentId)
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
        await expect(generalTab.alias).toHaveText(testDashboard.alias)
        await expect(generalTab.serviceName).toHaveText(serviceName)
        await expect(generalTab.parentGroup).toHaveText(testDashboard.parentId)
        // await expect(generalTab.packageVisibility).toHaveText(PACKAGE_VISIBILITY_PRIVATE)
        await expect(generalTab.description).toHaveText(changedDescription)
        await expect(generalTab.defReleaseVersion).toHaveText(defReleaseVersion.version)
        await expect(generalTab.pattern).toHaveText(RV_PATTERN_NEW)
      })
    })

  test('[P-ACOD-02.6] Dashboard. Owner. Delete Dashboard.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10549` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { generalTab } = versionPage.packageSettingsPage
      const testDashboard = DSH_P_OWNER_DELETING_N

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

        await expect(portalPage.table.getRow(DSH_P_OWNER_EDITING_N)).toBeVisible()
        await expect(portalPage.table.getRow(testDashboard)).toBeHidden()
      })
    })
})
