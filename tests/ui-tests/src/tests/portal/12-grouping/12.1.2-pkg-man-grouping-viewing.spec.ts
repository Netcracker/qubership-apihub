import { test } from '@fixtures'
import { expect, expectFile } from '@services/expect-decorator'
import { PortalPage } from '@portal/pages/PortalPage'
import {
  CREATE_LIST_OF_USERS_V1,
  DEL_ORDER_V1,
  DEL_PET_V1,
  GET_PET_BY_TAG_V1,
  OGR_PMGR_DOWNLOAD_GQL_R,
  OGR_PMGR_DOWNLOAD_PUBLISH_N,
  OGR_PMGR_DOWNLOAD_REST_R,
  OGR_PMGR_FILTERING_GQL_R,
  OGR_PMGR_FILTERING_REST_DEPRECATED_R,
  OGR_PMGR_FILTERING_REST_R,
  P_PKG_PMGR_R,
  UPDATE_USER_V1,
  V_PKG_PMGR_CHANGED_R,
  V_PKG_PMGR_DOWNLOAD_PUBLISH_N,
} from '@test-data/portal'
import {
  VERSION_CHANGES_TAB_REST,
  VERSION_DEPRECATED_TAB_REST,
  VERSION_OPERATIONS_TAB_REST,
  VERSION_OVERVIEW_TAB_GROUPS,
} from '@portal/entities'
import type { DownloadedTestFile } from '@shared/entities'
import { ROOT_DOWNLOADS, TestFile } from '@shared/entities'
import path from 'node:path'
import { TICKET_BASE_URL } from '@test-setup'

