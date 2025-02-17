import { test } from '@fixtures'
import { expect } from '@services/expect-decorator'
import { PortalPage } from '@portal/pages/PortalPage'
import {
  CREATE_LIST_OF_USERS_V1_UPDATED,
  CREATE_LIST_OF_USERS_V2,
  GET_PET_BY_TAG_V1,
  GET_PET_BY_TAG_V2,
  GET_USER_BY_NAME_V1,
  UPDATE_USER_V1,
  V_PKG_PPGR_GQL_R,
  V_PKG_PPGR_REST_CHANGED_R,
} from '@test-data/portal'
import { VERSION_CHANGES_TAB_REST, VERSION_DEPRECATED_TAB_REST, VERSION_OPERATIONS_TAB_REST } from '@portal/entities'
import { TICKET_BASE_URL } from '@test-setup'

test.describe('12.1.4 Prefix grouping: Viewing', () => {

  const testVersion = V_PKG_PPGR_REST_CHANGED_R

  test('[P-AOPFI-3] Filtering operations by Group on the "Operations" tab',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10180` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { operationsTab } = versionPage

      await test.step('Open the "Operations" tab', async () => {
        await portalPage.gotoVersion(testVersion, VERSION_OPERATIONS_TAB_REST)

        await expect(operationsTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()
        await expect(operationsTab.table.getOperationRow(GET_PET_BY_TAG_V2)).toBeVisible()
      })

      await test.step('Filter by "v1" group', async () => {
        await operationsTab.sidebar.groupFilterAc.click()
        await operationsTab.sidebar.groupFilterAc.getListItem('v1').click()

        await expect(operationsTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()
        await expect(operationsTab.table.getOperationRow(GET_PET_BY_TAG_V2)).toBeHidden()
      })

      await test.step('Filter by "v2" group', async () => {
        await operationsTab.sidebar.groupFilterAc.click()
        await operationsTab.sidebar.groupFilterAc.getListItem('v2').click()

        await expect(operationsTab.table.getOperationRow(GET_PET_BY_TAG_V2)).toBeVisible()
        await expect(operationsTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeHidden()
      })
    })

  test('[P-DEPFI-1] Filtering operations by Group on the "Deprecated" tab',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5431` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { deprecatedTab } = versionPage

      await test.step('Open the "Deprecated" tab', async () => {
        await portalPage.gotoVersion(testVersion, VERSION_DEPRECATED_TAB_REST)

        await expect(deprecatedTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()
        await expect(deprecatedTab.table.getOperationRow(GET_PET_BY_TAG_V2)).toBeVisible()
      })

      await test.step('Filter by "v1" group', async () => {
        await deprecatedTab.sidebar.groupFilterAc.click()
        await deprecatedTab.sidebar.groupFilterAc.getListItem('v1').click()

        await expect(deprecatedTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()
        await expect(deprecatedTab.table.getOperationRow(GET_PET_BY_TAG_V2)).toBeHidden()
      })

      await test.step('Filter by "v2" group', async () => {
        await deprecatedTab.sidebar.groupFilterAc.click()
        await deprecatedTab.sidebar.groupFilterAc.getListItem('v2').click()

        await expect(deprecatedTab.table.getOperationRow(GET_PET_BY_TAG_V2)).toBeVisible()
        await expect(deprecatedTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeHidden()
      })
    })

  test('[P-CHPFI-1] Filtering operations by Group on the "API Changes" tab',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5326` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { apiChangesTab } = versionPage

      await test.step('Open the "API Changes" tab', async () => {
        await portalPage.gotoVersion(testVersion, VERSION_CHANGES_TAB_REST)

        await expect(apiChangesTab.table.getOperationRow(UPDATE_USER_V1)).toBeVisible()
        await expect(apiChangesTab.table.getOperationRow(GET_PET_BY_TAG_V2)).toBeVisible()
      })

      await test.step('Filter by "v1" group', async () => {
        await apiChangesTab.sidebar.groupFilterAc.click()
        await apiChangesTab.sidebar.groupFilterAc.getListItem('v1').click()

        await expect(apiChangesTab.table.getOperationRow(UPDATE_USER_V1)).toBeVisible()
        await expect(apiChangesTab.table.getOperationRow(GET_PET_BY_TAG_V2)).toBeHidden()
      })

      await test.step('Filter by "v2" group', async () => {
        await apiChangesTab.sidebar.groupFilterAc.click()
        await apiChangesTab.sidebar.groupFilterAc.getListItem('v2').click()

        await expect(apiChangesTab.table.getOperationRow(GET_PET_BY_TAG_V2)).toBeVisible()
        await expect(apiChangesTab.table.getOperationRow(UPDATE_USER_V1)).toBeHidden()
      })
    })

  test('[P-GOP-6.1] Compare operations grouped by prefix - REST API',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8398` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-1442` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { comparePackagesPage: comparePage, compareSelectDialog, compareOperationsPage } = versionPage

      const getUserV1Row = comparePage.compareContent.getOperationRow(GET_USER_BY_NAME_V1)
      const createListV1Row = comparePage.compareContent.getOperationRow(CREATE_LIST_OF_USERS_V1_UPDATED)

      await portalPage.gotoVersion(testVersion)

      await test.step('Compare', async () => {
        await versionPage.toolbar.compareMenu.click()
        await versionPage.toolbar.compareMenu.groupsItm.click()
        await compareSelectDialog.fillForm({
          previousGroup: 'v1',
          currentGroup: 'v2',
        })
        await compareSelectDialog.compareBtn.click()

        /*! await expect(comparePage.toolbar.breakingChangesFilterBtn).toHaveText('2') //Issue TestCase-B-1442
        await expect(comparePage.toolbar.semiBreakingChangesFilterBtn).toHaveText('0')
        await expect(comparePage.toolbar.deprecatedChangesFilterBtn).toHaveText('2')
        await expect(comparePage.toolbar.nonBreakingChangesFilterBtn).toHaveText('2')
        await expect(comparePage.toolbar.annotationChangesFilterBtn).toHaveText('1')
        await expect(comparePage.toolbar.unclassifiedChangesFilterBtn).toHaveText('1')*/

        await expect(comparePage.swapper.leftTitle).toHaveText('path prefix: /api/v1/')
        await expect(comparePage.swapper.rightTitle).toHaveText('path prefix: /api/v2/')

        //! await expect(comparePage.compareContent.getOperationRow()).toHaveCount(4) //Issue TestCase-B-1442
        await expect.soft(getUserV1Row.changeSeverityIndicator).toHaveText('breaking')
        await expect.soft(getUserV1Row.leftSummary.path).toHaveText(`${GET_USER_BY_NAME_V1.method}${GET_USER_BY_NAME_V1.path}`)
        await expect.soft(getUserV1Row.leftSummary.changes).toBeHidden()
        await expect.soft(getUserV1Row.rightSummary.path).toBeHidden()
        await expect.soft(getUserV1Row.rightSummary.changes.breaking).toHaveText('Breaking: 1')

        await expect.soft(createListV1Row.changeSeverityIndicator).toHaveText('breaking')
        await expect.soft(createListV1Row.leftSummary.path).toHaveText(`${CREATE_LIST_OF_USERS_V1_UPDATED.method}${CREATE_LIST_OF_USERS_V1_UPDATED.path}`)
        await expect.soft(createListV1Row.leftSummary.changes).toBeHidden()
        await expect.soft(createListV1Row.rightSummary.path).toHaveText(`${CREATE_LIST_OF_USERS_V2.method}${CREATE_LIST_OF_USERS_V2.path}`)
        await expect.soft(createListV1Row.rightSummary.changes.breaking).toHaveText('Breaking: 1')
        await expect.soft(createListV1Row.rightSummary.changes.semiBreaking).toBeHidden()
        await expect.soft(createListV1Row.rightSummary.changes.deprecated).toHaveText('Deprecated: 1')
        //! await expect.soft(createListV1Row.rightSummary.changes.nonBreaking).toHaveText('Non-breaking: 1') //Issue TestCase-B-1442
        await expect.soft(createListV1Row.rightSummary.changes.annotation).toHaveText('Annotation: 2')
        await expect.soft(createListV1Row.rightSummary.changes.unclassified).toHaveText('Unclassified: 1')
      })

      await test.step('Swap', async () => {
        await comparePage.swapper.swapBtn.click()

        // await expect(comparePage.toolbar.breakingChangesFilterBtn).toHaveText('2')
        // await expect(comparePage.toolbar.semiBreakingChangesFilterBtn).toHaveText('0')
        // await expect(comparePage.toolbar.deprecatedChangesFilterBtn).toHaveText('2')
        // await expect(comparePage.toolbar.nonBreakingChangesFilterBtn).toHaveText('2')
        // await expect(comparePage.toolbar.annotationChangesFilterBtn).toHaveText('1')
        // await expect(comparePage.toolbar.unclassifiedChangesFilterBtn).toHaveText('1')

        await expect(comparePage.swapper.leftTitle).toHaveText('path prefix: /api/v2/')
        await expect(comparePage.swapper.rightTitle).toHaveText('path prefix: /api/v1/')

        //! await expect(comparePage.compareContent.getOperationRow()).toHaveCount(4) //Issue TestCase-B-1442
        await expect.soft(getUserV1Row.changeSeverityIndicator).toHaveText('non-breaking')
        await expect.soft(getUserV1Row.leftSummary.path).toBeHidden()
        await expect.soft(getUserV1Row.leftSummary.changes).toBeHidden()
        await expect.soft(getUserV1Row.rightSummary.path).toHaveText(`${GET_USER_BY_NAME_V1.method}${GET_USER_BY_NAME_V1.path}`)
        await expect.soft(getUserV1Row.rightSummary.changes.nonBreaking).toHaveText('Non-breaking: 1')

        await expect.soft(createListV1Row.changeSeverityIndicator).toHaveText('breaking')
        await expect.soft(createListV1Row.leftSummary.path).toHaveText(`${CREATE_LIST_OF_USERS_V2.method}${CREATE_LIST_OF_USERS_V2.path}`)
        await expect.soft(createListV1Row.leftSummary.changes).toBeHidden()
        await expect.soft(createListV1Row.rightSummary.path).toHaveText(`${CREATE_LIST_OF_USERS_V1_UPDATED.method}${CREATE_LIST_OF_USERS_V1_UPDATED.path}`)
        await expect.soft(createListV1Row.rightSummary.changes.breaking).toHaveText('Breaking: 1')
        await expect.soft(createListV1Row.rightSummary.changes.semiBreaking).toBeHidden
        await expect.soft(createListV1Row.rightSummary.changes.deprecated).toHaveText('Deprecated: 1')
        //! await expect.soft(createListV1Row.rightSummary.changes.nonBreaking).toHaveText('Non-breaking: 1') //Issue TestCase-B-1442
        await expect.soft(createListV1Row.rightSummary.changes.annotation).toHaveText('Annotation: 2')
        await expect.soft(createListV1Row.rightSummary.changes.unclassified).toHaveText('Unclassified: 1')
      })

      //Cover TestCase-A-10265 defect - operation comparison opening
      await test.step('Open operation comparison', async () => {
        await comparePage.compareContent.getOperationRow(CREATE_LIST_OF_USERS_V1_UPDATED).click()

        await expect(compareOperationsPage.docView).toBeVisible()
        await expect(compareOperationsPage.swapper.leftTitle).toHaveText('path prefix: /api/v2/')
        await expect(compareOperationsPage.swapper.rightTitle).toHaveText('path prefix: /api/v1/')
      })
    })

  test('[P-GOP-6.2-N] Compare operations grouped by prefix - GraphQL',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8398` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage

      await portalPage.gotoVersion(V_PKG_PPGR_GQL_R)

      await versionPage.toolbar.compareMenu.click()

      await expect(versionPage.toolbar.compareMenu.versionsItm).toBeVisible()
      await expect(versionPage.toolbar.compareMenu.groupsItm).toBeHidden()
    })
})
