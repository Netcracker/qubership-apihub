import { registerVersionFiles, test } from '@fixtures'
import { VERSION_CHANGES_TAB_REST } from '@portal/entities'
import { PortalPage } from '@portal/pages/PortalPage'
import { expect } from '@services/expect-decorator'
import {
  MSG_CHANGES_DESC,
  OP_CHANGES_DESC,
  setupChangesDescTestData,
  V_CHANGES_DESC_DSH_2_R,
  V_CHANGES_DESC_PKG_1_R,
  V_CHANGES_DESC_PKG_2_R,
  V_CHANGES_DESC_PKG_3_R,
} from './dsh-changes-description.test-data'

/**
 * Dashboard API Changes: human-readable change descriptions must expand the same way as for packages
 * when comparing non-linear package versions via a dashboard (https://github.com/Netcracker/qubership-apihub/issues/706).
 */

test.describe('Dashboard API Changes description', () => {
  test.beforeAll(async ({ apihubTDM }) => {
    await setupChangesDescTestData(apihubTDM)
  })

  test('P-BUG-706 Expand operation change description on dashboard API Changes tab', async ({ sysadminPage: page, usedResources }) => {
    const portalPage = new PortalPage(page)
    const { versionDashboardPage: versionPage } = portalPage
    const { apiChangesTab } = versionPage

    registerVersionFiles(usedResources, [
      V_CHANGES_DESC_PKG_1_R,
      V_CHANGES_DESC_PKG_2_R,
      V_CHANGES_DESC_PKG_3_R,
    ])

    await portalPage.gotoVersion(V_CHANGES_DESC_DSH_2_R, VERSION_CHANGES_TAB_REST)

    const operationRow = apiChangesTab.table.getOperationRow(OP_CHANGES_DESC)

    await test.step('Verify changed operation is listed on API Changes tab', async () => {
      await expect(operationRow).toBeVisible()
    })

    await operationRow.expandBtn.click()

    await test.step('Verify operation row is expanded', async () => {
      await expect(operationRow.collapseBtn).toBeVisible()
    })

    await test.step('Verify human-readable change description is displayed', async () => {
      await expect(apiChangesTab.table.getChangeDescriptionCell(MSG_CHANGES_DESC)).toBeVisible()
    })
  })
})
