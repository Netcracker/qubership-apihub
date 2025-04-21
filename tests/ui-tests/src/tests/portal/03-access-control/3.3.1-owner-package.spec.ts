import { test } from '@fixtures'
import { expect, expectFile } from '@services/expect-decorator'
import { PortalPage } from '@portal/pages/PortalPage'
import {
  CREATE_LIST_OF_USERS_V1,
  DEF_PREFIX_GROUP,
  FILE_P_PETSTORE30,
  FILE_P_PETSTORE30_CHANGELOG_BASE,
  GRP_P_OWNER_CRUD_N,
  GRP_P_OWNER_ROOT_N,
  NO_PERM_ADD_MEMBER,
  NO_PERM_GEN_TOKEN,
  NO_PERM_MANAGE_ROLES,
  OGR_PREFIX_DELETION_MSG,
  OGR_PREFIX_EDITING_MSG,
  ORG_PKG_UAC_OWNER_REST_CHANGING_OPERATIONS_N,
  ORG_PKG_UAC_OWNER_REST_DELETING_N,
  ORG_PKG_UAC_OWNER_REST_DOWNLOADING_N,
  ORG_PKG_UAC_OWNER_REST_EDITING_PARAMS_N,
  PKG_P_OWNER_DELETING_N,
  PKG_P_OWNER_EDITING_N,
  PKG_P_OWNER_N,
  RV_PATTERN_DEF,
  RV_PATTERN_NEW,
  V_P_PKG_UAC_OWNER_CHANGED_N,
  V_P_PKG_UAC_OWNER_DELETING_N,
  V_P_PKG_UAC_OWNER_EDIT_PKG_DEF_RELEASE_N,
  V_P_PKG_UAC_OWNER_EDITING_ARCHIVED_N,
  V_P_PKG_UAC_OWNER_EDITING_DRAFT_N,
  V_P_PKG_UAC_OWNER_EDITING_RELEASE_N,
  VERSION_DELETED_MSG,
} from '@test-data/portal'
import {
  SETTINGS_TAB_API_CONFIG,
  SETTINGS_TAB_GENERAL,
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

test.describe('03.3.1 Access Control. Owner role. (Package)', () => {

  const rootGroup = GRP_P_OWNER_ROOT_N
  const crudGroup = GRP_P_OWNER_CRUD_N
  const testPackage = PKG_P_OWNER_N
  const testVersion = V_P_PKG_UAC_OWNER_CHANGED_N
  const prefixGroupName = 'v1'
  const downloadingGroupName = ORG_PKG_UAC_OWNER_REST_DOWNLOADING_N.groupName

  test('[P-ACOP-01.1] Package. Owner. Shared and Overview tabs.',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10545` },
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

  test('[P-ACOP-01.2] Package. Owner. Create manual group.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10545` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { groupsTab } = portalPage.versionPackagePage.overviewTab
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

  test('[P-ACOP-01.3] Package. Owner. Edit groups.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10545` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { groupsTab } = portalPage.versionPackagePage.overviewTab
      const { createUpdateOperationGroupDialog: updateDialog } = groupsTab
      const manualGroupName = ORG_PKG_UAC_OWNER_REST_EDITING_PARAMS_N.groupName
      const updatedDescription = 'updated description'
      const updatedManualGroupName = 'uac-owner-updated'

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)

      await test.step('Edit prefix group', async () => {
        await groupsTab.getGroupRow(prefixGroupName).openEditGroupParametersDialog()

        await expect(updateDialog.groupNameTxtFld).toBeDisabled()
        await expect(updateDialog.apiTypeAc).toBeDisabled()

        await updateDialog.fillForm({ description: updatedDescription })
        await updateDialog.updateBtn.click()

        await expect(updateDialog.updateBtn).toBeHidden()
        await expect(groupsTab.getGroupRow(prefixGroupName).descriptionCell).toHaveText(updatedDescription)
      })

      await test.step('Edit manual group', async () => {
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
    })

  test('[P-ACOP-01.4] Package. Owner. Delete groups.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10545` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { groupsTab } = portalPage.versionPackagePage.overviewTab
      const { deleteOperationGroupDialog } = groupsTab
      const { groupName } = ORG_PKG_UAC_OWNER_REST_DELETING_N

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)

      await test.step('Delete prefix group', async () => {
        await groupsTab.getGroupRow(prefixGroupName).hover()

        await expect(groupsTab.getGroupRow(prefixGroupName).deleteBtn).toBeDisabled()

        await groupsTab.getGroupRow(prefixGroupName).deleteBtn.hover({ force: true })

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(OGR_PREFIX_DELETION_MSG)
      })

      await test.step('Delete manual group', async () => {
        await groupsTab.getGroupRow(groupName).openDeleteGroupDialog()
        await deleteOperationGroupDialog.deleteBtn.click()

        await expect(deleteOperationGroupDialog.deleteBtn).toBeHidden()
        await expect(groupsTab.getGroupRow(1)).toBeVisible()
        await expect(groupsTab.getGroupRow(groupName)).toBeHidden()
      })
    })

  test('[P-ACOP-01.5] Package. Owner. Change operations in groups.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10545` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { groupsTab } = portalPage.versionPackagePage.overviewTab
      const { editOperationGroupDialog } = groupsTab
      const manualGroup = ORG_PKG_UAC_OWNER_REST_CHANGING_OPERATIONS_N

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)

      await test.step('Change operations in prefix group', async () => {
        await groupsTab.getGroupRow(prefixGroupName).hover()

        await expect(groupsTab.getGroupRow(prefixGroupName).addBtn).toBeDisabled()

        await groupsTab.getGroupRow(prefixGroupName).addBtn.hover({ force: true })

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(OGR_PREFIX_EDITING_MSG)
      })

      await test.step('Change operations in manual group', async () => {
        await groupsTab.getGroupRow(manualGroup.groupName).openEditGroupDialog()
        await editOperationGroupDialog.leftList.getOperationListItem(manualGroup.testMeta!.toAdd![0].operations[0]).checkbox.click()
        await editOperationGroupDialog.toRightBtn.click()

        await expect(editOperationGroupDialog.rightList.getOperationListItem()).toHaveCount(2)

        await editOperationGroupDialog.saveBtn.click()

        await expect(editOperationGroupDialog.saveBtn).toBeHidden()
        await expect(groupsTab.getGroupRow(manualGroup.groupName).operationsNumberCell).toHaveText('2')
      })
    })

  test('[P-ACOP-01.6] Package. Owner. Download operation groups.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10545` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { groupsTab } = portalPage.versionPackagePage.overviewTab

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)

      await test.step('Prefix group', async () => {

        await test.step('Download as combined YAML', async () => {
          const file = await groupsTab.getGroupRow(prefixGroupName).downloadCombinedYaml()

          await expectFile(file).toHaveName(`${prefixGroupName}_${testPackage.packageId}_${testVersion.version}.yaml`)
        })

        await test.step('Download as combined JSON', async () => {
          const file = await groupsTab.getGroupRow(prefixGroupName).downloadCombinedJson()

          await expectFile(file).toHaveName(`${prefixGroupName}_${testPackage.packageId}_${testVersion.version}.json`)
        })

        await test.step('Download as reduced YAML', async () => {
          const file = await groupsTab.getGroupRow(prefixGroupName).downloadReducedYaml()

          await expectFile(file).toHaveName(`${prefixGroupName}_${testPackage.packageId}_${testVersion.version}.zip`)
        })

        await test.step('Download as reduced JSON', async () => {
          const file = await groupsTab.getGroupRow(prefixGroupName).downloadReducedJson()

          await expectFile(file).toHaveName(`${prefixGroupName}_${testPackage.packageId}_${testVersion.version}.zip`)
        })

        await test.step('Download as reduced HTML', async () => {
          const file = await groupsTab.getGroupRow(prefixGroupName).downloadReducedHtml()

          await expectFile(file).toHaveName(`${prefixGroupName}_${testPackage.packageId}_${testVersion.version}.zip`)
        })
      })

      await test.step('Manual group', async () => {

        await test.step('Download as combined YAML', async () => {
          const file = await groupsTab.getGroupRow(downloadingGroupName).downloadCombinedYaml()

          await expectFile(file).toHaveName(`${downloadingGroupName}_${testPackage.packageId}_${testVersion.version}.yaml`)
        })

        await test.step('Download as combined JSON', async () => {
          const file = await groupsTab.getGroupRow(downloadingGroupName).downloadCombinedJson()

          await expectFile(file).toHaveName(`${downloadingGroupName}_${testPackage.packageId}_${testVersion.version}.json`)
        })

        await test.step('Download as reduced YAML', async () => {
          const file = await groupsTab.getGroupRow(downloadingGroupName).downloadReducedYaml()

          await expectFile(file).toHaveName(`${downloadingGroupName}_${testPackage.packageId}_${testVersion.version}.zip`)
        })

        await test.step('Download as reduced JSON', async () => {
          const file = await groupsTab.getGroupRow(downloadingGroupName).downloadReducedJson()

          await expectFile(file).toHaveName(`${downloadingGroupName}_${testPackage.packageId}_${testVersion.version}.zip`)
        })

        await test.step('Download as reduced HTML', async () => {
          const file = await groupsTab.getGroupRow(downloadingGroupName).downloadReducedHtml()

          await expectFile(file).toHaveName(`${downloadingGroupName}_${testPackage.packageId}_${testVersion.version}.zip`)
        })
      })
    })

  test('[P-ACOP-01.7] Package. Owner. Download operations on the all main tabs.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10545` },
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

  test('[P-ACOP-01.8] Package. Owner. Download documents.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10545` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { documentsTab } = versionPage
      const { slug } = FILE_P_PETSTORE30_CHANGELOG_BASE
      const { docName } = FILE_P_PETSTORE30.testMeta!

      await portalPage.gotoVersion(testVersion)
      await documentsTab.click()
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

  test('[P-ACOP-02.1] Package. Owner. Publishing.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10546` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
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

  test('[P-ACOP-02.2] Package. Owner. Settings.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10546` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-1019` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const {
        accessTokensTab,
        accessControlTab,
      } = versionPage.packageSettingsPage

      await portalPage.gotoGroup(rootGroup)
      await portalPage.table.getRow(testPackage).openSettings()

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

  test('[P-ACOP-02.3] Package. Owner. Versions.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10546` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { versionsTab } = versionPage.packageSettingsPage
      const { editVersionDialog } = versionsTab
      const testVersions = [
        V_P_PKG_UAC_OWNER_EDITING_RELEASE_N,
        V_P_PKG_UAC_OWNER_EDITING_DRAFT_N,
        V_P_PKG_UAC_OWNER_EDITING_ARCHIVED_N,
      ]
      const testStatus = ARCHIVED_VERSION_STATUS
      const testLabel = 'new-label'

      await portalPage.gotoPackage(testPackage, SETTINGS_TAB_VERSIONS)

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
        const testVersionRow = versionsTab.getVersionRow(V_P_PKG_UAC_OWNER_DELETING_N.version)

        await testVersionRow.openDeleteVersionDialog()
        await versionsTab.deleteVersionDialog.deleteBtn.click()

        await expect(versionsTab.deleteVersionDialog.deleteBtn).toBeHidden({ timeout: SNAPSHOT_TIMEOUT })
        await expect(portalPage.snackbar).toContainText(VERSION_DELETED_MSG)
        await expect(testVersionRow).toBeHidden()
      })
    })

  test('[P-ACOP-02.4] Package. Owner. Create Package.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10546` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { createPackageDialog, versionPackagePage: versionPage } = portalPage
      const packageName = 'PKG-owner-created'
      const packageAlias = 'POWNERC'

      await portalPage.gotoGroup(crudGroup)
      await portalPage.toolbar.createPackageMenu.click()
      await portalPage.toolbar.createPackageMenu.packageItm.click()

      await test.step('Create Package', async () => {
        await createPackageDialog.fillForm({
          name: packageName,
          alias: packageAlias,
        })
        await createPackageDialog.createBtn.click()

        await expect(createPackageDialog.createBtn).toBeHidden()
        await expect(portalPage.snackbar).toHaveText('SuccessPackage has been created')
        await expect(versionPage.toolbar.title).toHaveText(packageName)
      })
    })

  test('[P-ACOP-02.5] Package. Owner. Edit Package.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10546` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { generalTab } = versionPage.packageSettingsPage
      const testPackage = PKG_P_OWNER_EDITING_N
      const changedName = 'PKG-owner-renamed'
      const serviceName = `pkg-owner-${process.env.TEST_ID_N}`
      const changedDescription = 'changed description'
      const defReleaseVersion = V_P_PKG_UAC_OWNER_EDIT_PKG_DEF_RELEASE_N

      await test.step('Open Package settings', async () => {
        await portalPage.gotoPackage(testPackage, SETTINGS_TAB_GENERAL)

        await expect(generalTab.packageName).toHaveText(testPackage.name)
        await expect(generalTab.alias).toHaveText(testPackage.alias)
        await expect(generalTab.serviceName).toHaveText(EMPTY_VALUE)
        await expect(generalTab.parentGroup).toHaveText(testPackage.parentId)
        // await expect(generalTab.packageVisibility).toHaveText(PACKAGE_VISIBILITY_PUBLIC)
        await expect(generalTab.description).toHaveText(EMPTY_VALUE)
        await expect(generalTab.defReleaseVersion).toHaveText(EMPTY_VALUE)
        await expect(generalTab.pattern).toHaveText(RV_PATTERN_DEF)
      })

      await test.step('Set package parameters', async () => {
        await generalTab.editBtn.click()
        await generalTab.packageNameTxtFld.fill(changedName)
        await generalTab.serviceNameTxtFld.fill(serviceName)
        // await generalTab.packageVisibilitySwitch.click()
        await generalTab.descriptionTxtFld.fill(changedDescription)
        await generalTab.defReleaseVersionAc.click()
        await generalTab.defReleaseVersionAc.getListItem(`${defReleaseVersion.version} ${defReleaseVersion.status}`).click()
        await generalTab.patternTxtFld.fill(RV_PATTERN_NEW)
        await generalTab.saveBtn.click()

        await expect(generalTab.packageName).toHaveText(changedName)
        await expect(generalTab.alias).toHaveText(testPackage.alias)
        await expect(generalTab.serviceName).toHaveText(serviceName)
        await expect(generalTab.parentGroup).toHaveText(testPackage.parentId)
        // await expect(generalTab.packageVisibility).toHaveText(PACKAGE_VISIBILITY_PRIVATE)
        await expect(generalTab.description).toHaveText(changedDescription)
        await expect(generalTab.defReleaseVersion).toHaveText(defReleaseVersion.version)
        await expect(generalTab.pattern).toHaveText(RV_PATTERN_NEW)
      })
    })

  test('[P-ACOP-02.6] Package. Owner. Delete Package.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10546` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { generalTab } = versionPage.packageSettingsPage
      const testPackage = PKG_P_OWNER_DELETING_N

      await test.step('Open Package settings', async () => {
        await portalPage.gotoPackage(testPackage, SETTINGS_TAB_GENERAL)

        await expect(generalTab.packageName).toHaveText(testPackage.name)
      })

      await test.step('Delete Package', async () => {
        await generalTab.deleteBtn.click()
        await generalTab.deletePackageDialog.deleteBtn.click()

        await expect(generalTab.deletePackageDialog.deleteBtn).toBeHidden()
        await expect(portalPage.toolbar.title).toHaveText('Favorite')

        await portalPage.gotoGroup(crudGroup)

        await expect(portalPage.table.getRow(PKG_P_OWNER_EDITING_N)).toBeVisible()
        await expect(portalPage.table.getRow(testPackage)).toBeHidden()
      })
    })

  test('[P-ACOP-02.7] Package. Owner. Set REST Path Prefix.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10546` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { apiSpecConfigTab } = versionPage.packageSettingsPage
      const { editPrefixDialog } = apiSpecConfigTab

      await test.step('Open "API Specific Configuration" tab', async () => {
        await portalPage.gotoPackage(PKG_P_OWNER_EDITING_N, SETTINGS_TAB_API_CONFIG)

        await expect(apiSpecConfigTab.prefix).toHaveText(EMPTY_VALUE)
      })

      await test.step('Set valid prefix', async () => {
        await apiSpecConfigTab.prefix.hover()
        await apiSpecConfigTab.editBtn.click()

        await editPrefixDialog.prefixTxtFld.fill(DEF_PREFIX_GROUP)
        await editPrefixDialog.saveBtn.click()

        await expect(editPrefixDialog.saveBtn).toBeHidden()
        await expect(apiSpecConfigTab.prefix).toHaveText(DEF_PREFIX_GROUP)
      })
    })
})
