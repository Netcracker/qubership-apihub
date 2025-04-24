import { test } from '@fixtures'
import { expect, expectFile } from '@services/expect-decorator'
import { API_TITLES_MAP, FILE_ICON } from '@shared/entities'
import {
  genGroupsForEscaping,
  OGR_DMGR_ADD_TO_EMPTY_N,
  OGR_DMGR_CHANGE_DESCRIPTION_N,
  OGR_DMGR_CHANGE_NAME_N,
  OGR_DMGR_CHANGE_OPERATIONS_N,
  OGR_DMGR_CREATE_EMPTY_N,
  OGR_DMGR_CREATE_GQL_N,
  OGR_DMGR_DELETE_N,
  OGR_TMPL_EXIST_MSG,
  P_DSH_DMGR1_N,
  V_DSH_DMGR_N,
} from '@test-data/portal'
import { PortalPage } from '@portal/pages/PortalPage'
import { VERSION_OVERVIEW_TAB_GROUPS } from '@portal/entities'
import { SHORT_TIMEOUT, TICKET_BASE_URL } from '@test-setup'
import type { OperationGroup, Version } from '@test-data/props'

test.describe('12.2.1 Manual grouping: CRUD (Dashboards)', () => {

  const testDashboard = P_DSH_DMGR1_N
  const testVersion = V_DSH_DMGR_N

  test('[P-MGO-1.1] Create an empty group - REST API',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8349` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab } = versionPage
      const { groupsTab } = overviewTab
      const { createUpdateOperationGroupDialog: createDialog, editOperationGroupDialog } = groupsTab
      const { groupName } = OGR_DMGR_CREATE_EMPTY_N

      await portalPage.gotoDashboard(testDashboard)
      await overviewTab.groupsTab.click()

      await expect(groupsTab.getGroupRow(1)).toBeVisible()

      await groupsTab.createGroupBtn.click()
      await createDialog.fillForm(OGR_DMGR_CREATE_EMPTY_N)
      await createDialog.createBtn.click()

      await expect(createDialog.createBtn).toBeHidden()

      await editOperationGroupDialog.saveBtn.click()

      await expect(editOperationGroupDialog.saveBtn).toBeHidden()

      await expect.soft(groupsTab.getGroupRow(groupName).apiTypeCell).toHaveText(API_TITLES_MAP[OGR_DMGR_CREATE_EMPTY_N.apiType!])
      await expect.soft(groupsTab.getGroupRow(groupName).operationsNumberCell).toHaveText('0')
    })

  test('[P-MGO-1.2] Add operations to an empty group - REST API',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8349` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab } = versionPage
      const { groupsTab } = overviewTab
      const { editOperationGroupDialog } = groupsTab
      const { groupName } = OGR_DMGR_ADD_TO_EMPTY_N
      const { toAdd } = OGR_DMGR_ADD_TO_EMPTY_N.testMeta!

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)

      await groupsTab.getGroupRow(groupName).openEditGroupDialog()
      await editOperationGroupDialog.sidebar.packageFilterAc.set(toAdd![0].packageName!)
      await editOperationGroupDialog.leftList.getOperationListItem(toAdd![0].operations[0]).checkbox.click()
      await editOperationGroupDialog.toRightBtn.click()
      await editOperationGroupDialog.sidebar.packageFilterAc.clear()
      await editOperationGroupDialog.sidebar.packageFilterAc.set(toAdd![1].packageName!)
      await editOperationGroupDialog.leftList.getOperationListItem(toAdd![1].operations[0]).checkbox.click()
      await editOperationGroupDialog.leftList.getOperationListItem(toAdd![1].operations[1]).checkbox.click()
      await editOperationGroupDialog.toRightBtn.click()
      await editOperationGroupDialog.saveBtn.click()

      await expect(editOperationGroupDialog.saveBtn).toBeHidden()
      await expect.soft(groupsTab.getGroupRow(groupName).operationsNumberCell).toHaveText('3')
    })

  test('[P-MGO-1.3] Create a group - GraphQL',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8349` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab } = versionPage
      const { groupsTab } = overviewTab
      const { createUpdateOperationGroupDialog: createDialog, editOperationGroupDialog } = groupsTab
      const testGroup = OGR_DMGR_CREATE_GQL_N
      const { groupName, testMeta } = testGroup

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)

      await expect(groupsTab.getGroupRow(1)).toBeVisible()

      await groupsTab.createGroupBtn.click()
      await createDialog.fillForm(testGroup)
      await createDialog.createBtn.click()

      await expect(createDialog.createBtn).toBeHidden()

      await editOperationGroupDialog.leftList.getOperationListItem(testMeta!.toAdd![0].operations[0]).checkbox.click()
      await editOperationGroupDialog.leftList.getOperationListItem(testMeta!.toAdd![0].operations[1]).checkbox.click()
      await editOperationGroupDialog.toRightBtn.click()
      await editOperationGroupDialog.saveBtn.click()

      await expect(editOperationGroupDialog.saveBtn).toBeHidden()
      await expect.soft(groupsTab.getGroupRow(groupName).apiTypeCell).toHaveText(API_TITLES_MAP[testGroup.apiType])
      await expect.soft(groupsTab.getGroupRow(groupName).operationsNumberCell).toHaveText('2')
    })

  test('[P-MGO-2.1] Change name of group',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8350` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab } = versionPage
      const { groupsTab } = overviewTab
      const { createUpdateOperationGroupDialog: updateDialog } = groupsTab
      const { groupName, testMeta } = OGR_DMGR_CHANGE_NAME_N

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)

      await groupsTab.getGroupRow(groupName).openEditGroupParametersDialog()
      await updateDialog.fillForm({ groupName: testMeta!.changedName })
      await updateDialog.updateBtn.click()

      await expect(updateDialog.updateBtn).toBeHidden()
      await expect(groupsTab.getGroupRow(testMeta!.changedName)).toBeVisible()
      await expect(groupsTab.getGroupRow(groupName, { exact: true })).toBeHidden()
    })

  test('[P-MGO-2.2] Change description of group',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8350` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab } = versionPage
      const { groupsTab } = overviewTab
      const { createUpdateOperationGroupDialog: updateDialog } = groupsTab
      const { groupName, description, testMeta } = OGR_DMGR_CHANGE_DESCRIPTION_N

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)

      await expect(groupsTab.getGroupRow(groupName).descriptionCell).toHaveText(description!)

      await groupsTab.getGroupRow(groupName).openEditGroupParametersDialog()
      await updateDialog.fillForm({ description: testMeta!.changedDescription })
      await updateDialog.updateBtn.click()

      await expect(updateDialog.updateBtn).toBeHidden()
      await expect(groupsTab.getGroupRow(groupName).descriptionCell).toHaveText(testMeta!.changedDescription!)
    })

  test('[P-MGO-2.3] Change number and list of operations of group',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8350` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab } = versionPage
      const { groupsTab } = overviewTab
      const { editOperationGroupDialog } = groupsTab
      const { groupName, testMeta } = OGR_DMGR_CHANGE_OPERATIONS_N

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)

      await test.step(`Open "Edit Operation Group" dialog for "${groupName}"`, async () => {
        await groupsTab.getGroupRow(groupName).openEditGroupDialog()
      })

      await test.step('Add operations', async () => {
        await editOperationGroupDialog.leftList.getOperationListItem(testMeta!.toAdd![0].operations[0]).checkbox.click()
        await editOperationGroupDialog.leftList.getOperationListItem(testMeta!.toAdd![0].operations[1]).checkbox.click()
        await editOperationGroupDialog.toRightBtn.click()
      })

      await test.step('Remove operation', async () => {
        await editOperationGroupDialog.rightList.getOperationListItem(testMeta!.toRemove![0].operations[0]).checkbox.click()
        await editOperationGroupDialog.toLeftBtn.click()

        await expect(editOperationGroupDialog.rightList.getOperationListItem()).toHaveCount(4)
      })

      await test.step(`Save the "${groupName}" operation group`, async () => {
        await editOperationGroupDialog.saveBtn.click()

        await expect(editOperationGroupDialog.saveBtn).toBeHidden()
      })

      await test.step(`Open the ${groupName} operation group and check operations`, async () => {
        await portalPage.waitForTimeout(SHORT_TIMEOUT) //WA for row switching
        await groupsTab.getGroupRow(groupName).hover()
        await groupsTab.getGroupRow(groupName).addBtn.click()

        await expect(editOperationGroupDialog.rightList.getOperationListItem()).toHaveCount(4)
        await expect(editOperationGroupDialog.rightList.getOperationListItem(testMeta!.operations![0])).toBeVisible()
        await expect(editOperationGroupDialog.rightList.getOperationListItem(testMeta!.operations![1])).toBeVisible()
        await expect(editOperationGroupDialog.rightList.getOperationListItem(testMeta!.toAdd![0].operations[0])).toBeVisible()
        await expect(editOperationGroupDialog.rightList.getOperationListItem(testMeta!.toAdd![0].operations[1])).toBeVisible()
      })
    })

  test('[P-MGO-2.4] Upload OAS template',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8350` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab } = versionPage
      const { groupsTab } = overviewTab
      const { createUpdateOperationGroupDialog: updateDialog } = groupsTab
      const { groupName, testMeta } = OGR_DMGR_CHANGE_OPERATIONS_N

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

  test('[P-MGO-2.5] Download OAS template',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8350` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab } = versionPage
      const { groupsTab } = overviewTab
      const { createUpdateOperationGroupDialog: updateDialog } = groupsTab
      const { groupName } = OGR_DMGR_CHANGE_DESCRIPTION_N

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)
      await groupsTab.getGroupRow(groupName).openEditGroupParametersDialog()

      const file = await updateDialog.downloadTemplate()

      await expectFile(file).toHaveName(OGR_DMGR_CHANGE_DESCRIPTION_N.template!.name)
    })

  test('[P-MGO-2.6] Check special char escaping in operation group name',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8350` },
      ],
    },
    async ({ sysadminPage: page, apihubTDM: tdm }, testInfo) => {
      test.setTimeout(380000)

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab } = versionPage
      const { groupsTab } = overviewTab
      const { editOperationGroupDialog } = groupsTab

      const { retry } = testInfo
      const testVersion: Version = {
        ...V_DSH_DMGR_N,
        version: `char-escaping-${retry}`,
        status: 'draft',
      }
      const operationGroups: OperationGroup[] = genGroupsForEscaping(testVersion)

      await tdm.publishVersion(testVersion)

      for (const group of operationGroups) {
        await tdm.createOperationGroup(group)

        await test.step(`"${group.groupName}" group name`, async () => {

          await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)

          await test.step(`Open "Edit Operation Group" dialog for "${group.groupName}"`, async () => {
            await groupsTab.getGroupRow(group.groupName).openEditGroupDialog()
          })

          await test.step('Add operations', async () => {
            await editOperationGroupDialog.leftList.getOperationListItem(group.testMeta!.toAdd![0].operations[0]).checkbox.click()
            await editOperationGroupDialog.toRightBtn.click()

            await expect.soft(editOperationGroupDialog.rightList.getOperationListItem()).toHaveCount(1)
          })

          await test.step(`Save the "${group.groupName}" operation group`, async () => {
            await editOperationGroupDialog.saveBtn.click()

            await expect.soft(editOperationGroupDialog.saveBtn).toBeHidden()
            await expect.soft(groupsTab.getGroupRow(group.groupName).operationsNumberCell).toHaveText('1')
          })
        })
      }
    })

  test('[P-MGO-4.1] Delete a group of operations',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8351` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab, operationsTab } = versionPage
      const { groupsTab } = overviewTab
      const { deleteOperationGroupDialog } = groupsTab
      const { groupName } = OGR_DMGR_DELETE_N

      await portalPage.gotoDashboard(testDashboard)
      await overviewTab.groupsTab.click()

      await groupsTab.getGroupRow(groupName).hover()
      await groupsTab.getGroupRow(groupName).deleteBtn.click()
      await deleteOperationGroupDialog.deleteBtn.click()

      await expect(deleteOperationGroupDialog.deleteBtn).toBeHidden()
      await expect(groupsTab.getGroupRow(1)).toBeVisible()
      await expect(groupsTab.getGroupRow(groupName)).toBeHidden()

      await versionPage.operationsTab.click()
      await operationsTab.sidebar.groupFilterAc.click()

      await expect(operationsTab.sidebar.groupFilterAc.ungroupedItm).toBeVisible()
      await expect(operationsTab.sidebar.groupFilterAc.getListItem(groupName)).toBeHidden()
    })
})