test.describe('12.1.2 Manual grouping: Viewing (Packages)', () => {

  const testPackage = P_PKG_PMGR_R
  const testVersion = V_PKG_PMGR_CHANGED_R

  test('[P-MGOP-2.2.1] Downloading for REST API group',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10191` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab } = versionPage
      const { groupsTab } = overviewTab
      const { groupName } = OGR_PMGR_DOWNLOAD_REST_R

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

  test('[P-MGOP-2.2.2-N] Downloading for GraphQL group (Negative)',
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

      await expect(groupsTab.getGroupRow(groupName).downloadMenu).toBeDisabled()
    })

  test('[P-MGOP-2.2.3] Downloading the combined specification and its subsequent publication',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10191` },
      ],
    },
    async ({ sysadminPage: page, apihubTDM: tdm }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab, apiChangesTab } = versionPage
      const { groupsTab } = overviewTab
      const testVersion = V_PKG_PMGR_DOWNLOAD_PUBLISH_N
      const testGroup = OGR_PMGR_DOWNLOAD_PUBLISH_N
      let downloadedFile: DownloadedTestFile
      let testGroupFile: TestFile

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)

      await test.step('Download group as combined YAML', async () => {
        downloadedFile = await groupsTab.getGroupRow(testGroup.groupName).downloadCombinedYaml()
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

  test('[P-MGOP-3.1-N] Change API type for group (Negative)',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10192` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab } = versionPage
      const { groupsTab } = overviewTab
      const { createUpdateOperationGroupDialog: updateDialog } = groupsTab

      await test.step('Change API type for REST API group', async () => {
        await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)
        await groupsTab.getGroupRow(OGR_PMGR_DOWNLOAD_REST_R.groupName).hover()
        await groupsTab.getGroupRow(OGR_PMGR_DOWNLOAD_REST_R.groupName).editBtn.click()

        await expect.soft(updateDialog.apiTypeAc).toBeDisabled()
      })

      await test.step('Change API type for GraphQL group', async () => {
        await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)
        await groupsTab.getGroupRow(OGR_PMGR_DOWNLOAD_GQL_R.groupName).hover()
        await groupsTab.getGroupRow(OGR_PMGR_DOWNLOAD_GQL_R.groupName).editBtn.click()

        await expect.soft(updateDialog.apiTypeAc).toBeDisabled()
      })
    })

  //UNSTABLE
  /*test('[P-MGOP-3.2-N] Add more than 200 operations (Negative)',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10192` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab } = versionPage
      const { groupsTab } = overviewTab
      const { editOperationGroupDialog } = groupsTab
      const { groupName } = OGR_PMGR_MORE_200_R

      await portalPage.gotoVersion(V_PKG_PMGR_200_R, VERSION_OVERVIEW_TAB_GROUPS)

      await test.step('Open "Edit Operation Group" dialog', async () => {
        await groupsTab.getGroupRow(groupName).hover()
        await groupsTab.getGroupRow(groupName).addBtn.click()
      })

      await test.step('Add 199 operations', async () => {
        await portalPage.waitForTimeout(CREATE_TIMEOUT) //WA list reload
        for (let i = 1; i <= 199; i++) {
          await editOperationGroupDialog.leftList.getOperationListItem(i).checkbox.click()
        }
        await editOperationGroupDialog.toRightBtn.click()

        await expect(editOperationGroupDialog.operationGroupLimit).toContainText('199 out of 200')
      })

      await test.step('Add the 200th operation', async () => {
        await editOperationGroupDialog.leftList.getOperationListItem(1).checkbox.click()
        await editOperationGroupDialog.toRightBtn.click()

        await expect(editOperationGroupDialog.operationGroupLimit).toContainText('200 out of 200')
      })

      await test.step('Try to add the 201th operation', async () => {
        await editOperationGroupDialog.leftList.getOperationListItem(1).checkbox.click()

        await expect(editOperationGroupDialog.toRightBtn).toBeDisabled()

        await editOperationGroupDialog.toRightBtn.hover()

        await expect(editOperationGroupDialog.tooltip).toHaveText(OGR_MORE_THEN_200_OPERATIONS_MSG)
      })
    })*/

  test('[P-MGOP-5.1] Filtering operations on the "Operations" tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10194` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { operationsTab } = versionPage
      const restGroup = OGR_PMGR_FILTERING_REST_R
      const gqlGroup = OGR_PMGR_FILTERING_GQL_R

      await portalPage.gotoVersion(testVersion, VERSION_OPERATIONS_TAB_REST)

      await expect(operationsTab.table.getOperationRow()).toHaveCount(19)

      await test.step('Add filter by REST API operation group', async () => {
        await operationsTab.sidebar.groupFilterAc.click()

        await expect.soft(operationsTab.sidebar.groupFilterAc.getListItem(gqlGroup.groupName)).toBeHidden()

        await operationsTab.sidebar.groupFilterAc.getListItem(restGroup.groupName).click()

        await expect(operationsTab.table.getOperationRow()).toHaveCount(2)
        await expect(operationsTab.table.getOperationRow(restGroup.testMeta!.operations![0])).toBeVisible()
        await expect(operationsTab.table.getOperationRow(restGroup.testMeta!.operations![1])).toBeVisible()
      })

      await test.step('Add filter by API Kind', async () => {
        await operationsTab.sidebar.apiKindFilterAc.click()
        await operationsTab.sidebar.apiKindFilterAc.noBwcItm.click()

        await expect(operationsTab.table.getOperationRow()).toHaveCount(1)
        await expect(operationsTab.table.getOperationRow(restGroup.testMeta!.operations![0])).toBeVisible()
      })

      await test.step('Switch to GraphQL API type', async () => {
        await operationsTab.toolbar.sltApiType.click()
        await operationsTab.toolbar.sltApiType.graphQlItm.click()

        await expect(operationsTab.table.noOperationsPlaceholder).toBeVisible()
      })

      await test.step('Set filter by GraphQL operation group', async () => {
        await operationsTab.sidebar.apiKindFilterAc.clear()
        await operationsTab.sidebar.groupFilterAc.click()
        await operationsTab.sidebar.groupFilterAc.allItm.click()

        await expect(operationsTab.table.getOperationRow()).toHaveCount(4)

        await operationsTab.sidebar.groupFilterAc.click()

        await expect.soft(operationsTab.sidebar.groupFilterAc.getListItem(restGroup.groupName)).toBeHidden()

        await operationsTab.sidebar.groupFilterAc.getListItem(gqlGroup.groupName).click()

        await expect(operationsTab.table.getOperationRow()).toHaveCount(1)
        await expect(operationsTab.table.getOperationRow(gqlGroup.testMeta!.operations![0])).toBeVisible()
      })
    })

  test('[P-MGOP-6.1] Filtering operations on the "API Changes" tab',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10195` },
        { type: 'Issue', description: 'GraphQL checks temporarily disabled' },
      ],

    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { apiChangesTab } = versionPage
      const restGroup = OGR_PMGR_FILTERING_REST_R
      const gqlGroup = OGR_PMGR_FILTERING_GQL_R

      await portalPage.gotoVersion(testVersion, VERSION_CHANGES_TAB_REST)

      await expect(apiChangesTab.table.getOperationRow()).toHaveCount(5)

      await test.step('Set filter by REST API operation group', async () => {
        await apiChangesTab.sidebar.groupFilterAc.click()

        await expect.soft(apiChangesTab.sidebar.groupFilterAc.getListItem(gqlGroup.groupName)).toBeHidden()

        await apiChangesTab.sidebar.groupFilterAc.getListItem(restGroup.groupName).click()

        await expect(apiChangesTab.table.getOperationRow()).toHaveCount(2)
        await expect(apiChangesTab.table.getOperationRow(restGroup.testMeta!.operations![0])).toBeVisible()
        await expect(apiChangesTab.table.getOperationRow(restGroup.testMeta!.operations![1])).toBeVisible()
      })

      await test.step('Set "Ungrouped" filter', async () => {
        await apiChangesTab.sidebar.groupFilterAc.click()
        await apiChangesTab.sidebar.groupFilterAc.ungroupedItm.click()

        await expect(apiChangesTab.table.getOperationRow()).toHaveCount(1)
        await expect(apiChangesTab.table.getOperationRow(CREATE_LIST_OF_USERS_V1)).toBeVisible()
      })

      await test.step('Switch to GraphQL API type', async () => {
        await apiChangesTab.toolbar.sltApiType.click()
        await apiChangesTab.toolbar.sltApiType.graphQlItm.click()

        await expect(apiChangesTab.table.noChangesPlaceholder).toBeVisible()
      })

      await test.step('Set filter by GraphQL operation group', async () => {
        await apiChangesTab.sidebar.groupFilterAc.click()
        await apiChangesTab.sidebar.groupFilterAc.allItm.click()

        /*!await expect(apiChangesTab.table.getOperationRow()).toHaveCount(2) //Issue GraphQL checks temporarily disabled

        await apiChangesTab.sidebar.groupFilterAc.click()

        await expect.soft(apiChangesTab.sidebar.groupFilterAc.getListItem(restGroup.groupName)).toBeHidden()

        await apiChangesTab.sidebar.groupFilterAc.getListItem(gqlGroup.groupName).click()

        await expect(apiChangesTab.table.getOperationRow()).toHaveCount(1)
        await expect(apiChangesTab.table.getOperationRow(gqlGroup.testMeta!.operations![0])).toBeVisible()*/
      })
    })

  test('[P-MGOP-7.1] Filtering operations on the "Deprecated" tab',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10196` },
        { type: 'Issue', description: 'GraphQL checks temporarily disabled' },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { deprecatedTab } = versionPage
      const restGroup = OGR_PMGR_FILTERING_REST_DEPRECATED_R
      const gqlGroup = OGR_PMGR_FILTERING_GQL_R

      await portalPage.gotoVersion(testVersion, VERSION_DEPRECATED_TAB_REST)

      await expect(deprecatedTab.table.getOperationRow()).toHaveCount(4)

      await test.step('Add filter by REST API operation group', async () => {
        await deprecatedTab.sidebar.groupFilterAc.click()

        await expect.soft(deprecatedTab.sidebar.groupFilterAc.getListItem(gqlGroup.groupName)).toBeHidden()

        await deprecatedTab.sidebar.groupFilterAc.getListItem(restGroup.groupName).click()

        await expect(deprecatedTab.table.getOperationRow()).toHaveCount(2)
        await expect(deprecatedTab.table.getOperationRow(restGroup.testMeta!.operations![0])).toBeVisible()
        await expect(deprecatedTab.table.getOperationRow(restGroup.testMeta!.operations![1])).toBeVisible()
      })

      await test.step('Set "Ungrouped" filter', async () => {
        await deprecatedTab.sidebar.groupFilterAc.click()
        await deprecatedTab.sidebar.groupFilterAc.ungroupedItm.click()

        await expect(deprecatedTab.table.getOperationRow()).toHaveCount(2)
      })

      /*!await test.step('Switch to GraphQL API type', async () => { //Issue GraphQL checks temporarily disabled
        await deprecatedTab.toolbar.sltApiType.click()
        await deprecatedTab.toolbar.sltApiType.graphQlItm.click()

        await expect(deprecatedTab.table.getOperationRow()).toHaveCount(1)
      })

      await test.step('Set filter by GraphQL operation group', async () => {
        await deprecatedTab.sidebar.groupFilterAc.click()
        await deprecatedTab.sidebar.groupFilterAc.allItm.click()

        await expect(deprecatedTab.table.getOperationRow()).toHaveCount(2)

        await deprecatedTab.sidebar.groupFilterAc.click()

        await expect.soft(deprecatedTab.sidebar.groupFilterAc.getListItem(restGroup.groupName)).toBeHidden()

        await deprecatedTab.sidebar.groupFilterAc.getListItem(gqlGroup.groupName).click()

        await expect(deprecatedTab.table.getOperationRow()).toHaveCount(1)
        await expect(deprecatedTab.table.getOperationRow(gqlGroup.testMeta!.operations![0])).toBeVisible()
      })*/
    })

  test('[P-MGOP-8.1] Filtering operations in the "Edit Group of operations" dialog',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10197` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab } = versionPage
      const { groupsTab } = overviewTab
      const { editOperationGroupDialog } = groupsTab
      const { groupName } = OGR_PMGR_FILTERING_REST_R

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)

      await test.step(`Open "Edit Operation Group" dialog for "${groupName}"`, async () => {
        await groupsTab.getGroupRow(groupName).hover()
        await groupsTab.getGroupRow(groupName).addBtn.click()

        // await expect(editOperationGroupDialog.leftList.getOperationListItem()).toHaveCount(17) //Optional check, skipped due to the using react-window
        await expect(editOperationGroupDialog.rightList.getOperationListItem()).toHaveCount(2)
      })

      await test.step('Add filter by API Kind', async () => {
        await editOperationGroupDialog.sidebar.apiKindFilterAc.click()
        await editOperationGroupDialog.sidebar.apiKindFilterAc.noBwcItm.click()

        await expect(editOperationGroupDialog.rightList.getOperationListItem()).toHaveCount(1)
        await expect(editOperationGroupDialog.rightList.getOperationListItem(DEL_ORDER_V1)).toBeVisible()
        await expect(editOperationGroupDialog.leftList.getOperationListItem()).toHaveCount(2)
        await expect(editOperationGroupDialog.leftList.getOperationListItem(GET_PET_BY_TAG_V1)).toBeVisible()
        await expect(editOperationGroupDialog.leftList.getOperationListItem(UPDATE_USER_V1)).toBeVisible()
      })

      await test.step('CAdd filter by Tag', async () => {
        await editOperationGroupDialog.sidebar.getTagButton('user').click()

        await expect(editOperationGroupDialog.rightList.noOperationsPh).toBeVisible()
        await expect(editOperationGroupDialog.leftList.getOperationListItem()).toHaveCount(1)
        await expect(editOperationGroupDialog.leftList.getOperationListItem(UPDATE_USER_V1)).toBeVisible()
      })
    })

  test('[P-MGOP-8.2] Search operations in the "Edit Group of operations" dialog',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10197` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab } = versionPage
      const { groupsTab } = overviewTab
      const { editOperationGroupDialog } = groupsTab
      const { groupName } = OGR_PMGR_FILTERING_REST_R

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)

      await test.step(`Open "Edit Operation Group" dialog for "${groupName}"`, async () => {
        await groupsTab.getGroupRow(groupName).hover()
        await groupsTab.getGroupRow(groupName).addBtn.click()

        // await expect(editOperationGroupDialog.leftList.getOperationListItem()).toHaveCount(17) //Optional check, skipped due to the using react-window
        await expect(editOperationGroupDialog.rightList.getOperationListItem()).toHaveCount(2)
      })

      await test.step('Search operation by title', async () => {

        await test.step('Part of a word', async () => {
          await editOperationGroupDialog.searchbar.fill('Find')

          await expect(editOperationGroupDialog.leftList.getOperationListItem()).toHaveCount(4)
          await expect(editOperationGroupDialog.rightList.getOperationListItem()).toHaveCount(0)
        })

        await test.step('Adding part of a word', async () => {
          await editOperationGroupDialog.searchbar.type('s')

          await expect(editOperationGroupDialog.leftList.getOperationListItem()).toHaveCount(2)
          await expect(editOperationGroupDialog.rightList.getOperationListItem()).toHaveCount(0)
        })

        await test.step('Clearing a search query', async () => {
          await editOperationGroupDialog.searchbar.clear()

          // await expect(editOperationGroupDialog.leftList.getOperationListItem()).toHaveCount(17) //Optional check, skipped due to the using react-window
          await expect(editOperationGroupDialog.rightList.getOperationListItem()).toHaveCount(2)
        })

        await test.step('Two words', async () => {
          await editOperationGroupDialog.searchbar.clear()
          await editOperationGroupDialog.searchbar.fill('Finds Pets')

          await expect(editOperationGroupDialog.leftList.getOperationListItem()).toHaveCount(2)
          await expect(editOperationGroupDialog.leftList.getOperationListItem(GET_PET_BY_TAG_V1)).toBeVisible()
          await expect(editOperationGroupDialog.rightList.getOperationListItem()).toHaveCount(0)
        })

        await test.step('Case sensitive', async () => {
          await editOperationGroupDialog.searchbar.clear()
          await editOperationGroupDialog.searchbar.fill(GET_PET_BY_TAG_V1.title.toLowerCase())

          await expect(editOperationGroupDialog.rightList.noOperationsPh).toBeVisible()
          await expect(editOperationGroupDialog.leftList.getOperationListItem()).toHaveCount(1)
          await expect(editOperationGroupDialog.leftList.getOperationListItem(GET_PET_BY_TAG_V1)).toBeVisible()
        })

        await test.step('Invalid search query with valid substring', async () => {
          await editOperationGroupDialog.searchbar.clear()
          await editOperationGroupDialog.searchbar.fill(`${GET_PET_BY_TAG_V1.title}123`)

          await expect(editOperationGroupDialog.leftList.noOperationsPh).toBeVisible()
          await expect(editOperationGroupDialog.rightList.noOperationsPh).toBeVisible()
        })
      })

      await test.step('Search operation by path', async () => {

        await test.step('Part of a word', async () => {
          await editOperationGroupDialog.searchbar.fill('/api/v1/pet/findBy')

          await expect(editOperationGroupDialog.leftList.getOperationListItem()).toHaveCount(2)
          await expect(editOperationGroupDialog.leftList.getOperationListItem(GET_PET_BY_TAG_V1)).toBeVisible()
          await expect(editOperationGroupDialog.rightList.getOperationListItem()).toHaveCount(0)
        })

        await test.step('Adding part of a word', async () => {
          await editOperationGroupDialog.searchbar.type('Tags')

          await expect(editOperationGroupDialog.leftList.getOperationListItem()).toHaveCount(1)
          await expect(editOperationGroupDialog.leftList.getOperationListItem(GET_PET_BY_TAG_V1)).toBeVisible()
          await expect(editOperationGroupDialog.rightList.getOperationListItem()).toHaveCount(0)
        })

        await test.step('Case sensitive', async () => {
          await editOperationGroupDialog.searchbar.clear()
          await editOperationGroupDialog.searchbar.fill(GET_PET_BY_TAG_V1.path.toLowerCase())

          await expect(editOperationGroupDialog.leftList.getOperationListItem()).toHaveCount(1)
          await expect(editOperationGroupDialog.leftList.getOperationListItem(GET_PET_BY_TAG_V1)).toBeVisible()
          await expect(editOperationGroupDialog.rightList.getOperationListItem()).toHaveCount(0)
        })

        await test.step('Invalid search query with valid substring', async () => {
          await editOperationGroupDialog.searchbar.clear()
          await editOperationGroupDialog.searchbar.fill(`${GET_PET_BY_TAG_V1.path}123`)

          await expect(editOperationGroupDialog.leftList.noOperationsPh).toBeVisible()
          await expect(editOperationGroupDialog.rightList.noOperationsPh).toBeVisible()
        })
      })

      await test.step('Search by method', async () => {
        await editOperationGroupDialog.searchbar.fill('delete')

        await expect(editOperationGroupDialog.leftList.getOperationListItem()).toHaveCount(2)
        await expect(editOperationGroupDialog.leftList.getOperationListItem(DEL_PET_V1)).toBeVisible()
        await expect(editOperationGroupDialog.rightList.getOperationListItem()).toHaveCount(1)
      })
    })
})
