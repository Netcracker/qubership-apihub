import { test } from '@fixtures'
import { expect, expectFile } from '@services/expect-decorator'
import { PortalPage } from '@portal/pages/PortalPage'
import { D11, GET_PET_BY_TAG_V1, GET_PET_BY_TAG_V2_SWAGGER, PK11, PK12, V_P_DSH_CHANGELOG_REST_CHANGED_R, V_P_DSH_OVERVIEW_R } from '@test-data/portal'
import { VERSION_OPERATIONS_TAB_REST } from '@portal/entities'
import { TICKET_BASE_URL } from '@test-setup'

test.describe('10.2.1 Operations tab REST API (Dashboard)', () => {

  const testDashboard = D11
  const versionOverview = V_P_DSH_OVERVIEW_R
  const versionChangedRest = V_P_DSH_CHANGELOG_REST_CHANGED_R

  test('[P-OTDFI-1] Filtering operations by Packages on the Operations tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5641` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { contractsTab } = versionPage

      await portalPage.gotoVersion(versionOverview, VERSION_OPERATIONS_TAB_REST)

      await expect.soft(contractsTab.sidebar.groupFilterAc).toBeDisabled()
      await expect(contractsTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()
      await expect.soft(contractsTab.table.getOperationRow(GET_PET_BY_TAG_V2_SWAGGER)).toBeVisible()

      await contractsTab.sidebar.packageFilterAc.click()

      await expect.soft(contractsTab.sidebar.packageFilterAc.getListItem()).toHaveCount(2)

      await contractsTab.sidebar.packageFilterAc.getListItem(PK11.name).click()

      await expect(contractsTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()
      await expect(contractsTab.table.getOperationRow(GET_PET_BY_TAG_V2_SWAGGER)).not.toBeVisible()

      await contractsTab.sidebar.packageFilterAc.clear()
      await contractsTab.sidebar.packageFilterAc.click()
      await contractsTab.sidebar.packageFilterAc.getListItem(PK12.name).click()

      await expect(contractsTab.table.getOperationRow(GET_PET_BY_TAG_V2_SWAGGER)).toBeVisible()
      await expect(contractsTab.table.getOperationRow(GET_PET_BY_TAG_V1)).not.toBeVisible()
    })

  test('[P-OTDEO-1] Exporting operations on the Operations tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8629` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { contractsTab } = versionPage

      await portalPage.gotoVersion(versionChangedRest, VERSION_OPERATIONS_TAB_REST)

      await test.step('Export all operations', async () => {

        const file = await contractsTab.toolbar.exportMenu.downloadAll()

        await expectFile.soft(file).toHaveName(`APIOperations_${testDashboard.packageId}_${V_P_DSH_CHANGELOG_REST_CHANGED_R.version}.xlsx`)
      })

      await test.step('Export filtered operations', async () => {

        await contractsTab.sidebar.apiKindFilterAc.click()
        await contractsTab.sidebar.apiKindFilterAc.noBwcItm.click()

        const file = await contractsTab.toolbar.exportMenu.downloadFiltered()

        await expectFile.soft(file).toHaveName(`APIOperations_${testDashboard.packageId}_${V_P_DSH_CHANGELOG_REST_CHANGED_R.version}.xlsx`)
      })
    })
})
