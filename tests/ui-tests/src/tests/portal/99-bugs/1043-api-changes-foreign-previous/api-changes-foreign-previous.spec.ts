import { test } from '@fixtures'
import { VERSION_CHANGES_TAB_REST } from '@portal/entities'
import { PortalPage } from '@portal/pages/PortalPage'
import { expect } from '@services/expect-decorator'
import {
  D11,
  D123,
  GET_PET_BY_TAG_V2_SWAGGER,
  V_P_DSH_CHANGELOG_REST_BASE_R,
  V_P_DSH_CHANGELOG_REST_CHANGED_R,
} from '@test-data/portal'
import type { Version } from '@test-data/props'
import { HOOK_PUBLISH_TIMEOUT } from '@test-setup'

test.describe('Dashboard API Changes with a previous version from another dashboard', () => {
  const V_API_CHANGES_FOREIGN_PREV_R: Version = {
    pkg: D123,
    version: 'api-changes-foreign-prev',
    status: 'draft',
    refs: V_P_DSH_CHANGELOG_REST_CHANGED_R.refs,
    previousVersion: V_P_DSH_CHANGELOG_REST_BASE_R.version,
    previousVersionPackageId: D11.packageId,
  }

  test.beforeAll(async ({ apihubTDM }) => {
    test.setTimeout(HOOK_PUBLISH_TIMEOUT)
    await apihubTDM.publishVersionIfMissing(V_API_CHANGES_FOREIGN_PREV_R)
  })

  test('[P-BUG-1043] Load API Changes against a previous version from another dashboard', {
    annotation: { type: 'URL', description: 'https://github.com/Netcracker/qubership-apihub/issues/1043' },
  }, async ({ sysadminPage: page }) => {
    const portalPage = new PortalPage(page)
    const { versionDashboardPage: versionPage } = portalPage
    const { apiChangesTab } = versionPage

    await portalPage.gotoVersion(V_API_CHANGES_FOREIGN_PREV_R, VERSION_CHANGES_TAB_REST)

    await test.step('Verify API Changes loads the comparison against the other dashboard', async () => {
      await expect(apiChangesTab.table.getOperationRow(GET_PET_BY_TAG_V2_SWAGGER)).toBeVisible()
      await expect(apiChangesTab.toolbar.comparedToLnk).toHaveText(V_P_DSH_CHANGELOG_REST_BASE_R.version)
    })

    await apiChangesTab.toolbar.comparedToLnk.click()

    await test.step('Verify the API Changes baseline link opens the other dashboard', async () => {
      await expect(versionPage.toolbar.title).toHaveText(D11.name)
      await expect(versionPage.toolbar.versionSlt).toHaveText(V_P_DSH_CHANGELOG_REST_BASE_R.version)
    })
  })
})
