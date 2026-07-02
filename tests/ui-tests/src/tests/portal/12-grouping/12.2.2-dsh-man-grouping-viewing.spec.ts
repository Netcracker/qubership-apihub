import { test } from '@fixtures'
import { expect } from '@services/expect-decorator'
import { PortalPage } from '@portal/pages/PortalPage'
import {
  CREATE_LIST_OF_USERS_V1,
  DEL_ORDER_V1,
  DEL_PET_V1,
  GET_PET_BY_TAG_V1,
  LOGS_USER_V1,
  OGR_DMGR_CHANGELOG1_R,
  OGR_DMGR_CHANGELOG2_R,
  OGR_DMGR_CHANGELOG3_R,
  OGR_DMGR_DOWNLOAD_GQL_R,
  OGR_DMGR_DOWNLOAD_REST_R,
  OGR_DMGR_FILTERING_GQL_R,
  OGR_DMGR_FILTERING_REST_R,
  OGR_DMGR_MORE_200_R,
  OGR_MORE_THEN_200_OPERATIONS_MSG,
  P_PKG_DMGR_PET_R,
  P_PKG_DMGR_STORE_R,
  P_PKG_DMGR_USER_R,
  UPDATE_USER_V1,
  V_DSH_DMGR_200_R,
  V_DSH_DMGR_CHANGED_R,
} from '@test-data/portal'
import { VERSION_CHANGES_TAB_REST, VERSION_DEPRECATED_TAB_REST, VERSION_OPERATIONS_TAB_REST, VERSION_OVERVIEW_TAB_GROUPS } from '@portal/entities'
import { TICKET_BASE_URL } from '@test-setup'

