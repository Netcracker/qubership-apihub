import { test } from '@fixtures'
import { PortalPage } from '@portal/pages/PortalPage'
import { expect } from '@services/expect-decorator'
import { FILE_P_PETSTORE20, FILE_P_PETSTORE30, PK11, PK12, V_P_DSH_OVERVIEW_R } from '@test-data/portal'
import { VERSION_DOCUMENTS_TAB } from '@portal/entities'
import { TICKET_BASE_URL } from '@test-setup'

test.describe('7.2 Documents actions (Dashboard)', () => {

  test('[P-DCDFI-1] Filtering documents by Packages on the Documents tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4862` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { documentsTab } = versionPage

      await portalPage.gotoVersion(V_P_DSH_OVERVIEW_R, VERSION_DOCUMENTS_TAB)

      await documentsTab.sidebar.packageFilterAc.click()

      await expect.soft(documentsTab.sidebar.packageFilterAc.getListItem()).toHaveCount(2)

      await documentsTab.sidebar.packageFilterAc.getListItem(PK11.name).click()

      await expect(documentsTab.sidebar.getDocRestButton(FILE_P_PETSTORE30.testMeta!.docName)).toBeVisible()
      await expect(documentsTab.sidebar.getDocRestButton(FILE_P_PETSTORE20.testMeta!.docName)).not.toBeVisible()

      await documentsTab.sidebar.packageFilterAc.clear()
      await documentsTab.sidebar.packageFilterAc.click()
      await documentsTab.sidebar.packageFilterAc.getListItem(PK12.name).click()

      await expect(documentsTab.sidebar.getDocRestButton(FILE_P_PETSTORE20.testMeta!.docName)).toBeVisible()
      await expect(documentsTab.sidebar.getDocRestButton(FILE_P_PETSTORE30.testMeta!.docName)).not.toBeVisible()
    })
})
