import { test } from '@fixtures'
import { expect, expectFile } from '@services/expect-decorator'
import { PortalPage } from '@portal/pages/PortalPage'
import {
  D11,
  GET_PET_BY_TAG_V1,
  GET_PET_BY_TAG_V2_SWAGGER,
  PK11,
  PK12,
  V_P_DSH_CHANGELOG_REST_CHANGED_R,
  V_P_DSH_OVERVIEW_R,
} from '@test-data/portal'
import { VERSION_DEPRECATED_TAB_REST } from '@portal/entities'
import { TICKET_BASE_URL } from '@test-setup'

test.describe('8.2 Deprecated (Dashboard)', () => {

  const testDashboard = D11
  const versionOverview = V_P_DSH_OVERVIEW_R
  const versionChangedRest = V_P_DSH_CHANGELOG_REST_CHANGED_R

  test('[P-DEDFI-1] Filtering operations by Packages on the Deprecated tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5640` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { deprecatedTab } = versionPage

      await portalPage.gotoVersion(versionOverview, VERSION_DEPRECATED_TAB_REST)

      await expect.soft(deprecatedTab.sidebar.groupFilterAc).toBeDisabled()
      await expect(deprecatedTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()
      await expect(deprecatedTab.table.getOperationRow(GET_PET_BY_TAG_V2_SWAGGER)).toBeVisible()

      await deprecatedTab.sidebar.packageFilterAc.click()

      await expect.soft(deprecatedTab.sidebar.packageFilterAc.getListItem()).toHaveCount(2)

      await deprecatedTab.sidebar.packageFilterAc.getListItem(PK11.name).click()

      await expect(deprecatedTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()
      await expect(deprecatedTab.table.getOperationRow(GET_PET_BY_TAG_V2_SWAGGER)).not.toBeVisible()

      await deprecatedTab.sidebar.packageFilterAc.clear()
      await deprecatedTab.sidebar.packageFilterAc.click()
      await deprecatedTab.sidebar.packageFilterAc.getListItem(PK12.name).click()

      await expect(deprecatedTab.table.getOperationRow(GET_PET_BY_TAG_V2_SWAGGER)).toBeVisible()
      await expect(deprecatedTab.table.getOperationRow(GET_PET_BY_TAG_V1)).not.toBeVisible()
    })

  test('[P-DEDEO-1] Exporting operations on the Deprecated tab',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8633` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { deprecatedTab } = versionPage

      await portalPage.gotoVersion(versionChangedRest, VERSION_DEPRECATED_TAB_REST)

      await test.step('Download all operations', async () => {

        const file = await deprecatedTab.toolbar.exportMenu.downloadAll()

        await expectFile.soft(file).toHaveName(`DeprecatedOperations_${testDashboard.packageId}_${versionChangedRest.version}.xlsx`)
      })

      await test.step('Download filtered operations', async () => {

        await deprecatedTab.sidebar.apiKindFilterAc.click()
        await deprecatedTab.sidebar.apiKindFilterAc.noBwcItm.click()

        const file = await deprecatedTab.toolbar.exportMenu.downloadFiltered()

        await expectFile.soft(file).toHaveName(`DeprecatedOperations_${testDashboard.packageId}_${versionChangedRest.version}.xlsx`)
      })
    })
})