test.describe('12.2.2 Manual grouping: Viewing (Dashboards)', () => {

  const testVersion = V_DSH_DMGR_CHANGED_R

  test('[P-MGO-3.1-N] Change API type for group (Negative)',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8352` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab } = versionPage
      const { groupsTab } = overviewTab
      const { createUpdateOperationGroupDialog: updateDialog } = groupsTab

      await test.step('Change API type for REST API group', async () => {
        await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)
        await groupsTab.getGroupRow(OGR_DMGR_DOWNLOAD_REST_R.groupName).hover()
        await groupsTab.getGroupRow(OGR_DMGR_DOWNLOAD_REST_R.groupName).editBtn.click()

        await expect.soft(updateDialog.apiTypeAc).toBeDisabled()
      })

      await test.step('Change API type for GraphQL group', async () => {
        await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)
        await groupsTab.getGroupRow(OGR_DMGR_DOWNLOAD_GQL_R.groupName).hover()
        await groupsTab.getGroupRow(OGR_DMGR_DOWNLOAD_GQL_R.groupName).editBtn.click()

        await expect.soft(updateDialog.apiTypeAc).toBeDisabled()
      })
    })

  test.skip('[P-MGO-3.2-N] Add more than 200 operations (Negative)',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8352` },
        { type: 'Issue', description: `Need adaptation to ${TICKET_BASE_URL}TestCase-A-11218` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab } = versionPage
      const { groupsTab } = overviewTab
      const { editOperationGroupDialog } = groupsTab
      const { groupName } = OGR_DMGR_MORE_200_R

      await portalPage.gotoVersion(V_DSH_DMGR_200_R, VERSION_OVERVIEW_TAB_GROUPS)

      await test.step('Open "Edit Operation Group" dialog', async () => {
        await groupsTab.getGroupRow(groupName).hover()
        await groupsTab.getGroupRow(groupName).addBtn.click()
      })

      await test.step('Add operations from the 1st package', async () => {
        await editOperationGroupDialog.sidebar.packageFilterAc.click()
        await editOperationGroupDialog.sidebar.packageFilterAc.getListItem(P_PKG_DMGR_PET_R.name).click()
        await editOperationGroupDialog.leftList.allOperationsChx.click()
        await editOperationGroupDialog.toRightBtn.click()

        await expect.soft(editOperationGroupDialog.operationGroupLimit).toContainText('83')
      })

      await test.step('Add operations from the 2nd package', async () => {
        await editOperationGroupDialog.sidebar.packageFilterAc.clear()
        await editOperationGroupDialog.sidebar.packageFilterAc.click()
        await editOperationGroupDialog.sidebar.packageFilterAc.getListItem(P_PKG_DMGR_STORE_R.name).click()
        await editOperationGroupDialog.leftList.allOperationsChx.click()
        await editOperationGroupDialog.toRightBtn.click()

        await expect.soft(editOperationGroupDialog.operationGroupLimit).toContainText('137')
      })

      await test.step('Try to add operations from the 3rd package there are more than 200', async () => {
        await editOperationGroupDialog.sidebar.packageFilterAc.clear()
        await editOperationGroupDialog.sidebar.packageFilterAc.click()
        await editOperationGroupDialog.sidebar.packageFilterAc.getListItem(P_PKG_DMGR_USER_R.name).click()
        await editOperationGroupDialog.leftList.allOperationsChx.click()

        await expect.soft(editOperationGroupDialog.toRightBtn).toBeDisabled()

        await editOperationGroupDialog.toRightBtn.hover()

        await expect.soft(editOperationGroupDialog.tooltip).toHaveText(OGR_MORE_THEN_200_OPERATIONS_MSG)
      })
    })

  test('[P-MGO-5.1] Filtering operations on the "Contracts" tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8766` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { contractsTab } = versionPage
      const restGroup = OGR_DMGR_FILTERING_REST_R
      const gqlGroup = OGR_DMGR_FILTERING_GQL_R

      await portalPage.gotoVersion(testVersion, VERSION_OPERATIONS_TAB_REST)

      await expect(contractsTab.table.getOperationRow()).toHaveCount(19)

      await test.step('Add filter by REST API operation group', async () => {
        await contractsTab.sidebar.groupFilterAc.click()

        await expect.soft(contractsTab.sidebar.groupFilterAc.getListItem(gqlGroup.groupName)).toBeHidden()

        await contractsTab.sidebar.groupFilterAc.getListItem(restGroup.groupName).click()

        await expect(contractsTab.table.getOperationRow()).toHaveCount(2)
        await expect(contractsTab.table.getOperationRow(restGroup.testMeta!.operations![0])).toBeVisible()
        await expect(contractsTab.table.getOperationRow(restGroup.testMeta!.operations![1])).toBeVisible()
      })

      await test.step('Add filter by package', async () => {
        await contractsTab.sidebar.packageFilterAc.click()
        await contractsTab.sidebar.packageFilterAc.getListItem(P_PKG_DMGR_PET_R.name).click()

        await expect(contractsTab.table.getOperationRow()).toHaveCount(1)
        await expect(contractsTab.table.getOperationRow(restGroup.testMeta!.operations![0])).toBeVisible()
      })

      await test.step('Switch to GraphQL API type', async () => {
        await contractsTab.toolbar.sltApiType.click()
        await contractsTab.toolbar.sltApiType.graphQlItm.click()

        await expect(contractsTab.table.noOperationsPlaceholder).toBeVisible()
      })

      await test.step('Set filter by GraphQL operation group', async () => {
        await contractsTab.sidebar.packageFilterAc.clear()
        await contractsTab.sidebar.groupFilterAc.click()
        await contractsTab.sidebar.groupFilterAc.allItm.click()

        await expect(contractsTab.table.getOperationRow()).toHaveCount(5)

        await contractsTab.sidebar.groupFilterAc.click()

        await expect.soft(contractsTab.sidebar.groupFilterAc.getListItem(restGroup.groupName)).toBeHidden()

        await contractsTab.sidebar.groupFilterAc.getListItem(gqlGroup.groupName).click()

        await expect(contractsTab.table.getOperationRow()).toHaveCount(1)
        await expect(contractsTab.table.getOperationRow(gqlGroup.testMeta!.operations![0])).toBeVisible()
      })
    })

  test('[P-MGO-6.1] Filtering operations on the "API Changes" tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8767` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { apiChangesTab } = versionPage
      const group1 = OGR_DMGR_CHANGELOG1_R
      const group2 = OGR_DMGR_CHANGELOG2_R
      const group3 = OGR_DMGR_CHANGELOG3_R

      await portalPage.gotoVersion(testVersion, VERSION_CHANGES_TAB_REST)

      await expect(apiChangesTab.table.getOperationRow()).toHaveCount(5)

      await test.step('Set filter by 1st operation group', async () => {
        await apiChangesTab.sidebar.groupFilterAc.set(group1.groupName)

        await expect(apiChangesTab.table.getOperationRow()).toHaveCount(2)
        await expect(apiChangesTab.table.getOperationRow(group1.testMeta!.operations![0])).toBeVisible()
        await expect(apiChangesTab.table.getOperationRow(group1.testMeta!.operations![1])).toBeVisible()
      })

      await test.step('Set filter by 2nd operation group', async () => {
        await apiChangesTab.sidebar.groupFilterAc.set(group2.groupName)

        await expect(apiChangesTab.table.getOperationRow()).toHaveCount(2)
        await expect(apiChangesTab.table.getOperationRow(group2.testMeta!.operations![0])).toBeVisible()
        await expect(apiChangesTab.table.getOperationRow(group2.testMeta!.operations![1])).toBeVisible()
      })

      await test.step('Set filter by 3rd operation group', async () => {
        await apiChangesTab.sidebar.groupFilterAc.set(group3.groupName)

        await expect(apiChangesTab.table.getOperationRow()).toHaveCount(2)
        await expect(apiChangesTab.table.getOperationRow(group3.testMeta!.operations![0])).toBeVisible()
        await expect(apiChangesTab.table.getOperationRow(group3.testMeta!.operations![1])).toBeVisible()
      })

      await test.step('Set "Ungrouped" filter', async () => {
        await apiChangesTab.sidebar.groupFilterAc.click()
        await apiChangesTab.sidebar.groupFilterAc.ungroupedItm.click()

        await expect(apiChangesTab.table.getOperationRow()).toHaveCount(1)
        await expect(apiChangesTab.table.getOperationRow(CREATE_LIST_OF_USERS_V1)).toBeVisible()
      })
    })

  test('[P-MGO-7.1] Filtering operations on the "Deprecated" tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8768` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { deprecatedTab } = versionPage

      await portalPage.gotoVersion(testVersion, VERSION_DEPRECATED_TAB_REST)

      await expect(deprecatedTab.table.getOperationRow()).toHaveCount(3)

      await test.step('Add filter by REST API operation group', async () => {
        await deprecatedTab.sidebar.groupFilterAc.click()
        await deprecatedTab.sidebar.groupFilterAc.getListItem(OGR_DMGR_FILTERING_REST_R.groupName).click()

        await expect(deprecatedTab.table.getOperationRow()).toHaveCount(2)
        await expect(deprecatedTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()
        await expect(deprecatedTab.table.getOperationRow(UPDATE_USER_V1)).toBeVisible()
      })

      await test.step('Add filter by package', async () => {
        await deprecatedTab.sidebar.packageFilterAc.click()
        await deprecatedTab.sidebar.packageFilterAc.getListItem(P_PKG_DMGR_PET_R.name).click()

        await expect(deprecatedTab.table.getOperationRow()).toHaveCount(1)
        await expect(deprecatedTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()
      })

      await test.step('Set "Ungrouped" filter', async () => {
        await deprecatedTab.sidebar.packageFilterAc.clear()
        await deprecatedTab.sidebar.groupFilterAc.click()
        await deprecatedTab.sidebar.groupFilterAc.ungroupedItm.click()

        await expect(deprecatedTab.table.getOperationRow()).toHaveCount(1)
        await expect(deprecatedTab.table.getOperationRow(LOGS_USER_V1)).toBeVisible()
      })
    })

  test('[P-MGO-8.1] Filtering operations in the "Edit Group of operations" dialog',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8769` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab } = versionPage
      const { groupsTab } = overviewTab
      const { editOperationGroupDialog } = groupsTab
      const { groupName } = OGR_DMGR_FILTERING_REST_R

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_GROUPS)

      await test.step(`Open "Edit Operation Group" dialog for "${groupName}"`, async () => {
        await groupsTab.getGroupRow(groupName).hover()
        await groupsTab.getGroupRow(groupName).addBtn.click()

        // await expect(editOperationGroupDialog.leftList.getOperationListItem()).toHaveCount(17) //Optional check, skipped due to the using react-window
        await expect(editOperationGroupDialog.rightList.getOperationListItem()).toHaveCount(2)
      })

      await test.step('Set filter by API Kind', async () => {
        await editOperationGroupDialog.sidebar.apiKindFilterAc.click()
        await editOperationGroupDialog.sidebar.apiKindFilterAc.noBwcItm.click()

        await expect(editOperationGroupDialog.leftList.getOperationListItem()).toHaveCount(1)
        await expect(editOperationGroupDialog.leftList.getOperationListItem(DEL_ORDER_V1)).toBeVisible()
        await expect(editOperationGroupDialog.rightList.getOperationListItem()).toHaveCount(2)
        await expect(editOperationGroupDialog.rightList.getOperationListItem(GET_PET_BY_TAG_V1)).toBeVisible()
        await expect(editOperationGroupDialog.rightList.getOperationListItem(UPDATE_USER_V1)).toBeVisible()
      })

      await test.step('Add filter by Package', async () => {
        await editOperationGroupDialog.sidebar.packageFilterAc.click()
        await editOperationGroupDialog.sidebar.packageFilterAc.getListItem(P_PKG_DMGR_PET_R.name).click()

        await expect(editOperationGroupDialog.leftList.noOperationsPh).toBeVisible()
        await expect(editOperationGroupDialog.rightList.getOperationListItem()).toHaveCount(1)
        await expect(editOperationGroupDialog.rightList.getOperationListItem(GET_PET_BY_TAG_V1)).toBeVisible()
      })

      await test.step('Clear filter by Package and add filter by Tag', async () => {
        await editOperationGroupDialog.sidebar.packageFilterAc.clear()
        await editOperationGroupDialog.sidebar.getTagButton('user').click()

        await expect(editOperationGroupDialog.leftList.noOperationsPh).toBeVisible()
        await expect(editOperationGroupDialog.rightList.getOperationListItem()).toHaveCount(1)
        await expect(editOperationGroupDialog.rightList.getOperationListItem(UPDATE_USER_V1)).toBeVisible()
      })
    })

  test('[P-MGO-8.2] Search operations in the "Edit Group of operations" dialog',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8769` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab } = versionPage
      const { groupsTab } = overviewTab
      const { editOperationGroupDialog } = groupsTab
      const { groupName } = OGR_DMGR_FILTERING_REST_R

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

          await expect(editOperationGroupDialog.leftList.getOperationListItem()).toHaveCount(3)
          await expect(editOperationGroupDialog.rightList.getOperationListItem()).toHaveCount(1)
        })

        await test.step('Adding part of a word', async () => {
          await editOperationGroupDialog.searchbar.type('s')

          await expect(editOperationGroupDialog.leftList.getOperationListItem()).toHaveCount(1)
          await expect(editOperationGroupDialog.rightList.getOperationListItem()).toHaveCount(1)
        })

        await test.step('Clearing a search query', async () => {
          await editOperationGroupDialog.searchbar.clear()

          // await expect(editOperationGroupDialog.leftList.getOperationListItem()).toHaveCount(17) //Optional check, skipped due to the using react-window
          await expect(editOperationGroupDialog.rightList.getOperationListItem()).toHaveCount(2)
        })

        await test.step('Two words', async () => {
          await editOperationGroupDialog.searchbar.clear()
          await editOperationGroupDialog.searchbar.fill('Finds Pets')

          await expect(editOperationGroupDialog.leftList.getOperationListItem()).toHaveCount(1)
          await expect(editOperationGroupDialog.rightList.getOperationListItem()).toHaveCount(1)
          await expect(editOperationGroupDialog.rightList.getOperationListItem(GET_PET_BY_TAG_V1)).toBeVisible()
        })

        await test.step('Case sensitive', async () => {
          await editOperationGroupDialog.searchbar.clear()
          await editOperationGroupDialog.searchbar.fill(GET_PET_BY_TAG_V1.title.toLowerCase())

          await expect(editOperationGroupDialog.leftList.noOperationsPh).toBeVisible()
          await expect(editOperationGroupDialog.rightList.getOperationListItem()).toHaveCount(1)
          await expect(editOperationGroupDialog.rightList.getOperationListItem(GET_PET_BY_TAG_V1)).toBeVisible()
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

          await expect(editOperationGroupDialog.leftList.getOperationListItem()).toHaveCount(1)
          await expect(editOperationGroupDialog.rightList.getOperationListItem()).toHaveCount(1)
          await expect(editOperationGroupDialog.rightList.getOperationListItem(GET_PET_BY_TAG_V1)).toBeVisible()
        })

        await test.step('Adding part of a word', async () => {
          await editOperationGroupDialog.searchbar.type('Tags')

          await expect(editOperationGroupDialog.leftList.noOperationsPh).toBeVisible()
          await expect(editOperationGroupDialog.rightList.getOperationListItem()).toHaveCount(1)
          await expect(editOperationGroupDialog.rightList.getOperationListItem(GET_PET_BY_TAG_V1)).toBeVisible()
        })

        await test.step('Case sensitive', async () => {
          await editOperationGroupDialog.searchbar.clear()
          await editOperationGroupDialog.searchbar.fill(GET_PET_BY_TAG_V1.path.toLowerCase())

          await expect(editOperationGroupDialog.leftList.noOperationsPh).toBeVisible()
          await expect(editOperationGroupDialog.rightList.getOperationListItem()).toHaveCount(1)
          await expect(editOperationGroupDialog.rightList.getOperationListItem(GET_PET_BY_TAG_V1)).toBeVisible()
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
        await expect(editOperationGroupDialog.rightList.noOperationsPh).toBeVisible()
      })
    })
})
